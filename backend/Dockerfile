FROM python:3.12-slim

# curl is needed for the healthcheck in docker-compose
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir pipenv

COPY Pipfile Pipfile.lock* ./
# --system    → install into the system Python (no virtualenv inside the container)
# --deploy    → fail if Pipfile.lock is out of sync (active once Pipfile.lock is committed)
# If Pipfile.lock doesn't exist yet, fall back to plain install
RUN pipenv install --system || pipenv install --system --skip-lock

COPY . .

RUN mkdir -p uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
