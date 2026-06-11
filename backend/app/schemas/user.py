from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
import uuid
from enum import Enum
from app.schemas.achievement import UserAchievementResponse


class DietaryPreference(str, Enum):
    none = "none"
    vegetarian = "vegetarian"
    vegan = "vegan"
    pescatarian = "pescatarian"
    flexitarian = "flexitarian"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    dietary_preference: Optional[DietaryPreference] = None
    allergens: Optional[List[str]] = []


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    dietary_preference: Optional[DietaryPreference] = None
    allergens: Optional[List[str]] = None

    @field_validator('new_password')
    def password_match(cls, v, values, **kwargs):
        if v is not None and 'current_password' in values and values['current_password'] is None:
            raise ValueError('Для зміни паролю потрібно вказати поточний пароль')
        return v


class UserResponse(BaseModel):
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
        from_attributes = True

    @field_validator('allergens', 'is_premium', 'xp_points', 'achievements', mode='before')
    @classmethod
    def handle_null_defaults(cls, v, info):
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
    access_token: str
    token_type: str = "bearer"
    user: UserResponse