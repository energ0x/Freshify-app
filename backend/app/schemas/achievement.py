"""
Achievement Schemas Module

Defines the Pydantic schemas representing badges, achievements, and user-unlocked accomplishment metadata.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AchievementBase(BaseModel):
    """
    Base schema for representing a system achievement.
    Defines static fields of an award.
    """
    id: str
    name: str
    description: str
    icon: str
    xp_reward: int


class AchievementResponse(AchievementBase):
    """
    Response schema for returning system achievement details.
    """
    class Config:
        # Enables conversion from database object model properties
        from_attributes = True


class UserAchievementResponse(BaseModel):
    """
    Schema representing a specific achievement unlocked by a user.
    Maps the association between the user and the achievement, along with timestamp.
    """
    achievement_id: str
    unlocked_at: datetime
    achievement: AchievementResponse

    class Config:
        # Enables conversion from database object model properties
        from_attributes = True
