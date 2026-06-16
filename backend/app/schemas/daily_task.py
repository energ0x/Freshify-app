"""
Daily Task and Streak Schemas Module

Defines Pydantic models for daily gamification tasks and user login/activity streaks.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import date


class DailyTaskBase(BaseModel):
    """
    Base schema containing common attributes for a daily task.
    Represents the static structure of a gamified challenge (e.g. log 3 products).
    """
    id: str
    name: str
    description: str
    icon: str
    xp_reward: int
    total: int  # Target count required to complete the task


class DailyTaskResponse(DailyTaskBase):
    """
    Schema for daily task details returned to clients.
    Appends the user's specific progress towards the task goals and completion status.
    """
    progress: int  # Current count completed by the user
    completed: bool

    class Config:
        # Allows Pydantic to read database object models
        from_attributes = True


class StreakBase(BaseModel):
    """
    Base schema for tracking user activity and engagement streaks.
    Tracks daily usage patterns to incentivize consistency.
    """
    streak_type: str  # Type of streak (e.g., 'daily_login')
    current_streak: int  # Consecutive active days
    longest_streak: int  # All-time record streak
    last_activity_date: Optional[date]  # Date of the most recent tracked activity


class StreakResponse(StreakBase):
    """
    Schema for streak details returned in API responses.
    """
    class Config:
        # Enables ORM model serialization
        from_attributes = True