#!/usr/bin/env python3
"""
Creates (or upgrades) a premium test user.

Usage inside the container:
    docker compose run --rm seed

Usage locally (from backend/):
    python seed_premium_user.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timezone, timedelta
from app.db.database import SessionLocal, engine, Base
import app.db.models as models  # noqa: F401 — registers ORM models
from app.services.auth_service import hash_password, register_user
from app.services.category_service import create_initial_categories_for_user
from sqlalchemy.exc import IntegrityError

EMAIL = "premium@freshify.com"
PASSWORD = "test1234"
NAME = "Premium Tester"

Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.email == EMAIL).first()

    if user:
        print(f"  [--] User {EMAIL} already exists — upgrading to premium")
    else:
        user = models.User(
            email=EMAIL,
            password_hash=hash_password(PASSWORD),
            name=NAME,
        )
        db.add(user)
        db.flush()
        create_initial_categories_for_user(db, user.id)
        print(f"  [ok] Created user {EMAIL}")

    user.is_premium = True
    user.premium_expires_at = datetime.now(timezone.utc) + timedelta(days=3650)  # ~10 years
    user.photo_uploads_count = 0
    user.recipe_generations_count = 0
    user.analytics_generations_count = 0

    db.commit()
    print(f"  [ok] Premium activated (expires ~10 years from now)")
    print(f"\n  Email:    {EMAIL}")
    print(f"  Password: {PASSWORD}\n")

except Exception as e:
    db.rollback()
    print(f"  [!] Failed: {e}", file=sys.stderr)
    sys.exit(1)
finally:
    db.close()
