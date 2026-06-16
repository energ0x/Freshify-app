"""
Authentication Router
---------------------
This module handles all authentication-related endpoints, including user registration,
user login, fetching/updating user profile details, and activating premium status.
It coordinates with the auth and premium services to execute logic and issue JWTs.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserUpdate, TokenResponse
from app.services.auth_service import register_user, authenticate_user, create_access_token, update_user
from app.services.premium_service import PremiumService
from app.utils.dependencies import get_current_user
from app.db.models import User

# Define the APIRouter for authentication endpoints
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    Parameters:
    - data (UserCreate): The schema containing the user registration payload (email, password, name, dietary_preference, allergens).
    - db (Session): The database session dependency.

    Returns:
    - TokenResponse: The newly generated JWT access token along with the registered user's profile details.
    """
    # Create the user record in the database using the authentication service
    user = register_user(
        db,
        data.email,
        data.password,
        data.name,
        data.dietary_preference,
        data.allergens
    )
    # Generate an access token containing the user's UUID string as the subject claim ('sub')
    token = create_access_token({"sub": str(user.id)})
    # Return both the token and the validated Pydantic model representation of the user
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate a user and return an access token.

    Parameters:
    - data (UserLogin): The login payload containing the user's email and password.
    - db (Session): The database session dependency.

    Returns:
    - TokenResponse: The authenticated user's access token and profile info.
    """
    # Authenticate credentials against stored passwords in the database
    user = authenticate_user(db, data.email, data.password)
    # Create the access token upon successful authentication
    token = create_access_token({"sub": str(user.id)})
    # Return both the access token and user profile details
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Retrieve the current logged-in user's profile.

    Parameters:
    - current_user (User): The user object resolved from the request's Bearer token.

    Returns:
    - User: The current user details.
    """
    # Returns the user model directly as resolved by the dependency injection
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update the profile of the current logged-in user.

    Parameters:
    - data (UserUpdate): The fields to update (dietary preferences, name, allergens, etc.).
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user making the request.

    Returns:
    - User: The updated user database model.
    """
    # Update and save the user settings in the database
    user = update_user(db, current_user, data)
    return user


@router.post("/me/activate-premium", response_model=UserResponse)
def activate_premium(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Activate premium subscription benefits for the current logged-in user.

    Parameters:
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user making the request.

    Returns:
    - User: The user database model with premium features activated.
    """
    # Instantiate the premium service wrapper
    premium_service = PremiumService(db)
    # Toggle or activate premium flags on the user record
    user = premium_service.activate_premium(current_user)
    return user
