"""All SQLAlchemy models for Rankace."""
import datetime as dt
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _now():
    return dt.datetime.now(dt.timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="")
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    website_url: Mapped[str] = mapped_column(String(2000))
    target_keyword: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(30), default="active")  # active|archived
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CrawlSession(Base):
    __tablename__ = "crawl_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="running")  # running|done|error
    started_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pages_crawled: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str] = mapped_column(Text, default="")


class Page(Base):
    __tablename__ = "pages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    crawl_session_id: Mapped[int] = mapped_column(ForeignKey("crawl_sessions.id"), index=True)
    url: Mapped[str] = mapped_column(String(2000), index=True)
    status_code: Mapped[int] = mapped_column(Integer, default=0)
    load_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(Text, default="")
    meta_description: Mapped[str] = mapped_column(Text, default="")
    h1: Mapped[str] = mapped_column(Text, default="")
    h2_list: Mapped[str] = mapped_column(Text, default="[]")
    canonical: Mapped[str] = mapped_column(String(2000), default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    images_total: Mapped[int] = mapped_column(Integer, default=0)
    images_missing_alt: Mapped[int] = mapped_column(Integer, default=0)
    internal_links: Mapped[int] = mapped_column(Integer, default=0)
    external_links: Mapped[int] = mapped_column(Integer, default=0)
    # Internal pages linking TO this one. See crawler._count_in_links.
    in_links: Mapped[int] = mapped_column(Integer, default=0)
    indexable: Mapped[bool] = mapped_column(Boolean, default=True)
    depth: Mapped[int] = mapped_column(Integer, default=0)
    content_text: Mapped[str] = mapped_column(Text, default="")
    # Crawl signals persisted for the readiness audit. Both were extracted on
    # every crawl before this and stored nowhere, so no report could use them.
    schema_types: Mapped[str] = mapped_column(Text, default="[]")
    is_spa_shell: Mapped[bool] = mapped_column(Boolean, default=False)


class TechnicalIssue(Base):
    __tablename__ = "technical_issues"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    crawl_session_id: Mapped[int] = mapped_column(ForeignKey("crawl_sessions.id"), index=True)
    page_url: Mapped[str] = mapped_column(String(2000), default="")
    check: Mapped[str] = mapped_column(String(120), index=True)
    severity: Mapped[str] = mapped_column(String(20), default="medium")  # critical|high|medium|low
    message: Mapped[str] = mapped_column(Text, default="")


class Keyword(Base):
    __tablename__ = "keywords"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    keyword: Mapped[str] = mapped_column(String(500), index=True)
    intent: Mapped[str] = mapped_column(String(50), default="")
    relevance: Mapped[float] = mapped_column(Float, default=0)
    coverage: Mapped[float] = mapped_column(Float, default=0)
    commercial_value: Mapped[float] = mapped_column(Float, default=0)
    opportunity: Mapped[float] = mapped_column(Float, default=0)
    cluster: Mapped[str] = mapped_column(String(200), default="")
    data_source: Mapped[str] = mapped_column(String(50), default="analysis")


class Competitor(Base):
    __tablename__ = "competitors"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    url: Mapped[str] = mapped_column(String(2000))
    title: Mapped[str] = mapped_column(Text, default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    similarity: Mapped[float] = mapped_column(Float, default=0)


class ContentGap(Base):
    __tablename__ = "content_gaps"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    topic: Mapped[str] = mapped_column(String(500))
    your_coverage: Mapped[bool] = mapped_column(Boolean, default=False)
    competitor_coverage: Mapped[bool] = mapped_column(Boolean, default=False)
    gap_level: Mapped[str] = mapped_column(String(20), default="medium")


class Recommendation(Base):
    __tablename__ = "recommendations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(500))
    problem: Mapped[str] = mapped_column(Text, default="")
    why: Mapped[str] = mapped_column(Text, default="")
    impact: Mapped[str] = mapped_column(String(20), default="medium")
    action: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    effort: Mapped[str] = mapped_column(String(20), default="medium")
    score: Mapped[float] = mapped_column(Float, default=0)


class Experiment(Base):
    __tablename__ = "experiments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(500))
    hypothesis: Mapped[str] = mapped_column(Text, default="")
    variant: Mapped[str] = mapped_column(Text, default="")
    baseline_ctr: Mapped[float] = mapped_column(Float, default=0)
    variant_ctr: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    result: Mapped[str] = mapped_column(Text, default="")


class SeoScore(Base):
    __tablename__ = "seo_scores"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    crawl_session_id: Mapped[int] = mapped_column(ForeignKey("crawl_sessions.id"), index=True)
    health: Mapped[float] = mapped_column(Float, default=0)
    opportunity: Mapped[float] = mapped_column(Float, default=0)
    breakdown: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
