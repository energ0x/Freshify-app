import os
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment variables
os.environ.setdefault("SECRET_KEY", "ci-only-secret-key-not-used-in-prod-xxxxxxxxxxxxxxxx")
os.environ.setdefault("GEMINI_API_KEY", "")


def _get_test_engine():
    db_url = os.environ.get("DATABASE_URL")
    if db_url and db_url.startswith("postgresql"):
        try:
            pg_engine = create_engine(db_url, pool_pre_ping=True)
            with pg_engine.connect() as conn:
                pass
            return pg_engine
        except Exception:
            # Fall back to SQLite if PostgreSQL is unreachable locally
            pass

    # SQLite fallback for local development or environments without PostgreSQL
    sqlite_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(sqlite_engine, "connect")
    def register_sqlite_functions(dbapi_connection, connection_record):
        def date_trunc(unit, value):
            if not value:
                return None
            return str(value)[:10]
        dbapi_connection.create_function("date_trunc", 2, date_trunc)

    return sqlite_engine


test_engine = _get_test_engine()
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Patch app.db.database to point to test_engine and TestingSessionLocal
import app.db.database as db_module
db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal

from main import app
from app.db.database import Base, get_db
import app.db.models as models
from app.services.achievement_service import init_achievements
from app.services.daily_task_service import init_daily_tasks
from app.services.auth_service import register_user, create_access_token
from fastapi.testclient import TestClient


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        init_achievements(session)
        init_daily_tasks(session)
    finally:
        session.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    email = f"testuser_{datetime.now(timezone.utc).timestamp()}@freshify.app"
    user = register_user(
        db=db_session,
        email=email,
        password="ValidPassword123!",
        name="Test User",
        dietary_preference="none",
        allergens=["peanuts"]
    )
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}
