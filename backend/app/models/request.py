import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base

class Request(Base):
    __tablename__ = "requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    episodes_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="submitted", index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    client = relationship("User", back_populates="requests")
    history = relationship("StatusHistory", back_populates="request", cascade="all, delete-orphan", order_by="StatusHistory.changed_at.asc(), StatusHistory.id.asc()")
    assignments = relationship("Assignment", back_populates="request", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_requests_client_status", "client_id", "status"),
    )
