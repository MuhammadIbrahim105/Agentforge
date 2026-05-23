from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.agent_run import AgentRun, RunStatus
from app.schemas.agent import AgentRunRequest, AgentRunResponse
import uuid
from datetime import datetime

router = APIRouter()


@router.post("/run", response_model=AgentRunResponse, status_code=201)
def run_agent(payload: AgentRunRequest, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(
        Project.id == payload.project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    run = AgentRun(
        id=str(uuid.uuid4()),
        project_id=payload.project_id,
        user_id=current_user.id,
        task_input=payload.task,
        status=RunStatus.pending
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.get("/runs", response_model=List[AgentRunResponse])
def get_runs(db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    return db.query(AgentRun).filter(
        AgentRun.user_id == current_user.id
    ).order_by(AgentRun.created_at.desc()).all()


@router.get("/runs/{run_id}", response_model=AgentRunResponse)
def get_run(run_id: str, db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user)):
    run = db.query(AgentRun).filter(
        AgentRun.id == run_id,
        AgentRun.user_id == current_user.id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.delete("/runs/{run_id}", status_code=204)
def cancel_run(run_id: str, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    run = db.query(AgentRun).filter(
        AgentRun.id == run_id,
        AgentRun.user_id == current_user.id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    run.status = RunStatus.cancelled
    db.commit()
    return None