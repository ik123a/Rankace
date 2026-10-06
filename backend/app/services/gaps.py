TOPIC_BANK = [
    "Price", "Itinerary", "Best Season", "Difficulty", "Permits",
    "Routes", "Hotels", "FAQs", "Reviews", "Safety",
]


def detect_topics(text: str) -> dict[str, bool]:
    t = (text or "").lower()
    hints = {
        "Price": ["price", "cost", "$", "rs.", "package"],
        "Itinerary": ["itinerary", "day 1", "day-1", "schedule"],
        "Best Season": ["best season", "best time", "october", "weather"],
        "Difficulty": ["difficulty", "difficult", "fitness", "altitude"],
        "Permits": ["permit", "tims", "visa"],
        "Routes": ["route", "trail", "everest", "annapurna", "langtang"],
        "Hotels": ["hotel", "accommodation", "lodge", "stay"],
        "FAQs": ["faq", "frequently asked", "q:"],
        "Reviews": ["review", "rating", "testimonial"],
        "Safety": ["safety", "insurance", "guide", "rescue"],
    }
    return {topic: any(h in t for h in words) for topic, words in hints.items()}


def content_gaps(your_text: str, competitor_texts: list[str]) -> list[dict]:
    yours = detect_topics(your_text)
    gaps = []
    for topic in TOPIC_BANK:
        comp = any(detect_topics(c).get(topic) for c in competitor_texts)
        level = "high" if (comp and not yours.get(topic)) else ("low" if yours.get(topic) else "medium")
        gaps.append({
            "topic": topic,
            "your_coverage": bool(yours.get(topic)),
            "competitor_coverage": bool(comp),
            "gap_level": level,
        })
    return gaps
