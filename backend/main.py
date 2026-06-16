"""
Main entry point for the Freshify FastAPI Backend application.

This module initializes the FastAPI application instance, configures CORS middleware,
registers static file directories, mounts all public and private API route controllers,
and defines the application startup lifespan logic (such as DB table creation and data seeding).
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db.database import engine, Base, SessionLocal

# Crucial import: registers the models in the Base metadata before calling create_all
import app.db.models  # noqa: F401

# Import API routers/controllers
from app.api.routes import (
    auth, products, ai_vision, recipes, grocery,
    analytics, achievements, settings as settings_router, categories, daily_tasks
)

# Import services to seed initial lookup/static tables
from app.services.achievement_service import init_achievements
from app.services.daily_task_service import init_daily_tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle context manager.
    Runs on startup to initialize resources (DB tables, directory structure, seed data)
    and handles cleanup on shutdown.
    """
    # Create database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    
    # Establish a temporary database session to run seeds
    db = SessionLocal()
    try:
        # Seed predefined achievements and daily tasks into the DB
        init_achievements(db)
        init_daily_tasks(db)
    finally:
        # Guarantee session is closed after seeding
        db.close()
        
    # Ensure local directory for storing uploaded images exists
    os.makedirs("uploads", exist_ok=True)
    
    # Yield control back to FastAPI; runs while the application is active
    yield


# Initialize the FastAPI application
app = FastAPI(
    title="Freshify API",
    version="1.0.0",
    description="Food monitoring app API",
    lifespan=lifespan,
)

# Mount the static directory to serve uploaded product images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Add Cross-Origin Resource Sharing (CORS) middleware to allow requests from client hosts
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Bearer authentication is used; cookies are not utilized
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers for endpoints
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
    """
    Basic health check endpoint to verify that the server is running.
    
    Returns:
        dict: A simple status check response.
    """
    return {"status": "ok"}