import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from app.db.database import get_db
from app.db.models import User
from app.core.config import get_settings
from datetime import datetime, timezone, timedelta
from app.core.limiter_config import LIMIT_RESET_MINUTES

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer()


def check_and_reset_limits(user: User, db: Session) -> None:
    if user.is_premium:
        return

    now = datetime.now(timezone.utc)
    reset_at = user.limits_reset_at

    if reset_at is None or (now - reset_at) > timedelta(minutes=LIMIT_RESET_MINUTES):
        user.photo_uploads_count = 0
        user.recipe_generations_count = 0
        user.analytics_generations_count = 0
        user.limits_reset_at = now
        db.commit()
        db.refresh(user)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
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

    now = datetime.now(timezone.utc)

    if user.is_premium and user.premium_expires_at:
        expires_at = user.premium_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            user.is_premium = False
            db.commit()
            db.refresh(user)

    check_and_reset_limits(user, db)
    return user


def get_user_from_ws_token(token: str, db: Session) -> User | None:
    """Decode a JWT from a WebSocket query param and return the matching User."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    return db.query(User).filter(User.id == user_id).first()
