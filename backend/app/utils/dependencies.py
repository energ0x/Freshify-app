"""
Authentication and Authorization Dependencies.

This module provides FastAPI dependencies for authenticating HTTP requests,
checking JWT access tokens, enforcing subscription statuses, and managing
free-tier usage/rate limits reset windows.
"""

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

# Initialize logger for debugging authorization issues
logger = logging.getLogger(__name__)

# Retrieve cached application configuration settings
settings = get_settings()

# Initialize the HTTP Bearer security scheme for token authentication
security = HTTPBearer()


def check_and_reset_limits(user: User, db: Session) -> None:
    """
    Checks if the rate-limiting period has elapsed for a free user.
    If the limit window has passed, it resets usage counters and updates the timestamp.

    Args:
        user (User): The database model representing the current user.
        db (Session): Active database session for committing changes.
    """
    # Premium users are not subject to these limit constraints
    if user.is_premium:
        return

    now = datetime.now(timezone.utc)
    reset_at = user.limits_reset_at

    # If reset_at is not set or the time passed is greater than the configured window, reset limits
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
    """
    Retrieves and validates the current user from the incoming HTTP Bearer token.
    Evaluates JWT validity, checks user existence, checks for premium subscription expiration,
    and runs usage limit checks.

    Args:
        credentials (HTTPAuthorizationCredentials): Authorization header credential wrapper.
        db (Session): Database session injected by dependency.

    Returns:
        User: The authenticated User ORM object.

    Raises:
        HTTPException: 401 Unauthorized if token is invalid or user doesn't exist.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the access token using the application secret key and signing algorithm
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Query the user from the database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    now = datetime.now(timezone.utc)

    # Check if the user is premium and their subscription has expired
    if user.is_premium and user.premium_expires_at:
        expires_at = user.premium_expires_at
        # Ensure timezone-aware comparison
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            # Downgrade user to free tier upon expiration
            user.is_premium = False
            db.commit()
            db.refresh(user)

    # Re-evaluate and reset limits if the reset period has ended for free tier
    check_and_reset_limits(user, db)
    return user


def get_user_from_ws_token(token: str, db: Session) -> User | None:
    """
    Decodes a JWT from a WebSocket query parameter and retrieves the corresponding User.
    This bypasses HTTP bearer header dependency since WebSockets establish connection via URL queries.

    Args:
        token (str): JWT token string from the WebSocket query param.
        db (Session): Database session instance.

    Returns:
        User | None: The authenticated User ORM object, or None if validation fails.
    """
    try:
        # Decode token payload
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    # Retrieve user from the database
    return db.query(User).filter(User.id == user_id).first()
