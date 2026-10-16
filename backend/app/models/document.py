"""SQLAlchemy ORM Models — UploadedDocument"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    file_format: Mapped[str] = mapped_column(String(20), nullable=False)  # dxf, pdf, png, jpg
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="documents")
    analysis_runs: Mapped[list["AnalysisRun"]] = relationship(
        "AnalysisRun", back_populates="document"
    )

    def __repr__(self) -> str:
        return f"<UploadedDocument id={self.id} name={self.original_name!r}>"
