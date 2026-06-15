from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.db.models import User, DailyTask, UserDailyTask, Streak, Product, ConsumedProduct
import uuid
from datetime import date, timedelta

DAILY_TASK_DEFINITIONS = [
    {
        "id": "add_product",
        "name": "Додайте продукт",
        "description": "Додайте будь-який продукт до свого холодильника.",
        "icon": "plus",
        "xp_reward": 10,
        "total": 1,
        "check_progress": lambda db, user_id, on_date: db.query(func.count(Product.id)).filter(
            Product.user_id == user_id,
            func.date(Product.created_at) == on_date
        ).scalar() or 0
    },
    {
        "id": "use_product",
        "name": "Використайте продукт",
        "description": "Відзначте, що ви використали продукт.",
        "icon": "check",
        "xp_reward": 15,
        "total": 1,
        "check_progress": lambda db, user_id, on_date: db.query(func.count(ConsumedProduct.id)).filter(
            ConsumedProduct.user_id == user_id,
            func.date(ConsumedProduct.consumed_at) == on_date
        ).scalar() or 0
    },
    {
        "id": "scan_barcode",
        "name": "Відскануйте штрих-код",
        "description": "Додайте продукт за допомогою сканування штрих-коду.",
        "icon": "barcode",
        "xp_reward": 20,
        "total": 1,
        "check_progress": lambda db, user_id, on_date: db.query(func.count(Product.id)).filter(
            Product.user_id == user_id,
            func.date(Product.created_at) == on_date,
            Product.source == 'barcode'
        ).scalar() or 0
    },
]

def init_daily_tasks(db: Session):
    for t_def in DAILY_TASK_DEFINITIONS:
        task = db.query(DailyTask).filter(DailyTask.id == t_def["id"]).first()
        if not task:
            db.add(DailyTask(
                id=t_def["id"],
                name=t_def["name"],
                description=t_def["description"],
                icon=t_def["icon"],
                xp_reward=t_def["xp_reward"],
                total=t_def["total"]
            ))
    db.commit()

def get_user_daily_tasks(db: Session, user_id: uuid.UUID):
    today = date.today()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return []

    user_tasks_today = db.query(UserDailyTask).filter(
        UserDailyTask.user_id == user_id,
        UserDailyTask.date == today
    ).all()
    
    tasks_map = {ut.task_id: ut for ut in user_tasks_today}

    response_tasks = []
    for t_def in DAILY_TASK_DEFINITIONS:
        task_id = t_def["id"]
        progress = t_def["check_progress"](db, user_id, today)
        
        user_task = tasks_map.get(task_id)
        
        if not user_task:
            user_task = UserDailyTask(
                user_id=user_id,
                task_id=task_id,
                date=today,
                progress=0,
                completed=False
            )
            db.add(user_task)

        user_task.progress = progress
        
        if not user_task.completed and user_task.progress >= t_def["total"]:
            user_task.completed = True
            user.xp_points = (user.xp_points or 0) + t_def["xp_reward"]
            
        response_tasks.append({
            "id": task_id,
            "name": t_def["name"],
            "description": t_def["description"],
            "icon": t_def["icon"],
            "xp_reward": t_def["xp_reward"],
            "total": t_def["total"],
            "progress": user_task.progress,
            "completed": user_task.completed
        })
        
    db.commit()
    return response_tasks

def update_streaks(db: Session, user_id: uuid.UUID):
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    login_streak = db.query(Streak).filter(
        Streak.user_id == user_id,
        Streak.streak_type == 'daily_login'
    ).first()

    if not login_streak:
        login_streak = Streak(user_id=user_id, streak_type='daily_login', current_streak=0, longest_streak=0)
        db.add(login_streak)

    if login_streak.last_activity_date is None or login_streak.last_activity_date < yesterday:
        login_streak.current_streak = 1
    elif login_streak.last_activity_date == yesterday:
        login_streak.current_streak += 1
    
    login_streak.last_activity_date = today
    if login_streak.current_streak > login_streak.longest_streak:
        login_streak.longest_streak = login_streak.current_streak

    db.commit()

def get_user_streaks(db: Session, user_id: uuid.UUID):
    update_streaks(db, user_id)
    streaks = db.query(Streak).filter(Streak.user_id == user_id).all()
    return streaks