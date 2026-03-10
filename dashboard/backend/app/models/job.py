from datetime import datetime
from sqlmodel import SQLModel, Field


class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: int | None = Field(default=None, primary_key=True)
    title: str = ""
    company: str = ""
    location: str = ""
    remote_status: str = ""
    salary: str = ""
    job_url: str = Field(default="", index=True)
    description: str = ""
    score: int = 0
    grade: str = ""
    matched_skills: str = ""
    missing_skills: str = ""
    leadership_level: str = ""
    enterprise_score: str = ""
    linkedin_connections: str = ""
    best_contact: str = ""
    resume_file: str = ""
    cover_letter_file: str = ""
    app_type: str = ""
    app_status: str = Field(default="", index=True)
    date_logged: str = ""
    applied: str = ""
    follow_up_date: str = ""
    follow_up_status: str = ""
    sheet_row: int = 0  # Row number in Google Sheet for write-back


class JobResponse(SQLModel):
    id: int
    title: str
    company: str
    location: str
    remote_status: str
    salary: str
    job_url: str
    score: int
    grade: str
    matched_skills: str
    missing_skills: str
    app_type: str
    app_status: str
    date_logged: str
    applied: str
    follow_up_date: str
    follow_up_status: str
    resume_file: str
    cover_letter_file: str


class JobDetailResponse(JobResponse):
    description: str
    leadership_level: str
    enterprise_score: str
    linkedin_connections: str
    best_contact: str
    sheet_row: int


class JobListResponse(SQLModel):
    jobs: list[JobResponse]
    total: int
    page: int
    per_page: int


class SyncStatus(SQLModel):
    last_synced: str | None = None
    job_count: int = 0
    syncing: bool = False
