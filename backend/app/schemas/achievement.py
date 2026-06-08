from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AchievementBase(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    xp_reward: int


class AchievementResponse(AchievementBase):
    class Config:
        from_attributes = True


class UserAchievementResponse(BaseModel):
    achievement_id: str
    unlocked_at: datetime
    achievement: AchievementResponse

    class Config:
        from_attributes = True
