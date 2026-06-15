import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db.database import engine, Base, SessionLocal
import app.db.models  # noqa: F401 — registers ORM models before create_all

from app.api.routes import (
    auth, products, ai_vision, recipes, grocery,
    analytics, achievements, settings as settings_router, categories, daily_tasks
)
from app.services.achievement_service import init_achievements
from app.services.daily_task_service import init_daily_tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        init_achievements(db)
        init_daily_tasks(db)
    finally:
        db.close()
    os.makedirs("uploads", exist_ok=True)
    yield


app = FastAPI(
    title="Freshify API",
    version="1.0.0",
    description="Food monitoring app API",
    lifespan=lifespan,
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Bearer auth — cookies not used
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(ai_vision.router)
app.include_router(recipes.router)
app.include_router(grocery.router)
app.include_router(analytics.router)
app.include_router(settings_router.router)
app.include_router(achievements.router)
app.include_router(categories.router)
app.include_router(daily_tasks.router)


@app.get("/health")
def health():
    return {"status": "ok"}