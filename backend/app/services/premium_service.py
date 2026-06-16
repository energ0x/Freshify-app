"""
Premium Service Module.

Provides services for managing premium subscription features, including activating
premium status for users and resetting their feature usage limits.
"""

from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.db import models

class PremiumService:
    """
    Service class responsible for business logic regarding user premium status.
    """
    
    def __init__(self, db: Session):
        """
        Initialize the PremiumService with a database session.

        Parameters:
            db (Session): The active database session.
        """
        self.db = db

    def activate_premium(self, user: models.User) -> models.User:
        """
        Activate premium status for a user for a duration of one month (30 days).

        This operation sets the is_premium flag to True, calculates the expiration date,
        and resets all monthly/daily limit counters to zero for premium-restricted actions.

        Parameters:
            user (models.User): The user object to upgrade.

        Returns:
            models.User: The updated and refreshed user instance.
        """
        user.is_premium = True
        user.premium_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        # Скидаємо лічильники при активації преміуму
        # Reset capability counters upon premium activation.
        user.photo_uploads_count = 0
        user.recipe_generations_count = 0
        user.analytics_generations_count = 0
        
        self.db.commit()
        self.db.refresh(user)
        return user

def get_premium_service(db: Session):
    """
    Factory function to instantiate PremiumService.

    Parameters:
        db (Session): The active database session.

    Returns:
        PremiumService: An instance of PremiumService.
    """
    return PremiumService(db)
