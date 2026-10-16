# BuildWise AI — Product & Architecture Specification v2

> **Status:** Final Pre-Implementation Architecture — Awaiting Approval  
> **Supersedes:** Spec v1  
> **Date:** 2026-09-15  
> **Next Step After Approval:** Phase 0 Implementation

---

## ⚠️ IMPORTANT: GEMINI MODEL VERIFICATION RESULTS

Before anything else — I verified the currently available Gemini API models from the **official Google AI for Developers pricing and model pages** (fetched live at time of writing). Here is the honest assessment:

### Currently Available Text-Generation Models (September 2026)

| Model ID | Type | Context | Best For | Free Tier |
|---|---|---|---|---|
| `gemini-3.8-flash` | Flash (latest) | 1M tokens | Complex agentic tasks, long-horizon reasoning | **Not confirmed free** — paid tier confirmed |
| `gemini-3.7-flash` | Flash | 1M tokens | Everyday coding, tool use, multi-step tasks | **Not confirmed free** |
| `gemini-3.6-flash` | Flash (prev gen) | 1M tokens | General agentic + multimodal tasks | **Not confirmed free** |
| `gemini-3.5-flash` | Flash | 1M tokens | High-throughput, routine workloads | **Not confirmed free** |
| `gemini-3.5-flash-lite` | Flash-Lite (cheapest) | 1M tokens | Cost-efficient, high-volume, simple tasks | **Not confirmed free** |
| `gemini-3.1-flash-lite` | Flash-Lite | 1M tokens | High-volume agentic, translation, processing | **Not confirmed free** |
| `gemini-3.1-pro-preview` | Pro | 1M tokens | Multimodal understanding, advanced reasoning | **Not confirmed free** |
| `gemini-3-flash-preview` | Flash (legacy) | 1M tokens | Legacy baseline | **Not confirmed free** |

### Critical Honest Assessment

> **The official pricing page confirmed a "Free" tier exists ("For developers and small projects") but the page structure (as fetched) does not display explicit per-model RPM/RPD limits for free access in a machine-readable way.** The search results indicated free tier limits of approximately 5–15 RPM and 100–1,500 RPD per model, but these figures are subject to change per project configuration.

> **My recommendation is architecturally correct regardless of which specific models have free access:** Design the system for any 3 Gemini text-generation models. The model IDs are environment-variable-driven. If free tier access is restricted, any 3 paid models work identically in the same architecture. The architecture never bakes in the assumption of "always free."

### Recommended Model Pool for BuildWise AI

For our use case (regulatory text explanation, RAG-grounded Q&A, long regulatory document context):

```
SLOT 1 (Primary):   gemini-3.8-flash
  → Best reasoning, handles long NBC regulation text
  
SLOT 2 (Secondary): gemini-3.6-flash
  → Reliable fallback, well-established, lower rate-limit pressure
  
SLOT 3 (Tertiary):  gemini-3.5-flash-lite
  → Cheapest/highest throughput, suitable for simple explanations
```

**Why this combination:** We get the best model for complex RAG Q&A in slot 1, a solid fallback in slot 2, and a cost/quota-efficient model in slot 3 for high-frequency simple explanations. The architecture makes swapping any slot a one-line environment variable change.

**Important:** The system must call `models.list` at startup to verify configured models are still available, and log a warning if any are not.

---

# SECTION 1 — ARCHITECTURE CHANGES FROM v1

## 1.1 Changes Made

| Area | v1 Spec | v2 Change | Reason |
|---|---|---|---|
| LLM Provider | OpenAI GPT-4o-mini (default), Ollama (fallback) | Gemini API with 3-model round-robin pool | User decision |
| LLM Client Library | `openai` Python SDK | `google-genai` (official Google GenAI SDK) | Matches provider choice |
| Model selection strategy | Single model | Round-robin across 3 configured models with fallback | User requirement |
| LLM failure handling | Brief mention | Full graceful degradation spec — analysis never fails due to LLM | User requirement |
| NBC 2016 source | "Assumed PDFs available" | 5 PDFs confirmed (3 Vol.1 + 2 Vol.2), ingestion pipeline required | User decision |
| Compliance rule values | Pre-populated with guessed values | All values marked REQUIRES VERIFICATION until confirmed from PDFs | User requirement |
| Rule verification lifecycle | Not specified | Full DRAFT → REQUIRES VERIFICATION → VERIFIED → DEPRECATED lifecycle | User requirement |
| Docker | Optional | Mandatory — `docker compose up` = full application | User decision |
| Docker Compose services | Not specified | Exactly 3 services: `postgres`, `backend`, `frontend` | User decision |
| Production serving | Not specified | React built to static → served by backend (FastAPI static files) or Nginx | User decision |
| Celery/Redis | Mentioned as v2 | Removed from roadmap mention — BackgroundTasks only for MVP | User confirmation |
| Auth | JWT scaffolded | No-auth demo mode explicitly first; auth scaffolding isolated | User decision |
| ComplianceResult statuses | PASS/FAIL only | PASS, FAIL, UNVERIFIED, NOT_APPLICABLE, INSUFFICIENT_DATA, ERROR | User requirement |
| Confidence/uncertainty | Described briefly | Explicit architectural rule: LOW confidence → INSUFFICIENT_DATA, not FAIL | User requirement |
| Ollama | Fallback LLM | Removed — Gemini is the provider; MockProvider for testing | Provider change |

## 1.2 No Conflicts Found

The v1 canonical geometry model, graph engine, compliance engine interfaces, pgvector database decision, SVG renderer decision, FastAPI framework, monorepo structure, and testing strategy are all **unchanged and confirmed.**

---

# SECTION 2 — FINAL TECHNOLOGY STACK

## 2.1 Backend

| Component | Technology | Version | Reason |
|---|---|---|---|
| API Framework | FastAPI | ≥0.111 | Async, Pydantic, auto-docs |
| ASGI Server | Uvicorn (with `--workers`) | ≥0.29 | Production-grade async server |
| Data Validation | Pydantic v2 | ≥2.7 | Native FastAPI integration |
| Config Management | pydantic-settings | ≥2.2 | Environment-variable-driven config |
| ORM | SQLAlchemy 2.x async | ≥2.0 | Python standard, full async |
| DB Driver | asyncpg | ≥0.29 | Async PostgreSQL |
| Migrations | Alembic | ≥1.13 | Schema versioning |
| DXF Parsing | ezdxf | ≥1.3 | Only mature Python DXF library |
| PDF Parsing | pdfplumber | ≥0.11 | Native PDF content extraction |
| OCR Fallback | pytesseract + doctr | ≥0.3 | Scanned PDF fallback |
| Computer Vision | opencv-python-headless | ≥4.9 | Mode A pipeline |
| Geometry | Shapely | ≥2.0 | Polygon ops, area, intersection |
| Graph | NetworkX | ≥3.3 | Egress analysis |
| Numerical | NumPy + SciPy | ≥1.26, ≥1.13 | Line math, spatial indexing |
| Embeddings | sentence-transformers + BAAI/bge-large-en-v1.5 | ≥3.0 | Free, local, no API key |
| Sparse Retrieval | rank-bm25 | ≥0.2 | In-process BM25 |
| Vector DB | pgvector (PostgreSQL ext.) | ≥0.3 | Eliminates separate service |
| **LLM Provider** | **google-genai (Google GenAI SDK)** | **≥1.0** | **Official Gemini Python SDK** |
| PDF Reports | WeasyPrint | ≥62 | Python-native, HTML→PDF |
| Templates | Jinja2 | ≥3.1 | Report template rendering |
| File Upload | python-multipart | ≥0.0.9 | FastAPI form parsing |
| Auth (scaffold) | python-jose + passlib | — | JWT/bcrypt, disabled by default |
| Rate Limiting | slowapi | ≥0.1 | API abuse prevention |
| Logging | structlog | ≥24 | Structured JSON logs |
| Testing | pytest + pytest-asyncio | ≥8.2, ≥0.23 | Standard test stack |
| HTTP Test Client | httpx | ≥0.27 | FastAPI TestClient |
| Test Fixtures | factory-boy | ≥3.3 | Floor plan factories |

## 2.2 Frontend

| Component | Technology | Version | Reason |
|---|---|---|---|
| Framework | React 18 | ≥18.3 | Portfolio standard |
| Language | TypeScript | ≥5.4 | Type safety |
| Build Tool | Vite | ≥5.3 | Fastest DX, modern ESM |
| Routing | React Router v6 | ≥6.24 | File-based routing |
| State | Zustand | ≥4.5 | Lightweight, no Redux |
| Server State | TanStack Query | ≥5.40 | Caching, loading, refetch |
| HTTP Client | Axios | ≥1.7 | HTTP + interceptors |
| Icons | Lucide React | ≥0.400 | Clean, tree-shakeable |
| Charts | Recharts | ≥2.12 | Compliance score charts |
| Graph View | React Flow | ≥11.11 | Room connectivity graph |
| PDF Preview | react-pdf | ≥9.0 | Uploaded PDF display |
| File Upload | react-dropzone | ≥14.2 | Drag-and-drop |
| Fonts | Inter (Google Fonts) | — | Professional typography |

## 2.3 Infrastructure

| Component | Technology | Reason |
|---|---|---|
| Containerization | Docker | Standard |
| Orchestration | Docker Compose | Single-command local run |
| Database | PostgreSQL 15+ with pgvector | Primary DB + vector store |
| File Storage | Docker volume (local) | MVP; abstracted for future S3 |
| Process Manager | Uvicorn multi-worker | Production ASGI |

---

# SECTION 3 — FINAL DEPLOYMENT STRATEGY

## 3.1 Local Development (Primary Mode)

```
docker compose -f docker-compose.dev.yml up
```

- PostgreSQL + pgvector (containerized)
- FastAPI backend (containerized, hot-reload via volume mount)
- Frontend: **Vite dev server** runs natively on host (`npm run dev`)
  - Vite proxies `/api` and `/ws` to backend container
  - Hot module replacement works fully
  - No container rebuild needed for frontend changes

## 3.2 Production / Demo Mode

```
docker compose up
```

- PostgreSQL + pgvector (containerized, persistent volume)
- FastAPI backend (containerized, Uvicorn with 2+ workers)
- Frontend: **React production build** served as static files

**Static file serving strategy:**

```
Option A (Chosen): FastAPI serves React build
  - React is built: npm run build → dist/
  - dist/ is copied into backend Docker image
  - FastAPI serves dist/ as StaticFiles at "/"
  - Single container for backend + frontend
  - Simpler Docker Compose (2 services: postgres + app)

Option B (Alternative): Nginx container
  - Separate nginx container serves dist/
  - Proxies /api/* to backend
  - More production-like but adds complexity
```

> **Decision: Option A for MVP demo.** Serving React static files from FastAPI is a fully valid pattern for a portfolio project and keeps Docker Compose to 3 services. Option B can be added for cloud deployment. The frontend build is separate from the backend but bundled into the same container image.

## 3.3 Cloud Deployment Path

Same Docker Compose configuration, deployed to:
- DigitalOcean Droplet (smallest: $6/mo)
- Hetzner VPS
- Any VPS with Docker support

Environment variables differ (production database URL, Gemini API key, CORS origins). No code changes needed.

## 3.4 Environment Files

```
.env.example          ← template, committed to git
.env                  ← actual secrets, in .gitignore
.env.development      ← dev overrides (safe defaults)
```

---

# SECTION 4 — FINAL DOCKER ARCHITECTURE

## 4.1 Docker Compose Services (Exactly 3)

```yaml
# docker-compose.yml (production / demo)
services:

  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"  # only for dev access; remove in production
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL_1=${GEMINI_MODEL_1:-gemini-3.8-flash}
      - GEMINI_MODEL_2=${GEMINI_MODEL_2:-gemini-3.6-flash}
      - GEMINI_MODEL_3=${GEMINI_MODEL_3:-gemini-3.5-flash-lite}
      - STORAGE_PATH=${STORAGE_PATH:-/app/storage}
      - APP_ENV=${APP_ENV:-production}
      - CORS_ORIGINS=${CORS_ORIGINS:-*}
      - MAX_UPLOAD_SIZE_MB=${MAX_UPLOAD_SIZE_MB:-50}
    volumes:
      - app_storage:/app/storage
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL:-http://localhost:8000}
    ports:
      - "80:80"
    depends_on:
      - backend
    # nginx serves the React build + proxies /api to backend

volumes:
  postgres_data:
  app_storage:
```

**Note on service count:** No Redis (no Celery), no Qdrant (using pgvector), no separate Nginx needed if serving from FastAPI. If we add Nginx: it becomes a 4th service but replaces the frontend container. This is an acceptable v1.1 upgrade.

## 4.2 Backend Dockerfile

```dockerfile
FROM python:3.11-slim

# System deps for OpenCV, WeasyPrint, pytesseract
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    pango1.0-0 \
    libpangocairo-1.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Build frontend and copy into static/ for serving
# (handled by multi-stage or build script)

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

## 4.3 Frontend Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

## 4.4 nginx.conf (Frontend Container)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

# SECTION 5 — FINAL GEMINI PROVIDER ARCHITECTURE

## 5.1 Design Principles

1. **Complete isolation**: No other module imports `google.generativeai` or `google-genai` SDK directly
2. **Graceful degradation**: LLM failure → analysis continues, explanation = `null`
3. **Round-robin with fallback**: Rotate models, skip failed ones, do not retry indefinitely
4. **Configurable**: All model IDs and API keys from environment variables
5. **Testable**: `MockProvider` returns deterministic responses without API calls
6. **Observable**: Every request/response logged with model used, latency, token count

## 5.2 Provider Interface (Abstract)

```
engines/llm/
├── __init__.py
├── base.py              ← LLMProvider abstract base class + LLMResponse dataclass
├── gemini_provider.py   ← GeminiProvider with round-robin ModelPool
├── mock_provider.py     ← MockProvider for tests (no API calls)
├── exceptions.py        ← LLMError, RateLimitError, ModelUnavailableError, etc.
└── pool.py              ← ModelPool: round-robin selection + failure tracking
```

## 5.3 Architecture

```
Application Code
      │
      │  calls only LLMProvider interface
      ▼
┌─────────────────────────────────┐
│  LLMProvider (ABC)              │
│  + explain_violation(...)       │
│  + answer_regulatory_query(...) │
│  + summarize_regulation(...)    │
│  + generate_recommendation(...) │
└─────────────────────────────────┘
              │
     ┌────────┴────────┐
     ▼                 ▼
GeminiProvider      MockProvider
     │
     ▼
ModelPool
  ├── Slot 1: gemini-3.8-flash  ← current_index points here
  ├── Slot 2: gemini-3.6-flash
  └── Slot 3: gemini-3.5-flash-lite

Each slot tracks:
  - model_id (from env var)
  - failure_count
  - last_failure_at
  - cooldown_until (exponential backoff)
  - is_available()
```

## 5.4 Round-Robin + Fallback Logic

```python
class ModelPool:
    """
    Rotates through configured Gemini models.
    Applies per-model exponential backoff on failure.
    Never retries more than MAX_RETRIES total across all models.
    """
    
    MAX_RETRIES = 3  # total attempts across all models
    BASE_BACKOFF_SECONDS = [1, 4, 16]  # exponential, NOT infinite
    
    def get_next_available(self) -> ModelSlot | None:
        """
        Round-robin: start from current_index.
        Skip models in cooldown.
        Return None if all models are unavailable.
        """
        ...
    
    def mark_failure(self, model_id: str, error_type: str) -> None:
        """
        Increments failure count.
        Sets cooldown_until based on failure_count:
          1st failure: 60s cooldown
          2nd failure: 300s cooldown
          3rd+ failure: 900s cooldown
        Resets after successful request.
        """
        ...
    
    def mark_success(self, model_id: str) -> None:
        """Resets failure count and cooldown for the model."""
        ...
```

## 5.5 Environment Variable Schema

```bash
# Gemini Configuration
GEMINI_API_KEY=your_api_key_here          # Single API key (Google's quota is per-project)
GEMINI_MODEL_1=gemini-3.8-flash           # Primary model
GEMINI_MODEL_2=gemini-3.6-flash           # Secondary model
GEMINI_MODEL_3=gemini-3.5-flash-lite      # Tertiary model
GEMINI_MAX_RETRIES=3                      # Max attempts across all models
GEMINI_REQUEST_TIMEOUT_SECONDS=30         # Per-request timeout
GEMINI_MAX_OUTPUT_TOKENS=2048             # For explanation/Q&A responses

# Note on API keys:
# Google's Gemini API quota is per PROJECT, not per API key.
# Multiple API keys only help if you have multiple Google projects.
# If you have multiple projects, set:
# GEMINI_API_KEY_2=key_for_project_2  (optional)
# GEMINI_API_KEY_3=key_for_project_3  (optional)
# Pool can associate different keys with different model slots if configured.
```

## 5.6 LLM Provider Interface Methods

```python
class LLMProvider(ABC):
    
    @abstractmethod
    async def explain_violation(
        self,
        result: ComplianceResult,
        regulation_chunks: list[str],
        building_context: dict
    ) -> LLMResponse:
        """
        Takes a COMPLETED ComplianceResult and generates plain-language explanation.
        NEVER evaluates compliance. NEVER changes the result.
        Returns LLMResponse with text + model_used + latency_ms.
        Returns LLMResponse(text=None, error="LLM unavailable") on failure.
        """
        ...
    
    @abstractmethod
    async def answer_regulatory_query(
        self,
        query: str,
        retrieved_chunks: list[RegulationChunk],
        max_tokens: int = 1024
    ) -> LLMResponse:
        """
        Answers a regulatory question grounded in retrieved chunks.
        ONLY uses information from chunks. Cites section numbers.
        """
        ...
    
    @abstractmethod
    async def generate_recommendation(
        self,
        violation: Violation,
        context: dict
    ) -> LLMResponse:
        """
        Generates a recommendation based on a deterministic violation.
        Does NOT evaluate the violation — violation is already determined.
        """
        ...

@dataclass
class LLMResponse:
    text: str | None           # None if unavailable
    model_used: str | None     # which model actually responded
    prompt_tokens: int | None
    output_tokens: int | None
    latency_ms: int | None
    error: str | None          # error message if failed
    is_available: bool         # False if all models failed
```

## 5.7 LLM Failure Handling in Analysis Pipeline

```
Analysis Pipeline:

1. Run geometry extraction          → if fails: EXTRACTION_FAILED
2. Build graph                      → if fails: GRAPH_BUILD_FAILED
3. Run compliance rules             → if fails: COMPLIANCE_FAILED
4. Generate JSON report             → always runs if step 3 succeeds
5. Try LLM explanations             → if Gemini unavailable:
                                         violations.llm_explanation = null
                                         report.llm_available = false
                                         UI shows: "AI explanation temporarily unavailable"
6. Generate PDF report              → always runs, explanation field shows fallback text

Rule: Steps 1-4 NEVER fail due to LLM unavailability.
      Step 5 is best-effort, isolated in try/except.
      The complete compliance report is always generated.
```

## 5.8 Startup Validation

```python
async def validate_llm_provider(provider: LLMProvider) -> None:
    """
    Called at application startup (not on every request).
    Verifies at least one configured model is reachable.
    Logs WARNING (not ERROR) if a model is unavailable.
    Application starts even if all models fail (graceful degradation).
    """
    ...
```

---

# SECTION 6 — FINAL REPOSITORY STRUCTURE

```
buildwise/
│
├── frontend/                              # React + TypeScript + Vite
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── floorplan/
│   │   │   │   ├── FloorPlanViewer.tsx    # SVG viewer root
│   │   │   │   ├── RoomLayer.tsx          # Room polygons
│   │   │   │   ├── WallLayer.tsx          # Wall lines
│   │   │   │   ├── OpeningLayer.tsx       # Doors / windows
│   │   │   │   ├── ViolationOverlay.tsx   # Violation highlights
│   │   │   │   ├── EgressRouteLayer.tsx   # Travel distance paths
│   │   │   │   └── FloorSelector.tsx      # Multi-floor switcher
│   │   │   ├── compliance/
│   │   │   │   ├── ComplianceSummary.tsx
│   │   │   │   ├── ViolationList.tsx
│   │   │   │   ├── ViolationDetail.tsx
│   │   │   │   ├── ComplianceScore.tsx
│   │   │   │   └── ResultStatusBadge.tsx
│   │   │   ├── rag/
│   │   │   │   ├── RegulatoryChat.tsx
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   └── CitationCard.tsx
│   │   │   ├── analysis/
│   │   │   │   ├── AnalysisWorkspace.tsx  # 3-panel layout
│   │   │   │   ├── LeftPanel.tsx
│   │   │   │   ├── CenterPanel.tsx
│   │   │   │   └── RightPanel.tsx
│   │   │   ├── upload/
│   │   │   │   ├── UploadZone.tsx
│   │   │   │   └── ProgressTracker.tsx
│   │   │   └── shared/
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Spinner.tsx
│   │   │       ├── ErrorBoundary.tsx
│   │   │       └── Layout.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── NewProject.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── Upload.tsx
│   │   │   ├── Processing.tsx
│   │   │   ├── Workspace.tsx             # Analysis Workspace
│   │   │   ├── Report.tsx
│   │   │   └── Regulations.tsx
│   │   ├── stores/
│   │   │   ├── useAuthStore.ts
│   │   │   ├── useProjectStore.ts
│   │   │   ├── useAnalysisStore.ts
│   │   │   ├── useFloorPlanStore.ts      # selected floor/room/violation
│   │   │   ├── useJobStore.ts            # WebSocket job status
│   │   │   └── useRAGStore.ts
│   │   ├── api/
│   │   │   ├── client.ts                 # Axios instance + interceptors
│   │   │   ├── projects.ts
│   │   │   ├── analysis.ts
│   │   │   ├── reports.ts
│   │   │   ├── rag.ts
│   │   │   └── websocket.ts
│   │   ├── types/
│   │   │   ├── geometry.ts               # Mirrors CGM Pydantic schemas
│   │   │   ├── compliance.ts             # ComplianceResult, Violation
│   │   │   ├── project.ts
│   │   │   ├── analysis.ts
│   │   │   └── rag.ts
│   │   ├── hooks/
│   │   │   ├── useJobStatus.ts           # WebSocket hook
│   │   │   ├── useFloorPlan.ts
│   │   │   └── useViolations.ts
│   │   ├── styles/
│   │   │   ├── tokens.css                # CSS custom properties
│   │   │   ├── global.css
│   │   │   ├── typography.css
│   │   │   └── utilities.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── backend/
│   ├── app/                               # FastAPI application layer
│   │   ├── __init__.py
│   │   ├── main.py                        # App factory, startup events
│   │   ├── config.py                      # pydantic-settings Settings class
│   │   ├── dependencies.py                # FastAPI DI (db session, storage, etc.)
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py                  # Aggregates all v1 routers
│   │   │   └── v1/
│   │   │       ├── health.py              # GET /health, GET /health/ready
│   │   │       ├── projects.py
│   │   │       ├── documents.py
│   │   │       ├── analysis.py
│   │   │       ├── compliance.py
│   │   │       ├── reports.py
│   │   │       ├── regulations.py
│   │   │       ├── chat.py                # RAG chat endpoint
│   │   │       └── websocket.py           # WS job status
│   │   ├── models/                        # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── project.py
│   │   │   ├── document.py
│   │   │   ├── analysis_run.py
│   │   │   ├── floor_plan_snapshot.py
│   │   │   ├── compliance_rule.py
│   │   │   ├── compliance_result.py
│   │   │   ├── violation.py
│   │   │   ├── recommendation.py
│   │   │   ├── report.py
│   │   │   ├── regulation_document.py
│   │   │   └── regulation_chunk.py
│   │   ├── schemas/                       # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── project.py
│   │   │   ├── document.py
│   │   │   ├── analysis.py
│   │   │   ├── compliance.py
│   │   │   ├── floor_plan.py              # CGM serialization for API
│   │   │   ├── report.py
│   │   │   ├── rag.py
│   │   │   └── common.py                 # shared types, pagination
│   │   ├── services/                      # Business logic orchestration
│   │   │   ├── __init__.py
│   │   │   ├── analysis_service.py       # Dispatches pipeline
│   │   │   ├── project_service.py
│   │   │   ├── report_service.py
│   │   │   └── rag_service.py
│   │   ├── storage/                       # File storage abstraction
│   │   │   ├── __init__.py
│   │   │   ├── base.py                   # StorageBackend ABC
│   │   │   └── local.py                  # LocalStorage implementation
│   │   └── jobs/                          # Background task management
│   │       ├── __init__.py
│   │       ├── manager.py                 # In-memory job status store
│   │       └── pipeline_runner.py         # Calls engines in sequence
│   │
│   ├── engines/                           # Core Python processing engines
│   │   ├── __init__.py
│   │   │
│   │   ├── geometry/                      # Canonical Geometry Model
│   │   │   ├── __init__.py
│   │   │   ├── models.py                  # CGM Pydantic models (CanonicalFloorPlan etc.)
│   │   │   ├── serializer.py              # CGM → JSON for API/storage
│   │   │   └── utils.py                   # Geometric helpers
│   │   │
│   │   ├── ingestion/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                    # IngestionAdapter ABC
│   │   │   ├── registry.py                # Format → adapter mapping
│   │   │   ├── validators.py              # Magic bytes, size, extension
│   │   │   ├── dxf_adapter.py             # ezdxf → CGM
│   │   │   ├── pdf_adapter.py             # pdfplumber → CGM
│   │   │   ├── image_adapter.py           # OpenCV pipeline → CGM
│   │   │   └── ifc_adapter.py             # [STUB] future
│   │   │
│   │   ├── spatial/                       # Spatial analysis
│   │   │   ├── __init__.py
│   │   │   ├── room_analyzer.py           # Area, perimeter, room type inference
│   │   │   ├── corridor_analyzer.py       # Width, length
│   │   │   ├── opening_linker.py          # Links openings to rooms
│   │   │   └── stair_analyzer.py          # Riser/tread geometry
│   │   │
│   │   ├── graph/
│   │   │   ├── __init__.py
│   │   │   ├── builder.py                 # CGM → NetworkX graph
│   │   │   ├── egress.py                  # Dijkstra, travel distance, dead-ends
│   │   │   ├── connectivity.py            # Connected components, reachability
│   │   │   └── serializer.py              # Graph → JSON for frontend
│   │   │
│   │   ├── compliance/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                    # ComplianceRule ABC + result models
│   │   │   ├── engine.py                  # Rule loader + evaluation orchestrator
│   │   │   ├── result.py                  # ComplianceResult, ResultStatus enum
│   │   │   ├── registry.py                # Auto-discovers rule classes
│   │   │   ├── rules/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── egress/
│   │   │   │   │   ├── travel_distance.py
│   │   │   │   │   ├── exit_count.py
│   │   │   │   │   └── dead_end_corridor.py
│   │   │   │   ├── dimensions/
│   │   │   │   │   ├── corridor_width.py
│   │   │   │   │   ├── door_width.py
│   │   │   │   │   └── stair_width.py
│   │   │   │   ├── stairs/
│   │   │   │   │   ├── riser_height.py
│   │   │   │   │   └── tread_depth.py
│   │   │   │   ├── environmental/
│   │   │   │   │   ├── window_floor_ratio.py
│   │   │   │   │   └── ventilation_ratio.py
│   │   │   │   └── fire_safety/
│   │   │   │       └── compartment_area.py
│   │   │   └── yaml_rules/
│   │   │       ├── dimensions.yaml
│   │   │       └── environmental.yaml
│   │   │
│   │   ├── vision/                        # Mode A: sketch/image pipeline
│   │   │   ├── __init__.py
│   │   │   ├── pipeline.py               # Orchestrator
│   │   │   ├── preprocessor.py
│   │   │   ├── binarizer.py
│   │   │   ├── morphology.py
│   │   │   ├── line_detector.py
│   │   │   ├── snapper.py
│   │   │   ├── contour_extractor.py
│   │   │   ├── vectorizer.py
│   │   │   ├── confidence.py
│   │   │   └── future/                   # ML extension placeholder
│   │   │       └── __init__.py
│   │   │
│   │   ├── rag/
│   │   │   ├── __init__.py
│   │   │   ├── ingestion/
│   │   │   │   ├── pdf_ingester.py       # pdfplumber + pytesseract fallback
│   │   │   │   ├── chunker.py            # Section-aware chunking
│   │   │   │   └── metadata_extractor.py
│   │   │   ├── retrieval/
│   │   │   │   ├── embedder.py           # BGE embeddings
│   │   │   │   ├── bm25_index.py         # rank_bm25
│   │   │   │   ├── semantic_search.py    # pgvector cosine similarity
│   │   │   │   ├── hybrid_search.py      # RRF fusion
│   │   │   │   └── reranker.py           # Optional cross-encoder
│   │   │   └── store/
│   │   │       ├── vector_store.py       # pgvector CRUD
│   │   │       └── document_registry.py  # Document version tracking
│   │   │
│   │   ├── llm/                           # LLM abstraction (Gemini)
│   │   │   ├── __init__.py
│   │   │   ├── base.py                   # LLMProvider ABC + LLMResponse
│   │   │   ├── pool.py                   # ModelPool (round-robin + backoff)
│   │   │   ├── gemini_provider.py        # GeminiProvider implementation
│   │   │   ├── mock_provider.py          # MockProvider for tests
│   │   │   └── exceptions.py             # LLM-specific exceptions
│   │   │
│   │   └── reporting/
│   │       ├── __init__.py
│   │       ├── schema.py                  # Report Pydantic schema
│   │       ├── json_reporter.py
│   │       ├── pdf_reporter.py            # WeasyPrint
│   │       └── templates/
│   │           ├── report.html            # Jinja2 HTML template
│   │           └── report.css
│   │
│   ├── alembic/
│   │   ├── env.py
│   │   ├── alembic.ini
│   │   └── versions/                      # Migration files
│   │
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pyproject.toml
│   ├── pytest.ini
│   └── Dockerfile
│
├── tests/
│   ├── unit/
│   │   ├── compliance/
│   │   │   ├── test_corridor_width.py
│   │   │   ├── test_travel_distance.py
│   │   │   ├── test_stair_width.py
│   │   │   ├── test_exit_count.py
│   │   │   └── test_dead_end.py
│   │   ├── geometry/
│   │   │   ├── test_area_calculator.py
│   │   │   └── test_room_detector.py
│   │   ├── graph/
│   │   │   ├── test_graph_builder.py
│   │   │   └── test_egress_analyzer.py
│   │   └── llm/
│   │       └── test_mock_provider.py
│   ├── integration/
│   │   ├── test_dxf_pipeline.py          # DXF → CGM
│   │   ├── test_cgm_to_graph.py
│   │   ├── test_graph_compliance.py
│   │   └── test_rag_pipeline.py
│   ├── e2e/
│   │   ├── test_full_analysis.py
│   │   └── test_report_generation.py
│   └── fixtures/
│       ├── floor_plans/
│       │   ├── simple_residential.dxf    # Synthetic: all compliant
│       │   ├── narrow_corridor.dxf       # Synthetic: corridor violation
│       │   ├── excessive_travel.dxf      # Synthetic: travel distance violation
│       │   ├── dead_end.dxf              # Synthetic: dead-end violation
│       │   ├── insufficient_windows.dxf  # Synthetic: environmental violation
│       │   └── all_violations.dxf        # Synthetic: multiple violations
│       └── regulations/
│           └── sample_regulation.pdf     # Small sample for RAG tests
│
├── docs/
│   ├── architecture/
│   │   └── spec_v2.md                    # This document
│   ├── compliance_rules/
│   │   └── rule_registry.md              # Master rule verification table
│   ├── api/
│   │   └── openapi.yaml                  # Auto-generated or written
│   └── development/
│       └── setup.md
│
├── data/
│   ├── regulations/
│   │   └── nbc_2016/
│   │       ├── volume1_part1.pdf         # NBC Vol.1 PDF #1
│   │       ├── volume1_part2.pdf         # NBC Vol.1 PDF #2
│   │       ├── volume1_part3.pdf         # NBC Vol.1 PDF #3
│   │       ├── volume2_part1.pdf         # NBC Vol.2 PDF #1
│   │       └── volume2_part2.pdf         # NBC Vol.2 PDF #2
│   └── .gitkeep
│
├── scripts/
│   ├── ingest_regulations.py             # CLI: ingest NBC PDFs into vector DB
│   ├── create_test_fixtures.py           # CLI: generate synthetic DXF test files
│   ├── seed_compliance_rules.py          # CLI: populate compliance_rules table
│   └── verify_models.py                  # CLI: verify Gemini models are available
│
├── docker-compose.yml                    # Production / demo
├── docker-compose.dev.yml                # Development (hot-reload)
├── .env.example
├── .gitignore
├── Makefile                              # make up, make dev, make test, make migrate
└── README.md
```

---

# SECTION 7 — FINAL DATABASE DESIGN

## 7.1 Relational vs JSONB Decision

| Data | Storage | Reason |
|---|---|---|
| User / Project / AnalysisRun metadata | Relational columns | Frequently queried, filtered, sorted |
| AnalysisRun status / stage | Relational columns | Polled frequently by WebSocket |
| ComplianceResult severity / status | Relational columns | Filtered by severity, aggregated |
| ComplianceResult measured/required values | Relational columns | Used in summary statistics |
| Violation entity_id / entity_type | Relational columns | Linked to geometry rendering |
| Violation coordinates | JSONB | Variable-length geometry array |
| CanonicalFloorPlan geometry | JSONB | Consumed as a unit; not queried by room |
| AnalysisRun configuration | JSONB | Flexible, rarely queried |
| ComplianceResult evidence | JSONB | Ad-hoc measurement data per rule |
| Report summary statistics | JSONB | Flexible report data |
| RegulationChunk metadata | JSONB | Section headers, document structure |
| RegulationChunk embedding | vector(1024) | pgvector column |

## 7.2 Full Database Schema

```sql
-- ──────────────────────────────────────────────
-- PROJECTS
-- ──────────────────────────────────────────────

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Note: user_id column added when auth is enabled (ALTER TABLE migration)

-- ──────────────────────────────────────────────
-- UPLOADED DOCUMENTS
-- ──────────────────────────────────────────────

CREATE TABLE uploaded_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    original_name   VARCHAR(255) NOT NULL,
    storage_key     TEXT NOT NULL,          -- relative path in storage volume
    file_format     VARCHAR(20) NOT NULL,   -- 'dxf', 'pdf', 'png', 'jpg', 'jpeg'
    mime_type       VARCHAR(100),
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON uploaded_documents (project_id);

-- ──────────────────────────────────────────────
-- ANALYSIS RUNS
-- ──────────────────────────────────────────────

CREATE TABLE analysis_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id     UUID NOT NULL REFERENCES uploaded_documents(id),
    status          VARCHAR(30) NOT NULL DEFAULT 'queued',
    -- 'queued' | 'processing' | 'complete' | 'failed'
    stage           VARCHAR(100),
    -- 'validating' | 'parsing' | 'extracting' | 'building_graph' |
    -- 'compliance' | 'explaining' | 'reporting' | 'complete'
    progress_pct    SMALLINT NOT NULL DEFAULT 0,
    error_code      VARCHAR(50),            -- ErrorCode enum value if failed
    error_message   TEXT,
    config          JSONB NOT NULL DEFAULT '{}',  -- ingestion options, rule overrides
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON analysis_runs (project_id);
CREATE INDEX ON analysis_runs (status);

-- ──────────────────────────────────────────────
-- FLOOR PLAN SNAPSHOTS
-- ──────────────────────────────────────────────
-- Stores the full CanonicalFloorPlan as JSONB.
-- Not normalized: geometry is consumed as a unit.

CREATE TABLE floor_plan_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID NOT NULL UNIQUE REFERENCES analysis_runs(id) ON DELETE CASCADE,
    floor_data      JSONB NOT NULL,          -- CanonicalFloorPlan serialized
    bounding_box    JSONB NOT NULL,          -- {xmin, ymin, xmax, ymax} in meters
    floor_count     SMALLINT NOT NULL DEFAULT 1,
    total_area_m2   NUMERIC(10, 2),          -- computed for report
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- COMPLIANCE RULES (Registry / Reference Table)
-- ──────────────────────────────────────────────

CREATE TABLE compliance_rules (
    rule_id             VARCHAR(50) PRIMARY KEY,    -- e.g. 'NBC-4-CW-001'
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    category            VARCHAR(50) NOT NULL,       -- 'egress', 'dimensions', 'environmental'
    severity            VARCHAR(20) NOT NULL,       -- 'critical', 'major', 'minor', 'warning'
    regulation_source   VARCHAR(100) NOT NULL,      -- 'NBC 2016'
    volume              VARCHAR(10),                -- 'Vol.1', 'Vol.2'
    part                VARCHAR(20),                -- 'Part 4'
    section             VARCHAR(30),                -- '4.2.1'
    clause              TEXT,                       -- full clause identifier
    source_page         INTEGER,                    -- page in PDF
    requirement_text    TEXT,                       -- verbatim requirement from NBC
    parameter           VARCHAR(100),              -- 'min_corridor_width_m'
    unit                VARCHAR(20),                -- 'meters'
    formula             TEXT,                       -- 'width >= min_width'
    verification_status VARCHAR(30) NOT NULL DEFAULT 'REQUIRES_VERIFICATION',
    -- 'DRAFT' | 'REQUIRES_VERIFICATION' | 'VERIFIED' | 'DEPRECATED'
    verified_by         TEXT,
    verified_at         TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    rule_version        VARCHAR(20) NOT NULL DEFAULT '1.0',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- COMPLIANCE RESULTS
-- ──────────────────────────────────────────────

CREATE TABLE compliance_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    rule_id         VARCHAR(50) NOT NULL REFERENCES compliance_rules(rule_id),
    status          VARCHAR(30) NOT NULL,
    -- 'PASS' | 'FAIL' | 'UNVERIFIED' | 'NOT_APPLICABLE' | 'INSUFFICIENT_DATA' | 'ERROR'
    severity        VARCHAR(20) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    measured_value  NUMERIC(12, 4),
    required_value  NUMERIC(12, 4),
    unit            VARCHAR(20),
    regulation_source   VARCHAR(100),
    source_page         INTEGER,
    source_section      VARCHAR(50),
    evidence            JSONB,              -- raw measurement data
    confidence          VARCHAR(20) NOT NULL DEFAULT 'high',
    -- 'high' | 'medium' | 'low' | 'insufficient'
    recommendation  TEXT,                   -- deterministic recommendation text
    llm_explanation TEXT,                   -- Gemini-generated explanation (nullable)
    llm_model_used  VARCHAR(50),            -- which Gemini model generated explanation
    floor_level     SMALLINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON compliance_results (analysis_run_id);
CREATE INDEX ON compliance_results (status);
CREATE INDEX ON compliance_results (severity);

-- ──────────────────────────────────────────────
-- VIOLATIONS (Geometry-linked)
-- ──────────────────────────────────────────────

CREATE TABLE violations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_result_id    UUID NOT NULL REFERENCES compliance_results(id) ON DELETE CASCADE,
    entity_type             VARCHAR(30) NOT NULL,   -- 'room' | 'wall' | 'corridor' | 'stair' | 'opening' | 'path'
    entity_id               UUID,                   -- CGM entity UUID (from floor_plan JSONB)
    geometry_hint           VARCHAR(30) NOT NULL,   -- 'boundary' | 'centroid' | 'line' | 'path' | 'point'
    coordinates             JSONB NOT NULL,          -- [{x, y}, ...] in meters (frontend renders this)
    label_text              VARCHAR(255),            -- e.g. "Width: 750mm (min 1000mm)"
    label_position          JSONB,                   -- {x, y} for label anchor
    floor_level             SMALLINT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON violations (compliance_result_id);

-- ──────────────────────────────────────────────
-- RECOMMENDATIONS
-- ──────────────────────────────────────────────

CREATE TABLE recommendations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    compliance_result_id UUID REFERENCES compliance_results(id),
    rule_id         VARCHAR(50),
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    priority        SMALLINT NOT NULL DEFAULT 1,     -- 1 = highest
    is_llm_generated BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON recommendations (analysis_run_id);

-- ──────────────────────────────────────────────
-- REPORTS
-- ──────────────────────────────────────────────

CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID NOT NULL UNIQUE REFERENCES analysis_runs(id) ON DELETE CASCADE,
    json_storage_key TEXT,                  -- path to JSON report file
    pdf_storage_key  TEXT,                  -- path to PDF report file
    summary_stats    JSONB NOT NULL DEFAULT '{}',
    -- {total_rules, pass_count, fail_count, critical_count, major_count,
    --  minor_count, warning_count, unverified_count, compliance_score}
    llm_available    BOOLEAN NOT NULL DEFAULT true,
    generated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- REGULATION DOCUMENTS (RAG corpus source)
-- ──────────────────────────────────────────────

CREATE TABLE regulation_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) NOT NULL,   -- 'NBC_2016'
    title           VARCHAR(255) NOT NULL,  -- 'National Building Code 2016 - Volume 1, Part 1'
    volume          VARCHAR(10),            -- 'Vol.1' | 'Vol.2'
    version         VARCHAR(20) NOT NULL,   -- '2016'
    jurisdiction    VARCHAR(50) DEFAULT 'India',
    storage_key     TEXT NOT NULL,          -- path to original PDF
    total_pages     INTEGER,
    total_chunks    INTEGER,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ──────────────────────────────────────────────
-- REGULATION CHUNKS (RAG corpus with embeddings)
-- ──────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE regulation_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES regulation_documents(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    section_number  VARCHAR(50),            -- e.g. '4.2.1' — extracted from text
    section_title   VARCHAR(255),           -- e.g. 'Means of Egress'
    parent_section  VARCHAR(50),            -- e.g. '4.2' for subsection traceability
    page_number     INTEGER,
    content_type    VARCHAR(30) NOT NULL DEFAULT 'text',
    -- 'text' | 'table' | 'definition' | 'formula' | 'note'
    raw_text        TEXT NOT NULL,
    token_count     INTEGER,
    metadata        JSONB NOT NULL DEFAULT '{}',
    embedding       vector(1024),            -- BAAI/bge-large-en-v1.5 embedding
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(document_id, chunk_index)
);
CREATE INDEX ON regulation_chunks (document_id, section_number);
CREATE INDEX ON regulation_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

## 7.3 Schema Design Notes

- **No `users` table in MVP** — table will be added via Alembic migration when auth is enabled. `project.user_id` column added at that time.
- **`floor_plan_snapshots.floor_data` (JSONB)** — stores the complete `CanonicalFloorPlan`. Not normalized because: (a) geometry is always consumed as a unit for rendering, (b) entity-level relational queries are not needed — violations reference entity UUIDs embedded in the JSONB.
- **`compliance_results.status`** — uses the extended status enum (`PASS`, `FAIL`, `UNVERIFIED`, `NOT_APPLICABLE`, `INSUFFICIENT_DATA`, `ERROR`) as required.
- **`compliance_rules.verification_status`** — `ONLY rules with status='VERIFIED'` are allowed to produce `FAIL` results with authoritative language. `REQUIRES_VERIFICATION` rules produce `UNVERIFIED` results.
- **`violations.coordinates` (JSONB)** — geometry array for frontend rendering. Variable length, no relational queries needed.
- **pgvector HNSW index** — uses `m=16, ef_construction=64` (good balance of query speed and index build time for <50K chunks).

---

# SECTION 8 — FINAL API CONTRACT

## 8.1 Route Summary

```
BASE: /api/v1/

HEALTH
  GET  /health                    → {status, version, timestamp}
  GET  /health/ready              → {status, database, storage, llm_available}

PROJECTS
  GET  /projects/                 → list projects
  POST /projects/                 → create project
  GET  /projects/{id}             → get project detail
  PUT  /projects/{id}             → update project
  DELETE /projects/{id}           → delete project + cascade

DOCUMENTS
  POST /documents/upload          → upload file (multipart, returns document_id)
  GET  /projects/{id}/documents/  → list project documents
  GET  /documents/{id}            → get document metadata
  DELETE /documents/{id}          → delete document + storage file

ANALYSIS
  POST /analysis/start            → start analysis {project_id, document_id, config}
                                    → returns {run_id, status: "queued"}
  GET  /analysis/{run_id}         → full analysis result
  GET  /analysis/{run_id}/status  → status polling fallback
  GET  /analysis/{run_id}/floor-plan → CGM geometry (for SVG viewer)
  GET  /analysis/{run_id}/graph   → room connectivity graph JSON
  GET  /analysis/{run_id}/violations → list of violations with geometry
  GET  /analysis/{run_id}/recommendations → recommendations list
  GET  /projects/{id}/analysis/   → list all runs for project

COMPLIANCE
  GET  /compliance/rules/         → list all active rules
  GET  /compliance/rules/{rule_id} → rule detail + verification status

REPORTS
  GET  /reports/{run_id}/json     → download JSON report
  GET  /reports/{run_id}/pdf      → download PDF report
  GET  /reports/{run_id}/summary  → summary stats (no download)

REGULATIONS (RAG Corpus)
  GET  /regulations/              → list ingested regulation documents
  GET  /regulations/{id}          → document detail
  POST /regulations/ingest        → (admin) trigger ingestion of PDF
  GET  /regulations/{id}/chunks/  → (debug/admin) list chunks

CHAT (RAG Q&A)
  POST /chat/query                → {question, document_ids?} → answer + citations
  GET  /chat/history/             → recent queries (session-based for MVP)

WEBSOCKET
  WS   /ws/analysis/{run_id}     → streaming job status updates
```

## 8.2 Key Request/Response Schemas

### POST /analysis/start

**Request:**
```json
{
  "project_id": "uuid",
  "document_id": "uuid",
  "config": {
    "mode": "auto",
    "rules_override": [],
    "scale_hint": null
  }
}
```

**Response:**
```json
{
  "run_id": "uuid",
  "status": "queued",
  "created_at": "2026-09-15T16:30:00Z"
}
```

### WebSocket Message (Server → Client)

```json
{
  "type": "status_update",
  "run_id": "uuid",
  "status": "processing",
  "stage": "building_graph",
  "progress_pct": 55,
  "message": "Building room connectivity graph...",
  "timestamp": "2026-09-15T16:30:05Z"
}
```

```json
{
  "type": "complete",
  "run_id": "uuid",
  "status": "complete",
  "progress_pct": 100,
  "summary": {
    "total_violations": 4,
    "critical": 2,
    "major": 1,
    "warning": 1
  }
}
```

### GET /analysis/{run_id}/violations

**Response:**
```json
{
  "run_id": "uuid",
  "total": 4,
  "violations": [
    {
      "id": "uuid",
      "rule_id": "NBC-4-CW-001",
      "title": "Minimum Corridor Width",
      "status": "FAIL",
      "severity": "critical",
      "measured_value": 0.75,
      "required_value": 1.0,
      "unit": "meters",
      "regulation_source": "NBC 2016",
      "source_section": "4.2.1",
      "source_page": null,
      "message": "Corridor C-03 width is 750mm, minimum required is 1000mm.",
      "recommendation": "Increase corridor width by at least 250mm.",
      "llm_explanation": "This corridor serves as a primary means of egress...",
      "confidence": "high",
      "rule_verification_status": "REQUIRES_VERIFICATION",
      "geometry": [
        {
          "entity_type": "room",
          "entity_id": "uuid-corridor-3",
          "geometry_hint": "boundary",
          "coordinates": [
            {"x": 6.0, "y": 2.0}, {"x": 8.5, "y": 2.0},
            {"x": 8.5, "y": 2.75}, {"x": 6.0, "y": 2.75}
          ],
          "label_text": "750mm (min 1000mm)",
          "label_position": {"x": 7.25, "y": 2.375},
          "floor_level": 0
        }
      ]
    }
  ]
}
```

### POST /chat/query

**Request:**
```json
{
  "question": "What is the maximum travel distance to a fire exit?",
  "document_ids": []
}
```

**Response:**
```json
{
  "answer": "According to NBC 2016, the maximum travel distance...",
  "citations": [
    {
      "document": "NBC 2016 - Volume 1",
      "section": "4.3.2",
      "section_title": "Travel Distance",
      "page": null,
      "text": "...extracted text excerpt..."
    }
  ],
  "model_used": "gemini-3.8-flash",
  "llm_available": true,
  "retrieved_chunk_count": 5
}
```

---

# SECTION 9 — CANONICAL GEOMETRY MODEL (CGM)

## 9.1 Confirmed from v1 — No Changes

The CGM is fully defined in spec v1. Key points confirmed:

- All coordinates in **meters** regardless of input format
- Multi-floor support from day one via `CGMFloor[]`
- UUID-keyed entities (critical for violation ↔ geometry linking)
- `ConfidenceLevel` enum: `HIGH | MEDIUM | LOW | INFERRED`
- Fully Shapely-compatible (geometry coordinates match Shapely Polygon format)
- Stored as JSONB in `floor_plan_snapshots.floor_data`

## 9.2 Confidence → Result Status Mapping (New)

This is a firm architectural rule:

```
Entity confidence HIGH or MEDIUM + rule runs → can produce PASS or FAIL
Entity confidence LOW → rule produces INSUFFICIENT_DATA (never FAIL)
Entity not detected at all → rule produces NOT_APPLICABLE
Rule evaluation throws exception → produces ERROR
Rule source is REQUIRES_VERIFICATION → FAIL becomes UNVERIFIED
```

This prevents: a sketch with a barely-detected door producing a hard `FAIL` for door width.

---

# SECTION 10 — ANALYSIS PIPELINE SPECIFICATION

## 10.1 Pipeline Stages

```
PipelineRunner.run(document_id, run_id, config)
│
├── Stage 1: VALIDATING (5%)
│   └── FileValidator.validate(path)
│       → checks magic bytes, size, extension
│       → error: INVALID_FILE
│
├── Stage 2: PARSING (20%)
│   └── IngestionRegistry.get_adapter(format)
│       └── adapter.extract(path, options)
│       → produces CanonicalFloorPlan
│       → error: EXTRACTION_FAILED
│
├── Stage 3: SPATIAL ANALYSIS (35%)
│   ├── RoomAnalyzer.analyze(cgm)
│   ├── CorridorAnalyzer.analyze(cgm)
│   ├── OpeningLinker.link(cgm)
│   └── StairAnalyzer.analyze(cgm)
│       → enriches CGM with computed spatial properties
│       → error: GEOMETRY_INVALID
│
├── Stage 4: GRAPH BUILD (55%)
│   └── GraphBuilder.build(cgm)
│       → produces NetworkX graph
│       → error: GRAPH_BUILD_FAILED
│
├── Stage 5: COMPLIANCE (70%)
│   └── ComplianceEngine.run(cgm, graph)
│       → produces list[ComplianceResult]
│       → error: COMPLIANCE_FAILED
│
├── Stage 6: LLM EXPLANATIONS (80%) [OPTIONAL — never blocks]
│   └── for each FAIL result:
│       LLMProvider.explain_violation(result, chunks)
│       → populates result.llm_explanation (or leaves None on failure)
│       → LLM failure: log warning, continue
│
├── Stage 7: REPORTING (90%)
│   ├── JSONReporter.generate(results)
│   └── PDFReporter.generate(results)
│       → stores to file storage
│       → error: REPORT_GENERATION_FAILED
│
└── Stage 8: COMPLETE (100%)
    → updates analysis_run.status = 'complete'
    → notifies WebSocket subscribers
```

## 10.2 PipelineRunner Independence from FastAPI

```python
class PipelineRunner:
    """
    Completely independent from FastAPI.
    Can be called from:
      - FastAPI BackgroundTasks (MVP)
      - Celery task (future)
      - CLI script (for testing)
      - pytest (for integration tests)
    
    Communicates progress via:
      - ProgressEmitter interface (injected)
        - WebSocketEmitter (FastAPI)
        - LogEmitter (CLI / tests)
        - NullEmitter (unit tests)
    """
    
    def __init__(
        self,
        db_session: AsyncSession,
        storage: StorageBackend,
        llm_provider: LLMProvider,
        progress_emitter: ProgressEmitter
    ):
        ...
    
    async def run(self, run_id: UUID, document_path: Path, config: dict) -> AnalysisRunResult:
        ...
```

---

# SECTION 11 — COMPLIANCE RULE LIFECYCLE

## 11.1 Rule Status Definitions

| Status | Meaning | Allowed Compliance Output |
|---|---|---|
| `DRAFT` | Rule is being written, not yet evaluated | Not executed |
| `REQUIRES_VERIFICATION` | Logic implemented, threshold not yet confirmed from NBC PDF | Produces `UNVERIFIED` (never `FAIL`) |
| `VERIFIED` | Threshold and logic confirmed against NBC 2016 PDF + page cited | Produces `PASS` or `FAIL` |
| `DEPRECATED` | Rule replaced by newer version or regulation changed | Not executed |

## 11.2 Rule Registry Table (to be maintained in `docs/compliance_rules/rule_registry.md`)

| Rule ID | Title | Vol | Part | Section | Clause | Page | Parameter | Value | Unit | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| NBC-4-CW-001 | Min Corridor Width | — | Part 4 | — | — | — | min_corridor_width | — | m | `REQUIRES_VERIFICATION` |
| NBC-4-SW-001 | Min Stair Width | — | Part 4 | — | — | — | min_stair_width | — | m | `REQUIRES_VERIFICATION` |
| NBC-4-DW-001 | Min Door Width (main) | — | Part 4 | — | — | — | min_door_width | — | m | `REQUIRES_VERIFICATION` |
| NBC-4-TD-001 | Max Travel Distance | — | Part 4 | — | — | — | max_travel_dist | — | m | `REQUIRES_VERIFICATION` |
| NBC-4-DE-001 | Max Dead-End Length | — | Part 4 | — | — | — | max_dead_end | — | m | `REQUIRES_VERIFICATION` |
| NBC-4-EX-001 | Min Exit Count | — | Part 4 | — | — | — | min_exits | — | count | `REQUIRES_VERIFICATION` |
| NBC-4-RH-001 | Riser Height Range | — | Part 4 | — | — | — | riser_min/max | — | m | `REQUIRES_VERIFICATION` |
| NBC-4-TR-001 | Tread Depth Minimum | — | Part 4 | — | — | — | min_tread | — | m | `REQUIRES_VERIFICATION` |
| NBC-8-WF-001 | Window/Floor Ratio | — | Part 8 | — | — | — | min_wf_ratio | — | ratio | `REQUIRES_VERIFICATION` |
| NBC-8-VF-001 | Ventilation Ratio | — | Part 8 | — | — | — | min_vent_ratio | — | ratio | `REQUIRES_VERIFICATION` |

> **All values blank** until confirmed from the 5 NBC PDFs. The process: ingest PDFs → use RAG to locate relevant sections → manually confirm values → update rule registry → mark `VERIFIED` → run rules in `VERIFIED` mode.

## 11.3 How REQUIRES_VERIFICATION Rules Work

```python
class MinCorridorWidthRule(ComplianceRule):
    rule_id = "NBC-4-CW-001"
    verification_status = RuleVerificationStatus.REQUIRES_VERIFICATION
    
    def check(self, floor_plan, graph, context) -> list[ComplianceResult]:
        params = self.get_yaml_params()  # loads from dimensions.yaml
        for corridor in floor_plan.corridors:
            width = measure_corridor_width(corridor)
            if width < params["min_corridor_width_m"]:
                status = (
                    ResultStatus.FAIL
                    if self.verification_status == RuleVerificationStatus.VERIFIED
                    else ResultStatus.UNVERIFIED  # ← cannot be FAIL until verified
                )
                yield ComplianceResult(
                    status=status,
                    message=f"Corridor width {width*1000:.0f}mm below configured minimum"
                            + (" [UNVERIFIED — awaiting NBC source confirmation]"
                               if status == ResultStatus.UNVERIFIED else ""),
                    ...
                )
```

---

# SECTION 12 — RAG ARCHITECTURE

## 12.1 NBC PDF Ingestion Pipeline

```
scripts/ingest_regulations.py

1. DISCOVERY
   Scan data/regulations/nbc_2016/ for PDF files
   Validate each file (readable, not corrupted)
   Extract metadata: filename, file size, creation date

2. DOCUMENT REGISTRATION
   Create regulation_documents record for each PDF
   Extract volume/part from filename convention

3. TEXT EXTRACTION (per PDF page)
   Try: pdfplumber.extract_text(page)
   If text_length < threshold: OCR fallback
     pytesseract.image_to_string(page_image, lang='eng')
   Store: raw_text, page_number, is_ocr_extracted

4. STRUCTURE DETECTION
   Regex patterns for NBC section numbering:
     "Part \d+" → Part headers
     "\d+\.\d+(\.\d+)*" → Section numbers (e.g., "4.2.1")
     "Table \d+" → Table markers
     "Note:" → Notes/commentary
   Assign: section_number, section_title, parent_section

5. CHUNKING
   Strategy: Hierarchical section-aware chunking
   - Keep section heading with its content
   - Max chunk: 600 tokens (with 80-token overlap)
   - Never split mid-sentence
   - Tables: kept as single chunks (even if slightly large)
   - Preserve: document_id, page_number, section_number
   
6. EMBEDDING
   Model: BAAI/bge-large-en-v1.5 (sentence-transformers)
   Batch size: 32 chunks per GPU/CPU call
   Store embedding in regulation_chunks.embedding (vector(1024))

7. BM25 INDEX UPDATE
   rank_bm25 index rebuilt from all active regulation_chunks
   Persisted in memory at app startup
   Rebuilt when new documents ingested

8. VERIFICATION
   Log: document_id, total_pages, total_chunks, avg_token_count
   Warn: pages with low text extraction (possible OCR issues)
```

## 12.2 Hybrid Retrieval (Per Query)

```
Query: "minimum corridor width residential building"

1. BM25 TOP-K (k=20)
   rank_bm25.get_scores(tokenize(query))
   → top 20 by BM25 score

2. SEMANTIC TOP-K (k=20)
   embedder.encode(query) → query_vector (1024d)
   SELECT ... ORDER BY embedding <=> query_vector LIMIT 20

3. RECIPROCAL RANK FUSION
   score(chunk) = Σ(1 / (rank_i + 60)) for each ranking list
   → merged top 20 by RRF score

4. RESULT
   Top 5-10 chunks with:
   - raw_text (for LLM context)
   - section_number, page_number, document title (for citations)
```

## 12.3 RAG Pipeline Isolation

```python
class RAGService:
    """
    Hybrid retrieval + LLM answer generation.
    
    NEVER called during compliance evaluation.
    Called only for:
      1. User regulatory Q&A (POST /chat/query)
      2. LLM explanation enrichment (after compliance runs)
    """
    
    async def query(self, question: str, doc_filter: list[UUID] | None = None) -> RAGResponse:
        chunks = await self.retriever.hybrid_search(question, k=10, doc_filter=doc_filter)
        if not chunks:
            return RAGResponse(answer="No relevant regulation text found.", citations=[])
        
        llm_response = await self.llm_provider.answer_regulatory_query(question, chunks)
        
        return RAGResponse(
            answer=llm_response.text or "AI explanation temporarily unavailable.",
            citations=self._extract_citations(chunks),
            llm_available=llm_response.is_available
        )
```

---

# SECTION 13 — PHASE 0 IMPLEMENTATION PLAN

> **Goal:** Working infrastructure — no DXF parsing, no compliance rules, no RAG yet.
> **Exit criterion:** `docker compose up` starts all services; backend health check passes; frontend loads; DB connectivity verified; CGM schema defined.

## 13.1 Phase 0 Checklist

### P0.1 — Repository Setup
- [ ] Create monorepo: `buildwise/`
- [ ] Initialize `frontend/` with Vite + React + TypeScript (`npm create vite@latest`)
- [ ] Initialize `backend/` as Python package with `pyproject.toml`
- [ ] Create `tests/`, `docs/`, `data/`, `scripts/`, `docker/` directories
- [ ] Create `.gitignore` (Python, Node, `.env`, `__pycache__`, `dist/`, `storage/`)
- [ ] Create `.env.example` with all required variables
- [ ] Create `Makefile` with targets: `up`, `dev`, `test`, `migrate`, `shell`
- [ ] Initialize Git with initial commit

### P0.2 — FastAPI Application Scaffold
- [ ] `backend/app/main.py` — App factory with startup/shutdown events
- [ ] `backend/app/config.py` — `Settings` class via `pydantic-settings`
  - All variables read from env: `DATABASE_URL`, `GEMINI_*`, `STORAGE_PATH`, `APP_ENV`, etc.
- [ ] `backend/app/dependencies.py` — DB session, storage backend, LLM provider
- [ ] Structured logging setup with `structlog` (JSON output in production, pretty in dev)
- [ ] Exception handlers: generic 500, validation errors, file-not-found
- [ ] CORS middleware configured from `CORS_ORIGINS` env var

### P0.3 — Health Endpoints
- [ ] `GET /health` → `{status: "ok", version: "0.1.0", timestamp: "..."}`
- [ ] `GET /health/ready` → `{status: "ready", database: "ok", storage: "ok", llm_status: "available | unavailable"}`
  - Database: attempt a simple SELECT 1
  - Storage: verify storage directory is writable
  - LLM: attempt to list configured models (non-blocking; degraded is not a failure)

### P0.4 — Database Setup
- [ ] `pgvector/pgvector:pg15` Docker image configured
- [ ] `asyncpg` + `SQLAlchemy 2.x async` configured
- [ ] Alembic initialized: `alembic init alembic/`
- [ ] `alembic/env.py` configured for async engine
- [ ] All ORM models created (as defined in Section 7):
  - `Project`, `UploadedDocument`, `AnalysisRun`, `FloorPlanSnapshot`
  - `ComplianceRule`, `ComplianceResult`, `Violation`, `Recommendation`
  - `Report`, `RegulationDocument`, `RegulationChunk`
- [ ] Initial Alembic migration created and applied
- [ ] `CREATE EXTENSION IF NOT EXISTS vector` in migration
- [ ] Database connectivity test in `/health/ready`
- [ ] Seed script for `compliance_rules` table (all rules in REQUIRES_VERIFICATION status)

### P0.5 — Canonical Geometry Model
- [ ] `engines/geometry/models.py` — Full CGM Pydantic schema:
  - `Point2D`, `LineSegment`, `Polygon2D`
  - `ConfidenceLevel`, `RoomType`, `WallType`, `OpeningType`, `StairDirection`
  - `CGMWall`, `CGMOpening`, `CGMRoom`, `CGMStair`, `CGMExit`, `CGMFloor`
  - `CGMMetadata`, `CanonicalFloorPlan`
- [ ] `engines/geometry/serializer.py` — CGM → JSON dict (for storage + API)
- [ ] `engines/geometry/utils.py` — shared geometric helpers
- [ ] CGM round-trip test: create sample CGM → serialize → deserialize → compare

### P0.6 — File Storage Abstraction
- [ ] `app/storage/base.py` — `StorageBackend` ABC:
  ```python
  async def save(self, key: str, content: bytes) -> str
  async def load(self, key: str) -> bytes
  async def delete(self, key: str) -> None
  async def exists(self, key: str) -> bool
  def get_url(self, key: str) -> str
  ```
- [ ] `app/storage/local.py` — `LocalStorage` implementation
  - Files stored at `{STORAGE_PATH}/{key}`
  - Directory created if not exists
  - Path traversal prevention (resolve and check prefix)
- [ ] Storage health check in `/health/ready`

### P0.7 — API Versioning + Basic Routes
- [ ] `/api/v1/` prefix applied to all routes
- [ ] Health routes: `/health`, `/health/ready` (no prefix)
- [ ] Project CRUD routes (scaffold only — no business logic yet)
  - `GET/POST /api/v1/projects/`
  - `GET/PUT/DELETE /api/v1/projects/{id}`
- [ ] Document upload route (scaffold — validation only, no parsing)
  - `POST /api/v1/documents/upload`
  - Validates file extension + magic bytes + size
  - Stores file to storage backend
  - Creates `uploaded_documents` record
- [ ] Analysis start route (scaffold — creates run record, returns ID)
  - `POST /api/v1/analysis/start`
- [ ] WebSocket stub: `WS /ws/analysis/{run_id}` (echoes status only)

### P0.8 — Background Job Manager
- [ ] `app/jobs/manager.py` — in-memory job status store
  - `{run_id: JobStatus}` dictionary
  - Thread-safe (asyncio.Lock)
  - Methods: `create_job`, `update_status`, `get_status`, `is_complete`
- [ ] `app/jobs/pipeline_runner.py` — stub pipeline that:
  - Emits progress stages via ProgressEmitter
  - Waits 1 second between stages (placeholder)
  - Marks job complete
- [ ] `ProgressEmitter` interface + `WebSocketEmitter` + `LogEmitter`
- [ ] FastAPI `BackgroundTasks` wires upload → pipeline_runner

### P0.9 — LLM Provider Scaffold
- [ ] `engines/llm/base.py` — `LLMProvider` ABC + `LLMResponse`
- [ ] `engines/llm/exceptions.py` — `LLMError`, `RateLimitError`, `ModelUnavailableError`
- [ ] `engines/llm/pool.py` — `ModelPool` with round-robin + backoff logic
- [ ] `engines/llm/gemini_provider.py` — `GeminiProvider` (calls `google-genai` SDK)
  - Reads model IDs from config
  - Startup validation: verify models via `client.models.list()`
  - Graceful failure: returns `LLMResponse(is_available=False)` on all failures
- [ ] `engines/llm/mock_provider.py` — `MockProvider` for tests
- [ ] Unit tests: pool round-robin logic, backoff timing, mock provider

### P0.10 — Frontend Scaffold
- [ ] Vite + React 18 + TypeScript initialized
- [ ] ESLint + Prettier configured
- [ ] React Router v6 installed + basic routing:
  - `/` → Landing page
  - `/dashboard` → Dashboard (empty)
  - `/projects/:id/upload` → Upload (empty)
  - `/analysis/:runId` → Workspace (empty)
- [ ] CSS design system foundation:
  - `styles/tokens.css` — CSS custom properties:
    ```css
    --color-bg-primary: #0F1117;
    --color-bg-secondary: #161B27;
    --color-bg-surface: #1E2435;
    --color-accent-primary: #6366F1;
    --color-accent-success: #10B981;
    --color-violation-critical: #EF4444;
    --color-violation-major: #F59E0B;
    --color-violation-minor: #EAB308;
    --color-violation-warning: #64748B;
    --font-primary: 'Inter', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    /* ... spacing, border-radius, transitions ... */
    ```
  - `styles/global.css` — reset + base styles
  - `styles/typography.css` — heading/body/caption scales
- [ ] Zustand stores scaffolded (empty initial state)
- [ ] Axios client with base URL from `VITE_API_URL` env var
- [ ] Inter font loaded from Google Fonts

### P0.11 — Docker & Compose
- [ ] `backend/Dockerfile` (multi-stage: deps → app)
- [ ] `frontend/Dockerfile` (multi-stage: build → nginx)
- [ ] `frontend/nginx.conf` (SPA routing + API proxy)
- [ ] `docker-compose.yml` (3 services: postgres, backend, frontend)
- [ ] `docker-compose.dev.yml` (postgres + backend with volume mount for hot-reload)
- [ ] Docker health checks on all services
- [ ] `depends_on` with `condition: service_healthy` for backend → postgres

### P0.12 — Connectivity Tests
- [ ] Backend unit test: DB session connects, `SELECT 1` returns
- [ ] Backend unit test: local storage save/load round-trip
- [ ] Backend unit test: CGM serialization round-trip
- [ ] Backend unit test: MockProvider returns expected response
- [ ] Frontend: API client successfully fetches `/health`
- [ ] `docker compose up` → `GET /health/ready` → `{"status": "ready"}`
- [ ] `docker compose up` → frontend loads at `localhost:80`
- [ ] `docker compose up` → frontend can hit `/api/v1/projects/` without CORS error

### P0.13 — README
- [ ] Installation prerequisites (Docker, Docker Compose, Node, Python)
- [ ] Quick start: `cp .env.example .env` → `docker compose up`
- [ ] Development setup: separate backend + frontend dev commands
- [ ] Environment variable reference
- [ ] Architecture overview diagram
- [ ] Phase status tracker

---

# SECTION 14 — PHASE 1 IMPLEMENTATION PLAN

> **Goal:** DXF → CGM → SVG viewer → compliance → violations → report (Mode B vertical slice)
> **Entry criterion:** Phase 0 complete, all connectivity tests pass

## 14.1 Phase 1 Milestone Map

```
MILESTONE 1A: DXF → CGM → Database
  DXF file upload → ezdxf parsing → CanonicalFloorPlan → stored in DB

MILESTONE 1B: CGM → API → SVG Viewer
  GET /analysis/{id}/floor-plan → frontend renders SVG floor plan
  Pan, zoom, room outlines, walls, doors working

MILESTONE 1C: Graph Engine
  CGM → NetworkX graph → egress analysis
  GET /analysis/{id}/graph → frontend shows graph view

MILESTONE 1D: Compliance Engine (REQUIRES_VERIFICATION rules)
  Run all rules → ComplianceResults → violations with geometry
  GET /analysis/{id}/violations → frontend shows violation overlays

MILESTONE 1E: LLM Integration
  GeminiProvider.explain_violation() → llm_explanation populated
  Graceful degradation tested

MILESTONE 1F: Reports
  JSON + PDF report generated
  GET /reports/{id}/pdf → downloadable report

MILESTONE 1G: RAG Ingestion
  scripts/ingest_regulations.py → NBC PDFs → chunked → embedded → pgvector
  GET /chat/query → retrieval + Gemini answer + citations

MILESTONE 1H: NBC Rule Verification
  Use RAG to locate actual NBC clauses for each rule
  Update rule registry, mark VERIFIED rules, update YAML thresholds
```

## 14.2 Phase 1 Detailed Checklist

### P1.1 — DXF Adapter
- [ ] `engines/ingestion/base.py` — `IngestionAdapter` ABC
- [ ] `engines/ingestion/validators.py` — magic bytes, size, extension
- [ ] `engines/ingestion/dxf_adapter.py`:
  - Load DXF with ezdxf
  - Extract modelspace entities
  - Layer-based heuristic classification (WALL/DOOR/WINDOW/STAIR layers)
  - `LINE` / `LWPOLYLINE` → `CGMWall`
  - `INSERT` block references → `CGMOpening` (door/window symbols)
  - Closed `LWPOLYLINE` / `HATCH` → candidate room boundaries
  - `TEXT` / `MTEXT` → room labels
  - Unit normalization (DXF INSUNITS header → meters)
  - Confidence assignment per entity type
- [ ] Integration test: each synthetic test DXF → CGM round-trip

### P1.2 — Spatial Analysis
- [ ] `engines/spatial/room_analyzer.py`:
  - Closed polygon detection from wall sets (Shapely)
  - Room area + perimeter computation
  - Room type inference from labels
- [ ] `engines/spatial/corridor_analyzer.py`:
  - Identify corridors (long narrow rooms)
  - Width measurement via medial axis approximation
- [ ] `engines/spatial/opening_linker.py`:
  - Link doors/windows to adjacent rooms
  - Assign `room_ids` to each `CGMOpening`
- [ ] `engines/spatial/stair_analyzer.py`:
  - Detect stair geometry
  - Compute width from bounding box

### P1.3 — Graph Engine
- [ ] `engines/graph/builder.py`:
  - Rooms → nodes with attributes
  - Doors/passages → edges with width + distance
  - Stairs → special nodes + inter-floor edges
  - Exits → terminal nodes
- [ ] `engines/graph/egress.py`:
  - `compute_travel_distances()` — Dijkstra from each room to nearest exit
  - `detect_dead_ends()` — corridors with degree 1 only
  - `find_shortest_egress_paths()` — per room egress route
- [ ] `engines/graph/serializer.py`:
  - NetworkX → JSON (nodes + edges + egress_paths) for frontend

### P1.4 — Compliance Engine
- [ ] `engines/compliance/base.py` — `ComplianceRule` ABC (finalize from spec)
- [ ] `engines/compliance/result.py` — `ResultStatus` enum + `ComplianceResult` dataclass
- [ ] `engines/compliance/engine.py` — rule loader + orchestration
- [ ] `engines/compliance/registry.py` — auto-discover rule classes
- [ ] Implement all 10 MVP rules (all as `REQUIRES_VERIFICATION` initially):
  - `NBC-4-CW-001` through `NBC-8-VF-001`
- [ ] Unit tests: pass/fail/edge case for every rule
- [ ] Confidence → status mapping enforced in every rule

### P1.5 — Floor Plan API + SVG Viewer
- [ ] Backend: `GET /api/v1/analysis/{run_id}/floor-plan` returns CGM as SVG-ready JSON
- [ ] Frontend: `FloorPlanViewer.tsx` — SVG rendering:
  - `viewBox` from bounding box
  - `WallLayer.tsx` — `<line>` elements from wall segments
  - `RoomLayer.tsx` — `<polygon>` elements with click handlers
  - `OpeningLayer.tsx` — door arcs, window lines
  - Pan/zoom via CSS transform or SVG viewBox manipulation
  - Floor selector: `CGMFloor[]` tabs

### P1.6 — Violation Overlays
- [ ] Backend: `GET /api/v1/analysis/{run_id}/violations` with geometry coordinates
- [ ] Frontend: `ViolationOverlay.tsx`:
  - Renders `<polygon>` overlays with severity-based fill colors
  - Click handler: selects violation, opens right panel
- [ ] `RightPanel.tsx` — shows selected violation detail:
  - Title, measured vs required, regulation source, explanation
  - `rule_verification_status` badge (VERIFIED / REQUIRES VERIFICATION)

### P1.7 — LLM Explanations
- [ ] `engines/llm/gemini_provider.py` — implement `explain_violation` method
  - Retrieves relevant regulation chunks for the rule
  - Builds structured prompt (violation details + regulation context)
  - Calls Gemini API with timeout
  - Falls back gracefully
- [ ] Startup validation: `verify_models.py` script tests all 3 models
- [ ] Pipeline integration: after compliance, async explain all FAIL results

### P1.8 — Reporting
- [ ] `engines/reporting/schema.py` — full report Pydantic schema
- [ ] `engines/reporting/json_reporter.py`
- [ ] `engines/reporting/pdf_reporter.py` — WeasyPrint from Jinja2 template
- [ ] `engines/reporting/templates/report.html` — styled compliance report
- [ ] Backend: `GET /reports/{run_id}/json` + `GET /reports/{run_id}/pdf`
- [ ] Frontend: report download buttons in workspace

### P1.9 — RAG Ingestion + Chat
- [ ] `engines/rag/ingestion/` — full PDF ingestion pipeline
- [ ] `scripts/ingest_regulations.py` — runs full ingestion for all 5 NBC PDFs
- [ ] `engines/rag/retrieval/` — BM25 + pgvector hybrid + RRF
- [ ] `POST /api/v1/chat/query` — regulatory Q&A endpoint
- [ ] Frontend: `RegulatoryChat.tsx` — chat interface with citation display

### P1.10 — NBC Rule Verification
- [ ] Use RAG to query NBC PDFs for each rule's exact clause
- [ ] Update `rule_registry.md` with actual page/section/clause references
- [ ] Update YAML threshold values with verified numbers
- [ ] Change rule `verification_status` to `VERIFIED` for confirmed rules
- [ ] Rerun compliance tests against verified thresholds

---

# SECTION 15 — KNOWN TECHNICAL RISKS

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| DXF layer naming is inconsistent across files | HIGH | HIGH | Configurable layer mapping in `config.yaml`; user can specify which layers are walls/doors |
| NBC PDF text extraction quality | MEDIUM | HIGH | Test pdfplumber on all 5 PDFs before Phase 1; identify pages needing OCR early |
| NBC section structure not machine-parseable | MEDIUM | MEDIUM | Manual section labeling for key chapters during ingestion; regex handles well-structured PDFs |
| Gemini API rate limits hit during demo | MEDIUM | MEDIUM | Round-robin pool distributes load; graceful degradation means demo still works without LLM |
| Gemini model API IDs change | MEDIUM | LOW | Environment variable configuration means update = change `.env`, no code change |
| Corridor width measurement accuracy | HIGH | MEDIUM | Shapely medial axis approximation documented as heuristic; low-confidence results produce INSUFFICIENT_DATA |
| pgvector HNSW index build time | LOW | LOW | <50K chunks; index build takes <60 seconds on standard hardware |
| WeasyPrint rendering edge cases | LOW | LOW | Test with Arabic/Devanagari text in NBC clauses; WeasyPrint supports Unicode |
| Multi-floor DXF complexity | MEDIUM | MEDIUM | Single-floor processing first; multi-floor as explicit opt-in |
| Shapely polygon detection from walls | HIGH | HIGH | This is the hardest geometry problem; create many synthetic DXF test cases |

---

# SECTION 16 — DECISIONS STILL REQUIRING APPROVAL

There are only **2 genuine decisions** remaining that require your explicit answer:

### DECISION A — Static File Serving in Production

**Option 1 (Recommended):** FastAPI serves React build as static files
- Docker Compose: 2 services (postgres + app) or 3 (postgres + backend + frontend)
- Frontend built into backend Docker image OR separate nginx container
- Simpler architecture, single image to push

**Option 2:** Separate Nginx container proxies to FastAPI, serves React build
- Docker Compose: 3 services (postgres + backend + nginx)  
- Cleaner separation of concerns
- Standard production pattern

**My recommendation: Option 1 for MVP.** Serving static files from FastAPI (FastAPI `StaticFiles`) is completely valid and reduces Docker complexity. We can switch to Option 2 when deploying to a VPS.

> **Do you confirm Option 1, or do you want Option 2?**

---

### DECISION B — Gemini Model Slots

Based on my live verification, I'm proposing:
- Slot 1: `gemini-3.8-flash` (best reasoning for regulatory text)
- Slot 2: `gemini-3.6-flash` (solid fallback)  
- Slot 3: `gemini-3.5-flash-lite` (cost/quota-efficient)

**Important:** All of these are **paid tier** based on the current pricing page. A free tier exists but I could not confirm which specific models have free access — this changes per your project configuration.

> **Are you okay with these 3 model choices, with the understanding that the architecture allows changing them at any time via `.env`?**

> **Do you have a Google AI Studio API key ready, or do you need to set one up before we start Phase 0?**

---

# SECTION 17 — EXPLICIT NOT-TO-BUILD LIST

The following are explicitly deferred and should not be touched until Phase 0 and Phase 1 are complete and tested:

| Feature | When |
|---|---|
| IFC file support | Phase 3+ |
| Mode A (sketch/image pipeline) | Phase 2 |
| Celery + Redis | When concurrent load demands it |
| Qdrant vector database | If pgvector proves insufficient at scale |
| Automatic layout optimization (geometry modification) | Future major version |
| Latent diffusion for sketch reconstruction | REMOVED from scope |
| AST/DSL rule language | REMOVED from scope |
| CSP solver (OR-Tools) | Only if sequential rules are provably insufficient |
| Full RBAC / multi-role auth | Phase 2+ (JWT scaffold in Phase 0) |
| CI/CD pipeline (GitHub Actions, etc.) | Phase 2 |
| Cross-encoder reranker | RAG refinement pass after Phase 1 |
| Thermal / acoustic / energy simulation | Future major version |
| Generative layout suggestions | Future major version |
| Mobile / tablet responsive design | After desktop experience is solid |
| Multi-jurisdiction regulation library | Phase 3+ |
| BIM round-trip export | Future major version |
| Real-time collaboration | Future major version |

---

## APPROVAL REQUEST

This specification is ready for implementation immediately upon your approval.

**To approve Phase 0:** Reply "Approved — implement Phase 0" and I will begin implementing in the exact sequence defined in Section 13.

**To modify anything:** Specify the section number and the change, and I will update the spec before implementing.

The two decisions in Section 16 should also be answered before I start. If you do not answer them, I will default to:
- **Decision A:** FastAPI static file serving (Option 1)
- **Decision B:** Model slots as proposed; you confirm API key availability separately

---

# SECTION 18 — VISION-BASED BLUEPRINT ASSESSMENT & REVISED DRAWING SPECIFICATION (IMPLEMENTED)

> **Implementation Status:** COMPLETE & VERIFIED  
> **Route / Endpoint:** `POST /api/v1/blueprint/assess` & Frontend `/blueprint-assess`  
> **Applicable Regulations:** National Building Code of India (NBC 2016) Part 4 (Fire & Life Safety), Part 8 (Building Services / Ventilation), and Part 3 (Accessibility)

### 18.1 Feature Overview

BuildWise AI provides a standalone and project-integrated Vision AI Blueprint Assessment pipeline. Users upload construction plans or blueprint drawings in standard formats (PNG, JPG, JPEG, PDF, SVG, BMP, WEBP, TIFF). The system performs deep architectural compliance screening against NBC 2016 rules, outputs structured flaw markers with pinpoint coordinates, and synthesizes a **Suggested Revised Blueprint Drawing** with concrete visual architectural improvements overlaid directly on the plan.

### 18.2 Ingestion & Processing Pipeline

```
[Uploaded Blueprint: PNG/JPG/PDF/SVG]
               │
               ▼
   [Format & Size Validation (≤20MB)]
               │
               ▼
   ┌──────────────────────────────────────────────┐
   │ Dual-Track Evaluation Strategy:              │
   │  - Primary: Gemini Multimodal Vision AI      │
   │    (Analyzes spatial geometry & room layout) │
   │  - Fallback: Classical Rule Engine           │
   │    (Guarantees 100% offline uptime)          │
   └──────────────────────────────────────────────┘
               │
               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ Structured Assessment Synthesis:                             │
   │  1. Overall Risk Index & Compliance Score (0–100)            │
   │  2. Defect & Flaw List with NBC 2016 Code Citations          │
   │  3. SVG Pinpoint Flaw Coordinates (x_pct, y_pct)             │
   │  4. Prioritized Improvements Schedule                        │
   │  5. Suggested Revised Drawing Elements (Corridors, Doors,    │
   │     Fire Barriers, Glazing Louvers, Ramps, Dimensions)       │
   │  6. Revised Blueprint Architectural Specifications           │
   └──────────────────────────────────────────────────────────────┘
               │
               ▼
   [Frontend Blueprint Evaluation Studio (/blueprint-assess)]
     ├── Mode 1: Suggested Revised Blueprint (Visual Revisions)
     ├── Mode 2: Flaws & Defect Pins (Interactive Marker Overlays)
     └── Mode 3: Side-by-Side Split View (Before vs. After)
```

### 18.3 Data Contract

```json
{
  "assessment_id": "uuid-v4",
  "filename": "floorplan_commercial.png",
  "file_format": "png",
  "image_width_px": 1920,
  "image_height_px": 1080,
  "processing_time_ms": 1420,
  "ai_model_used": "gemini-3.8-flash | classical-cv-fallback",
  "overall_risk": "low | medium | high | critical",
  "compliance_score": 78,
  "issues": [
    {
      "id": "ISS-001",
      "category": "egress",
      "severity": "critical",
      "title": "Insufficient exit corridor width",
      "description": "Primary corridor width is below the 1.8m requirement for business occupancy.",
      "location": "North Access Corridor",
      "recommendation": "Widen corridor clear width to minimum 1.8m to eliminate dead-end bottleneck.",
      "code_reference": "NBC 2016, Part 4, Clause 3.2.1",
      "coordinates": { "x_pct": 72.0, "y_pct": 48.0 }
    }
  ],
  "improvements": [
    {
      "id": "IMP-001",
      "priority": 1,
      "title": "Corridor Widening & Clear Egress Path",
      "detail": "Expand north corridor clear width from 1.1m to 1.8m.",
      "estimated_impact": "Permits safe evacuation flow for up to 350 occupants.",
      "category": "egress"
    }
  ],
  "revised_elements": [
    {
      "id": "REV-001",
      "issue_id": "ISS-001",
      "title": "Expanded Corridor (1.8m clear width)",
      "category": "egress",
      "element_type": "corridor",
      "x_pct": 72.0,
      "y_pct": 48.0,
      "width_pct": 18.0,
      "height_pct": 8.0,
      "color": "#10B981",
      "description": "Expanded passageway clear width to 1.8m with continuous safety egress clearance",
      "code_reference": "NBC 2016 Part 4, Clause 3.2.1"
    }
  ],
  "executive_summary": "Comprehensive architectural assessment completed...",
  "revised_blueprint_notes": "Suggested Revised Blueprint Modifications: 1. Primary corridor widened...",
  "base64_image": "data:image/png;base64,...",
  "disclaimer": "BuildWise AI blueprint assessment uses AI vision analysis for preliminary screening only..."
}
```

### 18.4 UI / UX Capabilities

1. **Format Agnostic**: Accepts standard construction file formats (`PNG`, `JPG`, `PDF`, `SVG`, `BMP`, `WEBP`, `TIFF`).
2. **Instant Sample Blueprint**: Built-in SVG architectural floor plan generator for zero-friction one-click testing.
3. **Interactive Drawing Studio**:
   - **Suggested Revised Blueprint**: Renders green safety paths, outward door swings, 2-hr fire separation barriers, and daylighting louvers right over the blueprint drawing.
   - **Flaws View**: Pulsing marker pins, severity badges, and hover details.
   - **Side-by-Side Split View**: Dual synchronized canvas showing original vs revised layout.
4. **Export System**: JSON report download and architectural notes clipboard export.
