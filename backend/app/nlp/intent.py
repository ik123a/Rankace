import re

INTENTS = ("Informational", "Navigational", "Commercial Investigation", "Transactional")

SIGNALS = {
    "Transactional": ["buy", "price", "order", "checkout", "discount", "deal", "book now", "hire"],
    "Commercial Investigation": ["best", "top", "review", "vs", "compare", "alternative", "cheapest", "under "],
    "Navigational": [],
    "Informational": ["how", "what", "why", "guide", "tutorial", "tips", "learn", "meaning"],
}


def classify_intent(query: str) -> dict:
    q = (query or "").lower().strip()
    scores = {k: 0 for k in INTENTS}
    reasons: list[str] = []
    for intent, words in SIGNALS.items():
        for w in words:
            if w and w in q:
                scores[intent] += 2 if len(w) > 4 else 1
                reasons.append(f"matched '{w}' -> {intent}")
    if re.match(r"^[a-z0-9.-]+\.[a-z]{2,}$", q) or q in ("amazon", "facebook", "youtube", "google"):
        scores["Navigational"] += 3
        reasons.append("looks like a brand/domain navigation query")
    if not q:
        return {"intent": "Informational", "confidence": 0.0, "why": "Empty query defaults to Informational.", "scores": scores}
    if sum(scores.values()) == 0:
        if len(q.split()) >= 5:
            scores["Informational"] += 1
            reasons.append("long question-like query, defaulting to Informational")
        else:
            scores["Commercial Investigation"] += 1
            reasons.append("short ambiguous query, defaulting to Commercial Investigation")
    best = max(scores, key=lambda k: scores[k])
    total = sum(scores.values())
    confidence = round(scores[best] / total, 2) if total else 0.0
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: F401
    except Exception:
        pass
    return {"intent": best, "confidence": confidence, "why": "; ".join(reasons) or "No strong signals.", "scores": scores}


def embedding_similarity(a: str, b: str) -> float:
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        vec = TfidfVectorizer().fit_transform([a or "", b or ""])
        return round(float(cosine_similarity(vec[0], vec[1])[0][0]), 3)
    except Exception:
        wa, wb = set((a or "").lower().split()), set((b or "").lower().split())
        if not wa or not wb:
            return 0.0
        return round(len(wa & wb) / max(len(wa | wb), 1), 3)


def cluster_keywords(keywords: list[str], n_clusters: int = 4) -> dict[str, str]:
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.cluster import KMeans

        if len(keywords) < 2:
            return {k: "General" for k in keywords}
        n = max(1, min(n_clusters, len(keywords)))
        mat = TfidfVectorizer().fit_transform(keywords)
        labels = KMeans(n_clusters=n, n_init=10, random_state=42).fit_predict(mat)
        return {k: f"Cluster {int(l) + 1}" for k, l in zip(keywords, labels)}
    except Exception:
        out: dict[str, str] = {}
        for k in keywords:
            kl = k.lower()
            if any(w in kl for w in ("price", "cost", "cheap", "package")):
                out[k] = "Pricing"
            elif any(w in kl for w in ("route", "itinerary", "trek", "everest", "annapurna")):
                out[k] = "Routes"
            else:
                out[k] = "Planning"
        return out
