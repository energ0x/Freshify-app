import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Date, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    products = relationship("Product", back_populates="owner", cascade="all, delete-orphan")
    consumed_products = relationship("ConsumedProduct", back_populates="user", cascade="all, delete-orphan")
    grocery_items = relationship("GroceryItem", back_populates="user", cascade="all, delete-orphan")
    donation_settings = relationship("DonationSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100))
    quantity = Column(Float, default=1.0)
    unit = Column(String(50), default="шт")
    expiry_date = Column(Date)
    image_url = Column(Text)
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="products")
    consumed_records = relationship("ConsumedProduct", back_populates="product")


class ConsumedProduct(Base):
    __tablename__ = "consumed_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=False)
    category = Column(String(100))
    quantity = Column(Float)
    unit = Column(String(50))
    consumed_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="consumed_products")
    product = relationship("Product", back_populates="consumed_records")


class GroceryItem(Base):
    __tablename__ = "grocery_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100))
    quantity = Column(Float, default=1.0)
    unit = Column(String(50), default="шт")
    is_purchased = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="grocery_items")


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
