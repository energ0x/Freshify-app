from sqlalchemy.orm import Session
from app.db.models import User, Achievement, UserAchievement, ConsumedProduct, DonationSettings, Product, GroceryItem
import uuid
from datetime import datetime


def check_empty_shelf(db: Session, user_id: uuid.UUID) -> int:
    product_categories = db.query(Product.category_id).filter(
        Product.user_id == user_id, Product.category_id.isnot(None)
    ).distinct().all()
    consumed_product_categories = db.query(ConsumedProduct.category_id).filter(
        ConsumedProduct.user_id == user_id, ConsumedProduct.category_id.isnot(None)
    ).distinct().all()

    all_category_ids = {c[0] for c in product_categories}.union({c[0] for c in consumed_product_categories})

    for category_id in all_category_ids:
        active_products_count = db.query(Product).filter(
            Product.user_id == user_id,
            Product.category_id == category_id,
            Product.is_active.is_(True)
        ).count()

        consumed_products_count = db.query(ConsumedProduct).filter(
            ConsumedProduct.user_id == user_id,
            ConsumedProduct.category_id == category_id
        ).count()

        if active_products_count == 0 and consumed_products_count > 0:
            return 1  # Achievement unlocked

    return 0  # Not yet unlocked


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
        "check_progress": lambda db, user_id: db.query(ConsumedProduct).filter(
            ConsumedProduct.user_id == user_id).count()
    },
    {
        "id": "2",
        "title": "ШІ-Дослідник",
        "desc": "Додайте 5 продуктів через фото",
        "icon": "camera",
        "total": 5,
        "color": "#3498DB",
        "xp_reward": 200,
        "check_progress": lambda db, user_id: db.query(User).filter(User.id == user_id).first().photo_uploads_count
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
        "id": "5",
        "title": "Кармічний баланс",
        "desc": "Увімкніть авто-донат",
        "icon": "heart",
        "total": 1,
        "color": "#E74C3C",
        "xp_reward": 200,
        "check_progress": lambda db, user_id: 1 if db.query(DonationSettings).filter(
            DonationSettings.user_id == user_id, DonationSettings.auto_donate.is_(True)).first() else 0
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
    {
        "id": "7",
        "title": "Око-алмаз",
        "desc": "Розпізнайте 50 продуктів за допомогою ШІ-фото.",
        "icon": "camera",
        "total": 50,
        "color": "#3498DB",
        "xp_reward": 500,
        "check_progress": lambda db, user_id: db.query(User).filter(User.id == user_id).first().photo_uploads_count
    },
    {
        "id": "8",
        "title": "Олдскул",
        "desc": "Додайте 20 продуктів вручну.",
        "icon": "pencil",
        "total": 20,
        "color": "#95A5A6",
        "xp_reward": 200,
        "check_progress": lambda db, user_id: db.query(Product).filter(
            Product.user_id == user_id).count() - db.query(User).filter(User.id == user_id).first().photo_uploads_count
    },
    {
        "id": "9",
        "title": "Світло у темряві",
        "desc": "користуйтесь застосунком без підключення до інтернету.",
        "icon": "moon",
        "total": 1,
        "color": "#34495E",
        "xp_reward": 100,
        "check_progress": lambda db, user_id: 0  # Client-side logic
    },
    {
        "id": "10",
        "title": "Порожня полиця",
        "desc": "Використайте всі продукти з однієї категорії",
        "icon": "box-open",
        "total": 1,
        "color": "#1ABC9C",
        "xp_reward": 300,
        "check_progress": check_empty_shelf
    },
    {
        "id": "11",
        "title": "ШІф-кухар",
        "desc": "згенеруйте 50 рецептів за допомогою ШІ.",
        "icon": "chef-hat",
        "total": 10,
        "color": "#E67E22",
        "xp_reward": 400,
        "check_progress": lambda db, user_id: db.query(User).filter(
            User.id == user_id).first().recipe_generations_count
    },
    {
        "id": "12",
        "title": "я з богатої сімʼї",
        "desc": "оформіть преміум підписку",
        "icon": "gem",
        "total": 1,
        "color": "#F1C40F",
        "xp_reward": 1000,
        "check_progress": lambda db, user_id: 1 if db.query(User).filter(
            User.id == user_id, User.is_premium.is_(True)).first() else 0
    },
    {
        "id": "13",
        "title": "Аналітик",
        "desc": "згенеруйте 10 рекомендацій ші дієтолога",
        "icon": "chart-bar",
        "total": 10,
        "color": "#2980B9",
        "xp_reward": 300,
        "check_progress": lambda db, user_id: db.query(User).filter(
            User.id == user_id).first().analytics_generations_count
    },
    {
        "id": "14",
        "title": "Перший крок",
        "desc": "Додайте свій перший продукт.",
        "icon": "shoe-prints",
        "total": 1,
        "color": "#27AE60",
        "xp_reward": 50,
        "check_progress": lambda db, user_id: db.query(Product).filter(Product.user_id == user_id).count()
    },
    {
        "id": "15",
        "title": "Шопінг-гуру",
        "desc": "Виконайте свій перший список покупок на 100%.",
        "icon": "shopping-cart",
        "total": 1,
        "color": "#8E44AD",
        "xp_reward": 150,
        "check_progress": lambda db, user_id: 1 if db.query(GroceryItem).filter(
            GroceryItem.user_id == user_id).count() > 0 and db.query(GroceryItem).filter(
            GroceryItem.user_id == user_id, GroceryItem.is_purchased.is_(False)).count() == 0 else 0
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
            "progress": min(progress, a_def["total"]),
            "completed": is_completed
        })

    return results
