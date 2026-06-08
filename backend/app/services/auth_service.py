from datetime import datetime, timedelta
from typing import Optional, List
from jose import jwt
import bcrypt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.models import User
from app.core.config import get_settings
from app.schemas.user import UserUpdate, DietaryPreference
from app.services.category_service import create_initial_categories_for_user

settings = get_settings()


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes_plain = plain_password.encode('utf-8')
    password_bytes_hashed = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes_plain, password_bytes_hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def register_user(
    db: Session,
    email: str,
    password: str,
    name: str,
    dietary_preference: Optional[DietaryPreference] = None,
    allergens: Optional[List[str]] = None
) -> User:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
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
    
    # Create a personal set of default categories for the new user
    create_initial_categories_for_user(db, user.id)
    
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return user


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    if data.email is not None and data.email != user.email:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        user.email = data.email
    
    if data.name is not None:
        user.name = data.name
        
    if data.dietary_preference is not None:
        user.dietary_preference = data.dietary_preference
        
    if data.allergens is not None:
        user.allergens = data.allergens
        
    if data.new_password:
        if not data.current_password or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неправильний поточний пароль")
        user.password_hash = hash_password(data.new_password)
        
    db.commit()
    db.refresh(user)
    return user