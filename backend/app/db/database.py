"""
Database configuration and session management module.

This module initializes the SQLAlchemy database engine using the database URL
defined in application settings. It provides the declarative base class and
a dependency generator function for managing database sessions.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import get_settings

# Retrieve application configurations (e.g., database connection URL)
settings = get_settings()

# Create the SQLAlchemy engine to interact with the PostgreSQL database
engine = create_engine(settings.database_url)

# Create a thread-local session factory for database transactions.
# autocommit=False ensures transactions are not auto-committed, enabling rollback on error.
# autoflush=False prevents automatic flushing of pending changes before queries.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for mapping database tables to SQLAlchemy models
Base = declarative_base()


def get_db():
    """
    Dependency generator function that yields a database session.
    Ensures that the database session is closed after the request is processed,
    releasing the connection back to the connection pool.
    
    Yields:
        Session: A SQLAlchemy database session instance.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        # Guarantee that the session is always closed even if an exception occurs
        db.close()
