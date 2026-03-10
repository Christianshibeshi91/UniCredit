from sqlmodel import SQLModel, Field


class Setting(SQLModel, table=True):
    __tablename__ = "settings"

    key: str = Field(primary_key=True)
    value: str = ""


class IntakeAnswer(SQLModel, table=True):
    __tablename__ = "intake_answers"

    id: int | None = Field(default=None, primary_key=True)
    question: str = Field(index=True)
    answer: str = ""
    source: str = "manual"  # "manual" or "learned"


class ErrorLog(SQLModel, table=True):
    __tablename__ = "error_logs"

    id: int | None = Field(default=None, primary_key=True)
    job_url: str = ""
    job_title: str = ""
    company: str = ""
    error_message: str = ""
    error_type: str = ""
    timestamp: str = ""
    retried: bool = False
