"""
SQLAlchemy Declarative Models for the Freshify Application.

This module defines the database schema and ORM models, representing tables for
Users, Categories, Achievements, Daily Tasks, Streaks, Products, Consumed Products,
Grocery Items, and Donation Settings.
"""

import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Date, Float, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    """
    Represents an application user.
    Tracks authentication details, dietary preferences, gamification progression (XP),
    subscription tier status, and rate-limiting quotas.
    """
    __tablename__ = "users"

    # Unique identifier (UUID v4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # User's email address used for login and notifications
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # Bcrypt-hashed password string
    password_hash = Column(String(255), nullable=False)
    
    # User's display name
    name = Column(String(255), nullable=False)
    
    # Dietary preference (e.g., vegan, vegetarian, none)
    dietary_preference = Column(String(50), nullable=True)
    
    # List of user allergens stored as a JSON array
    allergens = Column(JSON, default=list)
    
    # Subscription status flag (True if user is premium, False for free tier)
    is_premium = Column(Boolean, default=False, nullable=False)
    
    # Experience points (XP) accumulated through gamification tasks
    xp_points = Column(Integer, default=0)
    
    # Timestamp indicating when premium subscription expires
    premium_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Rate limit counters for free-tier users within the current window
    photo_uploads_count = Column(Integer, default=0, nullable=False)
    recipe_generations_count = Column(Integer, default=0, nullable=False)
    analytics_generations_count = Column(Integer, default=0, nullable=False)
    
    # Timestamp when the current rate-limit window resets
    limits_reset_at = Column(DateTime(timezone=True), nullable=True)

    # Auditing timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ORM Relationships
    products = relationship("Product", back_populates="owner", cascade="all, delete-orphan")
    consumed_products = relationship("ConsumedProduct", back_populates="user", cascade="all, delete-orphan")
    grocery_items = relationship("GroceryItem", back_populates="user", cascade="all, delete-orphan")
    donation_settings = relationship("DonationSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    daily_tasks = relationship("UserDailyTask", back_populates="user", cascade="all, delete-orphan")
    streaks = relationship("Streak", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    """
    Represents product categorization (e.g., Dairy, Vegetables, Meat).
    Categories can be system-wide (user_id is NULL) or user-specific (custom categories).
    """
    __tablename__ = "categories"

    # Unique identifier (UUID v4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Category display name
    name = Column(String(100), nullable=False)
    
    # Foreign key link to the User who created it; NULL indicates a default/global category
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    # ORM Relationships
    user = relationship("User", back_populates="categories")
    products = relationship("Product", back_populates="category_obj")
    consumed_products = relationship("ConsumedProduct", back_populates="category_obj")
    grocery_items = relationship("GroceryItem", back_populates="category_obj")


class Achievement(Base):
    """
    Represents a system-defined achievement that users can unlock
    by performing specific actions (e.g., scanning first product, completing daily goals).
    """
    __tablename__ = "achievements"

    # Unique string identifier/key (e.g., 'first_scan')
    id = Column(String(50), primary_key=True, index=True)
    
    # Display name of the achievement
    name = Column(String(100), nullable=False)
    
    # Description of how to unlock the achievement
    description = Column(Text, nullable=False)
    
    # Identifier for the UI icon to display
    icon = Column(String(50), nullable=False)
    
    # XP awarded to the user upon unlocking
    xp_reward = Column(Integer, default=50)

    # ORM Relationships
    users = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    """
    Association table tracking which achievements have been unlocked by which users.
    """
    __tablename__ = "user_achievements"

    # Composite primary key referencing User and Achievement
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    achievement_id = Column(String(50), ForeignKey("achievements.id", ondelete="CASCADE"), primary_key=True)
    
    # Date and time the achievement was unlocked
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())

    # ORM Relationships
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="users")


class DailyTask(Base):
    """
    Defines daily tasks available to users for XP rewards.
    """
    __tablename__ = "daily_tasks"

    # Unique task string identifier (e.g., 'log_product')
    id = Column(String(50), primary_key=True, index=True)
    
    # Display name of the daily task
    name = Column(String(100), nullable=False)
    
    # Details explaining the daily task
    description = Column(Text, nullable=False)
    
    # Icon key for client display
    icon = Column(String(50), nullable=False)
    
    # XP reward granted on task completion
    xp_reward = Column(Integer, default=10)
    
    # Total actions/progress required to complete this task (e.g. log 3 products)
    total = Column(Integer, default=1)

    # ORM Relationships
    users = relationship("UserDailyTask", back_populates="daily_task")


class UserDailyTask(Base):
    """
    Tracks a user's progress on a specific DailyTask for a specific calendar date.
    """
    __tablename__ = "user_daily_tasks"

    # Unique task completion identifier (UUID v4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key link to the User
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Foreign key link to the DailyTask definition
    task_id = Column(String(50), ForeignKey("daily_tasks.id", ondelete="CASCADE"), nullable=False)
    
    # Calendar date for which this task progress applies
    date = Column(Date, default=func.current_date(), nullable=False)
    
    # Current numerical progress (e.g. 2 scanned out of 3 required)
    progress = Column(Integer, default=0, nullable=False)
    
    # Flag indicating whether the task was fully completed
    completed = Column(Boolean, default=False, nullable=False)

    # ORM Relationships
    user = relationship("User", back_populates="daily_tasks")
    daily_task = relationship("DailyTask", back_populates="users")


class Streak(Base):
    """
    Tracks user consecutive activity metrics, such as consecutive login days.
    """
    __tablename__ = "streaks"

    # Unique streak tracker identifier (UUID v4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key link to the User
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Type of streak tracked (e.g., 'daily_login', 'perfect_week')
    streak_type = Column(String(50), nullable=False)
    
    # Current consecutive count of active periods
    current_streak = Column(Integer, default=0, nullable=False)
    
    # Historical record for longest streak achieved
    longest_streak = Column(Integer, default=0, nullable=False)
    
    # Date when the last tracked activity occurred (used to check if streak is broken)
    last_activity_date = Column(Date, nullable=True)

    # ORM Relationships
    user = relationship("User", back_populates="streaks")


class Product(Base):
    """
    Represents a food item or ingredient registered by the user.
    Tracks expiration date, quantity, status, and optional nutritional data.
    """
    __tablename__ = "products"

    # Unique product identifier (UUID v4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key link to the User who owns the product
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Product name (e.g., 'Milk', 'Apple')
    name = Column(String(255), nullable=False)
    
    # Optional foreign key linking to a Category (e.g., Dairy)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    
    # Remaining quantity of the product
    quantity = Column(Float, default=1.0)
    
    # Unit of measurement (e.g., 'pcs' / 'шт', 'kg', 'ml')
    unit = Column(String(50), default="шт")
    
    # The expiration date of this food product
    expiry_date = Column(Date)
    
    # Optional image path or URL associated with the product
    image_url = Column(Text)
    
    # User notes or additional details (e.g. 'Keep frozen')
    notes = Column(Text)
    
    # Active status; True if the product is in inventory, False if it was discarded/archived
    is_active = Column(Boolean, default=True)
    
    # Optional nutritional information per unit/serving
    calories = Column(Float, nullable=True)
    proteins = Column(Float, nullable=True)
    fats = Column(Float, nullable=True)
    carbohydrates = Column(Float, nullable=True)

    # Auditing timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ORM Relationships
    owner = relationship("User", back_populates="products")
    category_obj = relationship("Category", back_populates="products")
    consumed_records = relationship("ConsumedProduct", back_populates="product")


class ConsumedProduct(Base):
    """
    Logs history of consumed items for nutrition and waste reduction tracking.
    """
    __tablename__ = "consumed_products"

    # Unique consumption log identifier (UUID v4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key link to the User who consumed the product
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Foreign key link to the original Product; SET NULL if the product is deleted
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    # Cached product name (in case the original Product is deleted)
    product_name = Column(String(255), nullable=False)
    
    # Category of the consumed product
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    
    # Quantity consumed
    quantity = Column(Float)
    
    # Unit of measurement
    unit = Column(String(50))

    # Nutrition actually consumed in this event, frozen against later product edits/deletes.
    calories_consumed = Column(Float, nullable=True)
    proteins_consumed = Column(Float, nullable=True)
    fats_consumed = Column(Float, nullable=True)
    carbohydrates_consumed = Column(Float, nullable=True)

    # Timestamp indicating when the item was consumed
    consumed_at = Column(DateTime(timezone=True), server_default=func.now())

    # ORM Relationships
    user = relationship("User", back_populates="consumed_products")
    product = relationship("Product", back_populates="consumed_records")
    category_obj = relationship("Category", back_populates="consumed_products")


class GroceryItem(Base):
    """
    Represents an item in the user's shopping list.
    """
    __tablename__ = "grocery_items"

    # Unique shopping item identifier (UUID v4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key link to the User
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Name of the grocery item to purchase
    name = Column(String(255), nullable=False)
    
    # Category classification for organizing the shopping list
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    
    # Target quantity to purchase
    quantity = Column(Float, default=1.0)
    
    # Unit of measurement
    unit = Column(String(50), default="шт")
    
    # Purchase status; True if already bought and can be moved to inventory/products
    is_purchased = Column(Boolean, default=False)
    
    # Additional shopping remarks or context
    notes = Column(Text)

    # Auditing timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ORM Relationships
    user = relationship("User", back_populates="grocery_items")
    category_obj = relationship("Category", back_populates="grocery_items")


class DonationSettings(Base):
    """
    Tracks configuration for a user's food donation settings, enabling
    automatic suggestions for donating products nearing expiration.
    """
    __tablename__ = "donation_settings"

    # Unique donation settings identifier (UUID v4)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key link to the User (one-to-one constraint via unique=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Flag to enable/disable automated donation recommendations
    auto_donate = Column(Boolean, default=False)
    
    # Target charity organization name
    charity_name = Column(String(255), default="Повернись живим")
    
    # Website link of the target charity organization
    charity_url = Column(Text, default="https://savelife.in.ua")

    # Auditing timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ORM Relationships
    user = relationship("User", back_populates="donation_settings")