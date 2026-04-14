# Implementation Plan — Task Manager LLM

**Design spec:** `docs/superpowers/specs/2026-04-14-task-manager-llm-design.md`
**Handoff note:** Every checkpoint ends with a commit. If this plan is picked up mid-way by another agent (e.g. Codex), check `git log` to find the last completed checkpoint, then resume at the next "in progress" step. Read the spec first.

---

## Conventions

- **Python:** 3.11+, black + ruff, type hints everywhere.
- **TypeScript:** strict mode, no `any`, functional React components only.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). One commit per logical step inside a checkpoint.
- **Branch:** `main` only (short-lived project, no PR flow).
- **Tests run before checkpoint commit:** backend `pytest -q`, frontend `tsc --noEmit` + `vite build`.

---

## Checkpoint 1 — Backend scaffold, data model, migrations

**Goal:** `uvicorn app.main:app` boots, `/api/tasks` returns `[]`, Alembic migration applied.

- [ ] 1.1 Create `backend/pyproject.toml` with deps: `fastapi`, `uvicorn[standard]`, `sqlalchemy>=2`, `alembic`, `pydantic-settings`, `anthropic`, `httpx`, `pytest`, `pytest-asyncio`, `ruff`, `black`.
- [ ] 1.2 `backend/.env.example` with `DATABASE_URL=sqlite:///./tasks.db`, `ANTHROPIC_API_KEY=`, `LLM_MODEL=claude-haiku-4-5-20251001`, `CORS_ORIGINS=http://localhost:5173`.
- [ ] 1.3 `app/config.py` — `Settings` via `pydantic-settings`, reads `.env`.
- [ ] 1.4 `app/db.py` — engine, `SessionLocal`, `Base`, `get_db` dependency.
- [ ] 1.5 `app/models.py` — `Task` model with all columns from spec §5 (including `parent_id` self-FK, `category`).
- [ ] 1.6 `alembic init alembic` in `backend/`, wire `env.py` to import `Base.metadata`, generate initial migration, apply.
- [ ] 1.7 `app/main.py` — FastAPI app, CORS middleware, health route `GET /api/health`, empty placeholder `/api/tasks` router that returns `[]`.
- [ ] 1.8 `pytest` smoke test: app starts, health returns 200.
- [ ] 1.9 Commit: `feat(backend): scaffold app with task model and alembic migration`.

**Done criteria:** `uvicorn app.main:app --reload` from `backend/` serves health + empty tasks list; `pytest` passes.

---

## Checkpoint 2 — CRUD + filter/search API

**Goal:** full `/api/tasks` CRUD with combinable filters, structured errors, tests green.

- [ ] 2.1 `app/schemas.py` — `TaskCreate`, `TaskUpdate` (all fields optional), `TaskRead`, `TaskList`. Enums for priority/status.
- [ ] 2.2 `app/repositories/tasks.py` — `TaskRepository` with `create`, `get`, `list(filters)`, `update`, `delete`. All SQL lives here.
- [ ] 2.3 `app/services/tasks.py` — thin pass-through now; will hold business rules later.
- [ ] 2.4 `app/errors.py` — `NotFoundError`, `ValidationError`, exception handlers mapping to `{"error": {...}}` envelope. Register in `main.py`.
- [ ] 2.5 `app/routers/tasks.py` — all 5 endpoints from spec §6, query parsing for filters (status/priority repeatable, due_before/after, q, parent_id, limit/offset).
- [ ] 2.6 Tests `tests/test_repositories.py` — CRUD + each filter in isolation + combined filter.
- [ ] 2.7 Tests `tests/test_api_tasks.py` — httpx TestClient: create/read/update/delete happy paths + 404 + 422.
- [ ] 2.8 Commit: `feat(backend): implement task CRUD with filters and search`.

**Done criteria:** all tests pass; manual `curl` of each endpoint works.

---

## Checkpoint 3 — LLM integration (US-3..US-6)

**Goal:** 4 LLM endpoints return structured JSON via Anthropic tool use, cached, tested with mocks.

- [ ] 3.1 `app/services/llm.py` — `LLMService` class, constructor takes `anthropic.Anthropic` client + settings. Internal `_call(feature, system, tool, user_content)` helper that handles tool-use extraction and errors.
- [ ] 3.2 In-memory cache: `dict[str, Any]` keyed by `sha256(feature + input_json)`, TTL 1h. Dedup via `asyncio.Lock` per key.
- [ ] 3.3 Four methods: `categorize`, `decompose`, `suggest_priority`, `workload_summary`. Each defines its system prompt + tool schema per spec §7.
- [ ] 3.4 `LLMUpstreamError` domain exception, handler returns 502.
- [ ] 3.5 `app/routers/llm.py` — 4 POST endpoints, Pydantic request/response schemas.
- [ ] 3.6 Wire router in `main.py`.
- [ ] 3.7 Tests `tests/test_llm_service.py` — inject fake Anthropic client returning canned `ToolUseBlock`, assert each method parses correctly and caches.
- [ ] 3.8 Tests `tests/test_api_llm.py` — TestClient calls each endpoint with mocked service.
- [ ] 3.9 Commit: `feat(backend): add LLM endpoints for categorize, decompose, priority, workload`.

**Done criteria:** all tests pass. With a real `ANTHROPIC_API_KEY` set, each endpoint responds correctly to a curl (manual smoke by user, not required to pass).

---

## Checkpoint 4 — Frontend scaffold + CRUD UI

**Goal:** `npm run dev` serves a working task list with create/edit/delete against the backend.

- [ ] 4.1 `npm create vite@latest frontend -- --template react-ts`; install `tailwindcss`, `@tanstack/react-query`, `react-hot-toast`, `clsx`, `date-fns`.
- [ ] 4.2 Configure Tailwind, base `index.css`, Vite proxy `/api → http://localhost:8000`.
- [ ] 4.3 `src/api/client.ts` — typed `fetch` wrapper, parses error envelope, throws `ApiError`.
- [ ] 4.4 `src/api/tasks.ts` — typed functions for each endpoint.
- [ ] 4.5 `src/main.tsx` — QueryClient provider, Toaster.
- [ ] 4.6 `src/components/ui/` — `Button`, `Input`, `Select`, `Dialog`, `Spinner` (minimal, Tailwind-only, no headless-ui to keep deps low).
- [ ] 4.7 `src/components/TaskList.tsx` + `TaskCard.tsx` — render list, loading skeleton, empty state.
- [ ] 4.8 `src/components/TaskForm.tsx` — create/edit, validation, maps 422 details to field errors.
- [ ] 4.9 `src/components/DeleteDialog.tsx` — confirmation.
- [ ] 4.10 `src/App.tsx` — wires it together, header, container layout.
- [ ] 4.11 `tsc --noEmit && vite build` both clean.
- [ ] 4.12 Commit: `feat(frontend): scaffold React app with task CRUD UI`.

**Done criteria:** manual test — create, edit, delete a task in browser; errors display as toasts.

---

## Checkpoint 5 — Filters/search UI + LLM triggers

**Goal:** filter bar works, LLM buttons produce proposals user can accept/modify/reject.

- [ ] 5.1 `src/components/FilterBar.tsx` — status & priority multi-select, due date range inputs, search box with 300ms debounce. Syncs to query state.
- [ ] 5.2 `src/hooks/useTasks.ts` — wraps TanStack Query, serializes filter state to API query params.
- [ ] 5.3 `src/api/llm.ts` — typed functions for 4 LLM endpoints.
- [ ] 5.4 `src/components/LLMActions.tsx` — 4 buttons on TaskCard / toolbar: Categorize, Decompose, Suggest Priority, Workload Summary (last one in header, not per-task).
- [ ] 5.5 Proposal dialogs:
  - Categorize → show suggested category+tags, [Apply] [Dismiss].
  - Decompose → show subtask list, user can edit titles, [Create All] [Cancel].
  - Priority → show suggested priority + rationale, [Apply] [Dismiss].
  - Workload → markdown-rendered summary in a modal, [Close].
- [ ] 5.6 Loading states: button spinner during LLM call; disable re-click.
- [ ] 5.7 Error handling: 502 → toast with retry button that re-fires the same call.
- [ ] 5.8 Commit: `feat(frontend): add filters, search, and LLM proposal flows`.

**Done criteria:** manual test — filter combinations narrow list; each LLM action produces a usable proposal and applies to DB.

---

## Checkpoint 6 — README, browser verification, polish

**Goal:** repo is submission-ready.

- [ ] 6.1 Write `README.md`: project description, feature list, stack, setup (backend + frontend separately), env vars, run commands, architecture decisions, known issues/compromises, wishlist (from spec §12).
- [ ] 6.2 Add `.gitignore` for both `backend/` (`__pycache__`, `.venv`, `*.db`, `.env`) and `frontend/` (`node_modules`, `dist`).
- [ ] 6.3 Manual browser sweep:
  - Happy path: create 5 tasks with varying priority/status/due dates.
  - Filters: exercise every combination.
  - Search: title match + description match + no-results state.
  - LLM: each of 4 features end-to-end with real API key.
  - Edge cases: empty list, very long title, past due date, deleting a parent with subtasks, network error simulation (devtools offline).
- [ ] 6.4 Fix any regressions found.
- [ ] 6.5 `pytest -q` final green.
- [ ] 6.6 Commit: `docs: add README and finalize submission`.
- [ ] 6.7 Hand repo URL creation to user (push to GitVerse).

**Done criteria:** README renders cleanly, all manual tests pass, tests green, user can `git remote add` and push.

---

## Handoff notes for Codex (if resumed)

- Read this plan top-to-bottom, then `docs/superpowers/specs/2026-04-14-task-manager-llm-design.md`.
- Check `git log --oneline` — the last commit tells you which checkpoint finished.
- Stick to the conventions section; don't rewrite code from prior checkpoints unless explicitly broken.
- All architectural decisions are in the spec. Don't re-litigate stack, layer boundaries, or API shapes without a reason.
- LLM prompts are authored once in checkpoint 3 — treat them as contracts; changes need regenerating test fixtures.
