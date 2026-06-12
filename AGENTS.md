# AGENTS.md — Agent guide for Freshify

Purpose: give an AI coding agent the minimal, high-value orientation needed to be productive in this repo.

- Quick architecture
  - Backend: FastAPI app at `backend/main.py` (package `app/`). Routers live in `backend/app/api/routes/` (e.g. `auth.py`, `products.py`, `ai_vision.py`) and are mounted in `main.py`.
  - Persistence: SQLAlchemy declarative models in `backend/app/db/models.py`, engine/session in `backend/app/db/database.py`. `Base.metadata.create_all(...)` is called in `backend/main.py` (note the explicit import of `app.db.models` before create_all).
  - Config: pydantic-settings `Settings` in `backend/app/core/config.py`. Environment file is `.env` (see `Settings.Config.env_file`). Use `get_settings()` (cached) to read config within code.
  - Services: business logic is in `backend/app/services/` (e.g. `auth_service.py`, `gemini_service.py`, `product_service.py`). Routes call service functions (thin controllers).
  - Utils & dependencies: shared helpers in `backend/app/utils/` — `dependencies.py` (auth dependency), `image_utils.py` (image validation/compression). Auth uses HTTP Bearer tokens validated by `jose.jwt` using `settings.secret_key`.
  - Mobile client: React Native app under `mobile/`. It talks to backend using `mobile/src/services/api.js` and expects an `API_URL` in `mobile/src/utils/constants.js` (default is a local IP). Mobile stores token with Expo SecureStore under key `auth_token`.
  - AI integration: `backend/app/services/gemini_service.py` uses `google.genai` Client for both vision (`gemini-3.1-flash-lite-preview`) and text (`gemma-4-31b-it`). Requires `gemini_api_key` in `.env`.

- How to run (developer shortcuts)
  - Start local Postgres (docker-compose):
    - `docker-compose up -d db pgadmin` (run from repo root). Note: `docker-compose.yml` maps Postgres to host port `5435:5432`.
  - Backend venv & install (uses Pipfile):
    - From `backend/`: `pipenv install --dev` or use `pip install -r <your-requirements>` if you prefer venv/pip.
  - Run backend dev server (from `backend/` dir):
    - `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
    - Or `python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`
  - Important env/DB note: default `backend/app/core/config.py` database URL points to `localhost:5432`. If you use the included docker-compose, either update `.env` / `DATABASE_URL` to use port `5435` or change the compose port mapping.

- Developer patterns an agent should follow (concrete, codebase-specific)
  - Use `get_db()` (generator) as the DB dependency in routes; it yields a SQLAlchemy session and closes it after use (see `backend/app/db/database.py`).
  - Do not instantiate `Settings()` directly across the code. Call `get_settings()` which wraps `Settings` with `lru_cache()` so config is singletons-safe (see `backend/app/core/config.py`).
  - Authentication flow:
    - `auth` endpoints create JWTs with `create_access_token` in `backend/app/services/auth_service.py`. Tokens have `sub` equal to the user `id` (UUID). `backend/app/utils/dependencies.py` expects `sub` to fetch user and return `User` ORM object.
    - Passwords are hashed with `bcrypt` and stored as decoded utf-8 strings (see `hash_password` / `verify_password`). When modifying auth logic, keep byte/str conversions consistent with existing helpers.
  - Image AI flow:
    - Client sends multipart to `/ai/analyze-image` (`backend/app/api/routes/ai_vision.py`). The route validates content-type, compresses using `validate_and_compress_image` (`backend/app/utils/image_utils.py`), and passes bytes to `analyze_product_image` in `gemini_service.py`.
    - `gemini_service.analyze_product_image` returns parsed JSON (or `{"error": ...}`) — routes and mobile expect the `AIProductResponse` schema (`backend/app/schemas/product.py`). Keep that shape when modifying prompts or the model call.
  - Response model usage: routes often declare Pydantic response models (e.g. `response_model=AIProductResponse`). Some routes convert ORM -> Pydantic using `.model_validate(...)` (e.g. in `auth.register` returning `UserResponse.model_validate(user)`). When returning ORM objects directly, many schemas set `Config.from_attributes = True`.

- Conventions and gotchas
  - DB schema is created with `Base.metadata.create_all(...)` at startup. There is `alembic` in `backend/Pipfile` but there are no migration scripts present — if you need migrations, add an Alembic setup.
  - Model imports order matters: `backend/main.py` includes `import app.db.models` before `create_all` — do the same if you add scripts that call `create_all`.
  - Tokens: code expects `sub` claim to be a string UUID. Changing token claims will require updating `get_current_user` logic.
  - Mobile dev convenience: `mobile/src/utils/constants.js` uses a hard-coded `API_URL` local IP. When running backend on a dev machine or emulator, update this constant or use environment configurations for the mobile app.
  - AI runtime: The project uses the Google GenAI SDK. If replacing the model backend, keep the `gemini_service` function signatures (e.g., bytes + mime_type for vision) to minimize changes.

- Useful entry points / files to open first
  - `backend/main.py` — server entry, routers, CORS.
  - `backend/app/api/routes/` — all public endpoints; follow these to find feature logic.
  - `backend/app/services/` — where higher-level logic and external integrations live (auth, gemini/AI, product business rules).
  - `backend/app/db/models.py` and `backend/app/schemas/` — canonical data shapes.
  - `mobile/src/services/api.js` and `mobile/src/utils/constants.js` — how the mobile client calls the backend and which endpoints to expect.

- Example quick tasks for an AI agent
  - Add a new field to `Product` and expose it to API:
    1. Add Column to `backend/app/db/models.py` and corresponding field to `backend/app/schemas/product.py`.
    2. Update create/update endpoints in `backend/app/api/routes/products.py` and `backend/app/services/product_service.py` (if present).
    3. Run the server and verify with the mobile client or curl.
  - Replace Gemini call with another LLM: edit `backend/app/services/gemini_service.py`, keep function names and returned JSON shape.

Keep changes small and local: modify schema -> model -> service -> route in that order. Always run the server and test the route you changed.

---

If you want, I can now:
- Add an explicit `.env.example` describing keys used by `Settings` (DB URL, gemini/ollama keys, secret_key)
- Run quick smoke checks (start docker db and run backend) and report connectivity issues I discover


