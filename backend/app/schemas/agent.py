from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class AgentRunRequest(BaseModel):
    task: str
    project_id: str
    stream: bool = True


class AgentStep(BaseModel):
    agent: str
    action: str
    output: Optional[str] = None
    timestamp: Optional[str] = None


class AgentRunResponse(BaseModel):
    id: str
    project_id: str
    task_input: str
    final_output: Optional[str]
    status: str
    agents_used: Optional[List[str]]
    tokens_used: int
    cost_usd: float
    duration_ms: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class AgentRunList(BaseModel):
    runs: List[AgentRunResponse]
    total: int