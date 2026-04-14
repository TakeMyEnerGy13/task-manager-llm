from datetime import date, datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    due_date: Mapped[date | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True
    )

    subtasks: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys=[parent_id],
    )
    parent: Mapped["Task | None"] = relationship(
        "Task", back_populates="subtasks", remote_side=[id], foreign_keys=[parent_id]
    )
