"""
API v1 Router — aggregates all route modules under /api/v1/
"""

from fastapi import APIRouter

from app.api.v1 import projects, documents, analysis, compliance, reports, regulations, chat, websocket, blueprint

api_router = APIRouter()

# ─── Projects ─────────────────────────────────────────────
api_router.include_router(
    projects.router,
    prefix="/projects",
    tags=["Projects"],
)

# ─── Documents ────────────────────────────────────────────
api_router.include_router(
    documents.router,
    prefix="/documents",
    tags=["Documents"],
)

# ─── Analysis ─────────────────────────────────────────────
api_router.include_router(
    analysis.router,
    prefix="/analysis",
    tags=["Analysis"],
)

# ─── Compliance ───────────────────────────────────────────
api_router.include_router(
    compliance.router,
    prefix="/compliance",
    tags=["Compliance"],
)

# ─── Reports ──────────────────────────────────────────────
api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["Reports"],
)

# ─── Regulations (RAG Corpus) ─────────────────────────────
api_router.include_router(
    regulations.router,
    prefix="/regulations",
    tags=["Regulations"],
)

# ─── RAG Chat ─────────────────────────────────────────────
api_router.include_router(
    chat.router,
    prefix="/chat",
    tags=["Regulatory Chat"],
)

# ─── WebSocket ────────────────────────────────────────────
api_router.include_router(
    websocket.router,
    prefix="/ws",
    tags=["WebSocket"],
)

# ── Blueprint Assessment ────────────────────────────────────
api_router.include_router(
    blueprint.router,
    prefix="/blueprint",
    tags=["Blueprint Assessment"],
)
