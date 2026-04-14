# Интеллектуальный менеджер задач

Веб-приложение для управления задачами с LLM-ассистентом на базе Claude.

## Возможности

**Обязательные:**
- Создание, просмотр, редактирование, удаление задач (CRUD)
- Атрибуты задачи: название, описание, приоритет (низкий/средний/высокий), статус (ожидает/в работе/готово), срок выполнения, время создания
- Комбинируемые фильтры на стороне сервера: статус, приоритет, диапазон дат
- Полнотекстовый поиск по названию и описанию

**LLM-функции (US-3..US-6):**
- **Умная категоризация** — LLM предлагает категорию и теги на основе названия/описания
- **Декомпозиция** — LLM разбивает задачу на подзадачи; пользователь редактирует и создаёт их одним кликом
- **Предложение приоритета** — LLM рекомендует приоритет с обоснованием
- **Сводка нагрузки** — естественно-языковая сводка по всем активным задачам с подсчётом просроченных

## Стек

| Слой | Технология |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, SQLite |
| LLM | Anthropic Python SDK (`claude-haiku-4-5-20251001`), tool use для JSON |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query v5 |
| Тесты | pytest, httpx TestClient |

## Структура проекта

```
task-manager-llm/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app factory
│   │   ├── config.py        # pydantic-settings
│   │   ├── db.py            # SQLAlchemy engine + session
│   │   ├── models.py        # Task ORM model
│   │   ├── schemas.py       # Pydantic DTOs
│   │   ├── errors.py        # Domain exceptions + handlers
│   │   ├── repositories/    # Весь SQL (TaskRepository)
│   │   ├── services/        # Бизнес-логика (TaskService, LLMService)
│   │   └── routers/         # HTTP-слой (tasks, llm)
│   ├── alembic/             # Миграции
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/             # fetch-обёртки (client, tasks, llm)
│       ├── components/      # UI-компоненты
│       ├── hooks/           # useTasks
│       └── lib/             # Константы (метки, цвета)
└── docs/superpowers/specs/  # Design spec
```

## Требования

- Python 3.11+
- Node.js 20+
- Anthropic API Key (для LLM-функций)

## Настройка и запуск

### Backend

```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -e ".[dev]"

# Настройте .env:
cp .env.example .env
# Откройте .env и вставьте ANTHROPIC_API_KEY

# Применить миграции:
alembic upgrade head

# Запустить:
uvicorn app.main:app --reload
# API доступен на http://localhost:8000
# Документация: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Приложение на http://localhost:5173
```

### Переменные окружения (backend/.env)

| Переменная | Обязательна | Описание |
|---|---|---|
| `DATABASE_URL` | Нет | SQLite путь (default: `sqlite:///./tasks.db`) |
| `ANTHROPIC_API_KEY` | Для LLM | Ключ API Anthropic |
| `LLM_MODEL` | Нет | Модель Claude (default: `claude-haiku-4-5-20251001`) |
| `CORS_ORIGINS` | Нет | Разрешённые origins (default: `http://localhost:5173`) |

## Запуск тестов (backend)

```bash
cd backend
pytest -v
```

27 тестов: CRUD, фильтры, текстовый поиск, LLM-сервис (с мок-клиентом), API-эндпоинты.

## Архитектурные решения

**Разделение слоёв на бэке:** `routers` → только HTTP; `services` → бизнес-логика; `repositories` → весь SQL. Ничто, кроме репозитория, не обращается к сессии напрямую.

**LLM через tool use:** каждая функция задаёт tool-схему с JSON Schema — LLM обязан вернуть ответ в заданном формате. Это надёжнее, чем парсить свободный текст.

**Кэш LLM-запросов:** in-memory dict с SHA-256 ключом по входным данным, TTL 1 час. Одинаковые запросы не уходят в API повторно.

**Подзадачи как отдельные Task:** декомпозиция создаёт полноценные дочерние задачи с `parent_id`, а не текст в описании. Это позволяет управлять ими отдельно.

**SQLite + Alembic:** нулевая конфигурация для демо, при этом полноценные миграции — легко мигрировать на PostgreSQL, поменяв только `DATABASE_URL`.

**Структурированные ошибки:** все ошибки API → `{"error": {"code": "...", "message": "..."}}`. На фронте: toast для общих ошибок, inline-поля для 422-ошибок формы.

## Известные ограничения

- SQLite: один writer, не подходит для нагруженного production
- LLM-кэш теряется при перезапуске сервера
- Нет авторизации — все задачи глобальные
- Поиск через `LIKE`, не FTS5 (достаточно для демо-датасета)
- Нет тестов фронтенда

## Wishlist

- [ ] Авторизация (JWT / сессии)
- [ ] PostgreSQL + pgvector для семантического поиска
- [ ] FTS5 для SQLite
- [ ] Redis-кэш для LLM-ответов
- [ ] Стриминг LLM-ответов (streaming API)
- [ ] Kanban-доска с drag-and-drop
- [ ] Docker Compose для одной команды запуска
- [ ] CI/CD (GitVerse CI / GitHub Actions)
- [ ] Версионирование API (`/api/v1/`)
- [ ] Frontend-тесты (Vitest + Testing Library)
