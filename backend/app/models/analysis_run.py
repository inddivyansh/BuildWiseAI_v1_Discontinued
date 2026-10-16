"""SQLAlchemy ORM Models — AnalysisRun"""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AnalysisStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETE = "complete"
    FAILED = "failed"


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploaded_documents.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=AnalysisStatus.QUEUED.value, index=True
    )
    stage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    progress_pct: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="analysis_runs")
    document: Mapped["UploadedDocument"] = relationship("UploadedDocument", back_populates="analysis_runs")
    floor_plan_snapshot: Mapped["FloorPlanSnapshot | None"] = relationship(
        "FloorPlanSnapshot", back_populates="analysis_run", uselist=False
    )
    compliance_results: Mapped[list["ComplianceResult"]] = relationship(
        "ComplianceResult", back_populates="analysis_run", cascade="all, delete-orphan"
    )
    report: Mapped["Report | None"] = relationship(
        "Report", back_populates="analysis_run", uselist=False
    )

    def __repr__(self) -> str:
        return f"<AnalysisRun id={self.id} status={self.status}>"
