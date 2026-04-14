from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class NotFoundError(Exception):
    def __init__(self, resource: str, id: int) -> None:
        self.resource = resource
        self.id = id
        super().__init__(f"{resource} {id} not found")


class DomainValidationError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)


class LLMUpstreamError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)


def _error(code: str, message: str, details: dict | None = None) -> dict:
    body: dict = {"error": {"code": code, "message": message}}
    if details:
        body["error"]["details"] = details
    return body


async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content=_error("not_found", str(exc)),
    )


async def domain_validation_handler(
    request: Request, exc: DomainValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content=_error("validation_error", str(exc)),
    )


async def llm_upstream_handler(request: Request, exc: LLMUpstreamError) -> JSONResponse:
    return JSONResponse(
        status_code=502,
        content=_error("llm_upstream", str(exc)),
    )


async def request_validation_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = {".".join(str(l) for l in e["loc"]): e["msg"] for e in exc.errors()}
    return JSONResponse(
        status_code=422,
        content=_error("request_validation", "Invalid request data", details),
    )
