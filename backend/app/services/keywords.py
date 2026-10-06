from app.nlp.intent import classify_intent, cluster_keywords, embedding_similarity


def keyword_opportunity(keyword: str, target_keyword: str, content_text: str) -> dict:
    intent_info = classify_intent(keyword)
    relevance = embedding_similarity(keyword, target_keyword or keyword)
    coverage = embedding_similarity(keyword, (content_text or "")[:5000])
    intent_value = {
        "Transactional": 1.0,
        "Commercial Investigation": 0.85,
        "Informational": 0.6,
        "Navigational": 0.3,
    }.get(intent_info["intent"], 0.5)
    commercial = intent_value
    gap = round(1 - min(coverage, 1.0), 3)
    score = round(100 * (0.35 * relevance + 0.25 * intent_value + 0.25 * gap + 0.15 * commercial), 1)
    return {
        "keyword": keyword,
        "intent": intent_info["intent"],
        "relevance": round(relevance, 3),
        "coverage": round(coverage, 3),
        "commercial_value": round(commercial, 3),
        "opportunity": score,
    }


def build_keywords(target_keyword: str, pages: list) -> list[dict]:
    import re
    from collections import Counter

    text = " ".join((p.content_text or "") for p in pages[:10])[:20000]
    words = re.findall(r"[a-zA-Z][a-zA-Z\- ]{2,40}", text.lower())
    phrases = [" ".join(w.split()[:3]).strip() for w in words]
    stop = {"and", "the", "for", "with", "this", "that", "from", "have", "are", "was", "will", "your"}
    counts = Counter(p for p in phrases if len(p) > 4 and p.split()[0] not in stop)
    seeds = [target_keyword] if target_keyword else []
    for phrase, _ in counts.most_common(25):
        if phrase not in seeds:
            seeds.append(phrase)
        if len(seeds) >= 20:
            break
    valid_seeds = [k for k in seeds if k]
    clusters = cluster_keywords(valid_seeds)
    results = []
    for k in valid_seeds:
        item = keyword_opportunity(k, target_keyword, text)
        item["cluster"] = clusters.get(k, "General")
        results.append(item)
    return results
