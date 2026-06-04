from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create engine - Neon PostgreSQL requires SSL, but we fall back to SQLite locally if not provided
db_url = settings.DATABASE_URL
if not db_url or db_url == "":
    db_url = "sqlite:///./interview.db"

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        connect_args=connect_args,
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=False,  # Set True to see SQL queries during development
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()


def get_db():
    """
    Dependency injection for FastAPI routes.
    Yields a database session and closes it after request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    Create all tables defined in models.
    Called on application startup.
    No Alembic - direct SQLAlchemy table creation.
    """
    from app.models import user, interview, question, answer, score, report, analytics  # noqa
    Base.metadata.create_all(bind=engine)
    print("All database tables created successfully")

    # Safe dynamic migration: Add brief_overview to technical_scores if missing
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        columns = [c["name"] for c in inspector.get_columns("technical_scores")]
        if "brief_overview" not in columns:
            print("Adding column 'brief_overview' to table 'technical_scores'...")
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE technical_scores ADD COLUMN brief_overview TEXT"))
            print("Column 'brief_overview' added successfully.")
        else:
            print("Column 'brief_overview' already exists in table 'technical_scores'.")

        # Dynamic migration for welcome_email_sent on users table
        users_columns = [c["name"] for c in inspector.get_columns("users")]
        if "welcome_email_sent" not in users_columns:
            print("Adding column 'welcome_email_sent' to table 'users'...")
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN welcome_email_sent BOOLEAN DEFAULT FALSE"))
            print("Column 'welcome_email_sent' added successfully.")
        else:
            print("Column 'welcome_email_sent' already exists in table 'users'.")
    except Exception as e:
        print(f"[WARNING] Database column migration skipped or failed: {e}")
