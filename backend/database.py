from sqlalchemy import create_engine, Column, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database configuration
DB_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DB_DIR, exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'omninotes.db')}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    filenames = Column(JSON)
    paths = Column(JSON)
    extracted_text = Column(Text, default="")
    formatted_text = Column(Text, default="")
    summary = Column(Text, default="")
    key_points = Column(JSON, default=list)
    flashcards = Column(JSON, default=list)
    quiz_questions = Column(JSON, default=list)
    status = Column(String, default="uploaded")  # uploaded, processing, processed, error
    error_message = Column(Text, default="")
    pdf_path = Column(String, default="")
    md_path = Column(String, default="")
    style = Column(String, default="structured")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
