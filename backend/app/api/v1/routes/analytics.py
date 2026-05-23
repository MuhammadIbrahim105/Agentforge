from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.agent_run import AgentRun, RunStatus
from app.models.document import Document

router = APIRouter()


@router.get("/usage")
def get_usage(db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    total_runs = db.query(AgentRun).filter(AgentRun.user_id == current_user.id).count()
    completed_runs = db.query(AgentRun).filter(
        AgentRun.user_id == current_user.id,
        AgentRun.status == RunStatus.completed
    ).count()
    total_tokens = db.query(AgentRun).filter(
        AgentRun.user_id == current_user.id
    ).with_entities(AgentRun.tokens_used).all()
    tokens_sum = sum([t[0] or 0 for t in total_tokens])

    return {
        "total_runs": total_runs,
        "completed_runs": completed_runs,
        "failed_runs": total_runs - completed_runs,
        "total_tokens_used": tokens_sum,
        "token_budget": current_user.token_budget,
        "tokens_remaining": current_user.token_budget - tokens_sum
    }


@router.get("/performance")
def get_performance(db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    runs = db.query(AgentRun).filter(AgentRun.user_id == current_user.id).all()
    total = len(runs)
    if total == 0:
        return {"message": "No runs yet"}

    completed = [r for r in runs if r.status == RunStatus.completed]
    durations = [r.duration_ms for r in completed if r.duration_ms]

    return {
        "total_runs": total,
        "success_rate": round(len(completed) / total * 100, 2),
        "avg_duration_ms": round(sum(durations) / len(durations)) if durations else 0,
        "total_cost_usd": round(sum([r.cost_usd or 0 for r in runs]), 6)
    }