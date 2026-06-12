# Freshify: Огляд проєкту

Короткий технічний посібник для команди щодо архітектури, розгортання та структури проєкту.

## Архітектура

*   **Бекенд:** FastAPI. Використовує SQLAlchemy для взаємодії з базою даних та Pydantic для валідації.
*   **База даних:** PostgreSQL.
*   **Мобільний клієнт:** React Native. Взаємодіє з API та зберігає токени доступу через Expo SecureStore.
*   **ШІ-інтеграція:** Google Gemini (`gemini-2.0-flash`) через офіційний Python SDK. Сервіс знаходиться у `gemini_service.py` і повертає типізований JSON або стрімінговий Markdown через WebSocket.
*   **Авторизація:** JWT-токени (Bearer). Хешування паролів через `bcrypt`.

---

## Швидкий старт

### 0. Змінні середовища

```bash
cp .env.example .env
# Відредагуйте .env — мінімум SECRET_KEY і GEMINI_API_KEY
```

| Змінна | Опис |
|--------|------|
| `SECRET_KEY` | Мін. 32 символи. Генерація: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GEMINI_API_KEY` | API-ключ від Google AI Studio |
| `POSTGRES_USER/PASSWORD/DB` | Облікові дані для контейнера PostgreSQL |
| `DATABASE_URL` | Для локальної розробки — `localhost:5435`; docker-compose підставляє `db:5432` автоматично |
| `EXPO_PUBLIC_API_URL` | LAN IP вашої машини, щоб Expo міг достукатись до бекенду |

---

### Варіант A — Повний Docker-стек (рекомендовано)

Запускає базу даних **та** бекенд у контейнерах.

```bash
docker-compose up -d --build
```

Перевірте, що все підняте:

```bash
docker-compose ps
curl http://localhost:8000/health   # → {"status": "ok"}
```

> **pgAdmin** (опціонально): скопіюйте `docker-compose.override.yml` з прикладу нижче або просто
> підніміть стек — якщо файл присутній, pgAdmin стартує автоматично на `http://localhost:5050`.

---

### Варіант Б — Локальна розробка (гарячий перезапуск)

```bash
# 1. Тільки база даних у Docker
docker-compose up -d db

# 2. Бекенд з hot-reload (потрібен Python 3.12+)
cd backend
pipenv install --dev
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

### Мобільний клієнт

```bash
cd mobile
npm install
npx expo start -c
```

Вкажіть ваш LAN IP у `EXPO_PUBLIC_API_URL` у `.env` — Expo автоматично підхопить його.

---

## Структура проєкту (Бекенд)

Логіка розділена на шари, щоб уникнути "товстих" контролерів:

*   `backend/main.py` — точка входу. Тут підключаються роутери; міграції/ініціалізація виконуються у `lifespan` хендлері.
*   `app/api/routes/` — ендпоінти (`auth.py`, `products.py`, `ai_vision.py`). Лише приймають запити та викликають сервіси.
*   `app/services/` — уся бізнес-логіка (`auth_service.py`, `gemini_service.py`, `product_service.py`).
*   `app/db/models.py` — декларативні моделі SQLAlchemy.
*   `app/schemas/` — Pydantic-моделі для валідації вхідних/вихідних даних API.
*   `app/core/config.py` — налаштування (читаються з `.env`). Для доступу в коді завжди використовуйте кешовану функцію `get_settings()`.

---

## Важливі нюанси розробки

*   **Робота з БД:** В ендпоінтах використовуйте залежність `get_db()`. Вона автоматично видає сесію SQLAlchemy та коректно її закриває.
*   **Міграції:** Alembic підключено (`backend/alembic/`). При першому запуску таблиці створюються автоматично через `create_all`. Після зміни схеми генеруйте міграцію: `alembic revision --autogenerate -m "опис"` та `alembic upgrade head`.
*   **ШІ та зображення:** Клієнт надсилає фото на `POST /ai/analyze-image`. Бекенд валідує тип, стискає зображення та передає його у `gemini_service.py`. Відповідь завжди має відповідати Pydantic-схемі `AIProductListResponse`.
*   **Рецепти та аналітика:** Генерація йде через WebSocket (`/recipes/ws/generate`, `/analytics/ws/ai-recommendations`), а не REST.
*   **Токени:** У полі `sub` JWT-токена зашито `id` користувача (UUID). Не змінюйте це поле, оскільки на нього зав'язана логіка отримання поточного юзера (`get_current_user`).

---

## Freemium-ліміти (безкоштовний рівень)

| Можливість | Ліміт | Вікно скидання |
|------------|-------|----------------|
| Аналіз фото (AI) | 3 запити | 24 год |
| Генерація рецептів | 3 генерації | 24 год |
| AI-рекомендації | 3 генерації | 24 год |

Значення задані у `backend/app/core/limiter_config.py`.
