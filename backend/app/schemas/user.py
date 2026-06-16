"""
User Schemas Module

Defines the Pydantic models for user-related requests, updates, database serialization,
and authentication token structures.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
import uuid
from enum import Enum
from app.schemas.achievement import UserAchievementResponse


class DietaryPreference(str, Enum):
    """
    Enum representing dietary preferences options for users.
    Used for filtering recipes, product recommendations, or warnings.
    """
    none = "none"
    vegetarian = "vegetarian"
    vegan = "vegan"
    pescatarian = "pescatarian"
    flexitarian = "flexitarian"


class UserCreate(BaseModel):
    """
    Schema for validating user registration input.
    Requires email, password (with length restrictions), and name.
    """
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=255)
    dietary_preference: Optional[DietaryPreference] = None
    allergens: Optional[List[str]] = []


class UserLogin(BaseModel):
    """
    Schema for validating user authentication/login input.
    """
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """
    Schema for validating partial updates to user profile information.
    All fields are optional, enabling selective field updates.
    """
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    dietary_preference: Optional[DietaryPreference] = None
    allergens: Optional[List[str]] = None

    @field_validator('new_password')
    def password_match(cls, v, values, **kwargs):
        """
        Validates that changing the password requires the user to supply their current password.
        
        Args:
            v: The new password value being validated.
            values: A dictionary containing the other fields parsed so far.
            
        Returns:
            The validated new password.
            
        Raises:
            ValueError: If current_password is not supplied when new_password is set.
        """
        if v is not None and 'current_password' in values and values['current_password'] is None:
            raise ValueError('Для зміни паролю потрібно вказати поточний пароль')
        return v


class UserResponse(BaseModel):
    """
    Schema for serializing user profile information in API responses.
    Excludes sensitive data such as password hashes.
    """
    id: uuid.UUID
    email: str
    name: str
    dietary_preference: Optional[DietaryPreference] = None
    allergens: List[str] = []
    is_premium: bool = False
    premium_expires_at: Optional[datetime] = None
    xp_points: int = 0
    created_at: datetime
    achievements: List[UserAchievementResponse] = []

    class Config:
        # Allows Pydantic to read data directly from ORM objects (SQLAlchemy models)
        from_attributes = True

    @field_validator('allergens', 'is_premium', 'xp_points', 'achievements', mode='before')
    @classmethod
    def handle_null_defaults(cls, v, info):
        """
        Ensures fields receive valid default values if database values are null.
        
        Args:
            v: The value of the field being validated.
            info: Validation information containing the field name.
            
        Returns:
            Default value (empty list, False, 0) if the value is None, otherwise the original value.
        """
        if v is None:
            if info.field_name == 'allergens':
                return []
            if info.field_name == 'is_premium':
                return False
            if info.field_name == 'xp_points':
                return 0
            if info.field_name == 'achievements':
                return []
        return v


class TokenResponse(BaseModel):
    """
    Schema representing the structure of successful authentication response.
    Contains the JWT access token and accompanying user profile details.
    """
    access_token: str
    token_type: str = "bearer"
    user: UserResponse