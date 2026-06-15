from pydantic import BaseModel
from typing import Optional
from datetime import date

class DailyTaskBase(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    xp_reward: int
    total: int

class DailyTaskResponse(DailyTaskBase):
    progress: int
    completed: bool

    class Config:
        from_attributes = True

class StreakBase(BaseModel):
    streak_type: str
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date]

class StreakResponse(StreakBase):
    class Config:
        from_attributes = True