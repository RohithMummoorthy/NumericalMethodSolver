# ═══════════════════════════════════════════════════════════════════════════
# Dockerfile — Numerical Methods Solver
# Python 3.11 slim image with all dependencies pre-installed
# ═══════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

# ── Metadata ───────────────────────────────────────────────────────────────
LABEL maintainer="NMS"
LABEL description="Numerical Methods Solver — Flask App"
LABEL version="1.0"

# ── System dependencies ────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ──────────────────────────────────────────────────────
WORKDIR /app

# ── Install Python dependencies first (layer caching) ────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Copy application code ─────────────────────────────────────────────────
COPY . .

# ── Environment ───────────────────────────────────────────────────────────
ENV FLASK_ENV=production
ENV FLASK_APP=run.py
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# ── Expose port ───────────────────────────────────────────────────────────
EXPOSE 5000

# ── Run with Gunicorn (production WSGI server) ────────────────────────────
CMD ["python", "-m", "gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "run:app"]
