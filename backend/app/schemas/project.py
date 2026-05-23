from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    llm_model: Optional[str] = "llama-3.3-70b-versatile"
    embedding_model: Optional[str] = "sentence-transformers"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    llm_model: Optional[str] = None
    agent_config: Optional[Dict[str, Any]] = None


class ProjectResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    description: Optional[str]
    embedding_model: str
    llm_model: str
    chroma_collection: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True