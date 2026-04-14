# Intellectual Task Manager — Design Spec

**Date:** 2026-04-14
**Source:** `Testovoe_Zadanie_Razrabotchik (1).md.txt`

## 1. Goal

Full-stack To-Do application with LLM assistant. Users manage tasks (CRUD, filter, search) and can invoke LLM to categorize, decompose, suggest priority, or summarize workload.

## 2. Scope

**Mandatory (US-1, US-2):**
- CRUD tasks with attributes: `id`, `title`, `description`, `priority`, `status`, `due_date`, `created_at`.
- Server-side combinable filters (status, priority, due_date range) and full-text search on title/description.

**LLM (US-3..US-6) — optional per spec, but delivered as core value:**
- US-3 Smart categorization (title+description → category/tag suggestion).
- US-4 Task decomposition (task → subtasks list).
- US-5 Priority suggestion (description+due_date → priority level).
- US-6 Workload summary (all active tasks → natural-language summary).

Each LLM feature: explicit trigger (button), result shown as proposal, user accepts/modifies/rejects.

**Out of scope:** auth, multi-user, real-time sync, mobile, offline, drag-and-drop boards, file attachments, notifications.

## 3. Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend | Python 3.11+, FastAPI | Fast to scaffold, native OpenAPI, async |
| ORM/Migrations | SQLAlchemy 2.0 + Alembic | Repository abstraction, migrations requirement |
| DB | SQLite | Zero-config, sufficient for demo, FTS5 for search |
| Config | pydantic-settings | Env-based configuration |
| LLM | `anthropic` Python SDK | User preference, prompt caching, tool-use for JSON |
| Frontend | React 18 + Vite + TypeScript | Standard, fast HMR |
| UI | Tailwind CSS | Rapid styling, no design-system overhead |
| Data fetching | TanStack Query v5 | Cache, dedupe, loading/error states |
| HTTP client | native `fetch` wrapped | No axios dependency |
| Tests (backend) | pytest + httpx TestClient | Critical paths |

## 4. Architecture

Monorepo layout:

```
task-manager-llm/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory, CORS, exception handlers
│   │   ├── config.py            # Settings
│   │   ├── db.py                # Engine, session factory
│   │   ├── models.py            # SQLAlchemy Task model
│   │   ├── schemas.py           # Pydantic DTOs
│   │   ├── repositories/
│   │   │   └── tasks.py         # TaskRepository (all DB access)
│   │   ├── services/
│   │   │   ├── tasks.py         # Business logic for tasks
│   │   │   └── llm.py           # LLM client wrapper + 4 features
│   │   ├── routers/
│   │   │   ├── tasks.py         # /api/tasks CRUD + filters
│   │   │   └── llm.py           # /api/llm/* endpoints
│   │   └── errors.py            # Domain exceptions + handlers
│   ├── alembic/
│   ├── tests/
│   ├── pyproject.toml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/                 # fetch wrappers, types
│   │   ├── components/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── LLMActions.tsx
│   │   │   └── ui/              # primitives (Button, Dialog, etc.)
│   │   ├── hooks/               # useTasks, useLLM
│   │   └── lib/                 # utils, constants
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docs/
├── README.md
└── plan.md
```

**Layer discipline (backend):**
- `routers/` → HTTP only (parse, validate, delegate, serialize).
- `services/` → business logic, orchestration, LLM calls.
- `repositories/` → all SQL. Nothing else touches the session for writes.
- `models.py` → persistence shape only, no behavior.
- `schemas.py` → wire format, not persistence.

## 5. Data model

Single table `tasks`:

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, autoincrement |
| title | TEXT | NOT NULL, CHECK length > 0 |
| description | TEXT | NULL |
| priority | TEXT | NOT NULL, CHECK IN ('low','medium','high') |
| status | TEXT | NOT NULL, CHECK IN ('pending','in_progress','done'), default 'pending' |
| due_date | DATE | NULL |
| created_at | DATETIME | NOT NULL, default CURRENT_TIMESTAMP |
| category | TEXT | NULL (set by US-3 accept) |

Indexes: `(status)`, `(priority)`, `(due_date)`. Search uses `LIKE` against `title`+`description` (sufficient for demo; FTS5 optional upgrade documented in README wishlist).

**Subtasks (US-4):** LLM-generated subtasks are **returned as suggestions**, not persisted as separate rows. On accept, they are written to the parent task's `description` (appended as a checklist) OR persisted as separate tasks with a link back — **decision: persist as separate tasks**, each carrying `parent_id` (nullable FK to `tasks.id`). This adds one column and one index `(parent_id)`.

Revised columns: add `parent_id INTEGER NULL REFERENCES tasks(id) ON DELETE CASCADE`.

## 6. REST API

Base: `/api`. All responses JSON. Errors: `{"error": {"code": "...", "message": "...", "details": {...}}}`.

### Tasks

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tasks` | List with filters (see query params) |
| POST | `/api/tasks` | Create |
| GET | `/api/tasks/{id}` | Read single |
| PATCH | `/api/tasks/{id}` | Partial update |
| DELETE | `/api/tasks/{id}` | Delete (cascades to subtasks) |

**GET query params (all optional, combinable):**
- `status` — one of allowed values, repeatable (`?status=pending&status=in_progress`)
- `priority` — repeatable
- `due_before`, `due_after` — ISO date
- `q` — text query (matches title OR description, case-insensitive)
- `parent_id` — filter subtasks of a parent; `null` for top-level only
- `limit`, `offset` — pagination (default limit=100, max 500)

**Status codes:** 200 list/read, 201 create, 204 delete, 400 validation, 404 not found, 422 Pydantic, 500 unexpected, 502 LLM upstream error.

### LLM

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/llm/categorize` | `{title, description?}` | `{category, tags: string[], confidence}` |
| POST | `/api/llm/decompose` | `{task_id}` or `{title, description?}` | `{subtasks: [{title, description?}]}` |
| POST | `/api/llm/suggest-priority` | `{title, description?, due_date?}` | `{priority, rationale}` |
| POST | `/api/llm/workload-summary` | `{}` (reads current active tasks) | `{summary: string, overdue_count, upcoming_count}` |

LLM endpoints return 502 with structured error if Anthropic API fails; frontend shows retry.

**API versioning:** all routes under `/api/v1/` — reserved for future, but MVP uses `/api/` directly and documents versioning as wishlist (to avoid churn).

## 7. LLM integration

**Client:** `anthropic` SDK, model `claude-haiku-4-5-20251001`.

**Prompt strategy:**
- System prompt per feature (role + constraints + output format).
- Structured output via **tool use** (forces JSON schema compliance) — each feature defines one tool, LLM is instructed to always call it.
- Few-shot examples inline in system prompt where useful (categorize, suggest-priority).
- Prompt caching on the static system+tools prefix.

**Example — categorize tool schema:**
```json
{
  "name": "propose_category",
  "input_schema": {
    "type": "object",
    "properties": {
      "category": {"type": "string"},
      "tags": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
      "confidence": {"type": "number", "minimum": 0, "maximum": 1}
    },
    "required": ["category", "tags", "confidence"]
  }
}
```

**Caching:** in-memory `dict` keyed by `sha256(feature + input_json)`, TTL 1 hour. Simple, resets on restart, sufficient for demo. Documented as wishlist: replace with Redis for prod.

**Deduplication:** in-flight requests tracked; duplicate call returns the pending future.

**Error handling:** catch `anthropic.APIError` → raise `LLMUpstreamError` → exception handler returns 502 with `{code: "llm_upstream", message: "..."}`. Timeouts: 30s.

**No streaming in MVP** — responses are short JSON, spinner is enough. Streaming listed in wishlist.

## 8. Error handling

**Backend:**
- Domain exceptions: `NotFoundError`, `ValidationError`, `LLMUpstreamError`.
- Global handlers register in `main.py` and map to the structured error envelope above.
- Pydantic `RequestValidationError` → 422 with field-level `details`.

**Frontend:**
- TanStack Query `onError` → toast notification (react-hot-toast).
- Form-level field errors parsed from 422 `details` and shown inline.
- LLM failures → dialog with retry button, task state unchanged.
- Never display stack traces or raw backend messages.

## 9. Testing

**Backend (pytest):**
- Repository: CRUD happy paths + not-found.
- Filters: each filter in isolation + combined.
- Search: case-insensitive, matches title and description.
- LLM service: mocked `anthropic` client, asserts prompt structure and parses tool-use response.
- API: httpx TestClient covering each endpoint's happy path + one error path.

**Frontend:** none (scope). Manual browser verification before completion.

## 10. Deliverables

- Public git repo on GitVerse (URL added in README after user pushes).
- README covers: description, setup, env vars, run instructions, architecture decisions, known issues, wishlist.
- `plan.md` (implementation checklist) — primary handoff document for Codex if needed.

## 11. Known compromises

- SQLite: single-writer, fine for demo, not prod.
- LLM cache is in-memory (lost on restart).
- No auth — all tasks are "global."
- Search is LIKE-based, not FTS5 (simpler, adequate for demo dataset).
- No frontend tests.
- No CI pipeline (would add GitHub Actions / GitVerse CI in wishlist).

## 12. Wishlist (documented in README)

- Auth (JWT or session)
- FTS5 for search
- Redis-backed LLM cache
- Streaming LLM responses
- Drag-and-drop Kanban board
- GitVerse CI pipeline
- API versioning under `/api/v1/`
- Frontend component tests (Vitest + Testing Library)
- Docker Compose for one-command run
