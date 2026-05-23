import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    engineer = "engineer"
    viewer = "viewer"


class UserPlan(str, enum.Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.engineer, nullable=False)
    plan = Column(Enum(UserPlan), default=UserPlan.free, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    token_budget = Column(Integer, default=100000)
    tokens_used = Column(Integer, default=0)
    stripe_customer_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)