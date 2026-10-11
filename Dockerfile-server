FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LANG=C.UTF-8

# System dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies (cached unless requirements.txt changes)
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY server/. .

#run as non-root
RUN useradd -m kenneth
USER kenneth

EXPOSE 8000

CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "8000"]