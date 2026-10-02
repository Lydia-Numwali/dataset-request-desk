from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base

class Episode(Base):
    __tablename__ = "episodes"

    episode_id: Mapped[str] = mapped_column(String(100), primary_key=True, index=True)
    robot_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    task_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    operator_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quality: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # good, usable, bad
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    assignment = relationship("Assignment", back_populates="episode", uselist=False)

    __table_args__ = (
        Index("idx_episodes_robot_recorded", "robot_id", "recorded_at"),
        Index("idx_episodes_quality_task", "quality", "task_name"),
    )
