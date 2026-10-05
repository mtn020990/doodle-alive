# Doodle Alive backend (also serves the frontend). Build from the repo root:
#   docker build -t doodle-alive-api .
# scripts/deploy-azure.ps1 builds it in Azure with `az acr build`, so no local Docker is needed.
FROM python:3.12-slim

# /data is a persistent Azure Files share in Azure: uploads, outputs, and the
# Hugging Face model cache (models download there on first use, then are reused).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATA_DIR=/data \
    HF_HOME=/data/hf-cache

WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY frontend /app/frontend

EXPOSE 8000
# One worker only: jobs are kept in memory in this process.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
