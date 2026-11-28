export type IntentResultPayload = {
  intent: "Informational" | "Navigational" | "Commercial Investigation" | "Transactional";
  confidence: number;
  why: string;
  scores: Record<"Informational" | "Navigational" | "Commercial Investigation" | "Transactional", number>;
};

const INTENTS = [
  "Informational",
  "Navigational",
  "Commercial Investigation",
  "Transactional"
] as const;

const SIGNALS: Record<(typeof INTENTS)[number], string[]> = {
  Transactional: ["buy", "price", "order", "checkout", "discount", "deal", "book now", "hire"],
  "Commercial Investigation": ["best", "top", "review", "vs", "compare", "alternative", "cheapest", "under "],
  Navigational: [],
  Informational: ["how", "what", "why", "guide", "tutorial", "tips", "learn", "meaning"]
};

/** Classify search intent using RankAce's deterministic signal weights. */
export function classifyIntent(query: string): IntentResultPayload {
  const q = (query || "").toLowerCase().trim();
  const scores: IntentResultPayload["scores"] = {
    Informational: 0,
    Navigational: 0,
    "Commercial Investigation": 0,
    Transactional: 0
  };
  const reasons: string[] = [];

  for (const intent of INTENTS) {
    for (const w of SIGNALS[intent]) {
      if (w && q.includes(w)) {
        scores[intent] += w.length > 4 ? 2 : 1;
        reasons.push(`matched '${w}' -> ${intent}`);
      }
    }
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(q) || ["amazon", "facebook", "youtube", "google"].includes(q)) {
    scores.Navigational += 3;
    reasons.push("looks like a brand/domain navigation query");
  }

  if (!q) {
    return {
      intent: "Informational",
      confidence: 0,
      why: "Empty query defaults to Informational.",
      scores
    };
  }

  let fallback = false;
  const sumBeforeFallback = INTENTS.reduce((acc, k) => acc + scores[k], 0);
  if (sumBeforeFallback === 0) {
    fallback = true;
    if (q.split(/\s+/).length >= 5) {
      scores.Informational += 1;
      reasons.push("long question-like query, defaulting to Informational");
    } else {
      scores["Commercial Investigation"] += 1;
      reasons.push("short ambiguous query, defaulting to Commercial Investigation");
    }
  }

  let best: (typeof INTENTS)[number] = INTENTS[0];
  for (const k of INTENTS) {
    if (scores[k] > scores[best]) best = k;
  }

  const total = INTENTS.reduce((acc, k) => acc + scores[k], 0);
  let confidence = total ? Math.round((scores[best] / total) * 100) / 100 : 0;
  if (fallback) {
    confidence = Math.min(confidence, 0.35);
  }

  return {
    intent: best,
    confidence,
    why: reasons.join("; ") || "No strong signals.",
    scores
  };
}
