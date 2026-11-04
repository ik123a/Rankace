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

    # Extract whole WORDS, then build adjacent 2- and 3-word phrases.
    #
    # The previous pattern was `[a-zA-Z][a-zA-Z\- ]{2,40}` -- no word
    # boundaries -- so it matched from a letter anywhere in a word and glued
    # runs of words together. Measured output on example.com included
    # "oring purposes" and "xamples without needing": fragments of "for
    # illustrative purposes" and "examples without needing", shipped to the
    # user as keyword opportunities.
    tokens = re.findall(r"[a-z][a-z\-']{1,}", text.lower())
    stop = {
        "and", "the", "for", "with", "this", "that", "from", "have", "are", "was",
        "will", "your", "you", "our", "their", "they", "its", "not", "but", "can",
        "any", "all", "use", "using", "used", "into", "than", "then", "there",
        "these", "those", "such", "more", "most", "also", "been", "being", "has",
        "had", "were", "which", "when", "what", "how", "who", "about", "would",
    }

    phrases: list[str] = []
    for width in (3, 2):
        for index in range(len(tokens) - width + 1):
            chunk = tokens[index : index + width]
            # A phrase with a function word inside it is not a topic. Dropping
            # the whole chunk is stricter than trimming its edges and is what
            # keeps "of the domain" out of the cluster list.
            if any(token in stop for token in chunk):
                continue
            if sum(len(token) for token in chunk) < 10:
                continue
            phrases.append(" ".join(chunk))

    counts = Counter(phrases)
    seeds: list[str] = [target_keyword.strip()] if target_keyword.strip() else []
    seen = {seed.lower() for seed in seeds}

    def accept(phrase: str) -> bool:
        if not phrase or phrase in seen:
            return False
        seeds.append(phrase)
        seen.add(phrase)
        return True

    # Repeated phrases first: a topic a page returns to is a real theme. Single
    # occurrences are only used to fill a thin list, because on a short page
    # every phrase occurs once and the list would otherwise be empty.
    for phrase, count in counts.most_common(80):
        if count < 2:
            break
        if accept(phrase) and len(seeds) >= 20:
            break
    if len(seeds) < 6:
        for phrase, _count in counts.most_common(80):
            if len(seeds) >= 6:
                break
            accept(phrase)

    valid_seeds = [keyword for keyword in seeds if keyword]
    clusters = cluster_keywords(valid_seeds)
    results = []
    for keyword in valid_seeds:
        item = keyword_opportunity(keyword, target_keyword, text)
        item["cluster"] = clusters.get(keyword, "General")
        results.append(item)
    return results
