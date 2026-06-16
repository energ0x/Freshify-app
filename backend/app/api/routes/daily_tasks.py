"""
Daily Tasks Router
------------------
This router handles endpoints related to daily tasks, user streaks, and task/streak
summaries. It helps gamify the user experience, encouraging regular application usage,
by tracking recurring activities and providing summaries for the frontend dashboard.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.services import daily_task_service
from app.schemas.daily_task import DailyTaskResponse, StreakResponse
from app.utils.dependencies import get_current_user
from app.db.models import User

# Define the APIRouter for daily task and habit-tracking endpoints
router = APIRouter(prefix="/api/v1/daily-tasks", tags=["daily-tasks"])

@router.get("", response_model=List[DailyTaskResponse])
def get_daily_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve the daily tasks for the current user.

    Parameters:
    - db (Session): The database session dependency.
    - current_user (User): The user object resolved from the authentication token.

    Returns:
    - List[DailyTaskResponse]: A list of daily tasks assigned to or trackable by the user.
    """
    # Fetch user daily tasks using the daily task service
    return daily_task_service.get_user_daily_tasks(db, user_id=current_user.id)

@router.get("/streaks", response_model=List[StreakResponse])
def get_streaks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve the streaks for the current user.

    Parameters:
    - db (Session): The database session dependency.
    - current_user (User): The user object resolved from the authentication token.

    Returns:
    - List[StreakResponse]: A list of streak records representing consecutive task completions.
    """
    # Fetch user streak history and current streaks using the daily task service
    return daily_task_service.get_user_streaks(db, user_id=current_user.id)

@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a lightweight summary of task statistics for the frontend dashboard widgets.
    Includes current streak, best streak, and progress representation across the week.

    Parameters:
    - db (Session): The database session dependency.
    - current_user (User): The user object resolved from the authentication token.

    Returns:
    - Dict/JSON: An aggregated dashboard-friendly object of streaks, statuses, and counts.
    """
    # Retrieve aggregated weekly and streak summaries for display
    return daily_task_service.get_user_daily_summary(db, user_id=current_user.id)