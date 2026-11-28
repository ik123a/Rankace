import datetime as dt
import json
import logging
import time
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.analyzers.technical import analyze_technical
from app.api.auth import current_user, _validate_project_url
from app.core.database import get_db
from app.crawler.crawler import crawl_site, fetch_text, follow
from app.models import (Competitor, ContentGap, CrawlSession, Experiment, Keyword,
                        Page, Project, Recommendation, SeoScore, TechnicalIssue, User)
from app.nlp.intent import classify_intent, embedding_similarity
from app.schemas import CompetitorIn, ExperimentIn, ProjectIn
from app.services.demo import demo_dashboard
from app.services.gaps import TOPIC_BANK, content_gaps, detect_topics
from app.services.keywords import build_keywords
from app.services.readiness import analyse as analyse_readiness
from app.services.report import generate_pdf_report
from app.services.scoring import build_recommendations, compute_scores

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])

# Live site artefacts are fetched per project, but the cockpit can be reloaded
# repeatedly and none of robots.txt, sitemap.xml or llms.txt changes minute to
# minute. A short in-process cache keeps the readiness tab instant without
# introducing a cache dependency for four small text files.
_READINESS_TTL_SECONDS = 600
_readiness_cache: dict[str, tuple[float, dict]] = {}


STALE_CRAWL_AFTER_SECONDS = 30 * 60


def _iso_utc(value: dt.datetime | None) -> str | None:
    """Serialise a stored timestamp with an explicit UTC offset.

    SQLite has no timezone type: a column declared DateTime(timezone=True)
    comes back NAIVE, so FastAPI serialised `2026-10-27T13:32:42` with no
    trailing Z. A browser parses that as LOCAL time, so a crawl that had just
    finished displayed as "6h ago" on a UTC+6 machine -- measured. Postgres
    returns an aware value, which is why this only showed on the default
    backend. Both cases are normalised here at the API boundary.
    """
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone.utc)
    return value.isoformat()


def _effective_session_state(session: CrawlSession) -> tuple[str, str]:
    """Collapse a session row into the status the UI should show.

    A session is written as "running" before the crawl begins and only the crawl
    itself clears it. A killed process, a machine sleep or an abandoned request
    leaves the row "running" forever, so the cockpit would spin on work that is
    not happening. Both readers of this state (the status strip and the
    dashboard summary) go through here, otherwise they disagree about the same
    row -- which is exactly what happened when only one of them had the rule.
    """
    if session.status != "running" or session.started_at is None:
        return session.status, session.error or ""
    started = session.started_at
    reference = started if started.tzinfo else started.replace(tzinfo=dt.timezone.utc)
    age = (dt.datetime.now(dt.timezone.utc) - reference).total_seconds()
    if age <= STALE_CRAWL_AFTER_SECONDS:
        return "running", session.error or ""
    return (
        "error",
        session.error
        or "Audit did not complete (server restarted or the run timed out). Re-crawl to refresh.",
    )


def _owned(db: Session, user: User, project_id: int) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("")
def list_projects(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.query(Project).filter(Project.user_id == user.id).order_by(Project.id.desc()).all()


@router.post("")
def create_project(payload: ProjectIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    url = _validate_project_url(payload.website_url)
    project = Project(user_id=user.id, name=payload.name, website_url=url, target_keyword=payload.target_keyword)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/demo")
def demo():
    return demo_dashboard()


# Declared BEFORE `/{project_id}` for the same reason as /public-intent below:
# a one-segment literal route declared after an `int` path parameter route is
# shadowed by it and answered with a 422/401 instead of its own handler.
@router.get("/overview")
def overview(db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Real aggregate figures for the dashboard.

    The dashboard previously showed a hardcoded 88/100 health, 94% "intent
    coverage" and an "Online" growth lab as though they were measurements.
    None of them came from anything. Every number here is a count or an average
    over rows the user actually owns, and `projects_audited` tells the UI how
    many projects have a score at all so an average over zero is not shown as a
    real zero.
    """
    project_ids = [row[0] for row in db.query(Project.id).filter(Project.user_id == user.id).all()]
    if not project_ids:
        return {
            "projects": {"total": 0, "active": 0, "archived": 0},
            "pages_audited": 0,
            "health": None,
            "projects_audited": 0,
            "open_actions": 0,
            "keywords": 0,
            "last_audit": None,
        }

    status_counts = dict(
        db.query(Project.status, func.count(Project.id))
        .filter(Project.user_id == user.id)
        .group_by(Project.status)
        .all()
    )

    pages_audited = (
        db.query(func.count(Page.id)).filter(Page.project_id.in_(project_ids)).scalar() or 0
    )
    open_actions = (
        db.query(func.count(Recommendation.id))
        .filter(Recommendation.project_id.in_(project_ids))
        .scalar()
        or 0
    )
    keyword_count = (
        db.query(func.count(Keyword.id)).filter(Keyword.project_id.in_(project_ids)).scalar() or 0
    )

    # Latest score per project: max(id) grouped by project is the newest row
    # because ids are monotonic.
    latest_ids = [
        row[0]
        for row in db.query(func.max(SeoScore.id))
        .filter(SeoScore.project_id.in_(project_ids))
        .group_by(SeoScore.project_id)
        .all()
    ]
    health = None
    if latest_ids:
        scores = [row[0] for row in db.query(SeoScore.health).filter(SeoScore.id.in_(latest_ids)).all()]
        if scores:
            health = round(sum(scores) / len(scores), 1)

    last_session = (
        db.query(CrawlSession)
        .filter(CrawlSession.project_id.in_(project_ids))
        .order_by(CrawlSession.id.desc())
        .first()
    )

    last_status = None
    if last_session is not None:
        last_status, _error = _effective_session_state(last_session)

    return {
        "projects": {
            "total": len(project_ids),
            "active": status_counts.get("active", 0),
            "archived": status_counts.get("archived", 0),
        },
        "pages_audited": pages_audited,
        "health": health,
        "projects_audited": len(latest_ids),
        "open_actions": open_actions,
        "keywords": keyword_count,
        "last_audit": None
        if last_session is None
        else {
            "project_id": last_session.project_id,
            "status": last_status,
            "pages_crawled": last_session.pages_crawled,
            "finished_at": _iso_utc(last_session.finished_at),
            "started_at": _iso_utc(last_session.started_at),
        },
    }


# Public (unauthenticated) intent classifier.
#
# DECLARATION ORDER IS LOAD-BEARING. FastAPI matches routes in registration
# order, and `@router.get("/{project_id}")` below is typed `int`. A literal
# single-segment path like "public-intent" therefore fails integer parsing and
# gets answered by that route's auth dependency -- measured 401 on a
# deliberately public endpoint, which broke the extension side panel's AI
# intent feature. `/intent/classify` never showed the bug only because it has
# a second path segment and cannot be captured by a one-segment parameter
# route. Keep this block ABOVE every /{project_id} route.
@router.get("/public-intent")
@router.post("/public-intent")
def public_intent_classify(query: str = "", payload: dict = None):
    target = query
    if payload and "query" in payload:
        target = payload["query"]
    return classify_intent(target or "")


@router.get("/intent/classify")
@router.post("/intent/classify")
def intent_classify(query: str = ""):
    return classify_intent(query)


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return _owned(db, user, project_id)


@router.put("/{project_id}")
def update_project(project_id: int, payload: ProjectIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = _owned(db, user, project_id)
    project.name = payload.name
    project.website_url = _validate_project_url(payload.website_url)
    project.target_keyword = payload.target_keyword
    db.commit()
    db.refresh(project)
    return project


CHILD_MODELS = (
    Page,
    TechnicalIssue,
    Keyword,
    Competitor,
    ContentGap,
    Recommendation,
    Experiment,
    SeoScore,
    CrawlSession,
)


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = _owned(db, user, project_id)

    # Delete the children explicitly. `db.delete(project)` removed only the
    # project row: every page, keyword, competitor, gap, recommendation,
    # experiment, score and session it owned survived, unreachable by any API.
    # Worse, SQLite reuses the highest id, so the NEXT project created inherited
    # the previous project's rows -- measured in this workspace: a brand-new
    # project showed a competitor from a deleted one, which also reactivated the
    # Content Gap axis on its first crawl. There are no ORM relationships or DB
    # cascades here, so the order has to be explicit.
    for model in CHILD_MODELS:
        db.query(model).filter(model.project_id == project.id).delete(synchronize_session=False)
    db.delete(project)
    db.commit()
    return {"ok": True, "deleted_children": True}


@router.post("/{project_id}/archive")
def archive(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = _owned(db, user, project_id)
    project.status = "archived"
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/unarchive")
def unarchive(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = _owned(db, user, project_id)
    project.status = "active"
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/crawl")
def start_crawl(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = _owned(db, user, project_id)
    session = CrawlSession(project_id=project.id, status="running")
    db.add(session)
    db.commit()
    db.refresh(session)
    try:
        pages = crawl_site(project.website_url)
        db.query(Page).filter(Page.project_id == project.id).delete()
        db.query(TechnicalIssue).filter(TechnicalIssue.project_id == project.id).delete()
        for p in pages:
            db.add(Page(project_id=project.id, crawl_session_id=session.id, url=p.url,
                        status_code=p.status_code, load_time_ms=p.load_time_ms, title=p.title,
                        meta_description=p.meta_description, h1=p.h1, h2_list=json.dumps(p.h2_list),
                        canonical=p.canonical, word_count=p.word_count, images_total=p.images_total,
                        images_missing_alt=p.images_missing_alt, internal_links=p.internal_links,
                        external_links=p.external_links, in_links=p.in_links, indexable=p.indexable,
                        depth=p.depth, content_text=p.content_text,
                        schema_types=json.dumps(p.schema_types), is_spa_shell=p.is_spa_shell))
        issues, tech = analyze_technical(pages)
        for i in issues:
            db.add(TechnicalIssue(project_id=project.id, crawl_session_id=session.id, **i))
        keywords = build_keywords(project.target_keyword, pages)
        db.query(Keyword).filter(Keyword.project_id == project.id).delete()
        for k in keywords:
            db.add(Keyword(project_id=project.id, keyword=k["keyword"], intent=k["intent"],
                           relevance=k["relevance"], coverage=k["coverage"],
                           commercial_value=k["commercial_value"], opportunity=k["opportunity"],
                           cluster=k.get("cluster", "General"),
                           data_source="analysis"))
        your_text = " ".join(p.content_text for p in pages[:5])
        comps = db.query(Competitor).filter(Competitor.project_id == project.id).all()
        comp_texts = [f"{c.title} {c.url}" for c in comps]
        gaps = content_gaps(your_text, comp_texts)
        db.query(ContentGap).filter(ContentGap.project_id == project.id).delete()
        for g in gaps:
            db.add(ContentGap(project_id=project.id, topic=g["topic"], your_coverage=g["your_coverage"],
                              competitor_coverage=g["competitor_coverage"], gap_level=g["gap_level"]))
        gap_penalty = sum(20 for g in gaps if g["gap_level"] == "high")
        intent = classify_intent(project.target_keyword or project.name)
        intent_match = 94 if intent["intent"] in ("Commercial Investigation", "Transactional") else 70
        kw_fit = round(sum(k["relevance"] for k in keywords) / max(len(keywords), 1) * 100, 1) if keywords else 50
        scores = compute_scores(
            tech["technical"], pages, kw_fit, intent_match, gap_penalty, gap_measured=bool(comps)
        )
        db.add(SeoScore(project_id=project.id, crawl_session_id=session.id,
                        health=scores["health"], opportunity=scores["opportunity"],
                        breakdown=json.dumps(scores["breakdown"])))
        recs = build_recommendations(issues, gaps, keywords)
        db.query(Recommendation).filter(Recommendation.project_id == project.id).delete()
        for r in recs:
            db.add(Recommendation(project_id=project.id, **r))
        session.status = "done"
        session.pages_crawled = len(pages)
        session.finished_at = dt.datetime.now(dt.timezone.utc)
        db.commit()
        # Two readiness signals (schema coverage, JS-shell count) are measured
        # from the rows this crawl just replaced, so a cached report is stale
        # the moment it commits -- even though its robots/sitemap fetches would
        # still be valid.
        for key in [k for k in _readiness_cache if k.startswith(f"{project.id}:")]:
            _readiness_cache.pop(key, None)
        return {"crawl_session_id": session.id, "pages": len(pages), "scores": scores}
    except Exception as exc:
        # ROLLBACK FIRST. The crawl deletes the previous pages and issues and
        # then adds a large batch of new rows; if it raises halfway through,
        # those pending rows are still in the session. The old handler set the
        # status and committed, which FLUSHED the half-written crawl and left
        # the project with a partial page set, some issues and no score. Roll
        # the batch back, then mark the session row, which was committed
        # separately before the crawl started and therefore survives.
        db.rollback()
        logger.exception("Crawl failed for project %s", project_id)
        failed = db.get(CrawlSession, session.id)
        if failed is None:
            failed = CrawlSession(project_id=project.id)
            db.add(failed)
        failed.status = "error"
        failed.error = str(exc)[:2000]
        failed.finished_at = dt.datetime.now(dt.timezone.utc)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Crawl failed: {exc}")


@router.get("/{project_id}/crawl-status")
def crawl_status(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    session = db.query(CrawlSession).filter(CrawlSession.project_id == project_id).order_by(CrawlSession.id.desc()).first()
    if session is None:
        return {"status": "none", "pages_crawled": 0}

    # Report a stale running session as failed rather than lying about live
    # work; the row itself is left untouched.
    status, error = _effective_session_state(session)

    return {
        "id": session.id,
        "status": status,
        "stale": status != session.status,
        "pages_crawled": session.pages_crawled,
        "started_at": _iso_utc(session.started_at),
        "finished_at": _iso_utc(session.finished_at),
        "error": error,
    }


@router.get("/{project_id}/technical-seo")
def technical(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    return db.query(TechnicalIssue).filter(TechnicalIssue.project_id == project_id).limit(500).all()


@router.get("/{project_id}/pages")
def pages(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    rows = db.query(Page).filter(Page.project_id == project_id).limit(200).all()
    return [{"id": r.id, "url": r.url, "status_code": r.status_code, "title": r.title,
             "word_count": r.word_count, "internal_links": r.internal_links,
             "external_links": r.external_links, "in_links": r.in_links,
             "indexable": r.indexable, "depth": r.depth} for r in rows]


@router.get("/{project_id}/keywords")
def keywords(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    return db.query(Keyword).filter(Keyword.project_id == project_id).order_by(Keyword.opportunity.desc()).limit(200).all()


@router.get("/{project_id}/intent")
def intent(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = _owned(db, user, project_id)
    return classify_intent(project.target_keyword)


@router.get("/{project_id}/opportunities")
def opportunities(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    score = db.query(SeoScore).filter(SeoScore.project_id == project_id).order_by(SeoScore.id.desc()).first()
    recs = db.query(Recommendation).filter(Recommendation.project_id == project_id).order_by(Recommendation.score.desc()).limit(50).all()
    # `scored` distinguishes "no audit has run" from "the audit scored zero".
    # Without it the cockpit rendered a red 0/100 health ring for a brand-new
    # project, which reads as a catastrophic result rather than an absence.
    return {"scored": score is not None,
            "scores": {"health": score.health if score else 0, "opportunity": score.opportunity if score else 0,
                       "breakdown": json.loads(score.breakdown) if score else {}},
            "recommendations": recs}


@router.get("/{project_id}/recommendations")
def recommendations(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    return db.query(Recommendation).filter(Recommendation.project_id == project_id).order_by(Recommendation.score.desc()).all()


@router.get("/{project_id}/content-gaps")
def gaps_route(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    return db.query(ContentGap).filter(ContentGap.project_id == project_id).all()


@router.get("/{project_id}/competitors")
def list_competitors(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    return db.query(Competitor).filter(Competitor.project_id == project_id).all()


@router.post("/{project_id}/competitors")
def add_competitor(project_id: int, payload: CompetitorIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = _owned(db, user, project_id)
    url = _validate_project_url(payload.url)
    title, words, similarity = "", 0, 0.0
    fetch_error = ""
    try:
        resp, _final_url, status_code, _ctype = follow(url, timeout=15)
        if resp is None or status_code == 0:
            fetch_error = "Could not fetch this URL; the comparison is unavailable."
        elif status_code >= 400:
            fetch_error = f"Competitor returned HTTP {status_code}."
        else:
            from bs4 import BeautifulSoup

            html_body = getattr(resp, "text", "") or ""
            soup = BeautifulSoup(html_body, "lxml")
            title = soup.title.string.strip() if soup.title and soup.title.string else ""
            words = len(soup.get_text(" ", strip=True).split())
            yours = db.query(Page).filter(Page.project_id == project.id).first()
            similarity = round(embedding_similarity(yours.content_text[:5000] if yours else "", soup.get_text(" ", strip=True)[:5000]) * 100, 1)
    except Exception as exc:
        # Was a bare `pass`, so an unreachable, blocked or non-HTML competitor
        # was saved as a blank row with 0 words and 0% similarity. The user had
        # no way to tell "we could not read it" from "this page is empty".
        logger.warning("Competitor fetch failed for %s: %s", url, exc)
        fetch_error = "Could not fetch this URL; the comparison is unavailable."
    comp = Competitor(project_id=project.id, url=url, title=title, word_count=words, similarity=similarity)
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return {
        "id": comp.id,
        "url": comp.url,
        "title": comp.title,
        "word_count": comp.word_count,
        "similarity": comp.similarity,
        "fetch_error": fetch_error,
    }


@router.get("/{project_id}/readiness")
def readiness(project_id: int, refresh: bool = False, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Audit the signals that decide whether AI answer engines can read the site.

    Three small live fetches (robots.txt, sitemap.xml, llms.txt) plus stored
    crawl rows. Every fetch goes through the SSRF-validated redirect walk in
    the crawler, so a project URL cannot be used to reach internal hosts.
    """
    project = _owned(db, user, project_id)
    parsed = urlparse(project.website_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    cache_key = f"{project.id}:{origin}"

    cached = _readiness_cache.get(cache_key)
    if cached and not refresh and (time.time() - cached[0]) < _READINESS_TTL_SECONDS:
        payload = dict(cached[1])
        payload["cached"] = True
        return payload

    robots_status, robots_text = fetch_text(f"{origin}/robots.txt")
    sitemap_status, sitemap_text = fetch_text(f"{origin}/sitemap.xml")
    llms_status, llms_text = fetch_text(f"{origin}/llms.txt")
    pages = db.query(Page).filter(Page.project_id == project.id).limit(200).all()

    report = analyse_readiness(
        origin=origin,
        robots_text=robots_text,
        robots_status=robots_status,
        sitemap_text=sitemap_text,
        sitemap_status=sitemap_status,
        llms_text=llms_text,
        llms_status=llms_status,
        pages=pages,
    )
    report["cached"] = False
    _readiness_cache[cache_key] = (time.time(), report)
    return report


@router.get("/{project_id}/architecture")
def architecture(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    rows = db.query(Page).filter(Page.project_id == project_id).limit(200).all()
    nodes = [
        {
            "id": r.id,
            "url": r.url,
            "depth": r.depth,
            "out_links": r.internal_links,
            "in_links": r.in_links,
        }
        for r in rows
    ]
    # A TRUE orphan has no internal page linking to it. The previous test used
    # out-links (`links == 0`), so any content page that linked nowhere -- a
    # well-linked leaf with no navigation of its own -- was reported as an
    # orphan, while a genuinely unreachable page that happened to carry one
    # out-link was missed entirely.
    #
    # Rows crawled before in-link counting existed all read 0, which would make
    # every page look orphaned. `orphan_scan_available` lets the UI say "re-run
    # the audit" instead of asserting something false.
    orphan_scan_available = any((r.in_links or 0) > 0 for r in rows)
    orphans = [
        n for n in nodes if n["depth"] > 0 and n["in_links"] == 0
    ] if orphan_scan_available else []
    return {
        "nodes": nodes,
        "orphans": orphans,
        "orphan_scan_available": orphan_scan_available,
        "topics": TOPIC_BANK,
        "detected": detect_topics(" ".join(r.url for r in rows)),
    }


@router.get("/{project_id}/report")
def report(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = _owned(db, user, project_id)
    score = db.query(SeoScore).filter(SeoScore.project_id == project_id).order_by(SeoScore.id.desc()).first()
    issues = db.query(TechnicalIssue).filter(TechnicalIssue.project_id == project_id).limit(200).all()
    recs = db.query(Recommendation).filter(Recommendation.project_id == project_id).order_by(Recommendation.score.desc()).limit(30).all()
    return {"project": {"name": project.name, "website_url": project.website_url, "target_keyword": project.target_keyword},
            "scores": {"health": score.health if score else 0, "opportunity": score.opportunity if score else 0},
            "issues": [{"check": i.check, "severity": i.severity, "message": i.message, "page_url": i.page_url} for i in issues],
            "recommendations": [{"title": r.title, "priority": r.priority, "action": r.action, "problem": r.problem, "why": r.why, "effort": r.effort, "impact": r.impact} for r in recs],
            "disclaimer": "Rankace estimates SEO/search visibility opportunities and does not reproduce Google's proprietary ranking algorithm."}


@router.get("/{project_id}/report/pdf")
def export_pdf_report(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = _owned(db, user, project_id)
    score = db.query(SeoScore).filter(SeoScore.project_id == project_id).order_by(SeoScore.id.desc()).first()
    issues = db.query(TechnicalIssue).filter(TechnicalIssue.project_id == project_id).limit(200).all()
    recs = db.query(Recommendation).filter(Recommendation.project_id == project_id).order_by(Recommendation.score.desc()).limit(30).all()
    gaps = db.query(ContentGap).filter(ContentGap.project_id == project_id).all()
    keywords = db.query(Keyword).filter(Keyword.project_id == project_id).limit(50).all()
    pdf_bytes = generate_pdf_report(project, score, issues, recs, gaps, keywords)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="rankace_report_{project_id}.pdf"'},
    )


# NOTE: /intent/classify and /public-intent are declared near the top of this
# module, above the /{project_id} routes, because FastAPI resolves routes in
# registration order. See the comment on public_intent_classify.


experiments_router = APIRouter(prefix="/experiments", tags=["experiments"])


@experiments_router.get("")
def list_experiments(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    return db.query(Experiment).filter(Experiment.project_id == project_id).all()


@experiments_router.post("")
def create_experiment(project_id: int, payload: ExperimentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    exp = Experiment(project_id=project_id, **payload.model_dump())
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


@experiments_router.put("/{exp_id}")
def update_experiment(exp_id: int, payload: ExperimentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    exp = db.get(Experiment, exp_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Not found")
    _owned(db, user, exp.project_id)
    for k, v in payload.model_dump().items():
        setattr(exp, k, v)
    db.commit()
    return exp
