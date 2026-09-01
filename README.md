# Freshify: Огляд проєкту

**Freshify** — це інноваційний мобільний застосунок для управління продуктами харчування, що використовує штучний інтелект (Google Gemini) для зменшення харчових відходів, планування покупок та генерації персоналізованих рецептів.

---

## 📷 Знімки екрану

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/c336901f-615e-4459-9bdf-af3d1402b57d" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/2a995500-3a2b-4e09-b6ec-f0648d78fe96" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/1585610b-2123-449e-adeb-d0933f8340cb" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/055df70d-9ec2-4930-87c9-ea99bd2baa74" width="200"></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/624edaed-1fa1-4ff1-9540-d377b6d49c53" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/c4b1db43-a326-4a2b-acd5-8d4e574b5636" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/b3051531-f14b-454c-9a2f-ca429670902b" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/5b76c5ac-b90a-4013-bb47-e1a4d131f395" width="200"></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/da02f85d-3290-4dfc-8366-585b491ba31f" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/4a6eaacf-1b75-4ce1-9530-e333772980ba" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/f7f6ddc9-a707-4743-bf85-27f6869451d3" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/e8960c06-2786-428b-a43a-6726931b7c23" width="200"></td>
  </tr>
</table>

---

## 🏛 Архітектура

*   **Бекенд:** FastAPI. Використовує SQLAlchemy для взаємодії з базою даних та Pydantic для валідації.
*   **База даних:** PostgreSQL.
*   **Мобільний клієнт:** React Native. Взаємодіє з API та зберігає токени доступу через Expo SecureStore.
*   **ШІ-інтеграція:** Google Gemini (`gemini-2.0-flash`) через офіційний Python SDK. Сервіс знаходиться у `gemini_service.py` і повертає типізований JSON або стрімінговий Markdown через WebSocket.
*   **Авторизація:** JWT-токени (Bearer). Хешування паролів через `bcrypt`.

---

## 🚀 1. Встановлення та розгортання

### 1.1. Системні вимоги
- **Сервер (Бекенд):** Docker & Docker Compose або Python 3.12+.
- **Мобільний клієнт:** Смартфон на базі Android або iOS (з встановленим застосунком Expo Go для розробки).
- **База даних:** PostgreSQL 15+.

### 1.2. Швидкий старт (Docker — рекомендовано)

Це найшвидший спосіб запустити сервер зі всіма залежностями.

1.  **Клонуйте репозиторій:**
    ```bash
    git clone https://github.com/energ0x/Freshify-app.git
    cd Freshify-app
    ```
2.  **Налаштуйте змінні середовища:**
    Скопіюйте `.env.example` у `.env`:
    ```bash
    cp .env.example .env
    ```
    Відредагуйте `.env` — мінімум `SECRET_KEY` і `GEMINI_API_KEY`:
    | Змінна | Опис |
    |--------|------|
    | `SECRET_KEY` | Мін. 32 символи. Генерація: `python -c "import secrets; print(secrets.token_hex(32))"` |
    | `GEMINI_API_KEY` | API-ключ від Google AI Studio |
    | `POSTGRES_USER/PASSWORD/DB` | Облікові дані для контейнера PostgreSQL |

3.  **Запустіть контейнери:**
    ```bash
    docker-compose up -d --build
    ```
    Перевірте статус:
    ```bash
    docker-compose ps
    curl http://localhost:8000/health   # → {"status": "ok"}
    ```

### 1.3. Локальна розробка бекенду (без Docker для коду)

```bash
# 1. Тільки база даних у Docker
docker-compose up -d db

# 2. Бекенд з hot-reload (потрібен Python 3.12+)
cd backend
pipenv install --dev
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 1.4. Встановлення мобільного застосунку

1.  **Перейдіть у папку клієнта:**
    ```bash
    cd mobile
    npm install
    ```
2.  **Налаштуйте підключення:**
    У файлі `.env` (в папці `mobile`) вкажіть LAN IP вашого сервера:
    ```env
    EXPO_PUBLIC_API_URL=http://<ВАШ_IP_АДРЕС>:8000
    ```
3.  **Запустіть застосунок:**
    ```bash
    npx expo start -c
    ```
    *Відскануйте QR-код через застосунок Expo Go на смартфоні.*

---

## 📱 2. Використання функцій застосунку

### 2.1. Авторизація та налаштування
- **Реєстрація:** Створіть обліковий запис, вказавши пошту та пароль.
- **Дієтичний профіль:** При першому вході вкажіть свої вподобання (веган, кето тощо) та алергії. ШІ враховуватиме це при генерації рецептів.

### 2.2. Управління продуктами
- **Додавання вручну:** Натисніть "+", введіть назву, категорію та термін придатності.
- **AI-сканування (Камера):** Сфотографуйте холодильник або чеки. ШІ автоматично розпізнає продукти.
- **Контроль свіжості:** Продукти, термін яких добігає кінця, підсвічуються червоним.

### 2.3. Генерація рецептів (AI)
ШІ аналізує ваш поточний набір продуктів і пропонує покрокову інструкцію приготування страви через WebSocket-стрімінг для миттєвого відображення.

### 2.4. Список покупок (Grocery List)
Список автоматично синхронізується з вашим інвентарем: куплені товари переносяться в основний список продуктів.

### 2.5. Аналітика та досягнення
Отримуйте віртуальні нагороди за відповідальне споживання та переглядайте статистику зменшення харчових відходів.

---

## 💎 3. Тарифи та обмеження (Freemium)

| Можливість | Ліміт | Вікно скидання |
|------------|-------|----------------|
| Аналіз фото (AI) | 3 запити | 24 год |
| Генерація рецептів | 3 генерації | 24 год |
| AI-рекомендації | 3 генерації | 24 год |

*Premium-користувачі мають необмежений доступ до всіх AI-функцій.*

---

## 🛠 4. Структура проєкту та розробка

*   `backend/app/api/routes/` — ендпоінти API.
*   `backend/app/services/` — бізнес-логіка та інтеграція з Gemini.
*   `backend/app/db/models.py` — моделі бази даних.
*   `mobile/src/store/` — управління станом (Zustand).

---

## 🛠 5. Усунення несправностей
1.  **Помилка підключення:** Перевірте, чи смартфон і сервер в одній мережі та чи вірний IP у `EXPO_PUBLIC_API_URL`.
2.  **Помилка ШІ:** Переконайтеся, що в `.env` додано валідний `GEMINI_API_KEY`.
3.  **База даних:** Використовуйте `docker-compose logs db` для діагностики проблем з PostgreSQL.

---
© 2026 Freshify Team. Всі права захищені.
