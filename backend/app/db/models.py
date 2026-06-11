import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Date, Float, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    
    dietary_preference = Column(String(50), nullable=True)
    allergens = Column(JSON, default=list)
    is_premium = Column(Boolean, default=False, nullable=False)
    xp_points = Column(Integer, default=0)
    
    premium_expires_at = Column(DateTime(timezone=True), nullable=True)
    photo_uploads_count = Column(Integer, default=0, nullable=False)
    recipe_generations_count = Column(Integer, default=0, nullable=False)
    analytics_generations_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    products = relationship("Product", back_populates="owner", cascade="all, delete-orphan")
    consumed_products = relationship("ConsumedProduct", back_populates="user", cascade="all, delete-orphan")
    grocery_items = relationship("GroceryItem", back_populates="user", cascade="all, delete-orphan")
    donation_settings = relationship("DonationSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    user = relationship("User", back_populates="categories")
    products = relationship("Product", back_populates="category_obj")
    consumed_products = relationship("ConsumedProduct", back_populates="category_obj")
    grocery_items = relationship("GroceryItem", back_populates="category_obj")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    icon = Column(String(50), nullable=False)
    xp_reward = Column(Integer, default=50)

    users = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    achievement_id = Column(String(50), ForeignKey("achievements.id", ondelete="CASCADE"), primary_key=True)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="users")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    quantity = Column(Float, default=1.0)
    unit = Column(String(50), default="шт")
    expiry_date = Column(Date)
    image_url = Column(Text)
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    
    calories = Column(Float, nullable=True)
    proteins = Column(Float, nullable=True)
    fats = Column(Float, nullable=True)
    carbohydrates = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="products")
    category_obj = relationship("Category", back_populates="products")
    consumed_records = relationship("ConsumedProduct", back_populates="product")


class ConsumedProduct(Base):
    __tablename__ = "consumed_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    quantity = Column(Float)
    unit = Column(String(50))
    consumed_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="consumed_products")
    product = relationship("Product", back_populates="consumed_records")
    category_obj = relationship("Category", back_populates="consumed_products")


class GroceryItem(Base):
    __tablename__ = "grocery_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    quantity = Column(Float, default=1.0)
    unit = Column(String(50), default="шт")
    is_purchased = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="grocery_items")
    category_obj = relationship("Category", back_populates="grocery_items")


class DonationSettings(Base):
    __tablename__ = "donation_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    auto_donate = Column(Boolean, default=False)
    charity_name = Column(String(255), default="Повернись живим")
    charity_url = Column(Text, default="https://savelife.in.ua")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="donation_settings")