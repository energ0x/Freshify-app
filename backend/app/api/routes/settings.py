from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db
from app.db.models import User, DonationSettings
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


class DonationSettingsUpdate(BaseModel):
    auto_donate: Optional[bool] = None
    charity_name: Optional[str] = None
    charity_url: Optional[str] = None


class DonationSettingsResponse(BaseModel):
    auto_donate: bool
    charity_name: Optional[str]
    charity_url: Optional[str]

    class Config:
        from_attributes = True


@router.get("/donation", response_model=DonationSettingsResponse)
def get_donation_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = db.query(DonationSettings).filter(DonationSettings.user_id == current_user.id).first()
    if not settings:
        settings = DonationSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/donation", response_model=DonationSettingsResponse)
def update_donation_settings(data: DonationSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = db.query(DonationSettings).filter(DonationSettings.user_id == current_user.id).first()
    if not settings:
        settings = DonationSettings(user_id=current_user.id)
        db.add(settings)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
