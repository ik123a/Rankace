import datetime as dt
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.analyzers.technical import analyze_technical
from app.api.auth import current_user, _validate_project_url
from app.core.database import get_db
from app.crawler.crawler import crawl_site
from app.models import (Competitor, ContentGap, CrawlSession, Experiment, Keyword,
                        Page, Project, Recommendation, SeoScore, TechnicalIssue, User)
from app.nlp.intent import classify_intent, embedding_similarity
from app.schemas import CompetitorIn, ExperimentIn, ProjectIn
from app.services.demo import demo_dashboard
from app.services.gaps import TOPIC_BANK, content_gaps, detect_topics
from app.services.keywords import build_keywords
from app.services.report import generate_pdf_report
from app.services.scoring import build_recommendations, compute_scores

router = APIRouter(prefix="/projects", tags=["projects"])


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


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    project = _owned(db, user, project_id)
    db.delete(project)
    db.commit()
    return {"ok": True}


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
                        external_links=p.external_links, indexable=p.indexable, depth=p.depth,
                        content_text=p.content_text))
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
        scores = compute_scores(tech["technical"], pages, kw_fit, intent_match, gap_penalty)
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
        return {"crawl_session_id": session.id, "pages": len(pages), "scores": scores}
    except Exception as exc:
        session.status = "error"
        session.error = str(exc)[:2000]
        db.commit()
        raise HTTPException(status_code=500, detail=f"Crawl failed: {exc}")


@router.get("/{project_id}/crawl-status")
def crawl_status(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    session = db.query(CrawlSession).filter(CrawlSession.project_id == project_id).order_by(CrawlSession.id.desc()).first()
    return session or {}


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
             "external_links": r.external_links, "indexable": r.indexable, "depth": r.depth} for r in rows]


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
    return {"scores": {"health": score.health if score else 0, "opportunity": score.opportunity if score else 0,
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
    try:
        with httpx.Client(timeout=15, follow_redirects=True) as client:
            resp = client.get(url, headers={"User-Agent": "RankaceBot/1.0"})
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "lxml")
            title = soup.title.string.strip() if soup.title and soup.title.string else ""
            words = len(soup.get_text(" ", strip=True).split())
            yours = db.query(Page).filter(Page.project_id == project.id).first()
            similarity = round(embedding_similarity(yours.content_text[:5000] if yours else "", soup.get_text(" ", strip=True)[:5000]) * 100, 1)
    except Exception:
        pass
    comp = Competitor(project_id=project.id, url=url, title=title, word_count=words, similarity=similarity)
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp


@router.get("/{project_id}/architecture")
def architecture(project_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owned(db, user, project_id)
    rows = db.query(Page).filter(Page.project_id == project_id).limit(200).all()
    nodes = [{"id": r.id, "url": r.url, "depth": r.depth, "links": r.internal_links} for r in rows]
    orphans = [n for n in nodes if n["links"] == 0 and n["depth"] > 0]
    return {"nodes": nodes, "orphans": orphans, "topics": TOPIC_BANK, "detected": detect_topics(" ".join(r.url for r in rows))}


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


@router.get("/intent/classify")
@router.post("/intent/classify")
@router.get("/public-intent")
@router.post("/public-intent")
def public_intent_classify(query: str = "", payload: dict = None):
    target = query
    if payload and "query" in payload:
        target = payload["query"]
    return classify_intent(target or "")


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
