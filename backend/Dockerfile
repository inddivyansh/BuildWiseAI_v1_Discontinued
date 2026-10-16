# ──────────────────────────────────────────────────────────
# BuildWise AI — Backend Dockerfile (Production)
# Multi-stage build for smaller final image
# ──────────────────────────────────────────────────────────

# Stage 1: Build dependencies
FROM python:3.11-slim-bookworm AS builder

WORKDIR /build

# System dependencies for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ──────────────────────────────────────────────────────────
# Stage 2: Production image
# ──────────────────────────────────────────────────────────
FROM python:3.11-slim-bookworm AS production

LABEL maintainer="BuildWise AI"
LABEL version="0.1.0"

# System dependencies for runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Tesseract OCR
    tesseract-ocr \
    tesseract-ocr-eng \
    # OpenCV runtime
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    # WeasyPrint
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    # curl for Docker health checks
    curl \
    # PostgreSQL client (for health checks in scripts)
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app

# Create non-root user for security
RUN groupadd -r buildwise && useradd -r -g buildwise buildwise

# Copy application code
COPY --chown=buildwise:buildwise . .

# Create storage directory
RUN mkdir -p /app/storage && chown buildwise:buildwise /app/storage

# Switch to non-root user
USER buildwise

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production server: 2 workers (adjust based on available CPU)
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--log-level", "info", \
     "--access-log"]
