import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { classifyIntent } from "./intent";

export type StoredUser = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
};

export type StoredProject = {
  id: number;
  name: string;
  website_url: string;
  target_keyword: string;
  status: "active" | "archived";
  created_at: string;
  crawl_status: {
    id?: number;
    status: "none" | "running" | "done" | "error";
    pages_crawled: number;
    started_at: string | null;
    finished_at: string | null;
    error?: string;
  };
  pages: Array<{
    id: number;
    url: string;
    status_code: number;
    title: string;
    meta_description: string;
    word_count: number;
    internal_links: number;
    external_links: number;
    in_links: number;
    indexable: boolean;
    depth: number;
    has_schema: boolean;
  }>;
  issues: Array<{
    check: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    page_url: string;
  }>;
  keywords: Array<{
    keyword: string;
    intent: string;
    relevance: number;
    coverage: number;
    commercial_value: number;
    opportunity: number;
    cluster: string;
  }>;
  competitors: Array<{
    id: number;
    url: string;
    title: string;
    word_count: number;
    similarity: number;
    topics: string[];
    fetch_error?: string;
  }>;
  experiments: Array<{
    id: number;
    title: string;
    hypothesis: string;
    variant: string;
    baseline_ctr: number;
    variant_ctr: number;
    status: string;
    result: string;
  }>;
  readiness: any | null;
};

type StoreData = {
  nextProjectId: number;
  nextPageId: number;
  nextCompId: number;
  nextExpId: number;
  users: StoredUser[];
  projects: StoredProject[];
};

const STORE_PATH = path.join(os.tmpdir(), "rankace-standalone-store.json");

function hashPw(pw: string): string {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

function defaultStore(): StoreData {
  return {
    nextProjectId: 1,
    nextPageId: 1,
    nextCompId: 1,
    nextExpId: 1,
    users: [
      {
        id: 1,
        name: "Demo User",
        email: "demo@rankace.local",
        passwordHash: hashPw("demo1234")
      }
    ],
    projects: []
  };
}

function readStore(): StoreData {
  const g = globalThis as { __rankaceStore?: StoreData };
  if (g.__rankaceStore) return g.__rankaceStore;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as StoreData;
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.projects)) {
        g.__rankaceStore = parsed;
        return parsed;
      }
    }
  } catch { /* fall back */ }
  const fresh = defaultStore();
  g.__rankaceStore = fresh;
  return fresh;
}

function saveStore(store: StoreData): void {
  const g = globalThis as { __rankaceStore?: StoreData };
  g.__rankaceStore = store;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store), "utf8");
  } catch { /* ignore read-only fs */ }
}

export function authenticateUser(email: string, password: string): { access_token: string; token_type: string; user: { id: number; name: string; email: string } } | null {
  const store = readStore();
  const norm = (email || "").trim().toLowerCase();
  const user = store.users.find((u) => u.email === norm && u.passwordHash === hashPw(password));
  if (!user) return null;
  const payload = Buffer.from(JSON.stringify({ sub: user.id, email: user.email, exp: Date.now() + 86400000 })).toString("base64url");
  return {
    access_token: `standalone.${payload}.rankace`,
    token_type: "bearer",
    user: { id: user.id, name: user.name, email: user.email }
  };
}

export function registerUser(name: string, email: string, password: string) {
  const store = readStore();
  const norm = (email || "").trim().toLowerCase();
  if (!norm || !password || password.length < 4) {
    throw new Error("Please enter a valid email and a password of at least 4 characters.");
  }
  if (store.users.some((u) => u.email === norm)) {
    throw new Error("An account with this email already exists.");
  }
  const user: StoredUser = {
    id: store.users.length + 1,
    name: (name || norm.split("@")[0] || "User").trim(),
    email: norm,
    passwordHash: hashPw(password)
  };
  store.users.push(user);
  saveStore(store);
  return authenticateUser(norm, password)!;
}

/** Block SSRF targets pointing to loopback, link-local, or private subnets. */
export function assertPublicHttpUrl(rawUrl: string): URL {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error("Please enter a valid http:// or https:// website URL.");
  }
  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error("Only http:// and https:// URLs are allowed.");
  }
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "::1" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === "0.0.0.0"
  ) {
    throw new Error("Private or loopback network hosts cannot be audited for security reasons.");
  }
  return u;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractPageSignals(url: string, status: number, html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].replace(/\s+/g, " ").trim()) : "";
  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i) ||
    html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
  const metaDesc = descMatch ? decodeEntities(descMatch[1].trim()) : "";
  const canonicalMatch = html.match(/<link[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : "";
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  const indexable = status < 400 && !(robotsMatch && /noindex/i.test(robotsMatch[1]));
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  const imgs = [...html.matchAll(/<img\b([^>]*)>/gi)];
  const missingAlt = imgs.filter((m) => !/\balt\s*=\s*["'][^"']+["']/i.test(m[1])).length;
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"'#][^"']*)["']/gi)];
  const base = new URL(url);
  const internalHrefs: string[] = [];
  let internalLinks = 0;
  let externalLinks = 0;
  for (const m of links) {
    try {
      const target = new URL(m[1], base);
      if (target.protocol !== "http:" && target.protocol !== "https:") continue;
      if (target.hostname === base.hostname) {
        internalLinks++;
        if (!/\.(png|jpe?g|gif|webp|svg|pdf|zip|css|js)$/i.test(target.pathname)) {
          internalHrefs.push(target.href);
        }
      } else {
        externalLinks++;
      }
    } catch { /* ignore malformed href */ }
  }
  const text = stripTags(html);
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const hasSchema = /application\/ld\+json/i.test(html) || /itemscope/i.test(html);
  const topics = h2Matches
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length >= 3 && t.length <= 60)
    .slice(0, 8);

  return {
    title,
    metaDesc,
    canonical,
    indexable,
    h1Count: h1Matches.length,
    missingAlt,
    internalLinks,
    externalLinks,
    internalHrefs: Array.from(new Set(internalHrefs)),
    wordCount: words.length,
    hasSchema,
    topics,
    bodyText: text
  };
}

export function listProjects(): StoredProject[] {
  return readStore().projects;
}

export function getProject(id: number): StoredProject | null {
  return readStore().projects.find((p) => p.id === id) || null;
}

export function createProject(input: { name: string; website_url: string; target_keyword: string }): StoredProject {
  const validUrl = assertPublicHttpUrl(input.website_url).href;
  const store = readStore();
  const project: StoredProject = {
    id: store.nextProjectId++,
    name: input.name.trim(),
    website_url: validUrl,
    target_keyword: input.target_keyword.trim(),
    status: "active",
    created_at: new Date().toISOString(),
    crawl_status: { status: "none", pages_crawled: 0, started_at: null, finished_at: null },
    pages: [],
    issues: [],
    keywords: [],
    competitors: [],
    experiments: [],
    readiness: null
  };
  store.projects.unshift(project);
  saveStore(store);
  return project;
}

export function updateProjectStatus(id: number, status: "active" | "archived"): StoredProject | null {
  const store = readStore();
  const project = store.projects.find((p) => p.id === id);
  if (!project) return null;
  project.status = status;
  saveStore(store);
  return project;
}

export function deleteProject(id: number): boolean {
  const store = readStore();
  const idx = store.projects.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  store.projects.splice(idx, 1);
  saveStore(store);
  return true;
}

export async function runLiveCrawl(id: number): Promise<StoredProject> {
  const store = readStore();
  const project = store.projects.find((p) => p.id === id);
  if (!project) throw new Error("Project not found");

  const startUrl = assertPublicHttpUrl(project.website_url);
  const startedAt = new Date().toISOString();
  project.crawl_status = { id: Date.now(), status: "running", pages_crawled: 0, started_at: startedAt, finished_at: null };

  const queue: Array<{ url: string; depth: number }> = [{ url: startUrl.href, depth: 0 }];
  const visited = new Set<string>();
  const crawledPages: StoredProject["pages"] = [];
  const issues: StoredProject["issues"] = [];
  const inLinkMap = new Map<string, number>();

  while (queue.length > 0 && crawledPages.length < 6) {
    const item = queue.shift()!;
    if (visited.has(item.url)) continue;
    visited.add(item.url);

    try {
      const res = await fetch(item.url, {
        headers: { "User-Agent": "RankaceBot/1.0 (+https://rankace.vercel.app)" },
        signal: AbortSignal.timeout(7500)
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) continue;
      const html = await res.text();
      const sig = extractPageSignals(res.url || item.url, res.status, html);

      for (const href of sig.internalHrefs) {
        inLinkMap.set(href, (inLinkMap.get(href) || 0) + 1);
        if (!visited.has(href) && item.depth < 1 && queue.length < 12) {
          queue.push({ url: href, depth: item.depth + 1 });
        }
      }

      crawledPages.push({
        id: store.nextPageId++,
        url: res.url || item.url,
        status_code: res.status,
        title: sig.title,
        meta_description: sig.metaDesc,
        word_count: sig.wordCount,
        internal_links: sig.internalLinks,
        external_links: sig.externalLinks,
        in_links: 0,
        indexable: sig.indexable,
        depth: item.depth,
        has_schema: sig.hasSchema
      });

      const pageUrl = res.url || item.url;
      if (res.status >= 400) {
        issues.push({ check: "HTTP Status", severity: "critical", message: `Page returned HTTP ${res.status}.`, page_url: pageUrl });
      }
      if (!sig.title) {
        issues.push({ check: "Missing Title", severity: "critical", message: "Page has no <title> element.", page_url: pageUrl });
      } else if (sig.title.length < 30 || sig.title.length > 65) {
        issues.push({ check: "Title Length", severity: "medium", message: `Title is ${sig.title.length} chars (target 30–65).`, page_url: pageUrl });
      }
      if (!sig.metaDesc) {
        issues.push({ check: "Missing Description", severity: "high", message: "No meta description declared.", page_url: pageUrl });
      }
      if (!sig.canonical) {
        issues.push({ check: "Missing Canonical", severity: "medium", message: "No rel=canonical link tag.", page_url: pageUrl });
      }
      if (sig.h1Count === 0) {
        issues.push({ check: "Missing H1", severity: "high", message: "No H1 heading found on page.", page_url: pageUrl });
      } else if (sig.h1Count > 1) {
        issues.push({ check: "Multiple H1s", severity: "medium", message: `Found ${sig.h1Count} H1 tags (recommended 1).`, page_url: pageUrl });
      }
      if (sig.missingAlt > 0) {
        issues.push({ check: "Missing Alt Text", severity: "medium", message: `${sig.missingAlt} image(s) missing descriptive alt text.`, page_url: pageUrl });
      }
      if (sig.wordCount < 250) {
        issues.push({ check: "Thin Content", severity: "low", message: `Low body copy (${sig.wordCount} words).`, page_url: pageUrl });
      }
    } catch (err: unknown) {
      if (crawledPages.length === 0) {
        const msg = err instanceof Error ? err.message : "Could not reach website";
        project.crawl_status = {
          id: Date.now(),
          status: "error",
          pages_crawled: 0,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          error: msg
        };
        saveStore(store);
        throw new Error(`Crawl failed for ${item.url}: ${msg}`);
      }
    }
  }

  for (const p of crawledPages) {
    p.in_links = inLinkMap.get(p.url) || (p.depth === 0 ? 1 : 0);
  }

  // Generate honest keyword/intent rows seeded from target keyword + crawled titles
  const seedKw = project.target_keyword || crawledPages[0]?.title || project.name;
  const variants = [
    seedKw,
    `best ${seedKw}`,
    `${seedKw} guide`,
    `${seedKw} pricing`,
    ...crawledPages.slice(1, 4).map((p) => p.title.slice(0, 48)).filter(Boolean)
  ];
  const uniqueKws = Array.from(new Set(variants.map((v) => v.trim()).filter(Boolean)));
  project.keywords = uniqueKws.map((kw) => {
    const ic = classifyIntent(kw);
    const covered = crawledPages.some((p) => `${p.title} ${p.meta_description}`.toLowerCase().includes(kw.toLowerCase()));
    const coverage = covered ? 82 : 34;
    const relevance = Math.round(ic.confidence * 40 + 55);
    const commercial = ic.intent === "Transactional" ? 88 : ic.intent === "Commercial Investigation" ? 76 : 42;
    const opportunity = Math.max(8, Math.round((100 - coverage) * 0.55 + relevance * 0.25));
    return {
      keyword: kw,
      intent: ic.intent,
      relevance,
      coverage,
      commercial_value: commercial,
      opportunity,
      cluster: ic.intent
    };
  });

  project.pages = crawledPages;
  project.issues = issues;
  project.readiness = null;
  project.crawl_status = {
    id: Date.now(),
    status: "done",
    pages_crawled: crawledPages.length,
    started_at: startedAt,
    finished_at: new Date().toISOString()
  };
  saveStore(store);
  return project;
}

export function computeOpportunities(project: StoredProject) {
  if (!project.pages.length) {
    return {
      scored: false,
      scores: { health: 0, opportunity: 0, breakdown: {} },
      recommendations: []
    };
  }
  const weight: Record<string, number> = { critical: 14, high: 8, medium: 4, low: 2 };
  const totalPenalty = project.issues.reduce((s, i) => s + (weight[i.severity] || 2), 0);
  const perPagePenalty = totalPenalty / Math.max(1, project.pages.length);
  const health = Math.max(10, Math.min(100, Math.round(100 - perPagePenalty * 1.4)));
  const indexableRatio = Math.round((project.pages.filter((p) => p.indexable).length / project.pages.length) * 100);
  const avgWords = project.pages.reduce((s, p) => s + p.word_count, 0) / project.pages.length;
  const contentScore = Math.min(100, Math.round((avgWords / 600) * 100));
  const linkScore = Math.min(100, Math.round((project.pages.reduce((s, p) => s + p.internal_links, 0) / project.pages.length) * 6));
  const schemaPct = Math.round((project.pages.filter((p) => p.has_schema).length / project.pages.length) * 100);
  const opportunity = Math.max(5, Math.min(98, Math.round((100 - health) * 0.65 + (100 - contentScore) * 0.2)));

  const recommendations = project.issues.slice(0, 8).map((iss) => ({
    title: iss.check,
    problem: iss.message,
    why: `Detected directly on ${iss.page_url} during HTTP audit.`,
    action: `Resolve ${iss.check.toLowerCase()} on ${iss.page_url}`,
    priority: iss.severity === "critical" || iss.severity === "high" ? "High" : "Medium",
    effort: "Low",
    impact: iss.severity === "critical" ? "High" : "Medium",
    score: iss.severity === "critical" ? 92 : iss.severity === "high" ? 78 : 54
  }));

  return {
    scored: true,
    scores: {
      health,
      opportunity,
      breakdown: {
        "Technical SEO": health,
        Indexability: indexableRatio,
        Content: contentScore,
        "Internal Links": linkScore,
        "Structured Data": schemaPct
      }
    },
    recommendations
  };
}

export async function addProjectCompetitor(id: number, rawUrl: string) {
  const store = readStore();
  const project = store.projects.find((p) => p.id === id);
  if (!project) throw new Error("Project not found");
  const u = assertPublicHttpUrl(rawUrl);

  let title = "";
  let wordCount = 0;
  let topics: string[] = [];
  let fetchError = "";
  try {
    const res = await fetch(u.href, {
      headers: { "User-Agent": "RankaceBot/1.0 (+https://rankace.vercel.app)" },
      signal: AbortSignal.timeout(7500)
    });
    const html = await res.text();
    const sig = extractPageSignals(u.href, res.status, html);
    title = sig.title || u.hostname;
    wordCount = sig.wordCount;
    topics = sig.topics;
  } catch (err: unknown) {
    fetchError = err instanceof Error ? err.message : "Failed to fetch competitor URL";
  }

  const yourWords = new Set(
    `${project.target_keyword} ${project.pages.map((p) => p.title).join(" ")}`
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
  );
  const compWords = new Set(`${title} ${topics.join(" ")}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const overlap = [...yourWords].filter((w) => compWords.has(w)).length;
  const union = new Set([...yourWords, ...compWords]).size;
  const similarity = union ? Math.round((overlap / union) * 100) : 0;

  const row = {
    id: store.nextCompId++,
    url: u.href,
    title: title || u.href,
    word_count: wordCount,
    similarity,
    topics,
    ...(fetchError ? { fetch_error: fetchError } : {})
  };
  project.competitors.push(row);
  saveStore(store);
  return row;
}

export async function computeProjectReadiness(project: StoredProject, forceRefresh = false) {
  if (project.readiness && !forceRefresh) {
    return { ...project.readiness, cached: true };
  }
  const origin = new URL(project.website_url).origin;
  let robotsTxt = "";
  let llmsOk = false;
  try {
    const r = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) robotsTxt = await r.text();
  } catch {}
  try {
    const l = await fetch(`${origin}/llms.txt`, { signal: AbortSignal.timeout(5000) });
    llmsOk = l.ok;
  } catch {}

  const checkBot = (bot: string) => {
    if (!robotsTxt) return "undeclared";
    const blockRe = new RegExp(`User-agent:\\s*(?:${bot}|\\*)[\\s\\S]*?(?=User-agent:|$)`, "gi");
    const matches = robotsTxt.match(blockRe) || [];
    for (const block of matches) {
      if (/Disallow:\s*\/\s*$/im.test(block)) return "blocked";
    }
    return "allowed";
  };

  const schemaCount = project.pages.filter((p) => p.has_schema).length;
  const signals = [
    {
      key: "robots",
      label: "robots.txt present",
      status: robotsTxt ? "pass" : "warn",
      detail: robotsTxt ? "Found /robots.txt policy file." : "No /robots.txt found at origin.",
      advice: "Declare explicit crawl rules for search and AI agents."
    },
    {
      key: "llms",
      label: "llms.txt guidance",
      status: llmsOk ? "pass" : "warn",
      detail: llmsOk ? "Detected /llms.txt index file." : "No /llms.txt file published.",
      advice: "Publish a concise /llms.txt pointing to canonical docs."
    },
    {
      key: "schema",
      label: "Machine-readable schema",
      status: schemaCount > 0 ? "pass" : "fail",
      detail: `${schemaCount} of ${project.pages.length} crawled pages carry JSON-LD or microdata.`,
      advice: "Add Organization, WebPage, or Article JSON-LD blocks."
    }
  ];

  const score = Math.round(
    (robotsTxt ? 35 : 15) + (llmsOk ? 25 : 0) + (project.pages.length ? (schemaCount / project.pages.length) * 40 : 10)
  );

  const readiness = {
    score,
    origin,
    signals,
    answer_crawlers: [
      { name: "OAI-SearchBot", purpose: "Search answers", policy: checkBot("OAI-SearchBot") },
      { name: "PerplexityBot", purpose: "Citation index", policy: checkBot("PerplexityBot") },
      { name: "Claude-SearchBot", purpose: "Search retrieval", policy: checkBot("Claude-SearchBot") }
    ],
    training_crawlers: [
      { name: "GPTBot", purpose: "Model training", policy: checkBot("GPTBot") },
      { name: "Google-Extended", purpose: "Gemini grounding", policy: checkBot("Google-Extended") },
      { name: "CCBot", purpose: "Open web corpus", policy: checkBot("CCBot") }
    ],
    pages_measured: project.pages.length,
    note: "Live check against origin robots.txt, llms.txt, and crawled structured data.",
    cached: false
  };

  const store = readStore();
  const target = store.projects.find((p) => p.id === project.id);
  if (target) {
    target.readiness = readiness;
    saveStore(store);
  }
  return readiness;
}

export function listExperiments(projectId: number) {
  return getProject(projectId)?.experiments || [];
}

export function addExperiment(projectId: number, body: Omit<StoredProject["experiments"][number], "id">) {
  const store = readStore();
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found");
  const row = { ...body, id: store.nextExpId++ };
  project.experiments.unshift(row);
  saveStore(store);
  return row;
}

export function buildOverview() {
  const projects = listProjects();
  const audited = projects.filter((p) => p.pages.length > 0);
  const scores = audited.map((p) => computeOpportunities(p).scores.health);
  const last = audited[0];
  return {
    projects: {
      total: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      archived: projects.filter((p) => p.status === "archived").length
    },
    pages_audited: projects.reduce((s, p) => s + p.pages.length, 0),
    health: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    projects_audited: audited.length,
    open_actions: projects.reduce((s, p) => s + p.issues.length, 0),
    keywords: projects.reduce((s, p) => s + p.keywords.length, 0),
    last_audit: last
      ? {
          project_id: last.id,
          status: last.crawl_status.status,
          pages_crawled: last.pages.length,
          finished_at: last.crawl_status.finished_at,
          started_at: last.crawl_status.started_at
        }
      : null
  };
}

/** Generate a valid single-page PDF-1.4 report from audited project facts. */
export function buildProjectPdfBytes(project: StoredProject): Uint8Array {
  const opp = computeOpportunities(project);
  const lines = [
    `RankAce SEO Audit Report - ${project.name}`,
    `URL: ${project.website_url}`,
    `Target Keyword: ${project.target_keyword}`,
    `Generated: ${new Date().toISOString()}`,
    `Pages Crawled: ${project.pages.length} | Health Score: ${opp.scores.health}/100 | Opportunity: ${opp.scores.opportunity}/100`,
    `Findings (${project.issues.length} total):`,
    ...project.issues.slice(0, 22).map((i) => ` - [${i.severity.toUpperCase()}] ${i.check}: ${i.message}`)
  ];
  const escPdf = (s: string) => s.replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  let y = 760;
  const textOps = ["BT", "/F1 11 Tf"];
  for (const line of lines) {
    textOps.push(`1 0 0 1 48 ${y} Tm (${escPdf(line.slice(0, 95))}) Tj`);
    y -= 18;
    if (y < 48) break;
  }
  textOps.push("ET");
  const stream = textOps.join("\n");
  const objs = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${Buffer.byteLength(stream, "utf8")} >> stream\n${stream}\nendstream endobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, "utf8"));
}
