from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db import get_db
from app.repositories.tasks import TaskRepository
from app.schemas import TaskRead
from app.services.llm import LLMService, get_llm_service
from sqlalchemy.orm import Session

router = APIRouter(prefix="/llm", tags=["llm"])


# --- Request / Response schemas ---

class CategorizeRequest(BaseModel):
    title: str
    description: str | None = None


class CategorizeResponse(BaseModel):
    category: str
    tags: list[str]
    confidence: float


class DecomposeRequest(BaseModel):
    title: str
    description: str | None = None


class SubtaskProposal(BaseModel):
    title: str
    description: str | None = None


class DecomposeResponse(BaseModel):
    subtasks: list[SubtaskProposal]


class SuggestPriorityRequest(BaseModel):
    title: str
    description: str | None = None
    due_date: date | None = None


class SuggestPriorityResponse(BaseModel):
    priority: str
    rationale: str


class WorkloadSummaryResponse(BaseModel):
    summary: str
    overdue_count: int
    upcoming_count: int


# --- Endpoints ---

@router.post("/categorize", response_model=CategorizeResponse)
def categorize(
    req: CategorizeRequest,
    service: LLMService = Depends(get_llm_service),
) -> CategorizeResponse:
    result = service.categorize(req.title, req.description)
    return CategorizeResponse(**result)


@router.post("/decompose", response_model=DecomposeResponse)
def decompose(
    req: DecomposeRequest,
    service: LLMService = Depends(get_llm_service),
) -> DecomposeResponse:
    result = service.decompose(req.title, req.description)
    subtasks = [SubtaskProposal(**s) for s in result.get("subtasks", [])]
    return DecomposeResponse(subtasks=subtasks)


@router.post("/suggest-priority", response_model=SuggestPriorityResponse)
def suggest_priority(
    req: SuggestPriorityRequest,
    service: LLMService = Depends(get_llm_service),
) -> SuggestPriorityResponse:
    due_str = req.due_date.isoformat() if req.due_date else None
    result = service.suggest_priority(req.title, req.description, due_str)
    return SuggestPriorityResponse(**result)


@router.post("/workload-summary", response_model=WorkloadSummaryResponse)
def workload_summary(
    db: Session = Depends(get_db),
    service: LLMService = Depends(get_llm_service),
) -> WorkloadSummaryResponse:
    repo = TaskRepository(db)
    tasks, _ = repo.list(statuses=["pending", "in_progress"], limit=200)
    task_dicts = [
        {
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
        }
        for t in tasks
    ]
    result = service.workload_summary(task_dicts)
    return WorkloadSummaryResponse(**result)
