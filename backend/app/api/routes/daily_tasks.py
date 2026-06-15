from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.services import daily_task_service
from app.schemas.daily_task import DailyTaskResponse, StreakResponse
from app.utils.dependencies import get_current_user
from app.db.models import User

router = APIRouter(tags=["daily-tasks"])

@router.get("", response_model=List[DailyTaskResponse])
def get_daily_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve the daily tasks for the current user.
    """
    return daily_task_service.get_user_daily_tasks(db, user_id=current_user.id)

@router.get("/streaks", response_model=List[StreakResponse])
def get_streaks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve the streaks for the current user.
    """
    return daily_task_service.get_user_streaks(db, user_id=current_user.id)
