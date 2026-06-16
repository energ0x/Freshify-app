"""
Settings Router
---------------
This router manages user-specific application configuration. Specifically, it houses
endpoints for managing donation preferences (e.g., whether to auto-donate expiring food
items, and which charity details/URLs to associate with the user profile).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db
from app.db.models import User, DonationSettings
from app.utils.dependencies import get_current_user

# Define the APIRouter for configuration and settings
router = APIRouter(prefix="/settings", tags=["settings"])


class DonationSettingsUpdate(BaseModel):
    """
    Schema representing the payload to update donation configuration.
    All fields are optional, allowing partial updates.
    """
    auto_donate: Optional[bool] = None
    charity_name: Optional[str] = None
    charity_url: Optional[str] = None


class DonationSettingsResponse(BaseModel):
    """
    Schema representing the donation configuration returned to the client.
    """
    auto_donate: bool
    charity_name: Optional[str]
    charity_url: Optional[str]

    class Config:
        # Enable Pydantic model validation directly from ORM instances
        from_attributes = True


@router.get("/donation", response_model=DonationSettingsResponse)
def get_donation_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieve the current user's food donation settings.
    If no settings exist, a default record is lazily created.

    Parameters:
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.

    Returns:
    - DonationSettingsResponse: The user's donation preferences record.
    """
    # Query settings corresponding to the user ID
    settings = db.query(DonationSettings).filter(DonationSettings.user_id == current_user.id).first()
    
    # Lazily create a default settings row if one doesn't exist
    if not settings:
        settings = DonationSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/donation", response_model=DonationSettingsResponse)
def update_donation_settings(data: DonationSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update the user's food donation preferences.
    If no settings record exists, one will be created.

    Parameters:
    - data (DonationSettingsUpdate): The fields to modify.
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.

    Returns:
    - DonationSettingsResponse: The updated settings record.
    """
    # Fetch existing settings record
    settings = db.query(DonationSettings).filter(DonationSettings.user_id == current_user.id).first()
    
    # Instantiate donation settings row if none exists
    if not settings:
        settings = DonationSettings(user_id=current_user.id)
        db.add(settings)
        
    # Dynamically apply updated values for fields specified in the request payload
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
        
    db.commit()
    db.refresh(settings)
    return settings
