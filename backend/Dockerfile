# ============================================
# EstateAI Rwanda — Production Backend Image
# ============================================
# Build:  docker build -t estateai-backend backend/
# Run:    docker run -p 5000:5000 --env-file .env estateai-backend
FROM python:3.11-slim

# System libs needed by shapely + psycopg2-binary at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgeos-c1v5 libpq5 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Health check (Render also configures one in render.yaml)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python -c "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://localhost:5000/health').status==200 else 1)"

EXPOSE 5000
CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--timeout", "120", \
     "--bind", "0.0.0.0:5000", "--access-logfile", "-", "app:app"]
