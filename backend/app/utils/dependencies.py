from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from jose import JWTError, jwt
from app.db.database import get_db
from app.db.models import User
from app.core.config import get_settings
from datetime import datetime, timedelta
from app.core.limiter_config import LIMIT_RESET_MINUTES

settings = get_settings()
security = HTTPBearer()

def check_and_reset_limits(user: User, db: Session):
    """
    Перевіряє, чи потрібно скинути ліміти для користувача, і скидає їх,
    якщо минуло достатньо часу. Оновлює об'єкт user.
    """
    if user.is_premium:
        return

    now = datetime.utcnow()
    last_active = user.updated_at.replace(tzinfo=None) if user.updated_at and user.updated_at.tzinfo else user.updated_at
    
    if not last_active or (now - last_active) > timedelta(minutes=LIMIT_RESET_MINUTES):
        user.photo_uploads_count = 0
        user.recipe_generations_count = 0
        user.analytics_generations_count = 0
        db.commit()
        db.refresh(user)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
        
    now = datetime.utcnow()
    
    # Перевірка на закінчення терміну дії преміуму
    if user.is_premium and user.premium_expires_at:
        expires_at = user.premium_expires_at.replace(tzinfo=None) if user.premium_expires_at.tzinfo else user.premium_expires_at
        if now > expires_at:
            user.is_premium = False
            db.commit()
            db.refresh(user)
            
    # Викликаємо централізовану функцію для перевірки лімітів
    check_and_reset_limits(user, db)
            
    return user