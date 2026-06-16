"""
Auth Service Module.

Provides security and user authentication functions for the Freshify backend,
including password hashing, verification, JWT token generation, registration,
authentication checks, and profile update functionality.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List
from jose import jwt
import bcrypt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.models import User
from app.core.config import get_settings
from app.schemas.user import UserUpdate, DietaryPreference
from app.services.category_service import create_initial_categories_for_user

# Retrieve single cached configuration settings instance.
settings = get_settings()


def hash_password(password: str) -> str:
    """
    Securely hash a plain text password using bcrypt.

    Parameters:
        password (str): The plain-text password to hash.

    Returns:
        str: The hashed password as a UTF-8 string.
    """
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a bcrypt-hashed password.

    Parameters:
        plain_password (str): The password attempt from the user.
        hashed_password (str): The stored hashed password from the database.

    Returns:
        bool: True if passwords match, False otherwise.
    """
    password_bytes_plain = plain_password.encode('utf-8')
    password_bytes_hashed = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes_plain, password_bytes_hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a JSON Web Token (JWT) for user authorization.

    Parameters:
        data (dict): The token payload data (typically contains the 'sub' key with the user ID).
        expires_delta (Optional[timedelta]): Custom token expiration duration. If not provided,
                                             the default value from settings is used.

    Returns:
        str: Encoded JWT token string.
    """
    to_encode = data.copy()
    # Determine the token expiration timestamp using UTC timezone.
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    # Encode JWT using the configured secret key and algorithm.
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def register_user(
    db: Session,
    email: str,
    password: str,
    name: str,
    dietary_preference: Optional[DietaryPreference] = None,
    allergens: Optional[List[str]] = None
) -> User:
    """
    Register a new user in the system.

    Checks if the email is already registered. If not, hashes the password,
    creates the user record, commits it, generates initial categories for the user,
    and returns the created user entity.

    Parameters:
        db (Session): The active database session.
        email (str): The email address of the new user.
        password (str): The plain password.
        name (str): The name/nickname of the user.
        dietary_preference (Optional[DietaryPreference]): Dietary preferences (e.g. Vegetarian).
        allergens (Optional[List[str]]): List of ingredients the user is allergic to.

    Returns:
        User: The newly created User ORM object.

    Raises:
        HTTPException: 400 Bad Request if the email is already registered.
    """
    # Prevent duplicate registrations with the same email.
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # Instantiate user and hash the provided password.
    user = User(
        email=email,
        password_hash=hash_password(password),
        name=name,
        dietary_preference=dietary_preference,
        allergens=allergens or []
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create a personal set of default categories for the new user.
    create_initial_categories_for_user(db, user.id)
    
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """
    Authenticate a user by verifying their email and password.

    Parameters:
        db (Session): The database session.
        email (str): User email.
        password (str): Plain-text password.

    Returns:
        User: The authenticated User ORM model.

    Raises:
        HTTPException: 401 Unauthorized if verification fails.
    """
    # Query user by email.
    user = db.query(User).filter(User.email == email).first()
    # Verify the existence of the user and the validity of the password.
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return user


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    """
    Update profile data for an existing user.

    Validates unique email constraints if email is updated. Handles profile fields,
    allergens, dietary preferences, and optional password changes (which requires verification
    of the current password).

    Parameters:
        db (Session): The database session.
        user (User): The current authenticated User object.
        data (UserUpdate): Pydantic schema containing update parameters.

    Returns:
        User: The updated and refreshed User model.

    Raises:
        HTTPException: 400 Bad Request if the new email is already taken or if the current
                       password is incorrect/missing when changing passwords.
    """
    # Handle email change and ensure uniqueness.
    if data.email is not None and data.email != user.email:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        user.email = data.email
    
    # Update optional profile fields.
    if data.name is not None:
        user.name = data.name
        
    if data.dietary_preference is not None:
        user.dietary_preference = data.dietary_preference
        
    if data.allergens is not None:
        user.allergens = data.allergens
        
    # Handle password updating if requested.
    if data.new_password:
        # Require current password validation for security purposes.
        if not data.current_password or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неправильний поточний пароль")
        user.password_hash = hash_password(data.new_password)
        
    db.commit()
    db.refresh(user)
    return user