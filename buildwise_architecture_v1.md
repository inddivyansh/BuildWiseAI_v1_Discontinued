# BuildWise AI — Product & Architecture Specification v1

> **Status:** Pre-Implementation Architecture Document  
> **Version:** 1.0  
> **Date:** 2026-09-15  
> **Classification:** Internal Engineering Reference

---

## MASTER DECISION TABLE

> Read this first. Every technology choice is justified — not just named.

| Decision | Recommendation | Alternatives Considered | Why This Choice |
|---|---|---|---|
| **Backend Framework** | FastAPI | Django, Flask | API-first + async-ready + Pydantic schemas + OpenAPI auto-docs. Ideal for ML workloads. Django's ORM/admin adds overhead we don't need. Flask requires too much manual scaffolding. |
| **Frontend Framework** | React 18 + TypeScript | Vue, Svelte, Angular | Widest recruiter familiarity, strong ecosystem, excellent portfolio signal. TypeScript enforces schema contracts between frontend and backend. |
| **Frontend Build Tool** | Vite | CRA, Webpack, Parcel | Fastest dev server, native ESM, excellent HMR, modern default. CRA is deprecated. |
| **Primary Database** | PostgreSQL 15+ | MySQL, SQLite, MongoDB | Strong relational integrity, JSONB for semi-structured data, excellent Python ORM support (SQLAlchemy), extensible with pgvector. |
| **Vector Store** | pgvector (PostgreSQL extension) | Qdrant, ChromaDB, Weaviate | Eliminates a separate service. pgvector is sufficient for a regulatory document corpus (<100K chunks). Upgrade path to Qdrant exists if needed. Portfolio benefit: shows infrastructure restraint. |
| **RAG Sparse Retrieval (BM25)** | rank_bm25 (Python library) | Elasticsearch, Typesense | rank_bm25 runs in-process. No extra service. Combined with pgvector for hybrid retrieval. Sufficient for <100K regulation chunks. |
| **Embedding Model** | BAAI/bge-large-en-v1.5 (via sentence-transformers) | OpenAI embeddings, Cohere | Free, local, no API key, strong benchmark performance, runs on CPU. Can upgrade to OpenAI if quality is insufficient. |
| **LLM (Explanation)** | Configurable: OpenAI GPT-4o-mini default, Ollama (Mistral/Llama3) fallback | GPT-4o, Gemini Flash, Claude | GPT-4o-mini is cost-effective for explanations. Local Ollama fallback for offline/demo mode. LLM is ONLY used for natural-language output — never for compliance evaluation. |
| **OCR Stack** | pdfplumber (primary) + pytesseract/doctr (fallback) | AWS Textract, Google Vision, PaddleOCR | pdfplumber handles digital PDFs natively. pytesseract/doctr for scanned fallback. Fully local, no API cost. |
| **DXF Parser** | ezdxf | libdxfrw, custom | Python-native, actively maintained, handles DXF R12–R2018, entity-aware, good layer/block support. |
| **IFC Parser** | ifcopenshell | xBIM (C#) | Python-native. IFC is deferred to v2 — architecture accommodates it via the ingestion adapter pattern. |
| **Geometry Library** | Shapely + NumPy | GDAL, OpenCASCADE | Shapely provides polygon operations, intersection, area, buffer. NumPy for matrix/line math. Together they cover all geometric compliance needs. |
| **CV Library (Mode A)** | OpenCV (cv2) | scikit-image, PIL | Full classical CV pipeline — threshold, morphology, Hough, contour. CPU-only. Well-documented. |
| **Graph Library** | NetworkX | igraph, graph-tool | Python-native, excellent for medium-scale spatial graphs (<10K nodes), readable API, good visualization export. Performance is not a concern at MVP scale. |
| **Rule Representation** | Hybrid: YAML (simple thresholds) + Python classes (complex spatial/graph) | AST/DSL, JSON only, pure Python | YAML allows non-engineers to inspect/modify numeric thresholds. Python classes handle rules that require geometry traversal. Both implement the same `ComplianceRule` interface. |
| **Task Queue / Async** | FastAPI BackgroundTasks (MVP) → Celery + Redis (when needed) | Celery from day 1, RQ, Dramatiq | For MVP: DXF parsing + compliance for a typical floor plan takes 2–15 seconds. BackgroundTasks + WebSocket polling is sufficient. Add Celery when multi-user concurrent load demands it. |
| **File Storage** | Local filesystem (MVP) → MinIO (production) | AWS S3, GCS, DB BLOBs | Local filesystem for development and demo. MinIO is S3-compatible and Docker-deployable. Architecture uses an abstract storage interface — swap without changing business logic. |
| **Authentication** | Optional JWT (MVP: configurable no-auth mode) | OAuth2, Full RBAC, No auth | No-auth mode for demo/portfolio. JWT scaffolding in place so auth is one config flag away. Do not block core analysis workflow behind auth complexity. |
| **Floor-Plan Renderer** | SVG (primary) | Canvas (Konva.js), WebGL | SVG is DOM-native, CSS-styleable, accessible, and excellent for technical drawings. React components can directly interact with SVG elements (click, hover). Canvas is better for very large drawings (10K+ elements) — not an MVP concern. |
| **Deployment** | Docker Compose (local + demo) | Kubernetes, bare metal, Vercel | Single `docker-compose up` for full stack demo. Portfolio-friendly: reviewers can run it locally. Add cloud VM config for production hosting if needed. |
| **Containerization** | Docker + Docker Compose | Podman | Standard, well-understood, good recruiter familiarity. |
| **Report Generation** | WeasyPrint (PDF from HTML/CSS) | ReportLab, LaTeX, Puppeteer | Python-native, produces styled PDFs from Jinja2 HTML templates. No headless Chrome dependency. |
| **ORM** | SQLAlchemy 2.x (async) + Alembic | Tortoise ORM, Django ORM | SQLAlchemy is the Python standard. Async support with asyncpg driver. Alembic for schema migrations. |

---

## PART 1 — EXECUTIVE SUMMARY

BuildWise AI is a Python-backed, React-fronted architectural analysis platform that ingests formal architectural drawings (DXF, vector PDF) and hand-drawn sketches, extracts their spatial structure into a normalized internal representation, performs deterministic compliance analysis against a curated subset of building regulations, visualizes violations geometrically, and generates structured compliance reports with explainable recommendations.

**The platform is NOT:**
- A structural engineering tool
- A statutory compliance authority
- A replacement for a licensed architect
- A generative design tool
- A BIM platform

**The platform IS:**
- An AI-assisted compliance screening tool
- An architectural drawing analysis platform
- A regulatory knowledge tool backed by RAG
- A spatial graph analysis platform
- A portfolio-quality demonstration of ML + backend + frontend engineering

**MVP in one sentence:** Upload a DXF floor plan → extract geometry → build room graph → run NBC Part 4 / Part 8 compliance rules → visualize violations on the floor plan → download a PDF report.

---

## PART 2 — PRODUCT DEFINITION

### 2.1 Product Name
**BuildWise AI**

### 2.2 Tagline
*"Intelligent Architectural Analysis and Regulatory Compliance Screening."*

### 2.3 Core Value Proposition
> Upload any architectural floor plan. Instantly understand its spatial structure, identify potential regulatory violations, and receive actionable recommendations — before engaging statutory authorities.

### 2.4 What the System Does

1. **Ingests** architectural drawings in multiple formats
2. **Extracts** spatial entities (walls, rooms, doors, windows, stairs, exits)
3. **Normalizes** them into a format-independent canonical geometry representation
4. **Builds** a room/circulation graph
5. **Runs** deterministic compliance rules from NBC 2016 (Part 4 + Part 8) and configurable local rules
6. **Identifies** violations and maps each violation back to specific geometry
7. **Explains** violations in plain language (LLM-assisted, not LLM-evaluated)
8. **Generates** structured JSON + human-readable PDF reports
9. **Provides** a regulatory knowledge interface (RAG-backed chat for regulation queries)

### 2.5 What the System Explicitly Does NOT Do

- Issue official compliance certificates
- Perform structural calculations
- Guarantee permit approval
- Replace site inspection
- Automatically modify or optimize floor plans
- Support IFC in MVP
- Simulate thermal, acoustic, or energy performance

---

## PART 3 — TARGET USERS

### Primary
- **Architecture students** validating their designs
- **Junior architects** screening plans before formal submission
- **Engineering portfolio reviewer / technical recruiter** evaluating the candidate who built this

### Secondary
- **Building approval consultants** pre-screening projects
- **Real-estate developers** checking basic compliance early in design cycle

### Anti-persona
- Licensed structural engineers performing statutory sign-off (they need certified software)
- Municipal authority reviewers (they have their own systems)

---

## PART 4 — MVP SCOPE

### Included in MVP

| Feature | Priority | Notes |
|---|---|---|
| DXF file upload and parsing | P0 | Core input format |
| Vector PDF parsing | P1 | Via pdfplumber + geometry extraction |
| PNG/JPG sketch input (Mode A) | P1 | Classical CV pipeline |
| Canonical geometry extraction | P0 | Walls, rooms, doors, windows, stairs, exits |
| Room/circulation graph generation | P0 | NetworkX |
| Egress / travel distance analysis | P0 | Dijkstra + NBC Part 4 rules |
| Dead-end corridor detection | P0 | Graph traversal |
| Staircase dimension compliance | P0 | NBC Part 4 |
| Corridor width compliance | P0 | NBC Part 4 |
| Exit count/accessibility | P0 | NBC Part 4 |
| Window-to-floor ratio (daylight) | P1 | NBC Part 8 heuristic |
| Ventilation ratio | P1 | NBC Part 8 heuristic |
| Violation visualization on floor plan | P0 | SVG overlay |
| Compliance report (JSON + PDF) | P0 | Structured output |
| RAG regulatory knowledge interface | P1 | Query NBC text |
| LLM-generated violation explanations | P1 | Text only |
| Processing status / progress feed | P0 | WebSocket |
| Project / analysis history | P1 | Per user |
| JWT authentication (optional mode) | P2 | Config flag |

### Explicitly Out of MVP

| Feature | Classification | Why Deferred |
|---|---|---|
| IFC file support | FUTURE | Schema complexity; requires ifcopenshell + geometry kernel |
| Latent diffusion for sketch | REMOVE (from MVP) | No training data; research-grade; adds no compliance value |
| Deep learning floor plan segmentation | FUTURE | OpenCV classical CV is sufficient for MVP |
| Automatic layout optimization | FUTURE | Geometry optimization is research-grade |
| Multi-jurisdiction regulation library | FUTURE | Start with NBC Part 4+8 only |
| Thermal/energy simulation | FUTURE | Requires specialized simulation engines |
| AST/DSL rule language | REMOVE | YAML + Python classes are superior for maintainability |
| CSP solver (OR-Tools) | NICE TO HAVE | Sequential rule evaluation is equally correct and simpler |
| Full RBAC | FUTURE | JWT config flag is sufficient |
| CI/CD pipeline | SHOULD HAVE | Add post-MVP |
| Mobile / tablet UI | FUTURE | Desktop browser is primary target |
| BIM integration | FUTURE | Out of product scope for MVP |

---

## PART 5 — FEATURE CLASSIFICATION TABLE

| Proposed Feature | Classification | Reason |
|---|---|---|
| DXF ingestion | MUST HAVE | Core format, ezdxf is mature |
| PDF vector parsing | MUST HAVE | Most architects share PDFs |
| Image/sketch input | SHOULD HAVE | Differentiator for Mode A |
| IFC ingestion | FUTURE | Too complex for MVP |
| Canonical geometry model | MUST HAVE | Foundation of everything |
| Room/graph generation | MUST HAVE | Required for egress analysis |
| NBC Part 4 compliance | MUST HAVE | Core value proposition |
| NBC Part 8 heuristics | SHOULD HAVE | Daylight/ventilation checks |
| LLM violation explanations | SHOULD HAVE | Differentiates from raw rule output |
| RAG regulatory chat | SHOULD HAVE | Demonstrates RAG capability |
| Violation geometry overlay | MUST HAVE | Core UX feature |
| PDF report | MUST HAVE | Professional deliverable |
| JSON report | MUST HAVE | Machine-readable output |
| Latent diffusion | REMOVE | No data, no training pipeline, no benefit to MVP |
| AST/DSL rule language | REMOVE | YAML + Python is better |
| Full CSP solver | NICE TO HAVE | Simpler rule engine is equivalent |
| Automatic layout optimization | FUTURE | Research-grade problem |
| Multi-floor graph | SHOULD HAVE | Required for buildings >1 floor |
| Solar radiation simulation | FUTURE | Needs specialized engine |
| Thermal analysis | FUTURE | Out of scope |
| Acoustic analysis | FUTURE | Out of scope |

---

## PART 6 — USER JOURNEYS

### Journey 1 — Primary MVP (Mode B: DXF Upload)

```
1. User lands on product page
2. User creates project ("Project: Residential Block A")
3. User uploads DXF file
4. System validates file (extension + magic bytes)
5. System queues analysis job
6. Frontend shows real-time progress:
   → Uploading (0%)
   → Parsing DXF (20%)
   → Extracting geometry (35%)
   → Building room graph (55%)
   → Running compliance rules (70%)
   → Generating report (90%)
   → Complete (100%)
7. Analysis Workspace opens:
   - Center: interactive SVG floor plan viewer
   - Left: floor/room navigator
   - Right: compliance summary panel
8. User sees colored overlays:
   - Red: hard violations
   - Yellow: soft warnings
   - Blue: informational annotations
9. User clicks on a red corridor overlay:
   - Right panel shows: "Corridor C-03: Width 750mm"
   - Rule: "NBC 2016, Part 4, Clause 4.2.1 — minimum 1000mm"
   - LLM explanation: "This corridor serves as a primary egress route..."
   - Recommendation: "Increase corridor width by at least 250mm"
10. User navigates to "Compliance Report" tab
11. User downloads PDF report
12. User opens RAG panel: "What does NBC say about travel distance?"
13. System retrieves relevant regulation text + cites source
14. User saves project and analysis to history
```

### Journey 2 — Mode A: Sketch Upload

```
1. User uploads a photographed hand-drawn sketch
2. System applies classical CV pipeline:
   → Binarization → morphological cleanup → Hough line detection
   → Orthogonal snapping → contour extraction → vectorization
3. System displays extracted floor plan alongside original scan
4. System shows confidence indicators per element:
   - "Wall extracted: HIGH CONFIDENCE"
   - "Door detected: MEDIUM CONFIDENCE"
   - "Room R-04 boundary: LOW CONFIDENCE — review recommended"
5. User accepts/corrects ambiguous elements (future feature — MVP shows uncertainty only)
6. Geometry is converted to canonical format
7. Same compliance pipeline runs as Mode B
8. User sees analysis results with appropriate uncertainty markers
```

### Journey 3 — Regulatory Query

```
1. User is in Analysis Workspace
2. User opens RAG panel
3. User types: "What is the maximum travel distance from any point to a fire exit?"
4. System:
   → Encodes query with BGE embeddings
   → Performs hybrid retrieval (BM25 + semantic) from regulation corpus
   → Reranks results
   → Sends retrieved chunks + query to LLM
   → LLM generates explanation with citations
5. System displays:
   - Natural language answer
   - Source: "NBC 2016, Part 4, Section 4.3.2, Page 187"
   - Highlighted text excerpt
6. User asks follow-up: "Does this apply to residential buildings?"
7. System retrieves occupancy-specific clauses
```

---

## PART 7 — SYSTEM ARCHITECTURE

### 7.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND (Vite + TS)                       │
│  Landing | Dashboard | Upload | Workspace | Reports | RAG Panel      │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS REST + WebSocket
┌────────────────────────────▼────────────────────────────────────────┐
│                  PYTHON FASTAPI APPLICATION                          │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  API     │  │  Core    │  │ Security │  │   WebSocket      │   │
│  │  Routes  │  │  Config  │  │  Layer   │  │   Job Status     │   │
│  └────┬─────┘  └──────────┘  └──────────┘  └──────────────────┘   │
│       │                                                              │
│  ┌────▼─────────────────────────────────────────────────────────┐  │
│  │                   SERVICE LAYER                               │  │
│  │  AnalysisService | ProjectService | ReportService | RAGService│  │
│  └────┬──────────────────┬──────────────────┬───────────────────┘  │
└───────┼──────────────────┼──────────────────┼──────────────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────────────────┐
│  INGESTION    │  │  ANALYSIS     │  │  REGULATION / RAG         │
│  ENGINE       │  │  PIPELINE     │  │  ENGINE                   │
│               │  │               │  │                           │
│  DXF Adapter  │  │ Geometry Eng. │  │  PDF Ingestion            │
│  PDF Adapter  │  │ Graph Engine  │  │  Text Extraction          │
│  IMG Adapter  │  │ Compliance Eng│  │  Chunking + Embedding     │
│  IFC Adapter* │  │ Opt. Engine   │  │  Hybrid Retrieval         │
│               │  │               │  │  LLM Explanation          │
│  → Canonical  │  │ → Violations  │  │  → Citations              │
│    GeoModel   │  │ → Metrics     │  │                           │
└───────────────┘  └───────────────┘  └───────────────────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
               ┌───────────────────────┐
               │  REPORT ENGINE        │
               │  JSON schema          │
               │  PDF (WeasyPrint)     │
               │  Annotated geometry   │
               └──────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────────┐
        ▼                  ▼                       ▼
┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ PostgreSQL   │  │  File Storage    │  │  Background Tasks  │
│ + pgvector   │  │  (Local/MinIO)   │  │  (BackgroundTasks  │
│              │  │                  │  │  → Celery v2)      │
└──────────────┘  └──────────────────┘  └────────────────────┘
```

### 7.2 Request Lifecycle

```
POST /api/v1/projects/{id}/analyze
        ↓
File validation (magic bytes, size, extension)
        ↓
Store file → return job_id
        ↓
Dispatch background task (job_id)
        ↓
WebSocket: client subscribes to job_id status
        ↓
Worker: Ingest → Geometry → Graph → Compliance → Report
        ↓
Each pipeline stage emits: {job_id, stage, progress, message}
        ↓
On completion: store AnalysisRun in DB
        ↓
GET /api/v1/analysis/{run_id} → full result
```

---

## PART 8 — COMPONENT RESPONSIBILITIES

### 8.1 Ingestion Engine

**Responsibility:** Convert any supported input format into the Canonical Geometry Model (CGM).

```
engines/ingestion/
├── __init__.py
├── base.py            ← Abstract IngestionAdapter interface
├── dxf_adapter.py     ← ezdxf → CGM conversion
├── pdf_adapter.py     ← pdfplumber → CGM conversion
├── image_adapter.py   ← OpenCV pipeline → CGM conversion
├── ifc_adapter.py     ← [STUB] ifcopenshell → CGM (future)
├── validators.py      ← File validation (magic bytes, size)
└── utils.py           ← Shared geometry utilities
```

**Interface contract:**
```python
class IngestionAdapter(ABC):
    def validate(self, file_path: Path) -> ValidationResult
    def extract(self, file_path: Path, options: IngestionOptions) -> CanonicalFloorPlan
    def get_supported_formats(self) -> list[str]
    def get_extraction_confidence(self) -> dict[str, float]
```

**Adapter responsibility matrix:**

| Entity | DXF | Vector PDF | Raster Image | IFC (future) |
|---|---|---|---|---|
| Walls | HIGH | MEDIUM | MEDIUM | HIGH |
| Rooms | MEDIUM (from closed regions) | MEDIUM | MEDIUM | HIGH |
| Doors | HIGH (if on standard layer) | MEDIUM | LOW | HIGH |
| Windows | HIGH | MEDIUM | LOW | HIGH |
| Stairs | MEDIUM | LOW | LOW | HIGH |
| Labels/text | HIGH | HIGH | LOW (OCR) | HIGH |
| Dimensions | HIGH | HIGH | LOW | HIGH |
| Scale/units | HIGH | MEDIUM | LOW (user input) | HIGH |

### 8.2 Geometry Engine

**Responsibility:** Compute derived spatial properties from the Canonical Geometry Model.

```
engines/geometry/
├── __init__.py
├── room_detector.py       ← Closed polygon detection from wall sets
├── area_calculator.py     ← Room area, perimeter
├── opening_detector.py    ← Door/window detection and assignment
├── stair_analyzer.py      ← Stair geometry analysis
├── corridor_analyzer.py   ← Corridor identification, width measurement
├── spatial_index.py       ← R-tree or Shapely STRtree for spatial queries
└── coordinate_system.py   ← Unit normalization, scale resolution
```

### 8.3 Graph Engine

**Responsibility:** Build a NetworkX graph from the canonical floor plan. Support traversal algorithms for egress analysis.

```
engines/graph/
├── __init__.py
├── builder.py             ← CGM → NetworkX graph
├── traversal.py           ← Dijkstra, BFS, dead-end detection
├── egress_analyzer.py     ← Travel distance, exit reachability
├── export.py              ← Graph → JSON for frontend visualization
└── validators.py          ← Graph connectivity checks
```

### 8.4 Compliance Engine

**Responsibility:** Load rules, evaluate them against CGM + graph, accumulate violations.

```
engines/compliance/
├── __init__.py
├── base.py                ← ComplianceRule abstract base class
├── engine.py              ← Rule loader, evaluation orchestrator
├── result.py              ← ComplianceResult, Violation, ViolationGeometry
├── rules/
│   ├── egress/
│   │   ├── travel_distance.py
│   │   ├── exit_count.py
│   │   └── dead_end_corridor.py
│   ├── dimensions/
│   │   ├── corridor_width.py
│   │   ├── stair_width.py
│   │   └── door_width.py
│   ├── stairs/
│   │   ├── riser_height.py
│   │   └── tread_depth.py
│   ├── environmental/
│   │   ├── window_floor_ratio.py
│   │   └── ventilation_ratio.py
│   └── fire_safety/
│       └── compartment_area.py
└── yaml_rules/
    ├── dimension_thresholds.yaml
    └── environmental_thresholds.yaml
```

### 8.5 RAG Engine

**Responsibility:** Ingest regulation documents, chunk them, embed them, support hybrid retrieval, generate LLM explanations.

```
engines/rag/
├── __init__.py
├── ingestion/
│   ├── pdf_ingester.py      ← pdfplumber + pytesseract fallback
│   ├── chunker.py           ← Section-aware chunking
│   └── metadata_extractor.py
├── retrieval/
│   ├── embedder.py          ← BGE embedding model
│   ├── sparse.py            ← BM25 (rank_bm25)
│   ├── semantic.py          ← pgvector cosine similarity
│   ├── hybrid.py            ← RRF fusion
│   └── reranker.py          ← Cross-encoder reranking (optional)
├── generation/
│   ├── llm_client.py        ← Configurable LLM provider interface
│   ├── prompt_builder.py    ← Structured prompts with citations
│   └── explanation_gen.py   ← Violation explanation generation
└── store/
    ├── vector_store.py      ← pgvector CRUD
    └── document_registry.py ← Document version management
```

### 8.6 Report Engine

**Responsibility:** Convert analysis results into structured JSON and styled PDF reports.

```
engines/reporting/
├── __init__.py
├── schema.py          ← Pydantic report schema
├── json_reporter.py   ← Structured JSON generation
├── pdf_reporter.py    ← WeasyPrint PDF generation
└── templates/
    ├── report.html    ← Jinja2 HTML template
    └── report.css     ← Print-oriented CSS
```

### 8.7 Vision Engine (Mode A)

**Responsibility:** Classical CV pipeline for sketch/image to vectorized floor plan.

```
engines/vision/
├── __init__.py
├── pipeline.py           ← Orchestrates the full CV pipeline
├── preprocessing.py      ← Denoise, normalize, resize
├── binarizer.py          ← Otsu + adaptive threshold
├── morphology.py         ← Erosion, dilation, opening/closing
├── line_detector.py      ← Hough line transform, line merging
├── snapper.py            ← Orthogonal snapping, grid alignment
├── contour_extractor.py  ← Room contours from closed regions
├── vectorizer.py         ← Convert detected geometry to CGM
├── confidence.py         ← Per-element confidence scoring
└── future/               ← Placeholder for ML-based replacements
    └── __init__.py       ← (empty; documents extension point)
```

---

## PART 9 — CANONICAL FLOOR-PLAN DATA MODEL (CGM)

This is the most important internal schema. Every ingestion adapter must produce this. Every engine consumes it. It is independent of input format.

### 9.1 Python Pydantic Schema

```python
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID, uuid4
from enum import Enum

# ─────────────────────────────────────────────
# PRIMITIVE GEOMETRY
# ─────────────────────────────────────────────

class Point2D(BaseModel):
    x: float  # meters
    y: float  # meters

class LineSegment(BaseModel):
    start: Point2D
    end: Point2D

class Polygon2D(BaseModel):
    vertices: list[Point2D]  # ordered, closed (last point ≠ first point)
    holes: list[list[Point2D]] = []  # interior holes (e.g. columns)

# ─────────────────────────────────────────────
# ENTITY TYPES
# ─────────────────────────────────────────────

class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFERRED = "inferred"

class RoomType(str, Enum):
    BEDROOM = "bedroom"
    LIVING = "living"
    KITCHEN = "kitchen"
    BATHROOM = "bathroom"
    CORRIDOR = "corridor"
    STAIRCASE = "staircase"
    LOBBY = "lobby"
    OFFICE = "office"
    EXIT_LOBBY = "exit_lobby"
    UNKNOWN = "unknown"

class WallType(str, Enum):
    EXTERIOR = "exterior"
    INTERIOR = "interior"
    PARTITION = "partition"
    UNKNOWN = "unknown"

class OpeningType(str, Enum):
    DOOR = "door"
    WINDOW = "window"
    PASSAGE = "passage"
    FIRE_DOOR = "fire_door"

class StairDirection(str, Enum):
    UP = "up"
    DOWN = "down"
    BOTH = "both"

# ─────────────────────────────────────────────
# ENTITIES
# ─────────────────────────────────────────────

class CGMWall(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    geometry: LineSegment
    thickness: Optional[float] = None  # meters
    wall_type: WallType = WallType.UNKNOWN
    height: Optional[float] = None  # meters
    layer: Optional[str] = None  # DXF layer name if applicable
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH
    source_entity_id: Optional[str] = None  # original DXF entity handle

class CGMOpening(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    opening_type: OpeningType
    position: Point2D  # midpoint of opening
    width: float  # meters
    height: Optional[float] = None  # meters
    swing_direction: Optional[float] = None  # angle in degrees
    wall_id: Optional[UUID] = None  # wall this opening belongs to
    room_ids: list[UUID] = []  # rooms connected by this opening
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH
    source_entity_id: Optional[str] = None

class CGMRoom(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    label: Optional[str] = None  # detected text label
    room_type: RoomType = RoomType.UNKNOWN
    boundary: Polygon2D
    area: float  # square meters (computed)
    perimeter: float  # meters (computed)
    centroid: Point2D  # computed
    floor_id: UUID
    openings: list[UUID] = []  # references to CGMOpening IDs
    is_exit_route: bool = False
    is_exit: bool = False  # is this a final fire exit?
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH
    properties: dict = {}  # extensible key-value metadata

class CGMStair(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    boundary: Polygon2D
    direction: StairDirection
    width: Optional[float] = None  # meters
    riser_height: Optional[float] = None  # meters
    tread_depth: Optional[float] = None  # meters
    riser_count: Optional[int] = None
    connects_floors: list[str] = []  # floor IDs
    centroid: Point2D
    confidence: ConfidenceLevel = ConfidenceLevel.MEDIUM
    source_entity_id: Optional[str] = None

class CGMExit(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    position: Point2D
    width: float  # meters
    exit_type: str  # "external_door", "fire_door", "staircase_exit"
    connected_room_id: Optional[UUID] = None
    floor_id: UUID
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH

class CGMFloor(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    level: int  # 0 = ground, -1 = basement, 1 = first floor, etc.
    label: Optional[str] = None  # e.g. "Ground Floor"
    elevation: Optional[float] = None  # meters above datum
    walls: list[CGMWall] = []
    rooms: list[CGMRoom] = []
    openings: list[CGMOpening] = []
    stairs: list[CGMStair] = []
    exits: list[CGMExit] = []

class CGMMetadata(BaseModel):
    source_format: str  # "dxf", "pdf", "image", "ifc"
    source_file: str
    extraction_timestamp: str  # ISO 8601
    units: str  # "mm", "m", "inches" — normalized to meters internally
    scale: Optional[float] = None  # e.g. 1:100
    drawing_origin: Point2D = Point2D(x=0, y=0)
    confidence_summary: dict[str, float] = {}  # entity_type → avg confidence
    warnings: list[str] = []  # extraction warnings

class CanonicalFloorPlan(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    floors: list[CGMFloor]
    metadata: CGMMetadata
    bounding_box: tuple[float, float, float, float]  # xmin, ymin, xmax, ymax
```

### 9.2 Why This Schema

- **Format-independent:** Compliance engine never knows if data came from DXF or image
- **UUID-keyed:** Frontend can reference specific entities for visualization
- **Confidence-aware:** Allows UI to show uncertainty without hiding data
- **Shapely-compatible:** All coordinates are in meters, compatible with Shapely operations
- **Extensible:** `properties: dict` on rooms allows domain-specific metadata without schema changes
- **Multi-floor ready:** `CGMFloor` array supports multi-story buildings from day one

---

## PART 10 — GEOMETRY ARCHITECTURE

### 10.1 Coordinate System

- All internal coordinates in **meters** (regardless of input units)
- Origin (0,0) at bottom-left of drawing bounding box after normalization
- Y-axis: up is positive (standard mathematical convention)
- DXF may use arbitrary units → normalize at ingestion time using `INSUNITS` header

### 10.2 Spatial Operations (via Shapely)

| Operation | Purpose | Shapely API |
|---|---|---|
| Room area | Compliance check (min room area) | `Polygon.area` |
| Room perimeter | Ventilation ratio | `Polygon.length` |
| Wall-room intersection | Assign walls to rooms | `Polygon.intersection` |
| Door-wall assignment | Link openings to rooms | `Point.distance(LineSegment) < threshold` |
| Corridor width | Minimum width along medial axis | `Polygon.buffer` + medial axis approx |
| Bounding box | Spatial indexing | `Polygon.bounds` |
| Containment | "Does room contain centroid?" | `Polygon.contains(Point)` |

### 10.3 DXF Extraction Logic

```
ezdxf ModelSpace entities:
  LINE, LWPOLYLINE, POLYLINE → wall candidates (by layer)
  ARC, CIRCLE → roundel features (doorswings)
  HATCH → room fill areas (if present)
  TEXT, MTEXT → labels and dimensions
  INSERT (block references) → doors, windows, stairs (symbol detection)
  DIMENSION → dimension annotations

Layer heuristics (configurable):
  "WALL", "WALLS", "A-WALL" → wall entities
  "DOOR", "DOORS", "A-DOOR" → door entities
  "WINDOW", "WIN", "A-WIND" → window entities
  "STAIR", "STAIRS" → stair entities
  "TEXT", "ANNO" → annotation entities
```

### 10.4 PDF Extraction Logic

Vector PDFs are parsed with `pdfplumber`:
- Extract all line segments (paths) from PDF content stream
- Filter by stroke width (walls are typically thicker)
- Group collinear short segments into wall lines
- Detect closed regions as candidate rooms
- Extract text elements as labels
- **Limitation:** PDF has no semantic layer structure — all extraction is heuristic

### 10.5 Mode A — Image Pipeline Detail

```
INPUT IMAGE (PNG/JPG/scan)
      ↓
1. PREPROCESSING
   - Grayscale conversion
   - CLAHE contrast enhancement
   - Gaussian blur (denoise)
   - Resize to fixed DPI equivalent

2. BINARIZATION
   - Otsu's global threshold (primary)
   - Adaptive threshold (fallback for uneven lighting)
   - Sauvola threshold (for faded/low-contrast sketches)

3. MORPHOLOGICAL CLEANUP
   - Closing (fill small gaps in walls)
   - Opening (remove noise artifacts)
   - Dilation then erosion for line continuity

4. LINE DETECTION
   - Probabilistic Hough Line Transform (cv2.HoughLinesP)
   - Parameter tuning: minLineLength, maxLineGap, threshold
   - Filter near-zero-length segments

5. ORTHOGONAL SNAPPING
   - Cluster lines by angle (0°, 90° ± tolerance)
   - Snap non-orthogonal lines to nearest orthogonal
   - Merge overlapping collinear segments
   - Extend lines to intersections

6. CONTOUR/REGION EXTRACTION
   - Flood fill from detected room seeds
   - cv2.findContours on closed regions
   - Filter by area (remove noise regions)

7. VECTORIZATION
   - Convert pixel-space coordinates to meters using detected scale
   - If no scale bar detected: request user input
   - Output: list of wall segments + room polygons

8. CONFIDENCE ASSIGNMENT
   - Line confidence: based on Hough vote count + length
   - Room confidence: based on closure completeness
   - Overall: flag rooms with <70% boundary confidence as UNCERTAIN

OUTPUT → CanonicalFloorPlan (same schema as Mode B)
```

**Uncertainty handling:**
- Elements with LOW confidence are marked `confidence: "low"` in CGM
- Frontend renders them with a distinct visual style (e.g., dashed, muted color)
- Compliance checks on LOW confidence entities produce warnings, not hard violations
- User is prompted: "Some elements could not be reliably detected. Please review."

---

## PART 11 — GRAPH ARCHITECTURE

### 11.1 Graph Model

```
NODES:
  type: "room"     → represents a room (area, label, room_type)
  type: "corridor" → represents a corridor (width, length)
  type: "stair"    → represents a staircase (connects floors)
  type: "exit"     → represents a building exit (final node in egress paths)
  type: "lobby"    → entry/exit lobby

NODE ATTRIBUTES:
  id: UUID (maps to CGMRoom.id / CGMStair.id)
  label: str
  area: float (m²)
  centroid: (x, y)
  floor_level: int
  is_exit: bool
  room_type: RoomType

EDGES:
  Connects nodes that are accessible to each other via:
  - Door (type: "door", width: float)
  - Passage/opening (type: "passage", width: float)
  - Staircase (type: "stair_connection", floor_delta: int)
  - Corridor (type: "corridor_connection")

EDGE ATTRIBUTES:
  width: float (m) — narrowest point of the connection
  distance: float (m) — Euclidean distance between centroids (used for travel distance)
  opening_id: UUID — maps back to CGMOpening for visualization
  is_fire_rated: bool
  floor_from: int
  floor_to: int
```

### 11.2 Graph Algorithms

| Algorithm | Purpose | NetworkX function |
|---|---|---|
| Dijkstra (weighted by distance) | Travel distance to nearest exit | `nx.dijkstra_path_length` |
| BFS from exit nodes | Exit reachability | `nx.bfs_edges` |
| Dead-end detection | Corridors/rooms with only one connection | degree == 1 + corridor type check |
| Connected components | Detect isolated rooms | `nx.connected_components` |
| Minimum spanning tree | Circulation efficiency heuristic | `nx.minimum_spanning_tree` |

### 11.3 Multi-Floor Graph

```
Floor 0 graph + Floor 1 graph
↓
Staircase nodes added to each floor
↓
Inter-floor edges: stair node (floor 0) ↔ stair node (floor 1)
  - edge type: "vertical_connection"
  - distance: floor height estimate (default 3.0m if not provided)
↓
Exit nodes on Floor 0 are the terminal nodes for egress analysis
↓
All-pairs travel distance computed for every room to its nearest exit
```

### 11.4 Graph → Frontend Serialization

```json
{
  "nodes": [
    {
      "id": "uuid-room-1",
      "label": "Bedroom 1",
      "type": "room",
      "centroid": {"x": 4.5, "y": 6.2},
      "floor": 0,
      "area": 18.4,
      "is_exit": false
    }
  ],
  "edges": [
    {
      "id": "uuid-edge-1",
      "source": "uuid-room-1",
      "target": "uuid-corridor-1",
      "type": "door",
      "width": 0.9,
      "distance": 1.2,
      "opening_id": "uuid-opening-4"
    }
  ],
  "egress_paths": [
    {
      "room_id": "uuid-room-1",
      "path": ["uuid-room-1", "uuid-corridor-1", "uuid-lobby-1", "uuid-exit-1"],
      "total_distance": 28.4,
      "max_permitted": 30.0,
      "compliant": true
    }
  ]
}
```

---

## PART 12 — COMPLIANCE ENGINE ARCHITECTURE

### 12.1 Design Principle

```
Rule is ALWAYS a Python object.
Rule ALWAYS evaluates deterministically.
Rule NEVER calls an LLM.
Rule ALWAYS returns a structured ComplianceResult.
LLM only generates the human-readable explanation AFTER the rule has run.
```

### 12.2 Base Rule Class

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from uuid import UUID

class Severity(str, Enum):
    CRITICAL = "critical"     # Building cannot be approved
    MAJOR = "major"           # Significant violation, must be fixed
    MINOR = "minor"           # Suboptimal, should be fixed
    WARNING = "warning"       # Heuristic recommendation
    INFO = "info"             # Informational annotation

@dataclass
class ViolationGeometry:
    """Maps a violation back to specific geometry for frontend highlighting."""
    entity_type: str           # "room", "wall", "corridor", "stair", "opening"
    entity_id: UUID            # CGM entity UUID
    geometry_hint: str         # "boundary", "centroid", "line", "area"
    coordinates: list[dict]    # [{x, y}, ...] for frontend rendering

@dataclass
class ComplianceResult:
    rule_id: str
    rule_title: str
    passed: bool
    severity: Severity
    measured_value: float | None
    required_value: float | None
    unit: str | None
    message: str               # Short technical message
    recommendation: str | None # What to do to fix it
    regulation_source: str     # "NBC 2016, Part 4, Clause X.Y.Z"
    evidence: dict             # Raw measurements used in evaluation
    violations: list[ViolationGeometry]  # Empty if passed
    confidence: str            # "high", "medium", "low" (from input data quality)

class ComplianceRule(ABC):
    rule_id: str
    title: str
    description: str
    severity: Severity
    regulation_source: str
    regulation_section: str

    @abstractmethod
    def check(
        self,
        floor_plan: CanonicalFloorPlan,
        graph: nx.Graph | None = None,
        context: dict | None = None
    ) -> list[ComplianceResult]:
        """Evaluate the rule. Return one result per violation instance."""
        ...

    def get_yaml_params(self) -> dict:
        """Return parameters loaded from YAML for this rule's thresholds."""
        ...
```

### 12.3 YAML Rule Configuration

```yaml
# yaml_rules/dimension_thresholds.yaml
rules:
  - rule_id: "NBC-4-CW-001"
    param: min_corridor_width_m
    value: 1.0
    unit: "meters"
    source: "NBC 2016, Part 4, Clause 4.2.1"
    severity: "critical"
    note: "REQUIRES SOURCE VERIFICATION — value pending cross-check with NBC 2016 document"

  - rule_id: "NBC-4-SW-001"
    param: min_stair_width_m
    value: 1.0
    unit: "meters"
    source: "NBC 2016, Part 4, Clause 4.5.2"
    severity: "critical"
    note: "REQUIRES SOURCE VERIFICATION"

  - rule_id: "NBC-4-DW-001"
    param: min_door_width_m
    value: 0.9
    unit: "meters"
    source: "NBC 2016, Part 4, Clause 4.3.1"
    severity: "major"
    note: "REQUIRES SOURCE VERIFICATION"
```

### 12.4 MVP Rule Set

> **Critical note:** All numerical values below are marked `[REQUIRES VERIFICATION]` unless the exact NBC 2016 clause has been independently confirmed. We will NOT fabricate regulatory values.

| Rule ID | Title | Source | Input | Logic | Severity | Status |
|---|---|---|---|---|---|---|
| NBC-4-CW-001 | Minimum Corridor Width | NBC 2016, Part 4 | corridor.width | width ≥ 1000mm | CRITICAL | REQUIRES VERIFICATION |
| NBC-4-SW-001 | Minimum Stair Width | NBC 2016, Part 4 | stair.width | width ≥ 1000mm (residential) | CRITICAL | REQUIRES VERIFICATION |
| NBC-4-DW-001 | Minimum Door Width | NBC 2016, Part 4 | opening.width | width ≥ 900mm (main doors) | MAJOR | REQUIRES VERIFICATION |
| NBC-4-TD-001 | Maximum Travel Distance | NBC 2016, Part 4 | graph: max_dist_to_exit | dist ≤ 30m (sprinklered), 22m (unsprinklered) | CRITICAL | REQUIRES VERIFICATION |
| NBC-4-DE-001 | Dead-End Corridor | NBC 2016, Part 4 | graph: dead_end_length | dead_end ≤ 6m | MAJOR | REQUIRES VERIFICATION |
| NBC-4-EX-001 | Minimum Exit Count | NBC 2016, Part 4 | count(exits) per floor | exits ≥ 2 (occupancy > threshold) | CRITICAL | REQUIRES VERIFICATION |
| NBC-4-RH-001 | Riser Height | NBC 2016, Part 4 | stair.riser_height | 150mm ≤ riser ≤ 190mm | MAJOR | REQUIRES VERIFICATION |
| NBC-4-TR-001 | Tread Depth | NBC 2016, Part 4 | stair.tread_depth | tread ≥ 250mm | MAJOR | REQUIRES VERIFICATION |
| NBC-8-WF-001 | Window-to-Floor Ratio (Daylight) | NBC 2016, Part 8 | room.window_area / room.floor_area | ratio ≥ 10% | WARNING | REQUIRES VERIFICATION |
| NBC-8-VF-001 | Ventilation Opening Ratio | NBC 2016, Part 8 | room.vent_area / room.floor_area | ratio ≥ 5% | WARNING | REQUIRES VERIFICATION |
| NBC-4-CA-001 | Maximum Compartment Area | NBC 2016, Part 4 | floor.total_area | area ≤ limit by occupancy | MAJOR | REQUIRES VERIFICATION |

**Each rule requires:**
- PASS test case (compliant geometry)
- FAIL test case (violating geometry)
- EDGE CASE test (exactly at threshold)

### 12.5 Rule Engine Orchestration

```python
class ComplianceEngine:
    def run(self, floor_plan: CanonicalFloorPlan, graph: nx.Graph) -> list[ComplianceResult]:
        results = []
        for rule in self._load_rules():
            try:
                rule_results = rule.check(floor_plan, graph)
                results.extend(rule_results)
            except RuleEvaluationError as e:
                results.append(self._make_error_result(rule, e))
        return results
```

Rules are discovered via a plugin registry — adding a new rule file requires no change to `engine.py`.

---

## PART 13 — RAG / REGULATORY ARCHITECTURE

### 13.1 RAG Pipeline

```
DOCUMENT INGESTION:
  PDF (digital)  → pdfplumber → structured text + page metadata
  PDF (scanned)  → pytesseract / doctr → OCR text
  
  ↓
  
STRUCTURAL CHUNKING:
  - Split by section headings (regex on NBC section numbering: "4.2.1", "Table 4.1")
  - Chunk size: ~400–600 tokens with 50-token overlap
  - Preserve: section_id, page_number, document_id, version
  
  ↓
  
METADATA ENRICHMENT:
  Each chunk tagged with:
  {
    chunk_id, document_id, document_version,
    section_number, section_title, page_number,
    content_type: "rule" | "table" | "definition" | "commentary",
    occupancy_type: optional,
    raw_text, token_count
  }
  
  ↓
  
EMBEDDING:
  Model: BAAI/bge-large-en-v1.5 (via sentence-transformers)
  Dimension: 1024
  Storage: pgvector (vector column in regulation_chunks table)
  
  ↓
  
BM25 INDEX:
  rank_bm25 Python library
  Built in-memory at startup from regulation_chunks table
  Rebuilt when new documents ingested
  
  ↓
  
HYBRID RETRIEVAL (per query):
  1. BM25 top-k (k=20)
  2. pgvector cosine similarity top-k (k=20)
  3. Reciprocal Rank Fusion (RRF) → merged top-20
  4. Cross-encoder reranker (optional, ms-marco-MiniLM) → top-5
  
  ↓
  
LLM GENERATION:
  Provider: configurable (OpenAI GPT-4o-mini default, Ollama fallback)
  
  Prompt structure:
  """
  You are a regulatory assistant for building codes.
  Answer ONLY based on the provided regulation text.
  Do NOT invent regulatory values.
  Cite the exact section number for every claim.
  
  REGULATION CONTEXT:
  [retrieved chunks with section numbers]
  
  USER QUESTION:
  [user query]
  
  ANSWER:
  """
  
  ↓
  
RESPONSE:
  {
    "answer": "...",
    "citations": [
      {"section": "4.2.1", "page": 187, "document": "NBC 2016", "text": "..."}
    ],
    "confidence": "high" | "medium" | "low",
    "retrieved_chunks": [...]
  }
```

### 13.2 pgvector vs Qdrant Decision

**Recommendation: pgvector (PostgreSQL extension)**

| Factor | pgvector | Qdrant |
|---|---|---|
| Infrastructure complexity | None (same PG instance) | Additional service + port |
| Python SDK | psycopg2/asyncpg | qdrant-client |
| Hybrid search | Manual (BM25 separate) | Built-in |
| Performance | Good up to ~1M vectors | Better at 1M+ vectors |
| Demo simplicity | `docker-compose up` — one service | Two services |
| Regulatory corpus size | <50K chunks (manageable) | Would shine at scale |
| Portfolio signal | Shows restraint / pragmatism | Shows knowledge of specialized tools |

**Decision:** pgvector for MVP. The NBC 2016 + Part 8 corpus will produce at most ~30,000 chunks. pgvector with HNSW indexing handles this trivially. Note pgvector in your architecture document. Add Qdrant as a noted upgrade path.

**BM25 with pgvector:** Implemented via `rank_bm25` Python library, in-process. No Elasticsearch needed.

### 13.3 LLM Authority Boundaries (Enforced in Code)

```python
# This is a hard architectural boundary — not a guideline

class LLMClient:
    """
    The LLM client is ONLY used for:
    1. Generating natural-language violation explanations
    2. Answering regulatory questions via RAG
    3. Summarizing retrieved regulation text
    
    The LLM MUST NOT:
    - Evaluate numerical compliance ("is 800mm wide enough?")
    - Call any compliance rule functions
    - Return structured ComplianceResult objects
    - Make pass/fail determinations
    
    All compliance evaluation happens in ComplianceEngine BEFORE LLM is called.
    LLM receives ComplianceResult and explains it — it does not create it.
    """
    
    def explain_violation(self, result: ComplianceResult, context_chunks: list[str]) -> str:
        """Takes a COMPLETED ComplianceResult and generates an explanation."""
        ...
    
    def answer_regulatory_question(self, query: str, chunks: list[RegulationChunk]) -> RAGResponse:
        """Answers user questions about regulations. No compliance evaluation."""
        ...
```

---

## PART 14 — AI/ML ARCHITECTURE

### 14.1 ML Component Classification

| Component | Approach | Why |
|---|---|---|
| Sketch binarization | Deterministic (Otsu/adaptive) | No training data needed, reliable for clean sketches |
| Line detection | Deterministic (Hough) | Well-understood, explainable, sufficient for MVP |
| Room segmentation (Mode A) | Deterministic (flood fill + contour) | Avoids ML dependency for MVP |
| Room segmentation (Mode B DXF) | Deterministic (ezdxf layer parsing) | DXF has explicit structure |
| Entity classification | Deterministic (layer heuristics) | DXF layers encode entity type |
| Text extraction from drawings | pdfplumber / pytesseract | Libraries handle this without custom ML |
| Regulation extraction | RAG + LLM interpretation | Rules extracted from documents, human-reviewed |
| Compliance evaluation | Deterministic Python ONLY | ML is inappropriate for legal/regulatory evaluation |
| Egress analysis | Deterministic (Dijkstra) | Graph algorithms are exact |
| Violation explanation | LLM (GPT-4o-mini / Ollama) | NLG task appropriate for LLM |
| Regulatory Q&A | RAG + LLM | Retrieval + generation task |
| Corridor width measurement | Deterministic (Shapely + medial axis) | Geometry computation |

**ML is used only where it genuinely adds value and cannot be replaced by deterministic code.**

### 14.2 Embedding Model

- **Model:** `BAAI/bge-large-en-v1.5`
- **Library:** `sentence-transformers`
- **Dimensions:** 1024
- **Hardware:** CPU inference (200–500ms per batch of 32 chunks — acceptable for ingestion, not per-query)
- **Query encoding:** ~20ms per query on CPU (acceptable)
- **Alternative if CPU too slow:** `BAAI/bge-base-en-v1.5` (768d, 2x faster)

### 14.3 LLM Configuration

```python
# Configurable at runtime via environment variable
LLM_PROVIDER = env("LLM_PROVIDER", default="openai")

providers = {
    "openai": OpenAIClient(model="gpt-4o-mini"),
    "ollama": OllamaClient(model="mistral:7b-instruct"),
    "anthropic": AnthropicClient(model="claude-haiku"),
    "mock": MockLLMClient()  # for testing without API calls
}
```

### 14.4 Future ML Extension Points

The architecture is designed so these components can be swapped in later:

| Extension Point | Future Enhancement | Current Placeholder |
|---|---|---|
| `engines/vision/pipeline.py` | Replace Hough with CubiCasa5k deep segmentation | Classical CV |
| `engines/ingestion/image_adapter.py` | Add deep learning room labeling | Rule-based room type inference |
| `engines/rag/retrieval/reranker.py` | Cross-encoder reranking | Direct RRF fusion |
| `engines/compliance/rules/environmental/` | Physical daylight simulation (Radiance) | Window/floor ratio heuristic |

---

## PART 15 — DATABASE SCHEMA

### 15.1 Entity Relationship Overview

```
User
 └── Project (many)
       └── UploadedDocument (many)
       └── AnalysisRun (many)
             └── FloorPlanSnapshot (canonical CGM as JSONB)
             └── ComplianceResult (many)
                   └── Violation (many, with geometry)
             └── Report (one)
             └── Recommendation (many)

RegulationDocument
 └── RegulationChunk (many, with vector embedding)

ComplianceRule (reference table)
```

### 15.2 SQL Schema

```sql
-- USERS
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255),
    hashed_pw   VARCHAR(255),
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- PROJECTS
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- UPLOADED DOCUMENTS
CREATE TABLE uploaded_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    file_format     VARCHAR(50) NOT NULL,   -- "dxf", "pdf", "image"
    file_size_bytes BIGINT NOT NULL,
    storage_path    TEXT NOT NULL,          -- relative path or MinIO key
    mime_type       VARCHAR(100),
    checksum_sha256 VARCHAR(64),
    uploaded_at     TIMESTAMPTZ DEFAULT now()
);

-- ANALYSIS RUNS
CREATE TABLE analysis_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    document_id     UUID REFERENCES uploaded_documents(id),
    status          VARCHAR(50) NOT NULL,   -- "queued", "processing", "complete", "failed"
    stage           VARCHAR(100),           -- current pipeline stage
    progress_pct    INTEGER DEFAULT 0,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    error_message   TEXT,
    config          JSONB DEFAULT '{}',     -- ingestion options, rule overrides
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- FLOOR PLAN SNAPSHOTS (canonical CGM stored as JSONB)
CREATE TABLE floor_plan_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    floor_data      JSONB NOT NULL,         -- CanonicalFloorPlan serialized
    bounding_box    JSONB,                  -- {xmin, ymin, xmax, ymax}
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- COMPLIANCE RULES (reference/registry)
CREATE TABLE compliance_rules (
    rule_id         VARCHAR(100) PRIMARY KEY,   -- e.g. "NBC-4-CW-001"
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    severity        VARCHAR(50) NOT NULL,
    regulation_src  VARCHAR(255),
    section         VARCHAR(100),
    is_active       BOOLEAN DEFAULT true,
    version         VARCHAR(50) DEFAULT '1.0',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- COMPLIANCE RESULTS
CREATE TABLE compliance_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    rule_id         VARCHAR(100) REFERENCES compliance_rules(rule_id),
    passed          BOOLEAN NOT NULL,
    severity        VARCHAR(50) NOT NULL,
    measured_value  NUMERIC,
    required_value  NUMERIC,
    unit            VARCHAR(20),
    message         TEXT,
    recommendation  TEXT,
    evidence        JSONB,                  -- raw measurement data
    confidence      VARCHAR(20),
    llm_explanation TEXT,                   -- generated AFTER deterministic check
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- VIOLATIONS (geometry-linked)
CREATE TABLE violations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_result_id UUID REFERENCES compliance_results(id) ON DELETE CASCADE,
    entity_type         VARCHAR(50),        -- "room", "corridor", "stair"
    entity_id           UUID,               -- references CGM entity UUID
    geometry_hint       VARCHAR(50),        -- "boundary", "centroid", "line"
    coordinates         JSONB,              -- [{x, y}, ...] for frontend rendering
    floor_level         INTEGER DEFAULT 0
);

-- RECOMMENDATIONS
CREATE TABLE recommendations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    violation_id    UUID REFERENCES violations(id),
    rule_id         VARCHAR(100),
    title           VARCHAR(255),
    description     TEXT,
    priority        INTEGER,                -- 1 = highest
    estimated_change JSONB,                 -- e.g. {"dimension": "width", "increase_by_m": 0.25}
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- REPORTS
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    json_path       TEXT,                   -- storage path to JSON report
    pdf_path        TEXT,                   -- storage path to PDF report
    summary_stats   JSONB,                  -- {total_violations, critical, major, ...}
    generated_at    TIMESTAMPTZ DEFAULT now()
);

-- REGULATION DOCUMENTS
CREATE TABLE regulation_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    code            VARCHAR(100) NOT NULL,  -- "NBC_2016"
    version         VARCHAR(50) NOT NULL,   -- "2016"
    jurisdiction    VARCHAR(100),           -- "India"
    storage_path    TEXT NOT NULL,
    total_pages     INTEGER,
    ingested_at     TIMESTAMPTZ DEFAULT now(),
    is_active       BOOLEAN DEFAULT true
);

-- REGULATION CHUNKS (RAG corpus)
CREATE TABLE regulation_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID REFERENCES regulation_documents(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    section_number  VARCHAR(100),
    section_title   VARCHAR(255),
    page_number     INTEGER,
    content_type    VARCHAR(50),            -- "rule", "table", "definition"
    raw_text        TEXT NOT NULL,
    token_count     INTEGER,
    embedding       vector(1024),           -- pgvector column
    metadata        JSONB DEFAULT '{}'
);
CREATE INDEX ON regulation_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON regulation_chunks (document_id, section_number);
```

### 15.3 Notes on Schema Design

- **No separate Room/Wall/Door tables** — the canonical floor plan is stored as JSONB in `floor_plan_snapshots`. This avoids a deeply normalized schema for data that is consumed and displayed as a unit, not queried relationally by individual entity.
- **Violations link to entity UUIDs** — these are CGM entity UUIDs embedded in the JSONB, giving the frontend everything it needs to render violation overlays.
- **pgvector** replaces a separate vector database. The `regulation_chunks.embedding` column is an HNSW-indexed `vector(1024)`.
- **Reports store file paths** — large binaries (PDF) are stored on disk/MinIO, not in the DB.

---

## PART 16 — API ARCHITECTURE

### 16.1 API Design Principles

- REST-only for MVP. GraphQL adds complexity without benefit at this scale.
- All routes prefixed: `/api/v1/`
- OpenAPI/Swagger auto-generated by FastAPI
- Pydantic request/response schemas for every endpoint
- WebSocket for job status streaming

### 16.2 Route Map

```
AUTH
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh
  GET    /api/v1/auth/me

PROJECTS
  GET    /api/v1/projects/
  POST   /api/v1/projects/
  GET    /api/v1/projects/{project_id}
  PUT    /api/v1/projects/{project_id}
  DELETE /api/v1/projects/{project_id}

DOCUMENTS
  POST   /api/v1/projects/{project_id}/documents/upload
  GET    /api/v1/projects/{project_id}/documents/
  GET    /api/v1/documents/{document_id}
  DELETE /api/v1/documents/{document_id}

ANALYSIS
  POST   /api/v1/projects/{project_id}/analyze         ← triggers analysis
  GET    /api/v1/analysis/{run_id}                     ← full results
  GET    /api/v1/analysis/{run_id}/status              ← polling fallback
  GET    /api/v1/analysis/{run_id}/floor-plan          ← CGM geometry
  GET    /api/v1/analysis/{run_id}/graph               ← graph JSON
  GET    /api/v1/analysis/{run_id}/violations          ← violations list
  GET    /api/v1/analysis/{run_id}/recommendations     ← recommendations
  WS     /ws/analysis/{run_id}/status                  ← streaming progress

REPORTS
  GET    /api/v1/analysis/{run_id}/report/json         ← JSON download
  GET    /api/v1/analysis/{run_id}/report/pdf          ← PDF download

RAG
  POST   /api/v1/rag/query                             ← regulatory question
  GET    /api/v1/rag/documents/                        ← regulation library
  POST   /api/v1/rag/documents/ingest                  ← admin: ingest PDF
  GET    /api/v1/rag/documents/{doc_id}/chunks/        ← debug/admin

RULES
  GET    /api/v1/compliance/rules/                     ← list active rules
  GET    /api/v1/compliance/rules/{rule_id}            ← rule detail

ADMIN
  GET    /api/v1/admin/stats
  POST   /api/v1/admin/regulations/ingest
```

### 16.3 Key Response Schemas (Pydantic)

```python
class AnalysisStatusResponse(BaseModel):
    run_id: UUID
    status: str
    stage: str | None
    progress_pct: int
    message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    error: str | None

class ViolationResponse(BaseModel):
    id: UUID
    rule_id: str
    rule_title: str
    severity: str
    passed: bool
    message: str
    recommendation: str | None
    llm_explanation: str | None
    regulation_source: str
    measured_value: float | None
    required_value: float | None
    unit: str | None
    geometry: list[ViolationGeometryResponse]  # for frontend overlay

class ViolationGeometryResponse(BaseModel):
    entity_type: str
    entity_id: str
    geometry_hint: str
    coordinates: list[dict]  # [{x: float, y: float}]
    floor_level: int
```

---

## PART 17 — ASYNC PROCESSING ARCHITECTURE

### 17.1 MVP: FastAPI BackgroundTasks + WebSocket

**Decision:** Use `FastAPI BackgroundTasks` for MVP.

**Rationale:**
- A typical DXF floor plan (residential, 1 floor, ~200 entities): **2–8 seconds**
- A complex multi-floor DXF (~500 entities): **10–20 seconds**
- Vector PDF (requires more heuristic processing): **5–15 seconds**
- Mode A image pipeline: **3–10 seconds**

These durations do NOT require a distributed task queue for a single-user or low-concurrency demo. Adding Celery introduces Redis as a dependency, complicates Docker Compose, and adds failure modes without benefit at MVP scale.

**Upgrade trigger:** Add Celery when: (a) concurrent users exceed 5, or (b) processing takes >60 seconds routinely.

### 17.2 Job Status Model

```python
# In-memory job store for MVP (upgrade to Redis-backed for Celery)
class JobStatus(BaseModel):
    job_id: UUID
    status: Literal["queued", "processing", "complete", "failed"]
    stage: str
    progress_pct: int
    message: str
    created_at: datetime
    updated_at: datetime
    result_id: UUID | None  # AnalysisRun ID on completion
    error: str | None

# Stages emitted during processing:
STAGES = [
    ("validating",      5,  "Validating file..."),
    ("parsing",         20, "Parsing {format} file..."),
    ("extracting",      40, "Extracting spatial entities..."),
    ("building_graph",  55, "Building room connectivity graph..."),
    ("compliance",      70, "Running compliance rules..."),
    ("rag_explain",     80, "Generating explanations..."),
    ("reporting",       90, "Building report..."),
    ("complete",        100,"Analysis complete."),
]
```

### 17.3 WebSocket Protocol

```
Client → Server: {"type": "subscribe", "job_id": "uuid"}
Server → Client: {"type": "status", "job_id": "uuid", "stage": "parsing", "progress": 20, "message": "..."}
Server → Client: {"type": "complete", "job_id": "uuid", "run_id": "uuid"}
Server → Client: {"type": "error", "job_id": "uuid", "message": "..."}
```

---

## PART 18 — FRONTEND ARCHITECTURE

### 18.1 Technology Stack

- **Framework:** React 18 with TypeScript
- **Build tool:** Vite 5
- **State management:** Zustand (lightweight, no Redux complexity)
- **Data fetching:** TanStack Query (React Query) — handles caching, loading states, refetching
- **Routing:** React Router v6
- **Styling:** Vanilla CSS with CSS custom properties (design tokens)
- **Icons:** Lucide React
- **Floor plan rendering:** SVG (see Section 19)
- **Graph visualization:** React Flow (for room graph view)
- **Charts/metrics:** Recharts
- **PDF viewer:** react-pdf (for uploaded PDF preview)
- **WebSocket:** Native browser WebSocket API

### 18.2 Page Structure

```
/                     ← Landing page
/auth/login           ← Login
/auth/register        ← Register
/dashboard            ← Project list
/projects/new         ← Create project
/projects/:id         ← Project detail + analysis history
/projects/:id/upload  ← Upload new document
/analysis/:runId      ← Analysis workspace (main product view)
/analysis/:runId/report ← Report viewer
/regulations          ← Regulation library + RAG chat
/settings             ← User settings
/admin                ← Admin panel (regulation ingestion)
```

### 18.3 Analysis Workspace Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: BuildWise AI | Project Name | Analysis #N | Export | ⚙️   │
├──────────────────┬────────────────────────────┬────────────────────┤
│  LEFT PANEL      │   CENTER: FLOOR PLAN VIEW  │  RIGHT PANEL       │
│  (240px)         │   (flexible, ~60% width)   │  (320px)           │
│                  │                             │                    │
│  Floor navigator │   SVG interactive viewer   │  Context panel     │
│  ─────────────   │   - pan / zoom              │  ─────────────     │
│  Ground Floor ●  │   - room outlines           │  [on room click]   │
│  First Floor  ○  │   - violation overlays      │  Room: Bedroom 1   │
│  Second Floor ○  │   - egress route highlight  │  Area: 18.4 m²     │
│                  │   - door/window markers     │  Violations: 0     │
│  ─────────────   │   - hover tooltips          │                    │
│  Room list       │                             │  [on violation]    │
│  ─────────────   │                             │  Rule: NBC-4-CW    │
│  🔴 Corridor C03 │                             │  Severity: CRITICAL│
│  🟡 Room R07     │                             │  Measured: 750mm   │
│  ✅ Bedroom 1    │                             │  Required: 1000mm  │
│  ✅ Kitchen      │                             │  Clause: 4.2.1     │
│                  │                             │  [Explanation...]  │
├──────────────────┴────────────────────────────┴────────────────────┤
│  BOTTOM PANEL: Compliance Summary                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐  │
│  │ 🔴 CRITICAL  │ │ 🟡 MAJOR    │ │ ⚠️ MINOR     │ │ ℹ️ INFO  │  │
│  │      3       │ │      2       │ │      5       │ │     8    │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘  │
│  [Violations Tab] [Recommendations Tab] [Graph Tab] [Metrics Tab]  │
└─────────────────────────────────────────────────────────────────────┘
```

### 18.4 Visual Design System

- **Mode:** Dark (default) with light mode toggle
- **Primary palette:** Deep graphite (`#0F1117`) + Electric indigo (`#6366F1`) + Emerald (`#10B981`)
- **Typography:** Inter (Google Fonts) — professional, technical, legible
- **Severity colors:** Red `#EF4444` (critical), Amber `#F59E0B` (major), Yellow `#EAB308` (minor), Slate `#64748B` (info)
- **Floor plan background:** `#1E2030` with grid lines in `#2D3148`
- **No excessive animations** — subtle transitions only (200ms ease)
- **Data-dense but not cluttered** — information hierarchy is strict

### 18.5 Frontend State Management

```
Zustand stores:
  useAuthStore       ← user, token, isAuthenticated
  useProjectStore    ← current project, analysis runs
  useAnalysisStore   ← current run, violations, floor plan data
  useFloorPlanStore  ← selected floor, selected room, selected violation
  useJobStore        ← live job status (WebSocket-driven)
  useRAGStore        ← conversation history, loading state
```

---

## PART 19 — FLOOR PLAN VIEWER ARCHITECTURE

### 19.1 SVG vs Canvas Decision

**Decision: SVG for MVP**

| Factor | SVG | Canvas |
|---|---|---|
| DOM interaction | Native (click, hover on elements) | Manual hit-testing |
| Accessibility | Screen-reader compatible | Not accessible |
| Scalability | Good up to ~5,000 elements | Better at 50,000+ |
| CSS styling | Full CSS support | Manual render |
| Animation | CSS transitions | requestAnimationFrame |
| React integration | Direct JSX elements | imperative API |
| Violation overlays | CSS class switching | Manual redraw |
| Export to SVG file | Trivial (serialize DOM) | Canvas.toDataURL (raster) |

**Verdict:** A residential floor plan has <500 drawing elements. SVG is ideal. Canvas becomes necessary only at architectural-scale buildings with thousands of entities.

### 19.2 SVG Data Contract (Backend → Frontend)

The backend `/api/v1/analysis/{run_id}/floor-plan` endpoint returns:

```json
{
  "view_box": "0 0 45.2 32.8",
  "units": "meters",
  "floors": [
    {
      "floor_level": 0,
      "label": "Ground Floor",
      "elements": {
        "walls": [
          {
            "id": "uuid-wall-1",
            "x1": 0.0, "y1": 0.0, "x2": 8.5, "y2": 0.0,
            "thickness": 0.23,
            "wall_type": "exterior",
            "confidence": "high"
          }
        ],
        "rooms": [
          {
            "id": "uuid-room-1",
            "label": "Bedroom 1",
            "room_type": "bedroom",
            "polygon": [[2.0, 0.0], [6.0, 0.0], [6.0, 4.5], [2.0, 4.5]],
            "centroid": {"x": 4.0, "y": 2.25},
            "area": 18.0,
            "confidence": "high",
            "violation_ids": ["uuid-violation-3"]
          }
        ],
        "openings": [
          {
            "id": "uuid-opening-1",
            "type": "door",
            "x": 3.2, "y": 0.0,
            "width": 0.9,
            "angle": 0,
            "confidence": "high"
          }
        ],
        "stairs": [...],
        "exits": [...]
      }
    }
  ]
}
```

### 19.3 Violation Overlay Contract

```json
{
  "violations": [
    {
      "id": "uuid-violation-1",
      "rule_id": "NBC-4-CW-001",
      "severity": "critical",
      "entity_type": "room",
      "entity_id": "uuid-room-corridor-3",
      "geometry_hint": "boundary",
      "highlight_coordinates": [
        {"x": 6.0, "y": 2.0}, {"x": 8.5, "y": 2.0},
        {"x": 8.5, "y": 2.75}, {"x": 6.0, "y": 2.75}
      ],
      "label_position": {"x": 7.25, "y": 2.375},
      "label_text": "Width: 750mm (min 1000mm)",
      "floor_level": 0
    }
  ]
}
```

Frontend renders this as SVG `<polygon>` or `<path>` elements with a colored fill overlay and a tooltip on hover.

---

## PART 20 — VIOLATION VISUALIZATION DATA MODEL

See Section 19.3 for the full contract.

### 20.1 Rendering Strategy per Violation Type

| Violation Type | Geometry Element | Visual Representation |
|---|---|---|
| Corridor too narrow | Room polygon (corridor) | Red semi-transparent fill + border |
| Travel distance exceeded | Graph path | Red dashed line along egress route |
| Dead-end corridor | Room polygon | Orange fill + dead-end icon |
| Exit inaccessible | Exit node | Red X marker at exit position |
| Insufficient window area | Room polygon | Yellow hatch pattern fill |
| Stair width too narrow | Stair polygon | Red border + measurement label |
| Door too narrow | Opening indicator | Red door symbol |
| Riser/tread violation | Stair polygon | Amber fill |

### 20.2 Violation Severity Colors

```css
--violation-critical: rgba(239, 68, 68, 0.35);   /* red */
--violation-major:    rgba(245, 158, 11, 0.35);   /* amber */
--violation-minor:    rgba(234, 179, 8, 0.25);    /* yellow */
--violation-warning:  rgba(100, 116, 139, 0.25);  /* slate */
```

---

## PART 21 — REPORT ARCHITECTURE

### 21.1 JSON Report Schema

```json
{
  "report_id": "uuid",
  "generated_at": "2026-09-15T16:30:00Z",
  "schema_version": "1.0",
  "project": {
    "id": "uuid",
    "name": "Residential Block A",
    "description": "..."
  },
  "analysis_run": {
    "id": "uuid",
    "document": "floor_plan_block_a.dxf",
    "analyzed_at": "2026-09-15T16:28:45Z",
    "input_format": "dxf"
  },
  "summary": {
    "overall_status": "NON_COMPLIANT",
    "compliance_score": 72,
    "total_rules_evaluated": 11,
    "violations": {
      "critical": 2,
      "major": 1,
      "minor": 3,
      "warning": 5
    },
    "floors_analyzed": 1,
    "rooms_analyzed": 8
  },
  "violations": [
    {
      "id": "uuid",
      "rule_id": "NBC-4-CW-001",
      "title": "Minimum Corridor Width",
      "severity": "critical",
      "regulation_source": "NBC 2016, Part 4, Clause 4.2.1",
      "measured_value": 0.75,
      "required_value": 1.00,
      "unit": "meters",
      "message": "Corridor C-03 width is 750mm, minimum required is 1000mm.",
      "recommendation": "Increase corridor width by at least 250mm.",
      "explanation": "This corridor serves as a primary means of egress...",
      "evidence": {
        "entity_id": "uuid-room-corridor-3",
        "measurement_method": "shapely_medial_axis",
        "measurement_points": [{"x": 6.2, "y": 2.3}, {"x": 8.4, "y": 2.3}]
      }
    }
  ],
  "recommendations": [...],
  "regulation_references": [
    {
      "code": "NBC 2016",
      "part": "Part 4",
      "section": "4.2.1",
      "title": "Means of Egress — Width",
      "relevant_text": "..."
    }
  ],
  "floor_plan_stats": {
    "total_area_m2": 248.5,
    "total_rooms": 8,
    "total_exits": 2,
    "average_travel_distance_m": 18.4,
    "max_travel_distance_m": 28.7
  }
}
```

### 21.2 PDF Report Structure

```
Page 1: Cover — Project name, date, overall status badge, BuildWise AI
Page 2: Executive Summary — compliance score, violation breakdown, key findings
Page 3+: Violations — one per page or grouped by severity
         Each violation: title, rule, measured vs required, recommendation, regulation text
Page N-1: Floor Plan Annotations — SVG floor plan with violation markers embedded
Page N: Regulation References
```

Generated via WeasyPrint from Jinja2 HTML template with print CSS.

---

## PART 22 — SECURITY ARCHITECTURE

### 22.1 File Upload Security

```python
ALLOWED_EXTENSIONS = {".dxf", ".pdf", ".png", ".jpg", ".jpeg"}
MAGIC_BYTES = {
    ".dxf":  None,          # DXF is text-based; validate first line
    ".pdf":  b"%PDF-",      # PDF magic
    ".png":  b"\x89PNG",    # PNG magic
    ".jpg":  b"\xff\xd8\xff" # JPEG magic
}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB

def validate_upload(file: UploadFile) -> ValidationResult:
    # 1. Check extension
    # 2. Read first 8 bytes, check magic
    # 3. Check total size
    # 4. Generate safe filename (UUID-based, no path components)
    # 5. Store in isolated temp directory
```

### 22.2 Storage Security

- Uploaded files stored at: `storage/{user_id}/{project_id}/{uuid4}{extension}`
- No user-controlled path components in storage paths
- Temp files cleaned up after processing (or on failure)
- Files never served directly from the backend; presigned URLs or streaming download via API only

### 22.3 API Security

- All endpoints except `/api/v1/auth/*` require authentication (when auth is enabled)
- User can only access their own projects/analysis runs
- Project-level data isolation enforced in all SQL queries (always filter by `user_id`)
- Rate limiting: `slowapi` (FastAPI rate limiting library)
- CORS configured to frontend origin only

### 22.4 DXF/PDF Processing Safety

- DXF files are processed by ezdxf in a stateless function (no execution of embedded scripts)
- PDF files are processed by pdfplumber (does not execute embedded JavaScript)
- Large files: streaming processing with memory limits
- Malformed files: caught by try/except, return structured error, clean up temp file

### 22.5 Data Isolation

- Multi-user: all queries include `WHERE project.user_id = current_user.id`
- Uploaded files: stored in user-scoped subdirectory
- Analysis runs: ownership checked at API layer before any DB query
- No cross-user data exposure in any response schema

---

## PART 23 — TESTING STRATEGY

### 23.1 Test Categories

```
tests/
├── unit/
│   ├── test_compliance_rules/
│   │   ├── test_corridor_width.py      ← pass, fail, edge
│   │   ├── test_travel_distance.py
│   │   ├── test_stair_width.py
│   │   └── ...
│   ├── test_geometry/
│   │   ├── test_area_calculator.py
│   │   ├── test_room_detector.py
│   │   └── test_coordinate_normalizer.py
│   └── test_graph/
│       ├── test_graph_builder.py
│       ├── test_egress_analyzer.py
│       └── test_dead_end_detection.py
├── integration/
│   ├── test_dxf_to_cgm.py             ← DXF file → canonical model
│   ├── test_cgm_to_graph.py           ← canonical model → graph
│   ├── test_graph_to_compliance.py    ← graph → violations
│   ├── test_rag_ingestion.py          ← PDF → chunks → embeddings
│   └── test_rag_retrieval.py          ← query → retrieved chunks
└── e2e/
    ├── test_full_dxf_pipeline.py      ← upload DXF → get report
    ├── test_full_image_pipeline.py    ← upload image → get report
    └── test_rag_query.py              ← regulatory Q&A end-to-end
```

### 23.2 Compliance Rule Test Pattern

```python
# tests/unit/test_compliance_rules/test_corridor_width.py

class TestCorridorWidthRule:
    def test_pass_case(self, floor_plan_factory):
        """Corridor exactly at minimum (1000mm) must pass."""
        plan = floor_plan_factory.with_corridor(width_m=1.0)
        results = CorridorWidthRule().check(plan)
        assert all(r.passed for r in results)

    def test_fail_case(self, floor_plan_factory):
        """Corridor below minimum (750mm) must fail with CRITICAL severity."""
        plan = floor_plan_factory.with_corridor(width_m=0.75)
        results = CorridorWidthRule().check(plan)
        assert any(not r.passed for r in results)
        assert any(r.severity == Severity.CRITICAL for r in results)
        assert results[0].measured_value == pytest.approx(0.75)
        assert results[0].required_value == pytest.approx(1.0)

    def test_edge_case(self, floor_plan_factory):
        """Corridor at exactly 999mm (1mm under) must fail."""
        plan = floor_plan_factory.with_corridor(width_m=0.999)
        results = CorridorWidthRule().check(plan)
        assert any(not r.passed for r in results)
```

### 23.3 Synthetic Test Floor Plans

Create a set of synthetic DXF floor plans covering:
- Simple 1-floor residential (baseline)
- Multi-floor residential
- Floor plan with deliberately narrow corridors (fail case)
- Floor plan with excessive travel distance (fail case)
- Floor plan with dead-end corridors (fail case)
- Floor plan with missing exits (fail case)
- Floor plan with insufficient window area (fail case)
- Perfect compliant floor plan (all pass)

These are stored in `tests/fixtures/floor_plans/` and are the ground truth for integration tests.

---

## PART 24 — EVALUATION STRATEGY

### 24.1 Geometry Extraction Metrics

| Metric | How to Measure | Dataset Needed |
|---|---|---|
| Wall detection recall | (walls detected / total walls in ground truth) | Annotated DXF test set |
| Room detection F1 | Precision × recall for room polygons | Annotated floor plans |
| Room area error | Mean absolute error vs ground truth area | Annotated floor plans |
| Opening detection recall | Doors/windows found vs ground truth | Annotated floor plans |
| IoU (rooms) | Overlap of detected polygon vs ground truth polygon | Annotated floor plans |

**Dataset status:** *Requires creation.* Use synthetic DXF files with known ground truth. CubiCasa5k images can be used for Mode A evaluation.

### 24.2 Compliance Engine Metrics

| Metric | Definition |
|---|---|
| True Positive | Rule correctly flags a real violation |
| True Negative | Rule correctly passes a compliant design |
| False Positive | Rule incorrectly flags a compliant design |
| False Negative | Rule misses a real violation |
| Precision | TP / (TP + FP) |
| Recall | TP / (TP + FN) |

**Measurement approach:** Run compliance engine against synthetic test floor plans with known violation status. Each rule needs at least 3 test cases.

### 24.3 System Performance Metrics

| Metric | Target | Measurement |
|---|---|---|
| DXF analysis latency (simple) | < 10 seconds | benchmark test |
| DXF analysis latency (complex) | < 30 seconds | benchmark test |
| Mode A image pipeline | < 15 seconds | benchmark test |
| RAG query latency | < 3 seconds | benchmark test |
| API response time (non-analysis) | < 200ms | load test |
| Memory usage (analysis pipeline) | < 1 GB | profiling |

### 24.4 RAG Metrics

| Metric | How to Measure |
|---|---|
| Retrieval relevance | Manual evaluation of top-5 retrieved chunks per query |
| Citation accuracy | Does citation section number match the retrieved text? |
| Groundedness | Does LLM answer only use information from retrieved chunks? |
| Answer correctness | Manual expert review of sampled Q&A pairs |

**Dataset status:** *Requires question set creation.* Create 20–30 regulation questions with expected answers from NBC 2016.

---

## PART 25 — REPOSITORY STRUCTURE

```
buildwise/
│
├── frontend/                          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── floorplan/             # SVG viewer components
│   │   │   ├── violations/            # Violation overlay, list, detail
│   │   │   ├── compliance/            # Results panel, score display
│   │   │   ├── rag/                   # Regulatory chat panel
│   │   │   ├── reports/               # Report viewer
│   │   │   └── shared/               # Buttons, cards, inputs, etc.
│   │   ├── pages/
│   │   ├── stores/                    # Zustand stores
│   │   ├── api/                       # API client (axios/fetch wrappers)
│   │   ├── types/                     # TypeScript interfaces matching Pydantic schemas
│   │   ├── hooks/                     # Custom React hooks
│   │   └── styles/                    # CSS variables, global styles
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/
│   ├── app/                           # FastAPI application
│   │   ├── main.py                    # App factory
│   │   ├── config.py                  # Settings (pydantic-settings)
│   │   ├── dependencies.py            # FastAPI dependency injection
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── projects.py
│   │   │   │   ├── documents.py
│   │   │   │   ├── analysis.py
│   │   │   │   ├── reports.py
│   │   │   │   ├── rag.py
│   │   │   │   └── admin.py
│   │   │   └── websocket.py
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   ├── services/                  # Business logic orchestration
│   │   │   ├── analysis_service.py
│   │   │   ├── project_service.py
│   │   │   ├── report_service.py
│   │   │   └── rag_service.py
│   │   ├── storage/                   # File storage abstraction
│   │   │   ├── base.py
│   │   │   ├── local.py
│   │   │   └── minio.py
│   │   └── jobs/                      # Background task management
│   │       ├── manager.py
│   │       └── pipeline.py            # Orchestrates engine calls
│   │
│   ├── engines/                       # Core Python processing engines
│   │   ├── ingestion/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── dxf_adapter.py
│   │   │   ├── pdf_adapter.py
│   │   │   ├── image_adapter.py
│   │   │   └── ifc_adapter.py         # [STUB for v2]
│   │   ├── geometry/
│   │   │   ├── __init__.py
│   │   │   ├── room_detector.py
│   │   │   ├── area_calculator.py
│   │   │   ├── opening_detector.py
│   │   │   ├── corridor_analyzer.py
│   │   │   └── spatial_index.py
│   │   ├── graph/
│   │   │   ├── __init__.py
│   │   │   ├── builder.py
│   │   │   ├── traversal.py
│   │   │   ├── egress_analyzer.py
│   │   │   └── export.py
│   │   ├── compliance/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── engine.py
│   │   │   ├── result.py
│   │   │   ├── rules/
│   │   │   │   ├── egress/
│   │   │   │   ├── dimensions/
│   │   │   │   ├── stairs/
│   │   │   │   ├── environmental/
│   │   │   │   └── fire_safety/
│   │   │   └── yaml_rules/
│   │   ├── rag/
│   │   │   ├── __init__.py
│   │   │   ├── ingestion/
│   │   │   ├── retrieval/
│   │   │   ├── generation/
│   │   │   └── store/
│   │   ├── vision/
│   │   │   ├── __init__.py
│   │   │   ├── pipeline.py
│   │   │   ├── preprocessing.py
│   │   │   ├── binarizer.py
│   │   │   ├── morphology.py
│   │   │   ├── line_detector.py
│   │   │   ├── snapper.py
│   │   │   ├── contour_extractor.py
│   │   │   ├── vectorizer.py
│   │   │   ├── confidence.py
│   │   │   └── future/
│   │   └── reporting/
│   │       ├── __init__.py
│   │       ├── schema.py
│   │       ├── json_reporter.py
│   │       ├── pdf_reporter.py
│   │       └── templates/
│   │
│   ├── alembic/                       # Database migrations
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── pytest.ini
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│       ├── floor_plans/               # Synthetic DXF/PDF/image test files
│       └── regulations/               # Sample regulation PDF for tests
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── compliance_rules/
│   └── development/
│
├── data/
│   ├── regulations/                   # NBC 2016 PDF (not committed to git)
│   └── sample_floor_plans/
│
├── scripts/
│   ├── ingest_regulations.py          # CLI: ingest regulation PDFs
│   ├── create_test_dxf.py            # CLI: generate synthetic test floor plans
│   └── seed_compliance_rules.py      # CLI: seed rule registry to DB
│
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## PART 26 — DEPENDENCY / LIBRARY LIST

### Backend (Python)

| Library | Version | Purpose | Reason Included |
|---|---|---|---|
| `fastapi` | ^0.111 | API framework | Async, Pydantic, OpenAPI auto-docs |
| `uvicorn[standard]` | ^0.29 | ASGI server | Production-grade async server |
| `pydantic` | ^2.7 | Data validation/schemas | FastAPI native, schema enforcement |
| `pydantic-settings` | ^2.2 | Config from env | 12-factor app configuration |
| `sqlalchemy[asyncio]` | ^2.0 | ORM | Python standard ORM with async |
| `asyncpg` | ^0.29 | Async PostgreSQL driver | Required for SQLAlchemy async |
| `alembic` | ^1.13 | DB migrations | Schema version control |
| `ezdxf` | ^1.3 | DXF parsing | Only mature Python DXF library |
| `pdfplumber` | ^0.11 | PDF text/path extraction | Best native PDF content extraction |
| `pytesseract` | ^0.3 | OCR fallback | Tesseract Python binding |
| `opencv-python-headless` | ^4.9 | Computer vision | Headless (no GUI deps), full OpenCV |
| `shapely` | ^2.0 | Geometry operations | Polygon areas, intersections, spatial ops |
| `networkx` | ^3.3 | Graph algorithms | Egress analysis, graph traversal |
| `numpy` | ^1.26 | Numerical arrays | Line math, coordinate transforms |
| `scipy` | ^1.13 | Spatial indexing, medial axis | `scipy.spatial.cKDTree`, medial axis |
| `sentence-transformers` | ^3.0 | BGE embedding model | Local embedding, no API key needed |
| `rank-bm25` | ^0.2 | BM25 sparse retrieval | In-process BM25, no external service |
| `pgvector` | ^0.3 | pgvector Python adapter | Connect SQLAlchemy to vector column |
| `openai` | ^1.35 | LLM API client | GPT-4o-mini for explanations |
| `ollama` | ^0.2 | Local LLM client | Offline/demo mode LLM |
| `weasyprint` | ^62 | PDF generation | Python-native PDF from HTML |
| `jinja2` | ^3.1 | HTML templates | Report template rendering |
| `python-multipart` | ^0.0.9 | File upload parsing | FastAPI file upload support |
| `python-jose[cryptography]` | ^3.3 | JWT tokens | Auth token creation/validation |
| `passlib[bcrypt]` | ^1.7 | Password hashing | Secure credential storage |
| `slowapi` | ^0.1 | Rate limiting | API abuse prevention |
| `structlog` | ^24 | Structured logging | JSON logs for observability |
| `pytest` | ^8.2 | Test runner | Standard Python test framework |
| `pytest-asyncio` | ^0.23 | Async test support | Testing async FastAPI routes |
| `httpx` | ^0.27 | HTTP test client | FastAPI TestClient alternative |
| `factory-boy` | ^3.3 | Test fixtures | Floor plan factory for unit tests |

### Frontend (TypeScript/JavaScript)

| Library | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `typescript` | Type safety |
| `vite` | Build tool + dev server |
| `react-router-dom` | Client-side routing |
| `zustand` | State management |
| `@tanstack/react-query` | Server state, caching, loading |
| `axios` | HTTP client |
| `lucide-react` | Icon library |
| `recharts` | Compliance score charts |
| `@reactflow/core` | Room graph visualization |
| `react-pdf` | PDF preview |
| `react-dropzone` | File upload drag-and-drop |

---

## PART 27 — DEVELOPMENT PHASES

### Phase 0 — Project Foundation (Week 1–2)

- Repository structure setup (monorepo)
- Docker Compose: PostgreSQL + backend + frontend
- FastAPI app factory with config, logging, error handling
- SQLAlchemy models + Alembic migrations (all tables)
- Basic auth (JWT — but behind a feature flag)
- Vite + React + TypeScript scaffold
- CI: lint (ruff, mypy, eslint) + test commands defined
- README with local setup instructions

### Phase 1 — Ingestion Pipeline (Week 3–5)

- `CanonicalFloorPlan` Pydantic schema (the CGM)
- DXF adapter: walls, rooms, doors, windows, stairs (ezdxf)
- PDF adapter: vector path extraction (pdfplumber)
- Image adapter: OpenCV pipeline, Mode A classical CV
- File upload API endpoint + validation
- Storage abstraction (local filesystem)
- Synthetic test DXF floor plans (pass/fail cases)
- Unit tests: all adapters against synthetic files

### Phase 2 — Geometry + Graph Engine (Week 6–8)

- Room area + perimeter computation (Shapely)
- Corridor width measurement
- Opening assignment (doors/windows → rooms)
- NetworkX graph builder (from CGM)
- Egress analyzer: Dijkstra, dead-end detection, travel distance
- Graph JSON export for frontend
- Unit tests: geometry + graph algorithms
- Integration test: DXF → CGM → graph

### Phase 3 — Compliance Engine (Week 9–11)

- `ComplianceRule` base class + engine orchestrator
- YAML rule loader
- NBC Part 4 rules: corridor width, stair width, door width, travel distance, dead-ends, exit count
- NBC Part 8 rules: window/floor ratio, ventilation ratio
- Stair rules: riser, tread
- `ComplianceResult` + `ViolationGeometry` schema
- Violation → geometry coordinate mapping
- Unit tests: every rule with pass/fail/edge cases
- Integration test: graph → compliance

### Phase 4 — RAG System (Week 12–14)

- Regulation PDF ingestion (pdfplumber + pytesseract)
- Section-aware chunking + metadata
- BGE embedding + pgvector storage
- BM25 index (rank_bm25)
- Hybrid retrieval + RRF fusion
- LLM client (OpenAI + Ollama abstraction)
- Violation explanation generation
- RAG Q&A endpoint
- Integration tests: ingestion → retrieval accuracy

### Phase 5 — Report Engine (Week 15–16)

- JSON report schema + generator
- Jinja2 HTML report template
- WeasyPrint PDF generation
- Annotated floor plan in report (SVG embedded)
- API endpoints: download JSON + PDF reports

### Phase 6 — Frontend (Week 17–20)

- Design system: CSS variables, typography, colors
- Layout: analysis workspace (3-panel)
- SVG floor plan viewer: pan, zoom, room polygons, walls, openings
- Violation overlay rendering
- Left panel: floor navigator + room list
- Right panel: violation detail + recommendation
- Bottom panel: compliance summary + tabs
- Processing progress UI (WebSocket integration)
- Dashboard + project management pages
- RAG chat panel
- Report download UI

### Phase 7 — Integration, Testing, Polish (Week 21–24)

- End-to-end tests: full pipeline
- Performance benchmarking
- Evaluation metrics against synthetic test set
- Error handling review
- Security review (file upload, data isolation)
- README + documentation
- Docker Compose production config
- Demo video / portfolio presentation

---

## PART 28 — RISKS

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| DXF layer naming inconsistency | HIGH | MEDIUM | Layer heuristics + user-configurable layer mapping |
| PDF vector extraction is too heuristic | HIGH | MEDIUM | Accept lower accuracy; mark entities with confidence; fallback to user correction |
| Mode A (sketch) quality is insufficient for compliance | MEDIUM | LOW | Mode A outputs CGM with `confidence: low`; compliance runs but results are advisory |
| NBC clause values incorrect (we invented numbers) | HIGH | HIGH | All values marked `REQUIRES VERIFICATION`; implement a regulation review step before shipping rules |
| BGE embedding quality insufficient for legal text | LOW | MEDIUM | Evaluate retrieval quality; fallback to OpenAI embeddings if needed |
| LLM generates incorrect explanations | MEDIUM | LOW | LLM only explains pre-computed results; monitor output, add disclaimers |
| WeasyPrint PDF rendering issues | LOW | LOW | Well-tested library; CSS print layout has known quirks; test early |
| Multi-floor graph complexity | MEDIUM | MEDIUM | Single-floor is default; multi-floor is opt-in; test with simple 2-floor synthetic case |
| Corridor width measurement accuracy (Mode A) | HIGH | MEDIUM | Use Shapely medial axis approximation; mark as heuristic; require confidence >= medium |
| Scope creep (adding features during dev) | HIGH | HIGH | Strict MVP scope; anything not in Phase 0–6 is deferred to roadmap |

---

## PART 29 — INTENTIONAL TECHNICAL DEBT

We are consciously accepting the following shortcuts for MVP:

| Debt | Accepted Because | Remediation Path |
|---|---|---|
| FastAPI BackgroundTasks instead of Celery | Sufficient for demo/portfolio concurrency | Add Celery + Redis when multi-user load demands it |
| pgvector instead of Qdrant | No infrastructure overhead; sufficient at MVP scale | Qdrant if vector corpus exceeds 500K chunks |
| No cross-encoder reranker deployed | BGE + BM25 hybrid is sufficient for MVP | Add `cross-encoder/ms-marco-MiniLM-L-6-v2` in Phase 4 polish |
| Floor plan stored as JSONB (not normalized tables) | Analysis reads CGM as a unit; normalization adds no query benefit | Migrate to normalized tables if we need entity-level queries |
| No auth in demo mode | Speeds up portfolio demo; avoids login friction | JWT is scaffolded; enable with config flag |
| Local filesystem storage | Simpler Docker setup | Abstract storage interface allows swap to MinIO with no code change |
| BM25 index rebuilt in-memory | Fast enough for <100K chunks | Move to persistent BM25 index (disk-backed) at scale |
| Mode A produces uncertain geometry | Classical CV limitation | Replace with deep learning segmentation in v2 |
| NBC rules need source verification | We don't fabricate values | Manual review of NBC 2016 document before each rule goes live |

---

## PART 30 — FUTURE ROADMAP

### v1.1 — Post-MVP Enhancements
- Celery + Redis for production concurrency
- Cross-encoder reranking in RAG
- Multi-floor egress visualization
- User override / variance acknowledgment
- Improved Mode A: better sketch quality handling

### v2.0 — Major Feature Release
- IFC file support (ifcopenshell)
- Municipal bye-law support (parameterized rule schema)
- Deep learning floor plan segmentation (CubiCasa5k fine-tuning)
- Interactive violation correction (user adjusts dimensions, re-runs rules)
- Project version comparison (v1 vs v2 of a floor plan)
- Accessibility compliance (wheelchair turning radius, ramp gradients)

### v3.0 — Advanced Platform
- Full daylight simulation (Radiance integration or Honeybee)
- Multi-jurisdiction rule library
- BIM/IFC round-trip (import and export)
- Generative layout optimization (constrained optimization, not diffusion)
- Collaborative project review (multi-user annotation)
- API access for third-party integrations

---

## PART 31 — VISION-BASED BLUEPRINT ASSESSMENT & REVISED DRAWING ENGINE

> **Status:** Implemented & Verified in v1.1  
> **Route / Endpoint:** `POST /api/v1/blueprint/assess` & Frontend `/blueprint-assess`

### 31.1 Architecture Overview

The Vision Blueprint Assessment Engine bridges classical CAD analysis and rapid image/drawing screening. It accepts standard construction plan raster and vector formats (`PNG`, `JPG`, `JPEG`, `PDF`, `SVG`, `BMP`, `WEBP`, `TIFF`) and evaluates floor plans against the **National Building Code of India (NBC 2016)**.

In addition to detecting structural and regulatory flaws, it produces a **Suggested Revised Blueprint Drawing** with concrete architectural corrections mapped directly onto the plan coordinates.

### 31.2 Processing Topology

```
User Upload (PNG/JPG/PDF/SVG)
            │
            ▼
    [FastAPI /blueprint/assess]
            │
    ┌───────┴────────────────────────┐
    │                                │
    ▼                                ▼
[Gemini Vision Multimodal API]   [Classical Geometric Fallback Engine]
    │                                │
    └───────┬────────────────────────┘
            │
            ▼
    [Normalized BlueprintAssessmentResult]
     ├── issues: [BlueprintIssue (id, category, severity, coordinates)]
     ├── annotations: [BlueprintSVGAnnotation (color, pin labels)]
     ├── improvements: [ImprovementSuggestion (priority, impact)]
     └── revised_elements: [RevisedDrawingElement (type, bounds, color)]
            │
            ▼
    [Frontend Blueprint Evaluation Studio]
     ├── Suggested Revised Blueprint View (corridors, doors, barriers)
     ├── Flaws & Defect Pins View (interactive pin markers)
     └── Synchronized Side-by-Side Split View (Before vs. After)
```

### 31.3 Schema Contracts

* `BlueprintIssue`: Defines detected flaw, severity, location, recommendation, NBC code reference, and normalized coordinates `(x_pct, y_pct)`.
* `RevisedDrawingElement`: Defines architectural modification (`corridor`, `door`, `fire_barrier`, `ventilation`, `ramp`, `dimension`), coordinate bounds, styling, and design rationale.
* `BlueprintAssessmentResult`: Bundles compliance score (0–100), overall risk index, issues list, improvements list, revised drawing elements, and executive summary.

---

*This document represents the technical architecture and specifications for BuildWise AI.*
