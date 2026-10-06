DEMO_PAGES = [
    {"url": "https://example.com/", "title": "Example Domain - Home", "words": 950},
    {"url": "https://example.com/products", "title": "Products & Pricing", "words": 720},
    {"url": "https://example.com/about", "title": "", "words": 120},
]


def demo_dashboard():
    return {
        "demo": True,
        "health": 78,
        "opportunity": 82,
        "critical_issues": 7,
        "keyword_opportunities": 24,
        "breakdown": {"Technical SEO": 84, "Content": 91, "Keyword Fit": 76, "Internal Links": 68, "Intent Match": 94, "Content Gap": 79},
        "note": "DEMO DATA — clearly labeled synthetic data, not real search-volume data.",
    }
