from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class DocumentResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    file_type: str
    file_size: Optional[int]
    status: str
    chunk_count: int
    embedding_count: int
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SearchRequest(BaseModel):
    query: str
    n_results: int = 5
    use_hybrid: bool = True


class SearchResult(BaseModel):
    content: str
    source: str
    score: float
    metadata: Optional[Dict[str, Any]] = None