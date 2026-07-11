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
import time

router = APIRouter()


@router.post("/run", response_model=AgentRunResponse, status_code=201)
def run_agent(
    payload: AgentRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.agents.research_agent import run_research_agent

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
        status=RunStatus.running
    )
    db.add(run)
    db.commit()

    try:
        start_time = time.time()

        result = run_research_agent(
            task=payload.task,
            collection_name=project.chroma_collection,
            llm_model=project.llm_model
        )

        duration_ms = int((time.time() - start_time) * 1000)

        run.status = RunStatus.completed
        run.final_output = result["answer"]
        run.agents_used = result["agents_used"]
        run.steps = result["steps"]
        run.tokens_used = result["tokens_used"]
        run.cost_usd = result["tokens_used"] * 0.0000003
        run.duration_ms = duration_ms
        db.commit()
        db.refresh(run)
        return run

    except Exception as e:
        run.status = RunStatus.failed
        run.error_message = str(e)
        db.commit()
        db.refresh(run)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runs", response_model=List[AgentRunResponse])
def get_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(AgentRun).filter(
        AgentRun.user_id == current_user.id
    ).order_by(AgentRun.created_at.desc()).all()


@router.get("/runs/{run_id}", response_model=AgentRunResponse)
def get_run(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    run = db.query(AgentRun).filter(
        AgentRun.id == run_id,
        AgentRun.user_id == current_user.id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.delete("/runs/{run_id}", status_code=204)
def cancel_run(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    run = db.query(AgentRun).filter(
        AgentRun.id == run_id,
        AgentRun.user_id == current_user.id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    run.status = RunStatus.cancelled
    db.commit()
    return None