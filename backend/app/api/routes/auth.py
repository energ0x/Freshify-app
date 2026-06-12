from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserUpdate, TokenResponse
from app.services.auth_service import register_user, authenticate_user, create_access_token, update_user
from app.services.premium_service import PremiumService
from app.utils.dependencies import get_current_user
from app.db.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    user = register_user(
        db,
        data.email,
        data.password,
        data.name,
        data.dietary_preference,
        data.allergens
    )
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.email, data.password)
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = update_user(db, current_user, data)
    return user


@router.post("/me/activate-premium", response_model=UserResponse)
def activate_premium(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    premium_service = PremiumService(db)
    user = premium_service.activate_premium(current_user)
    return user
