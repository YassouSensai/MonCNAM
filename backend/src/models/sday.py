from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from .enums import ScheduleDays
from datetime import date

if TYPE_CHECKING:
    from .schedule import Schedule
    from .module import Module


class SDay(SQLModel, table=True):
    __tablename__ = "s_day"
    __table_args__ = {"schema": "public"}

    id: Optional[int] = Field(default=None, primary_key=True)
    day: ScheduleDays
    time: str
    # None = template récurrent ; date (lundi de la semaine) = semaine spécifique
    week_start: Optional[date] = Field(default=None, sa_column_kwargs={"nullable": True})

    schedule_id: int = Field(foreign_key="public.schedule.id")
    module_id: int = Field(foreign_key="public.module.id")

    # Relationships - use forward references with quotes
    schedule: "Schedule" = Relationship(back_populates="s_days")
    module: "Module" = Relationship(back_populates="s_days")
