from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.db.models import User, DailyTask, UserDailyTask, Streak, Product, ConsumedProduct
import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from app.core.config import get_settings

def _utc_range_for_local_date(on_date):
    # returns (start_utc, end_utc) timezone-aware datetimes
    tz_name = get_settings().server_timezone
    try:
        local_tz = ZoneInfo(tz_name)
    except Exception:
        local_tz = ZoneInfo('UTC')
    start_local = datetime(on_date.year, on_date.month, on_date.day, 0, 0, 0, tzinfo=local_tz)
    end_local = start_local + timedelta(days=1)
    start_utc = start_local.astimezone(ZoneInfo('UTC'))
    end_utc = end_local.astimezone(ZoneInfo('UTC'))
    return start_utc, end_utc


def check_add_product(db, user_id, on_date):
    start_utc, end_utc = _utc_range_for_local_date(on_date)
    return db.query(func.count(Product.id)).filter(
        Product.user_id == user_id,
        Product.created_at >= start_utc,
        Product.created_at < end_utc
    ).scalar() or 0


def check_use_product(db, user_id, on_date):
    start_utc, end_utc = _utc_range_for_local_date(on_date)
    return db.query(func.count(ConsumedProduct.id)).filter(
        ConsumedProduct.user_id == user_id,
        ConsumedProduct.consumed_at >= start_utc,
        ConsumedProduct.consumed_at < end_utc
    ).scalar() or 0


DAILY_TASK_DEFINITIONS = [
    {
        "id": "daily_login",
        "name": "Щоденний вхід",
        "description": "Відкрийте застосунок.",
        "icon": "log-in-outline",
        "xp_reward": 10,
        "total": 1,
        "check_progress": lambda db, user_id, on_date: 1 # Завжди виконано, якщо користувач запитує завдання
    },
    {
        "id": "add_product",
        "name": "Додайте продукт",
        "description": "Додайте будь-який продукт до свого холодильника.",
        "icon": "plus",
        "xp_reward": 15,
        "total": 1,
        "check_progress": check_add_product
    },
    {
        "id": "use_product",
        "name": "Використайте продукт",
        "description": "Відзначте, що ви використали продукт.",
        "icon": "check",
        "xp_reward": 20,
        "total": 1,
        "check_progress": check_use_product
    },
]

def _local_today():
    tz_name = get_settings().server_timezone
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo('UTC')
    return datetime.now(tz).date()


def init_daily_tasks(db: Session):
    # Видаляємо старе завдання, якщо воно існує
    old_task = db.query(DailyTask).filter(DailyTask.id == 'scan_barcode').first()
    if old_task:
        db.delete(old_task)

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
        else:
            # Оновлюємо дані, якщо вони змінилися
            task.name = t_def["name"]
            task.description = t_def["description"]
            task.icon = t_def["icon"]
            task.xp_reward = t_def["xp_reward"]
            task.total = t_def["total"]
            
    db.commit()

def get_user_daily_tasks(db: Session, user_id: uuid.UUID):
    # Ensure streaks are up-to-date for this user before computing tasks
    update_streaks(db, user_id)
    today = _local_today()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return []

    user_tasks_today = db.query(UserDailyTask).filter(
        UserDailyTask.user_id == user_id,
        UserDailyTask.date == today
    ).all()
    
    tasks_map = {ut.task_id: ut for ut in user_tasks_today}

    response_tasks = []
    streak_should_update = False
    for t_def in DAILY_TASK_DEFINITIONS:
        task_id = t_def["id"]
        
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
        
        # Перевіряємо прогрес, тільки якщо завдання ще не виконано
        if not user_task.completed:
            progress = t_def["check_progress"](db, user_id, today)
            user_task.progress = progress
            if user_task.progress >= t_def["total"]:
                user_task.completed = True
                user.xp_points = (user.xp_points or 0) + t_def["xp_reward"]
                # Mark that we should update streaks because a task was completed now
                streak_should_update = True
        
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
        
    # If any task was completed as part of this check, update streaks so last_activity_date/current_streak reflect today's activity
    if streak_should_update:
        update_streaks(db, user_id)

    db.commit()
    return response_tasks

def update_streaks(db: Session, user_id: uuid.UUID):
    """
    Update daily_login streak when the user accesses streaks.
    Rules:
    - If last_activity_date == today → no change
    - If last_activity_date == yesterday → increment current_streak by 1
    - If last_activity_date is older (gap >= 2 days) → reset current_streak to 0
    - After update set last_activity_date = today
    - longest_streak updated when current_streak increased
    """
    today = _local_today()
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

    # Update only if last_activity_date isn't today
    if login_streak.last_activity_date != today:
        if login_streak.last_activity_date == yesterday:
            # consecutive day
            login_streak.current_streak += 1
        else:
            # new streak (either first-ever or after a gap) -> start from 1
            login_streak.current_streak = 1
        # update longest
        if login_streak.current_streak > login_streak.longest_streak:
            login_streak.longest_streak = login_streak.current_streak
        login_streak.last_activity_date = today

    db.commit()


def get_user_streaks(db: Session, user_id: uuid.UUID):
    update_streaks(db, user_id)
    streaks = db.query(Streak).filter(Streak.user_id == user_id).all()
    return streaks


def get_user_daily_summary(db: Session, user_id: uuid.UUID):
    """
    Return a small summary used by the frontend widget:
    - current streak
    - best streak
    - week: list of booleans for the last 7 days (Mon..Sun order matching frontend labels)
    - weekLabels
    """
    # Update streaks before returning summary so 'current' is accurate
    update_streaks(db, user_id)
    today = _local_today()
    # Build week dates Monday..Sunday for current week (starting Monday)
    # Find start of week (Monday)
    start_of_week = today - timedelta(days=(today.weekday()))  # Monday
    week_dates = [start_of_week + timedelta(days=i) for i in range(7)]

    # Query UserDailyTask entries for 'daily_login' for these dates
    entries = db.query(UserDailyTask).filter(
        UserDailyTask.user_id == user_id,
        UserDailyTask.task_id == 'daily_login',
        UserDailyTask.date.in_([d for d in week_dates])
    ).all()
    entries_map = {e.date: e for e in entries}

    week_items = []
    for d in week_dates:
        e = entries_map.get(d)
        done = bool(e and (e.progress > 0 or e.completed))
        week_items.append({
            'date': d.isoformat(),
            'done': done,
        })

    # Fetch streak
    login_streak = db.query(Streak).filter(
        Streak.user_id == user_id,
        Streak.streak_type == 'daily_login'
    ).first()

    current = login_streak.current_streak if login_streak else 0
    best = login_streak.longest_streak if login_streak else 0

    # Fix edge-case: if last_activity_date is today but current_streak is 0, set it to 1
    if login_streak and login_streak.last_activity_date == _local_today() and login_streak.current_streak == 0:
        login_streak.current_streak = 1
        if login_streak.current_streak > login_streak.longest_streak:
            login_streak.longest_streak = login_streak.current_streak
        db.commit()
        current = login_streak.current_streak
        best = login_streak.longest_streak

    weekLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

    raw_streak = None
    if login_streak:
        raw_streak = {
            'last_activity_date': login_streak.last_activity_date.isoformat() if login_streak.last_activity_date else None,
            'current_streak': login_streak.current_streak,
            'longest_streak': login_streak.longest_streak,
        }

    return {
        'current': current,
        'best': best,
        'week': week_items,
        'weekLabels': weekLabels,
        'raw_streak': raw_streak,
    }