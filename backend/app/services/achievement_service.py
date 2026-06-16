"""
Achievement Service Module.

This service manages user achievements within the Freshify application. It includes
achievement definitions, initialization of the achievement metadata in the database,
checking and unlocking logic based on user actions, and retrieving progress reports.
"""

from sqlalchemy.orm import Session
from app.db.models import User, Achievement, UserAchievement, ConsumedProduct, DonationSettings, Product, GroceryItem
import uuid
from datetime import datetime

# Definining the achievements and their logic.
# Each entry contains metadata and a lambda check function to evaluate user progress.
ACHIEVEMENT_DEFINITIONS = [
    {
        "id": "1",
        "title": "Чистий холодильник",
        "desc": "Використайте 10 продуктів",
        "icon": "leaf",
        "total": 10,
        "color": "#2ECC71",
        "xp_reward": 200,
        # Check progress: Count the number of consumed products by this user.
        "check_progress": lambda db, user_id: db.query(ConsumedProduct).filter(
            ConsumedProduct.user_id == user_id).count()
    },
    {
        "id": "2",
        "title": "Кармічний баланс",
        "desc": "Увімкніть авто-донат",
        "icon": "heart",
        "total": 1,
        "color": "#E74C3C",
        "xp_reward": 200,
        # Check progress: Return 1 if auto-donate settings are active, otherwise 0.
        "check_progress": lambda db, user_id: 1 if db.query(DonationSettings).filter(
            DonationSettings.user_id == user_id, DonationSettings.auto_donate.is_(True)).first() else 0
    },
    {
        "id": "3",
        "title": "Обжора",
        "desc": "Додайте 20 продуктів.",
        "icon": "pencil",
        "total": 20,
        "color": "#95A5A6",
        "xp_reward": 200,
        # Check progress: Total products added minus the count of products created via photo uploads.
        "check_progress": lambda db, user_id: db.query(Product).filter(
            Product.user_id == user_id).count() - db.query(User).filter(User.id == user_id).first().photo_uploads_count
    },
    {
        "id": "4",
        "title": "я з богатої сімʼї",
        "desc": "оформіть преміум підписку",
        "icon": "gem",
        "total": 1,
        "color": "#F1C40F",
        "xp_reward": 1000,
        # Check progress: Return 1 if the user is a premium user, otherwise 0.
        "check_progress": lambda db, user_id: 1 if db.query(User).filter(
            User.id == user_id, User.is_premium.is_(True)).first() else 0
    },
    {
        "id": "5",
        "title": "Перший крок",
        "desc": "Додайте свій перший продукт.",
        "icon": "shoe-prints",
        "total": 1,
        "color": "#27AE60",
        "xp_reward": 50,
        # Check progress: Count the total products associated with the user.
        "check_progress": lambda db, user_id: db.query(Product).filter(Product.user_id == user_id).count()
    },
    {
        "id": "6",
        "title": "Шопінг-гуру",
        "desc": "Виконай свій перший список покупок на 100%.",
        "icon": "shopping-cart",
        "total": 1,
        "color": "#8E44AD",
        "xp_reward": 150,
        # Check progress: Return 1 if the user has grocery items and all of them are marked as purchased.
        "check_progress": lambda db, user_id: 1 if db.query(GroceryItem).filter(
            GroceryItem.user_id == user_id).count() > 0 and db.query(GroceryItem).filter(
            GroceryItem.user_id == user_id, GroceryItem.is_purchased.is_(False)).count() == 0 else 0
    },
]


def init_achievements(db: Session):
    """
    Initialize achievement records in the database.

    Iterates through the local ACHIEVEMENT_DEFINITIONS, creating database records
    for achievements that do not exist yet, or updating their XP reward values
    if they have changed.

    Parameters:
        db (Session): The active database session.
    """
    for a_def in ACHIEVEMENT_DEFINITIONS:
        # Check if the achievement already exists in the database.
        achievement = db.query(Achievement).filter(Achievement.id == a_def["id"]).first()
        if not achievement:
            # Create a new achievement record if missing.
            db.add(Achievement(
                id=a_def["id"],
                name=a_def["title"],
                description=a_def["desc"],
                icon=a_def["icon"],
                xp_reward=a_def["xp_reward"]
            ))
        else:
            # Оновлюємо існуючу ачівку, якщо змінилась винагорода
            # Update the existing achievement if the XP reward amount is updated.
            if achievement.xp_reward != a_def["xp_reward"]:
                achievement.xp_reward = a_def["xp_reward"]
    # Commit transaction to persist modifications or additions.
    db.commit()


def check_and_unlock_achievements(db: Session, user_id: uuid.UUID):
    """
    Check and unlock any achievements that the user qualifies for but hasn't unlocked yet.

    Iterates through all achievement definitions, calculates progress, and unlocks the
    achievement if progress meets the target threshold. Rewards the user with XP.

    Parameters:
        db (Session): The database session.
        user_id (uuid.UUID): The ID of the user to check and unlock achievements for.
    """
    # Retrieve user object from database.
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    # Extract all achievement IDs already unlocked by the user.
    unlocked_ids = [ua.achievement_id for ua in user.achievements]

    # Evaluate each achievement definition against current user stats.
    for a_def in ACHIEVEMENT_DEFINITIONS:
        if a_def["id"] not in unlocked_ids:
            progress = a_def["check_progress"](db, user_id)
            # Unlock the achievement if the progress reaches or exceeds the target count.
            if progress >= a_def["total"]:
                # Unlock by creating a link record.
                user_achievement = UserAchievement(
                    user_id=user_id,
                    achievement_id=a_def["id"]
                )
                db.add(user_achievement)
                # Award experience points to the user.
                user.xp_points = (user.xp_points or 0) + a_def["xp_reward"]

    # Commit all state changes to user achievements and XP points.
    db.commit()


def get_user_achievements_progress(db: Session, user_id: uuid.UUID):
    """
    Evaluate user achievements and retrieve detailed progress information.

    Runs check_and_unlock_achievements first to ensure data consistency,
    then constructs a list containing detail structures for each defined achievement.

    Parameters:
        db (Session): The database session.
        user_id (uuid.UUID): The user to process.

    Returns:
        list[dict]: A list of dictionaries representing each achievement, including
                    ID, title, description, icon, color, total target, current progress,
                    and completed flag.
    """
    # Make sure all newly earned achievements are unlocked first.
    check_and_unlock_achievements(db, user_id)

    # Fetch user to read unlocked achievements.
    user = db.query(User).filter(User.id == user_id).first()
    unlocked_ids = [ua.achievement_id for ua in user.achievements]

    results = []
    # Build result dictionary list for the client application.
    for a_def in ACHIEVEMENT_DEFINITIONS:
        is_completed = a_def["id"] in unlocked_ids
        # If completed, set progress to max. Otherwise, compute the current progress.
        progress = a_def["total"] if is_completed else a_def["check_progress"](db, user_id)

        results.append({
            "id": a_def["id"],
            "title": a_def["title"],
            "desc": a_def["desc"],
            "icon": a_def["icon"],
            "color": a_def["color"],
            "total": a_def["total"],
            "progress": min(progress, a_def["total"]),
            "completed": is_completed
        })

    return results