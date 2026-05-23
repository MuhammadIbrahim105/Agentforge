import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Enum, JSON, Boolean
from app.core.database import Base
import enum


class DocumentStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class DocumentType(str, enum.Enum):
    pdf = "pdf"
    docx = "docx"
    txt = "txt"
    csv = "csv"
    html = "html"


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    file_type = Column(Enum(DocumentType), nullable=False)
    file_size = Column(Integer, nullable=True)
    s3_key = Column(String, nullable=True)
    local_path = Column(String, nullable=True)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.pending)
    chunk_count = Column(Integer, default=0)
    embedding_count = Column(Integer, default=0)
    doc_metadata = Column(JSON, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)