import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, URL
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# 1. Read the settings from your .env file
load_dotenv()

# 2. Build the connection address from those settings
DATABASE_URL = URL.create(
    "mssql+pyodbc",
    username=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_SERVER"),
    port=int(os.getenv("DB_PORT", "1433")),
    database=os.getenv("DB_NAME"),
    query={
        "driver": os.getenv("DB_DRIVER"),
        "Encrypt": "yes",
        "TrustServerCertificate": "no",
    },
)

# 3. The engine (the connection itself) and a session factory
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"timeout": 60})
SessionLocal = sessionmaker(bind=engine, autoflush=False)

# 4. Base class that models.py will use for the tables
class Base(DeclarativeBase):
    pass


# Gives each API request its own database session and closes it afterwards
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()