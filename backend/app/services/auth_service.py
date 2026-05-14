from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
import bcrypt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.models import User
from app.core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    # Конвертуємо пароль у байти, генеруємо сіль і хешуємо
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    # Повертаємо як звичайний рядок для збереження в БД
    return hashed_password.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Конвертуємо обидва рядки в байти для порівняння
    password_bytes_plain = plain_password.encode('utf-8')
    password_bytes_hashed = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes_plain, password_bytes_hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def register_user(db: Session, email: str, password: str, name: Optional[str] = None) -> User:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    user = User(email=email, password_hash=hash_password(password), name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return user