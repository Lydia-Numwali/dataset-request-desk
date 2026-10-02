import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base

class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("requests.id", ondelete="CASCADE"), nullable=False, index=True)
    episode_id: Mapped[str] = mapped_column(String(100), ForeignKey("episodes.episode_id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    assigned_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    export_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, processing, completed, failed

    request = relationship("Request", back_populates="assignments")
    episode = relationship("Episode", back_populates="assignment")
    assigned_by = relationship("User")
    export_job = relationship("ExportJob", back_populates="assignment", uselist=False, cascade="all, delete-orphan")
