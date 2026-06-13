from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db.database import engine, Base, SessionLocal
import os


import app.db.models 

from app.api.routes import auth, products, ai_vision, recipes, grocery, analytics, achievements, settings as settings_router, categories
from app.services.achievement_service import init_achievements

Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    init_achievements(db)
finally:
    db.close()

os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Freshify API", version="1.0.0", description="Food monitoring app API")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


@app.get("/health")
def health():
    return {"status": "ok"}