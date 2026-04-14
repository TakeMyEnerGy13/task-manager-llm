from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.errors import (
    DomainValidationError,
    LLMUpstreamError,
    NotFoundError,
    domain_validation_handler,
    llm_upstream_handler,
    not_found_handler,
    request_validation_handler,
)

app = FastAPI(title="Task Manager LLM", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(NotFoundError, not_found_handler)  # type: ignore[arg-type]
app.add_exception_handler(DomainValidationError, domain_validation_handler)  # type: ignore[arg-type]
app.add_exception_handler(LLMUpstreamError, llm_upstream_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, request_validation_handler)  # type: ignore[arg-type]


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


# Routers registered after checkpoint 2+
from app.routers import tasks as tasks_router  # noqa: E402
from app.routers import llm as llm_router  # noqa: E402

app.include_router(tasks_router.router, prefix="/api")
app.include_router(llm_router.router, prefix="/api")
