"""SQLAlchemy ORM Models — Regulation Documents and Chunks (RAG corpus)"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RegulationDocument(Base):
    """Represents a single PDF in the RAG regulation corpus."""
    __tablename__ = "regulation_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    volume: Mapped[str | None] = mapped_column(String(10), nullable=True)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(50), nullable=False, default="India")
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    sha256_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    total_pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_chunks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    chunks: Mapped[list["RegulationChunk"]] = relationship(
        "RegulationChunk", back_populates="document", cascade="all, delete-orphan"
    )


class RegulationChunk(Base):
    """A single searchable chunk of regulation text with embedding."""
    __tablename__ = "regulation_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regulation_documents.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    section_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    section_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    parent_section: Mapped[str | None] = mapped_column(String(50), nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content_type: Mapped[str] = mapped_column(String(30), nullable=False, default="text")
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    clause_reference: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chunk_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    # embedding column added via Alembic migration after pgvector extension is installed
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_chunk_document_index"),
    )

    document: Mapped["RegulationDocument"] = relationship("RegulationDocument", back_populates="chunks")


class StatutoryRuleReference(Base):
    """
    Direct audit link connecting a deterministic compliance rule to its verified NBC source.
    """
    __tablename__ = "statutory_rule_references"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    code_standard: Mapped[str] = mapped_column(String(50), default="NBC_2016")
    volume: Mapped[str] = mapped_column(String(10))
    part: Mapped[str] = mapped_column(String(50))
    clause: Mapped[str] = mapped_column(String(100))
    page_number: Mapped[int] = mapped_column(Integer)
    table_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    statutory_title: Mapped[str] = mapped_column(String(255))
    verbatim_text: Mapped[str] = mapped_column(Text)
    threshold_description: Mapped[str] = mapped_column(Text)
    source_filename: Mapped[str] = mapped_column(String(255))
    source_sha256: Mapped[str] = mapped_column(String(64))
    verification_status: Mapped[str] = mapped_column(String(50), default="VERIFIED", index=True)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
