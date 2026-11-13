FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml ./
COPY ai_service ./ai_service
RUN pip install --no-cache-dir .
ENTRYPOINT ["emoji-ai"]
