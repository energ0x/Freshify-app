from sqlalchemy.orm import Session
from app.db.models import User, Achievement, UserAchievement, ConsumedProduct, DonationSettings
import uuid
from datetime import datetime

# Definining the achievements and their logic
ACHIEVEMENT_DEFINITIONS = [
    {
        "id": "1",
        "title": "Чистий холодильник",
        "desc": "Використайте 10 продуктів",
        "icon": "leaf",
        "total": 10,
        "color": "#2ECC71",
        "xp_reward": 200,
        "check_progress": lambda db, user_id: db.query(ConsumedProduct).filter(ConsumedProduct.user_id == user_id).count()
    },
    {
        "id": "5",
        "title": "Кармічний баланс",
        "desc": "Увімкніть авто-донат",
        "icon": "heart",
        "total": 1,
        "color": "#E74C3C",
        "xp_reward": 200,
        "check_progress": lambda db, user_id: 1 if db.query(DonationSettings).filter(DonationSettings.user_id == user_id, DonationSettings.auto_donate == True).first() else 0
    },
    # We will stub the rest for now as their logic depends on future features
    {
        "id": "2",
        "title": "ШІ-Дослідник",
        "desc": "Додайте 5 продуктів через фото",
        "icon": "camera",
        "total": 5,
        "color": "#3498DB",
        "xp_reward": 200,
        "check_progress": lambda db, user_id: 0
    },
    {
        "id": "3",
        "title": "Магістр штрихкодів",
        "desc": "Відскануйте 20 штрихкодів",
        "icon": "barcode",
        "total": 20,
        "color": "#9B59B6",
        "xp_reward": 200,
        "check_progress": lambda db, user_id: 0
    },
    {
        "id": "4",
        "title": "Ідеальний баланс",
        "desc": "Тиждень без зіпсованих продуктів",
        "icon": "scale",
        "total": 7,
        "color": "#F1C40F",
        "xp_reward": 200,
        "check_progress": lambda db, user_id: 0
    },
    {
        "id": "6",
        "title": "Кулінарна магія",
        "desc": "Зготуйте страву з 5+ інгредієнтів",
        "icon": "restaurant",
        "total": 1,
        "color": "#E67E22",
        "xp_reward": 200,
        "check_progress": lambda db, user_id: 0
    },
]

def init_achievements(db: Session):
    for a_def in ACHIEVEMENT_DEFINITIONS:
        achievement = db.query(Achievement).filter(Achievement.id == a_def["id"]).first()
        if not achievement:
            db.add(Achievement(
                id=a_def["id"],
                name=a_def["title"],
                description=a_def["desc"],
                icon=a_def["icon"],
                xp_reward=a_def["xp_reward"]
            ))
        else:
            # Оновлюємо існуючу ачівку, якщо змінилась винагорода
            if achievement.xp_reward != a_def["xp_reward"]:
                achievement.xp_reward = a_def["xp_reward"]
    db.commit()


def check_and_unlock_achievements(db: Session, user_id: uuid.UUID):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    
    unlocked_ids = [ua.achievement_id for ua in user.achievements]
    
    for a_def in ACHIEVEMENT_DEFINITIONS:
        if a_def["id"] not in unlocked_ids:
            progress = a_def["check_progress"](db, user_id)
            if progress >= a_def["total"]:
                # Unlock
                user_achievement = UserAchievement(
                    user_id=user_id,
                    achievement_id=a_def["id"]
                )
                db.add(user_achievement)
                user.xp_points = (user.xp_points or 0) + a_def["xp_reward"]
                
    db.commit()


def get_user_achievements_progress(db: Session, user_id: uuid.UUID):
    check_and_unlock_achievements(db, user_id)
    
    user = db.query(User).filter(User.id == user_id).first()
    unlocked_ids = [ua.achievement_id for ua in user.achievements]
    
    results = []
    for a_def in ACHIEVEMENT_DEFINITIONS:
        is_completed = a_def["id"] in unlocked_ids
        progress = a_def["total"] if is_completed else a_def["check_progress"](db, user_id)
        
        results.append({
            "id": a_def["id"],
            "title": a_def["title"],
            "desc": a_def["desc"],
            "icon": a_def["icon"],
            "color": a_def["color"],
            "total": a_def["total"],
            "progress": progress,
            "completed": is_completed
        })
        
    return results
