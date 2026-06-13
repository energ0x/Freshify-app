from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.db import models

class PremiumService:
    def __init__(self, db: Session):
        self.db = db

    def activate_premium(self, user: models.User) -> models.User:
        """
        Активує преміум-статус для користувача на один місяць.
        """
        user.is_premium = True
        user.premium_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        # Скидаємо лічильники при активації преміуму
        user.photo_uploads_count = 0
        user.recipe_generations_count = 0
        user.analytics_generations_count = 0
        
        self.db.commit()
        self.db.refresh(user)
        return user

def get_premium_service(db: Session):
    return PremiumService(db)