"""SQLAlchemy ORM Models — FloorPlanSnapshot, ComplianceRule, ComplianceResult, Violation, Report"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, Numeric,
    SmallInteger, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FloorPlanSnapshot(Base):
    """Stores the complete CanonicalFloorPlan as JSONB."""
    __tablename__ = "floor_plan_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_runs.id", ondelete="CASCADE"),
        nullable=False, unique=True
    )
    floor_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    bounding_box: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    floor_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    total_area_m2: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    analysis_run: Mapped["AnalysisRun"] = relationship("AnalysisRun", back_populates="floor_plan_snapshot")


class ComplianceRule(Base):
    """Reference table of compliance rules — the rule registry."""
    __tablename__ = "compliance_rules"

    rule_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    regulation_source: Mapped[str] = mapped_column(String(100), nullable=False)
    volume: Mapped[str | None] = mapped_column(String(10), nullable=True)
    part: Mapped[str | None] = mapped_column(String(20), nullable=True)
    section: Mapped[str | None] = mapped_column(String(30), nullable=True)
    clause: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requirement_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    parameter: Mapped[str | None] = mapped_column(String(100), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="REQUIRES_VERIFICATION"
    )
    verified_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    rule_version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    compliance_results: Mapped[list["ComplianceResult"]] = relationship(
        "ComplianceResult", back_populates="rule"
    )


class ComplianceResult(Base):
    """Results of running a compliance rule against a floor plan."""
    __tablename__ = "compliance_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_runs.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    rule_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("compliance_rules.rule_id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    measured_value: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    required_value: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    regulation_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_section: Mapped[str | None] = mapped_column(String(50), nullable=True)
    evidence: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    confidence: Mapped[str] = mapped_column(String(20), nullable=False, default="high")
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_model_used: Mapped[str | None] = mapped_column(String(50), nullable=True)
    floor_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    analysis_run: Mapped["AnalysisRun"] = relationship("AnalysisRun", back_populates="compliance_results")
    rule: Mapped["ComplianceRule"] = relationship("ComplianceRule", back_populates="compliance_results")
    violations: Mapped[list["Violation"]] = relationship(
        "Violation", back_populates="compliance_result", cascade="all, delete-orphan"
    )


class Violation(Base):
    """Geometry-linked violation for SVG overlay rendering."""
    __tablename__ = "violations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    compliance_result_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("compliance_results.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    geometry_hint: Mapped[str] = mapped_column(String(30), nullable=False)
    coordinates: Mapped[list] = mapped_column(JSONB, nullable=False)
    label_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    label_position: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    floor_level: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    compliance_result: Mapped["ComplianceResult"] = relationship(
        "ComplianceResult", back_populates="violations"
    )


class Report(Base):
    """Generated compliance report (JSON + PDF)."""
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_runs.id", ondelete="CASCADE"),
        nullable=False, unique=True
    )
    json_storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_stats: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    llm_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    analysis_run: Mapped["AnalysisRun"] = relationship("AnalysisRun", back_populates="report")
