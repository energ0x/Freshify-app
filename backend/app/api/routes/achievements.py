"""
Achievements Router
-------------------
This router handles gamification achievements, allowing users to query their progress,
milestones, and unlocked rewards within the application.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db.database import get_db
from app.db.models import User
from app.utils.dependencies import get_current_user
from app.services import achievement_service

# Define the APIRouter for user achievements
router = APIRouter(prefix="/achievements", tags=["achievements"])

@router.get("", response_model=List[Dict[str, Any]])
def get_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve achievements progress for the current authenticated user.
    Tracks milestones like food saved, days logged, and tasks completed.

    Parameters:
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user making the request.

    Returns:
    - List[Dict[str, Any]]: A list of achievement details including progress, targets, and lock status.
    """
    # Fetch user achievements status from the achievements service
    return achievement_service.get_user_achievements_progress(db, current_user.id)
