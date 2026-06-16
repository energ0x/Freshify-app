"""
Alembic migration environment script.

This module configures the database connection URL and maps the SQLAlchemy
Base metadata target for autogenerating database migrations.
"""

from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
import os
import sys

# Insert the parent/backend directory into the system path so the 'app' package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import the Base schema metadata and all models so Alembic autogenerate has visibility
from app.db.database import Base
import app.db.models
from app.core.config import get_settings

# Access the Alembic configuration settings from the alembic.ini file
config = context.config

# Override the database URL dynamically using settings from our application config
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

# Setup loggers according to the configuration file, if provided
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the metadata target for autogenerating migrations matching our database models
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    
    This configures the context with just a URL and not an active Engine connection,
    which is useful for generating SQL migration scripts without hitting the database.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    
    This creates a database engine and connection pool to apply migrations directly
    to the target database.
    """
    # Create the database connection engine based on Alembic settings
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    # Establish connection and run migrations within a transaction
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


# Choose whether to run in offline or online mode based on the Alembic execution command
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
