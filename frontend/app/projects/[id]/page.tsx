"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  ChevronRight,
  Download,
  ExternalLink,
  FlaskConical,
  Globe,
  HelpCircle,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { api, downloadBlob, getToken } from "../../../lib/api";
import { absoluteTime, formatDuration, formatNumber, relativeTime } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { DataTable, type Column } from "../../../components/ui/data-table";
import { EmptyState } from "../../../components/ui/empty-state";
import { Input, Textarea } from "../../../components/ui/field";
import { Panel } from "../../../components/ui/panel";
import { ScoreMeter } from "../../../components/ui/score-meter";
import { Skeleton } from "../../../components/ui/skeleton";
import { StatBlock } from "../../../components/ui/stat-block";
import { IntentTag, StatusTag, type IntentClass, type StatusKind } from "../../../components/ui/status-tag";
import { TabPanel, Tabs } from "../../../components/ui/tabs";
import { ThemeToggle } from "../../../components/ui/theme-toggle";

type Project = {
  id: number;
  name: string;
  website_url: string;
  target_keyword: string;
  status: string;
};

type Recommendation = {
  title: string;
  problem: string;
  why: string;
  action: string;
  priority: string;
  effort: string;
  impact: string;
  score: number;
};

type SeoScoreData = {
  scored?: boolean;
  scores: { health: number; opportunity: number; breakdown: Record<string, number> };
  recommendations: Recommendation[];
};

type TechnicalIssue = { check: string; severity: string; message: string; page_url: string };
type PageRow = {
  id: number;
  url: string;
  status_code: number;
  title: string;
  word_count: number;
  internal_links: number;
  external_links: number;
  in_links: number;
  indexable: boolean;
  depth: number;
};
type KeywordRow = {
  keyword: string;
  intent: string;
  relevance: number;
  coverage: number;
  commercial_value: number;
  opportunity: number;
  cluster: string;
};
type ContentGapRow = {
  topic: string;
  your_coverage: boolean;
  competitor_coverage: boolean;
  gap_level: string;
};
type CompetitorRow = { id: number; url: string; title: string; word_count: number; similarity: number | null; fetch_error: string };
type ExperimentRow = {
  id: number;
  title: string;
  hypothesis: string;
  variant: string;
  baseline_ctr: number;
  variant_ctr: number;
  status: string;
  result: string;
};
type ArchitectureData = {
  nodes: Array<{ id: number; url: string; depth: number; in_links: number; out_links: number }>;
  orphans: Array<{ id: number; url: string; depth: number; in_links: number; out_links: number }>;
  orphan_scan_available: boolean;
  topics: string[];
  detected: Record<string, boolean>;
};

type CrawlStatus = {
  id?: number;
  status: "none" | "running" | "done" | "error";
  stale?: boolean;
  pages_crawled?: number;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string;
};

type ReadinessSignal = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  advice: string;
};

type CrawlerPolicy = { name: string; purpose: string; kind?: string; policy: string };

type Readiness = {
  score: number;
  origin: string;
  signals: ReadinessSignal[];
  answer_crawlers: CrawlerPolicy[];
  training_crawlers: CrawlerPolicy[];
  pages_measured: number;
  note: string;
  cached: boolean;
};

const TAB_IDS = [
  "overview",
  "technical",
  "keywords",
  "competitors",
  "architecture",
  "readiness",
  "experiments",
  "report"
] as const;

type TabId = (typeof TAB_IDS)[number];

const SEVERITIES = ["all", "critical", "high", "medium", "low"] as const;

function severityKind(severity: string): StatusKind {
  if (severity === "critical") return "error";
  if (severity === "high") return "warning";
  return "neutral";
}

function gapKind(level: string): StatusKind {
  if (level === "high") return "error";
  if (level === "medium") return "warning";
  return "success";
}

function signalKind(status: ReadinessSignal["status"]): StatusKind {
  if (status === "pass") return "success";
  if (status === "warn") return "warning";
  return "error";
}

function policyKind(policy: string): StatusKind {
  if (policy === "allowed") return "success";
  if (policy === "blocked") return "error";
  // No robots.txt, so no stated policy: allowed by protocol, but not declared.
  return "neutral";
}

function toIntentClass(value: string): IntentClass {
  const known: ReadonlyArray<IntentClass> = [
    "Informational",
    "Navigational",
    "Commercial Investigation",
    "Transactional"
  ];
  return known.find((entry) => entry.toLowerCase() === value.trim().toLowerCase()) ?? "Informational";
}

export default function ProjectIntelligencePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [scoreData, setScoreData] = useState<SeoScoreData | null>(null);
  const [issues, setIssues] = useState<TechnicalIssue[]>([]);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [gaps, setGaps] = useState<ContentGapRow[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [architecture, setArchitecture] = useState<ArchitectureData | null>(null);
  const [intentData, setIntentData] = useState<{ intent: string; confidence: number; why: string } | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState("");

  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [addingCompetitor, setAddingCompetitor] = useState(false);

  const [newExpTitle, setNewExpTitle] = useState("");
  const [newExpHypothesis, setNewExpHypothesis] = useState("");
  const [newExpVariant, setNewExpVariant] = useState("");
  // Deliberately EMPTY. These used to default to 2.5 and 3.8, so a user who
  // recorded an experiment without measuring anything saved a fabricated 3.8%
  // variant CTR and a 1.3-point "lift" that then displayed as a measurement.
  const [newExpBaselineCtr, setNewExpBaselineCtr] = useState("");
  const [newExpVariantCtr, setNewExpVariantCtr] = useState("");
  const [addingExp, setAddingExp] = useState(false);

  async function loadAll() {
    if (!id) return;
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const [proj, opps, techIssues, pgList, kwList, gapList, compList, expList, arch, intent, status] =
        await Promise.all([
          api<Project>(`/api/projects/${id}`),
          api<SeoScoreData>(`/api/projects/${id}/opportunities`).catch(() => null),
          api<TechnicalIssue[]>(`/api/projects/${id}/technical-seo`).catch(() => []),
          api<PageRow[]>(`/api/projects/${id}/pages`).catch(() => []),
          api<KeywordRow[]>(`/api/projects/${id}/keywords`).catch(() => []),
          api<ContentGapRow[]>(`/api/projects/${id}/content-gaps`).catch(() => []),
          api<CompetitorRow[]>(`/api/projects/${id}/competitors`).catch(() => []),
          api<ExperimentRow[]>(`/api/experiments?project_id=${id}`).catch(() => []),
          api<ArchitectureData>(`/api/projects/${id}/architecture`).catch(() => null),
          api<{ intent: string; confidence: number; why: string }>(`/api/projects/${id}/intent`).catch(
            () => null
          ),
          api<CrawlStatus>(`/api/projects/${id}/crawl-status`).catch(() => null)
        ]);

      setProject(proj);
      setScoreData(opps);
      setIssues(techIssues || []);
      setPages(pgList || []);
      setKeywords(kwList || []);
      setGaps(gapList || []);
      setCompetitors(compList || []);
      setExperiments(expList || []);
      setArchitecture(arch);
      setIntentData(intent);
      setCrawlStatus(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Deep-link the active tab. A seven-panel cockpit is worth bookmarking, and
  // without this a refresh always threw the user back to Overview. The hash is
  // read after mount rather than via useSearchParams so the page needs no
  // Suspense boundary, and history.replaceState avoids polluting Back with one
  // entry per tab click.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const fromHash = window.location.hash.slice(1) as TabId;
      if (TAB_IDS.includes(fromHash)) setActiveTab(fromHash);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Elapsed counter while the crawl request is in flight. The crawl is a single
  // blocking POST that can run for minutes; a button that only says "Auditing"
  // for two minutes reads as a hang.
  useEffect(() => {
    if (!crawling) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [crawling]);

  const loadReadiness = useCallback(
    async (force = false) => {
      if (!id) return;
      setReadinessLoading(true);
      setReadinessError("");
      try {
        const data = await api<Readiness>(
          `/api/projects/${id}/readiness${force ? "?refresh=true" : ""}`
        );
        setReadiness(data);
      } catch (e) {
        setReadinessError(e instanceof Error ? e.message : "Readiness audit failed");
      } finally {
        setReadinessLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (activeTab !== "readiness") return;
    // Fetched on first visit to the tab, not on page load: it costs three
    // outbound requests to the audited site and most visits never open it.
    if (readiness || readinessLoading || readinessError) return;
    const timer = window.setTimeout(() => void loadReadiness(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function selectTab(next: TabId) {
    setActiveTab(next);
    window.history.replaceState(null, "", `#${next}`);
  }

  async function handleTriggerCrawl() {
    if (!id) return;
    setElapsed(0);
    setCrawling(true);
    setError("");
    try {
      await api(`/api/projects/${id}/crawl`, { method: "POST" });
      await loadAll();
      // The readiness audit measures schema coverage and JS-shell counts from
      // the rows this crawl just replaced, so a cached report is now stale.
      setReadiness(null);
      if (activeTab === "readiness") await loadReadiness(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crawl failed");
      // A failed crawl still writes an error session server-side; re-read so
      // the status strip shows the real outcome rather than the old one.
      const status = await api<CrawlStatus>(`/api/projects/${id}/crawl-status`).catch(() => null);
      setCrawlStatus(status);
    } finally {
      setCrawling(false);
    }
  }

  async function handleDownloadPdf() {
    if (!id) return;
    setDownloadingPdf(true);
    try {
      await downloadBlob(
        `/api/projects/${id}/report/pdf`,
        `rankace_report_${project?.name?.replace(/\s+/g, "_") || id}.pdf`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleAddCompetitor(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompetitorUrl.trim() || !id) return;
    setAddingCompetitor(true);
    try {
      const created = await api<{ fetch_error?: string }>(`/api/projects/${id}/competitors`, {
        method: "POST",
        body: JSON.stringify({ url: newCompetitorUrl })
      });
      // The competitor is still recorded so the comparison can be retried, but
      // an unreadable page is now REPORTED. It used to be saved as a blank row
      // with 0 words and 0% similarity, indistinguishable from a real result.
      setError(created?.fetch_error || "");
      setNewCompetitorUrl("");
      const comps = await api<CompetitorRow[]>(`/api/projects/${id}/competitors`);
      setCompetitors(comps);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add competitor");
    } finally {
      setAddingCompetitor(false);
    }
  }

  async function handleCreateExperiment(e: React.FormEvent) {
    e.preventDefault();
    if (!newExpTitle.trim() || !id) return;
    const baseline = newExpBaselineCtr.trim() === "" ? 0 : Number(newExpBaselineCtr);
    const variant = newExpVariantCtr.trim() === "" ? 0 : Number(newExpVariantCtr);
    if (!Number.isFinite(baseline) || !Number.isFinite(variant)) {
      setError("Click-through rates must be numbers between 0 and 100.");
      return;
    }
    if (baseline < 0 || baseline > 100 || variant < 0 || variant > 100) {
      setError("Click-through rates must be between 0 and 100.");
      return;
    }
    const measured = newExpBaselineCtr.trim() !== "" && newExpVariantCtr.trim() !== "";
    setAddingExp(true);
    setError("");
    try {
      await api(`/api/experiments?project_id=${id}`, {
        method: "POST",
        body: JSON.stringify({
          title: newExpTitle,
          hypothesis: newExpHypothesis,
          variant: newExpVariant,
          baseline_ctr: baseline,
          variant_ctr: variant,
          // A hypothesis with no figures is a draft, not a running test. The
          // old body always sent "running" and a result sentence claiming the
          // experiment was tracking, so an empty form produced a live-looking
          // experiment that had never been measured.
          status: measured ? "running" : "draft",
          result: measured
            ? "Baseline and variant recorded. Update the variant figure as data arrives."
            : "Hypothesis logged. No CTR measured yet; add baseline and variant figures to track lift."
        })
      });
      setNewExpTitle("");
      setNewExpHypothesis("");
      setNewExpVariant("");
      setNewExpBaselineCtr("");
      setNewExpVariantCtr("");
      const exps = await api<ExperimentRow[]>(`/api/experiments?project_id=${id}`);
      setExperiments(exps);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create experiment");
    } finally {
      setAddingExp(false);
    }
  }

  const criticalIssuesCount = issues.filter((issue) => issue.severity === "critical").length;
  const highIssuesCount = issues.filter((issue) => issue.severity === "high").length;
  const filteredIssues = issues.filter(
    (issue) => filterSeverity === "all" || issue.severity === filterSeverity
  );

  const clusteredKeywords = useMemo(
    () =>
      keywords.reduce<Record<string, KeywordRow[]>>((acc, keyword) => {
        const group = keyword.cluster || "Core Intent";
        if (!acc[group]) acc[group] = [];
        acc[group].push(keyword);
        return acc;
      }, {}),
    [keywords]
  );

  const issueColumns: ReadonlyArray<Column<TechnicalIssue>> = [
    {
      key: "severity",
      header: "Severity",
      render: (row) => <StatusTag kind={severityKind(row.severity)} label={row.severity} />
    },
    {
      key: "check",
      header: "Check",
      render: (row) => <span className="font-mono text-mono-data">{row.check}</span>
    },
    { key: "message", header: "Finding", render: (row) => row.message },
    {
      key: "page",
      header: "Page",
      render: (row) => <span className="font-mono text-mono-data text-ink-secondary">{row.page_url}</span>
    }
  ];

  const pageColumns: ReadonlyArray<Column<PageRow>> = [
    {
      key: "url",
      header: "URL",
      render: (row) => <span className="font-mono text-mono-data">{row.url}</span>
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (row) => (
        <StatusTag kind={row.status_code === 200 ? "success" : "error"} label={`HTTP ${row.status_code}`} />
      )
    },
    { key: "title", header: "Title", render: (row) => row.title || "Missing title" },
    { key: "words", header: "Words", numeric: true, render: (row) => row.word_count.toLocaleString() },
    {
      key: "links",
      header: "Links in / out",
      numeric: true,
      // `internal_links` is the number of internal links ON the page. The
      // column used to read "In / Out" next to it, which labelled out-links as
      // in-links. In-links now come from the crawl's link graph; on a project
      // crawled before that existed they are unknown, not zero, so a dash is
      // shown instead of a false 0.
      render: (row) => `${inLinksAvailable ? row.in_links : "—"} / ${row.internal_links}`
    },
    {
      key: "indexable",
      header: "Indexable",
      align: "right",
      render: (row) => (
        <StatusTag kind={row.indexable ? "success" : "error"} label={row.indexable ? "Yes" : "No"} />
      )
    },
    { key: "depth", header: "Depth", numeric: true, render: (row) => row.depth }
  ];

  const keywordColumns: ReadonlyArray<Column<KeywordRow>> = [
    { key: "keyword", header: "Keyword", render: (row) => row.keyword },
    { key: "intent", header: "Intent", render: (row) => <IntentTag intent={toIntentClass(row.intent)} /> },
    { key: "cluster", header: "Cluster", render: (row) => row.cluster || "Core Intent" },
    {
      key: "relevance",
      header: "Relevance",
      numeric: true,
      render: (row) => `${Math.round(row.relevance * 100)}%`
    },
    {
      key: "coverage",
      header: "Coverage",
      numeric: true,
      render: (row) => `${Math.round(row.coverage * 100)}%`
    },
    {
      key: "opportunity",
      header: "Opportunity",
      numeric: true,
      render: (row) => <ScoreMeter value={row.opportunity} variant="inline" showValue />
    }
  ];

  const gapColumns: ReadonlyArray<Column<ContentGapRow>> = [
    { key: "topic", header: "Topic", render: (row) => row.topic },
    {
      key: "yours",
      header: "Your site",
      render: (row) => (
        <StatusTag
          kind={row.your_coverage ? "success" : "error"}
          label={row.your_coverage ? "Covered" : "Missing"}
        />
      )
    },
    {
      key: "theirs",
      header: "Competitor",
      render: (row) => (
        <StatusTag
          kind={row.competitor_coverage ? "success" : "neutral"}
          label={row.competitor_coverage ? "Present" : "Absent"}
        />
      )
    },
    {
      key: "level",
      header: "Gap",
      align: "right",
      render: (row) => <StatusTag kind={gapKind(row.gap_level)} label={row.gap_level} />
    },
    {
      key: "rationale",
      header: "Impact",
      render: (row) =>
        row.gap_level === "high"
          ? `Competitors cover ${row.topic} in depth, leaving long-tail intent unaddressed.`
          : row.your_coverage
            ? `Solid coverage of ${row.topic} established.`
            : `Opportunity to expand coverage of ${row.topic} for competitive edge.`
    }
  ];

  const crawlerColumns: ReadonlyArray<Column<CrawlerPolicy>> = [
    {
      key: "name",
      header: "Crawler",
      render: (row) => <span className="font-mono text-mono-data">{row.name}</span>
    },
    { key: "purpose", header: "What it does", render: (row) => row.purpose },
    {
      key: "policy",
      header: "Policy",
      align: "right",
      render: (row) => (
        <StatusTag
          kind={policyKind(row.policy)}
          label={row.policy}
        />
      )
    }
  ];

  const tabItems = [
    { id: "overview", label: "Overview" },
    { id: "technical", label: `Technical SEO (${issues.length})` },
    { id: "keywords", label: `Keywords (${keywords.length})` },
    { id: "competitors", label: `Gaps (${gaps.length})` },
    { id: "architecture", label: "Architecture" },
    { id: "readiness", label: "AI search" },
    { id: "experiments", label: `Experiments (${experiments.length})` },
    { id: "report", label: "Report" }
  ];

  const hasAudit = crawlStatus?.status === "done" || Boolean(scoreData?.scored);

  const crawlStatusLabel =
    crawling || crawlStatus?.status === "running"
      ? "Auditing"
      : crawlStatus?.status === "error"
        ? "Last audit failed"
        : crawlStatus?.status === "done"
          ? "Audit complete"
          : "No audit yet";
  const crawlStatusKind: StatusKind =
    crawling || crawlStatus?.status === "running"
      ? "info"
      : crawlStatus?.status === "error"
        ? "error"
        : crawlStatus?.status === "done"
          ? "success"
          : "neutral";
  const lastCrawlAt = crawlStatus?.finished_at ?? crawlStatus?.started_at;
  const inLinksAvailable = architecture?.orphan_scan_available ?? false;

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="header-bar border-b border-line-subtle bg-canvas/85 backdrop-blur-xl">
        <div className="shell shell-content flex flex-col gap-4 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="secondary" size="sm" href="/dashboard" aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div className="min-w-0">
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 font-mono text-mono-micro uppercase text-ink-tertiary"
              >
                <Link href="/dashboard" className="rounded-sm hover:text-ink-primary">
                  Dashboard
                </Link>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
                <span className="text-ink-secondary">Projects</span>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
                <span className="text-accent">#{id}</span>
              </nav>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="truncate text-title-l text-ink-primary">
                  {project?.name || `Project #${id}`}
                </h1>
                {project ? <StatusTag kind="info" label={project.status} /> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-body-s text-ink-secondary">
                {project?.website_url ? (
                  <a
                    href={project.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-sm transition-colors duration-150 ease-instrument hover:text-accent"
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="font-mono text-mono-data">{project.website_url}</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : null}
                {project?.target_keyword ? (
                  <span>
                    Target{" "}
                    <span className="font-mono text-mono-data text-ink-primary">
                      {project.target_keyword}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Button onClick={handleTriggerCrawl} loading={crawling}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {crawling ? "Auditing" : "Re-crawl"}
            </Button>
            <Button variant="secondary" onClick={handleDownloadPdf} loading={downloadingPdf}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {downloadingPdf ? "Compiling" : "Export PDF"}
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="shell shell-content flex flex-col gap-6 pb-16 pt-6">
        {/* Crawl state used to be invisible: /crawl-status existed and nothing
            read it, so a failed or never-run audit looked exactly like a fresh
            project and a killed run stayed "in progress" with no way to tell. */}
        <Panel className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <StatusTag kind={crawlStatusKind} label={crawlStatusLabel} />
            <p className="min-w-0 text-body-s text-ink-secondary">
              {crawling ? (
                <>
                  Crawl running ·{" "}
                  <span data-numeric className="font-mono text-ink-primary">
                    {formatDuration(elapsed)}
                  </span>{" "}
                  elapsed
                </>
              ) : crawlStatus?.status === "error" ? (
                crawlStatus.error || "The last audit did not complete."
              ) : crawlStatus?.status === "done" ? (
                <>
                  <span data-numeric className="font-mono text-ink-primary">
                    {formatNumber(crawlStatus.pages_crawled ?? 0)}
                  </span>{" "}
                  pages recorded from the last audit.
                </>
              ) : (
                "Run the first audit to record technical findings and scores."
              )}
            </p>
          </div>
          {lastCrawlAt ? (
            <time
              dateTime={lastCrawlAt}
              title={absoluteTime(lastCrawlAt)}
              className="font-mono text-mono-micro uppercase text-ink-tertiary"
            >
              {relativeTime(lastCrawlAt)}
            </time>
          ) : (
            <Button size="sm" variant="secondary" onClick={handleTriggerCrawl} loading={crawling}>
              Run audit
            </Button>
          )}
        </Panel>

        {error ? (
          <p className="flex items-center gap-2 rounded-md border border-status-error/30 bg-status-error/10 px-4 py-3 text-body-s text-status-error">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Panel className="flex min-h-[8.5rem] items-center justify-center">
            {loading ? (
              <Skeleton className="h-24 w-24 rounded-pill" />
            ) : scoreData?.scored ? (
              <ScoreMeter
                value={scoreData.scores.health}
                variant="ring"
                size="lg"
                label="SEO health"
              />
            ) : (
              // No audit has run. A 0/100 ring is not a score, it is an
              // absence, and it rendered as a failing health result.
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <span className="font-mono text-title-l text-ink-tertiary">–</span>
                <span className="text-label text-ink-secondary">SEO health</span>
                <span className="font-mono text-mono-micro uppercase text-ink-tertiary">
                  Not scored
                </span>
              </div>
            )}
          </Panel>
          <StatBlock
            label="Visibility potential"
            value={scoreData?.scored ? scoreData.scores.opportunity : "—"}
            suffix={scoreData?.scored ? "/100" : undefined}
            tone="accent"
            loading={loading}
          />
          <StatBlock
            label="Critical issues"
            value={hasAudit ? criticalIssuesCount : "—"}
            tone="error"
            loading={loading}
          />
          <StatBlock
            label="High severity"
            value={hasAudit ? highIssuesCount : "—"}
            tone="warning"
            loading={loading}
          />
          <StatBlock label="Audited endpoints" value={pages.length} loading={loading} />
        </section>

        <Tabs
          ariaLabel="Project intelligence sections"
          value={activeTab}
          onChange={(next) => selectTab(next as TabId)}
          items={tabItems}
          className="scroll-x"
        />

        <TabPanel id={activeTab} className="flex flex-col gap-6">
          {activeTab === "overview" ? (
            <>
              {intentData ? (
                <Panel tone="interactive">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex flex-col gap-3">
                      <p className="font-mono text-mono-micro uppercase text-ink-tertiary">
                        Target search intent
                      </p>
                      <p className="text-title-m text-ink-primary">&quot;{project?.target_keyword}&quot;</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <IntentTag intent={toIntentClass(intentData.intent)} />
                        <ScoreMeter
                          value={Math.round(intentData.confidence * 100)}
                          variant="inline"
                          showHealthWord={false}
                        />
                      </div>
                    </div>
                    <div className="max-w-md flex-1">
                      <p className="font-mono text-mono-micro uppercase text-ink-tertiary">Attribution</p>
                      <p className="mt-2 text-body-s leading-relaxed text-ink-secondary">{intentData.why}</p>
                    </div>
                  </div>
                </Panel>
              ) : null}

              {scoreData?.scored && Object.keys(scoreData.scores.breakdown).length > 0 ? (
                <Panel>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-title-m text-ink-primary">Visibility breakdown</h2>
                    <span className="font-mono text-mono-micro uppercase text-ink-tertiary">
                      Rankace Core v2
                    </span>
                  </div>
                  <p className="measure mt-2 text-body-s text-ink-secondary">
                    A transparent weighted breakdown from crawl diagnostics and semantic models. Every
                    factor is reproducible from the same crawl.
                  </p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(scoreData.scores.breakdown).map(([category, value]) => (
                      <ScoreMeter key={category} value={value} label={category} size="md" />
                    ))}
                  </div>
                  {!("Content Gap" in scoreData.scores.breakdown) ? (
                    <p className="mt-5 border-t border-line-subtle pt-3 text-body-s text-ink-tertiary">
                      Content Gap is excluded from the weighted score because no competitor has been
                      analysed. It is not a perfect result – it is an unmeasured axis. Add a competitor in
                      the Gaps tab to include it.
                    </p>
                  ) : null}
                </Panel>
              ) : null}

              <Panel>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-title-m text-ink-primary">Prioritised action plan</h2>
                  <span className="font-mono text-mono-micro uppercase text-ink-tertiary">
                    {scoreData?.recommendations.length || 0} actions
                  </span>
                </div>

                {loading ? (
                  <div className="mt-6 flex flex-col gap-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (scoreData?.recommendations.length ?? 0) === 0 ? (
                  <EmptyState
                    className="mt-5"
                    title="No actions yet"
                    body="Run a crawl to generate a prioritised list of technical and content fixes."
                    action={
                      <Button size="sm" onClick={handleTriggerCrawl} loading={crawling}>
                        Run crawl
                      </Button>
                    }
                  />
                ) : (
                  <div className="mt-6 flex flex-col gap-3">
                    {scoreData?.recommendations.map((item, index) => (
                      <article
                        key={index}
                        className="rounded-md border border-line-subtle bg-surface-sunken p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h3 className="text-body font-semibold text-ink-primary">{item.title}</h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusTag kind={gapKind(item.priority)} label={`${item.priority} priority`} />
                            <StatusTag kind="info" label={`${item.impact} impact`} />
                            <StatusTag kind="neutral" label={`${item.effort} effort`} />
                          </div>
                        </div>
                        <dl className="mt-4 grid gap-3 text-body-s sm:grid-cols-3">
                          <div>
                            <dt className="font-mono text-mono-micro uppercase text-ink-tertiary">
                              Problem
                            </dt>
                            <dd className="mt-1 text-ink-secondary">{item.problem}</dd>
                          </div>
                          <div>
                            <dt className="font-mono text-mono-micro uppercase text-ink-tertiary">
                              Why it matters
                            </dt>
                            <dd className="mt-1 text-ink-secondary">{item.why}</dd>
                          </div>
                          <div>
                            <dt className="font-mono text-mono-micro uppercase text-status-success">
                              Action
                            </dt>
                            <dd className="mt-1 text-ink-primary">{item.action}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                )}
              </Panel>
            </>
          ) : null}

          {activeTab === "technical" ? (
            <>
              {/* Filter pills, matching the dashboard roster and the declared
                  design contract. These were five filled BUTTONS, so the
                  active filter looked like the page's primary action. */}
              <Tabs
                variant="pill"
                mode="filter"
                ariaLabel="Filter technical findings by severity"
                value={filterSeverity}
                onChange={setFilterSeverity}
                items={SEVERITIES.map((severity) => ({
                  id: severity,
                  label: `${severity} (${
                    severity === "all"
                      ? issues.length
                      : issues.filter((issue) => issue.severity === severity).length
                  })`
                }))}
                className="w-fit"
              />

              <DataTable
                caption="Technical diagnostic findings"
                columns={issueColumns}
                rows={filteredIssues}
                rowKey={(row) => `${row.check}-${row.page_url}-${row.message}`}
                loading={loading}
                emptyTitle="No issues match this filter"
                emptyBody="Change the severity filter, or run a fresh crawl to re-evaluate every page."
              />

              <DataTable
                caption="Crawled pages"
                columns={pageColumns}
                rows={pages}
                rowKey={(row) => String(row.id)}
                loading={loading}
                emptyTitle="No pages crawled"
                emptyBody="Trigger a crawl to record status codes, titles, word counts and link depth."
              />
            </>
          ) : null}

          {activeTab === "keywords" ? (
            <>
              <Panel tone="interactive" className="flex items-start gap-3">
                <HelpCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-status-warning"
                  aria-hidden="true"
                />
                <p className="text-body-s text-ink-secondary">
                  No commercial search-volume provider is configured. The opportunity score is
                  estimated by Rankace from topical relevance, search intent value and content gap
                  coverage. It is not a volume figure.
                </p>
              </Panel>

              {Object.keys(clusteredKeywords).length > 0 ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {Object.entries(clusteredKeywords).map(([clusterName, clusterKeywords]) => (
                    <Panel key={clusterName}>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-title-m text-ink-primary">{clusterName}</h3>
                        <span className="font-mono text-mono-micro uppercase text-ink-tertiary">
                          {clusterKeywords.length} queries
                        </span>
                      </div>
                      <ul className="mt-4 flex flex-col gap-2">
                        {clusterKeywords.slice(0, 6).map((keyword) => (
                          <li
                            key={keyword.keyword}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <span className="truncate text-body-s text-ink-secondary">
                              {keyword.keyword}
                            </span>
                            <ScoreMeter value={keyword.opportunity} variant="inline" showValue />
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  ))}
                </div>
              ) : null}

              <DataTable
                caption="Extracted keywords and search intent"
                columns={keywordColumns}
                rows={keywords}
                rowKey={(row) => row.keyword}
                loading={loading}
                emptyTitle="No keywords extracted"
                emptyBody="Run a crawl so Rankace can extract semantic phrases from your pages."
              />
            </>
          ) : null}

          {activeTab === "competitors" ? (
            <>
              <Panel>
                <h2 className="text-title-m text-ink-primary">Add a competitor</h2>
                <p className="measure mt-2 text-body-s text-ink-secondary">
                  Rankace compares page semantics with TF-IDF and embedding similarity to surface topic
                  domains competitors cover and you do not.
                </p>
                <form
                  onSubmit={handleAddCompetitor}
                  className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <Input
                    label="Competitor URL"
                    value={newCompetitorUrl}
                    onChange={(e) => setNewCompetitorUrl(e.target.value)}
                    placeholder="https://competitor.com/pricing"
                    className="flex-1"
                    required
                  />
                  <Button type="submit" loading={addingCompetitor}>
                    Add and compare
                  </Button>
                </form>
              </Panel>

              {competitors.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {competitors.map((competitor) => (
                    <Panel key={competitor.id} tone="interactive">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="truncate text-title-m text-ink-primary">
                          {competitor.title || competitor.url}
                        </h3>
                        <StatusTag kind="neutral" label={competitor.similarity === null ? "Unmeasured" : `${competitor.similarity}%`} />
                      </div>
                      <p className="mt-2 truncate font-mono text-mono-data text-ink-secondary">
                        {competitor.url}
                      </p>
                      <p className="mt-3 font-mono text-mono-micro uppercase text-ink-tertiary">
                        {competitor.fetch_error || `${competitor.word_count.toLocaleString()} words · semantic comparison`}
                      </p>
                    </Panel>
                  ))}
                </div>
              ) : null}

              <DataTable
                caption="Content topic gap matrix"
                columns={gapColumns}
                rows={gaps}
                rowKey={(row) => row.topic}
                loading={loading}
                emptyTitle="No competitor gaps mapped"
                emptyBody="Add a competitor above, then run a new audit to populate the gap matrix."
              />
            </>
          ) : null}

          {activeTab === "architecture" ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <Panel>
                  <h2 className="text-title-m text-ink-primary">
                    {inLinksAvailable
                      ? `Orphan pages (${architecture?.orphans?.length || 0})`
                      : "Orphan pages"}
                  </h2>
                  <p className="mt-2 text-body-s text-ink-secondary">
                    Pages no other internal page links to. Crawlers reach pages by following links, so
                    an orphan is invisible unless it is in the sitemap.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {!inLinksAvailable ? (
                      <p className="rounded-sm border border-line-subtle bg-surface-sunken px-3 py-2 text-body-s text-ink-secondary">
                        This project was crawled before in-link counting existed. Re-crawl to measure
                        orphans – existing rows cannot tell &ldquo;no links in&rdquo; from &ldquo;not counted&rdquo;.
                      </p>
                    ) : (architecture?.orphans || []).length === 0 ? (
                      <StatusTag kind="success" label="No orphan pages detected" />
                    ) : (
                      architecture?.orphans.map((orphan) => (
                        <p
                          key={orphan.id}
                          className="truncate rounded-sm border border-line-subtle bg-surface-sunken px-3 py-2 font-mono text-mono-data text-ink-secondary"
                        >
                          {orphan.url}
                        </p>
                      ))
                    )}
                  </div>
                </Panel>

                <Panel>
                  <h2 className="text-title-m text-ink-primary">Deeply buried pages</h2>
                  <p className="mt-2 text-body-s text-ink-secondary">
                    Important content should sit within three clicks of the homepage.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {pages.filter((page) => page.depth >= 3).length === 0 ? (
                      <StatusTag kind="success" label="All pages within three clicks" />
                    ) : (
                      pages
                        .filter((page) => page.depth >= 3)
                        .map((page) => (
                          <p
                            key={page.id}
                            className="flex items-center justify-between gap-3 rounded-sm border border-line-subtle bg-surface-sunken px-3 py-2"
                          >
                            <span className="truncate font-mono text-mono-data text-ink-secondary">
                              {page.url}
                            </span>
                            <StatusTag kind="warning" label={`Depth ${page.depth}`} />
                          </p>
                        ))
                    )}
                  </div>
                </Panel>
              </div>

              <Panel>
                <h2 className="text-title-m text-ink-primary">Crawl depth hierarchy</h2>
                <div className="mt-5 flex flex-col gap-4">
                  {[0, 1, 2, 3].map((depthLevel) => {
                    const depthPages = pages.filter((page) => page.depth === depthLevel);
                    if (depthPages.length === 0 && depthLevel > 0) return null;
                    return (
                      <div key={depthLevel}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono text-mono-micro uppercase text-accent">
                            {depthLevel === 0 ? "Depth 0 · root" : `Depth ${depthLevel}`}
                          </span>
                          <span className="font-mono text-mono-micro uppercase text-ink-tertiary">
                            {depthPages.length} pages
                          </span>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {depthPages.map((page) => (
                            <div
                              key={page.id}
                              className="rounded-sm border border-line-subtle bg-surface-sunken p-3"
                            >
                              <p className="truncate text-body-s text-ink-primary">
                                {page.title || page.url}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-mono-micro text-ink-tertiary">
                                {page.url}
                              </p>
                              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-subtle pt-2">
                                <span className="font-mono text-mono-micro text-ink-tertiary">
                                  {inLinksAvailable ? `In ${page.in_links} · ` : ""}Out {page.internal_links}
                                </span>
                                <StatusTag
                                  kind={page.status_code === 200 ? "success" : "error"}
                                  label={`HTTP ${page.status_code}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </>
          ) : null}

          {activeTab === "readiness" ? (
            <>
              {readinessLoading && !readiness ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <Panel key={index}>
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-3 h-3 w-full" />
                      <Skeleton className="mt-2 h-3 w-2/3" />
                    </Panel>
                  ))}
                </div>
              ) : readinessError ? (
                <Panel className="flex flex-col items-start gap-3">
                  <p className="flex items-center gap-2 text-body-s text-status-error">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {readinessError}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => loadReadiness(true)}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Try again
                  </Button>
                </Panel>
              ) : readiness ? (
                <>
                  <Panel variant="hero" className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-6">
                      <ScoreMeter value={readiness.score} variant="ring" size="lg" label="AI readiness" />
                      <div className="min-w-0">
                        <h2 className="flex items-center gap-2 text-title-l text-ink-primary">
                          <Bot className="h-4 w-4 text-accent" aria-hidden="true" />
                          Can answer engines read this site?
                        </h2>
                        <p className="measure mt-2 text-body-s text-ink-secondary">{readiness.note}</p>
                        <p className="mt-2 font-mono text-mono-micro uppercase text-ink-tertiary">
                          {readiness.origin} · {readiness.pages_measured}{" "}
                          {readiness.pages_measured === 1 ? "page" : "pages"} measured
                          {readiness.cached ? " · cached" : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => loadReadiness(true)}
                      loading={readinessLoading}
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      Re-check live files
                    </Button>
                  </Panel>

                  <div className="grid gap-3 md:grid-cols-2">
                    {readiness.signals.map((item) => (
                      <Panel key={item.key} tone="interactive" className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h3 className="text-title-m text-ink-primary">{item.label}</h3>
                          <StatusTag
                            kind={signalKind(item.status)}
                            label={
                              item.status === "fail"
                                ? "action needed"
                                : item.status === "warn"
                                  ? "review"
                                  : "ready"
                            }
                          />
                        </div>
                        <p className="text-body-s text-ink-secondary">{item.detail}</p>
                        <p className="mt-auto border-t border-line-subtle pt-3 text-body-s text-ink-tertiary">
                          {item.advice}
                        </p>
                      </Panel>
                    ))}
                  </div>

                  <Panel variant="flush" className="overflow-hidden">
                    <div className="border-b border-line-subtle px-4 py-3">
                      <h2 className="flex items-center gap-2 text-title-m text-ink-primary">
                        <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                        Crawler policy, read from robots.txt
                      </h2>
                      <p className="mt-1 text-body-s text-ink-secondary">
                        Index crawlers decide whether this site can be cited at all. Training crawlers
                        are a separate licensing decision.
                      </p>
                    </div>
                    <DataTable
                      caption="AI crawler access policy"
                      columns={crawlerColumns}
                      rows={[...readiness.answer_crawlers, ...readiness.training_crawlers]}
                      rowKey={(row) => row.name}
                      emptyTitle="No crawler policy"
                      emptyBody="robots.txt could not be read, so no policy is stated."
                      className="rounded-none border-0 shadow-none"
                    />
                  </Panel>
                </>
              ) : (
                <EmptyState
                  title="Readiness not measured"
                  body="Run the check to audit robots.txt, sitemap.xml, llms.txt and the stored crawl."
                  action={
                    <Button size="sm" onClick={() => loadReadiness(true)} loading={readinessLoading}>
                      Run readiness check
                    </Button>
                  }
                />
              )}
            </>
          ) : null}

          {activeTab === "experiments" ? (
            <>
              <Panel tone="interactive" className="flex items-start gap-3">
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <p className="text-body-s text-ink-secondary">
                  Document a hypothesis, define a variant, then track click-through rate over time.
                  Rankace records your own measurements. It does not claim to run live A/B tests inside
                  Google.
                </p>
              </Panel>

              <Panel>
                <h2 className="text-title-m text-ink-primary">Record an experiment</h2>
                <form onSubmit={handleCreateExperiment} className="mt-5 flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Experiment title"
                      value={newExpTitle}
                      onChange={(e) => setNewExpTitle(e.target.value)}
                      placeholder="Title tag commercial intent upgrade"
                      required
                    />
                    <Input
                      label="Proposed variant"
                      value={newExpVariant}
                      onChange={(e) => setNewExpVariant(e.target.value)}
                      placeholder="Best SEO Tools: Pricing and Comparison Guide"
                      required
                    />
                  </div>
                  <Textarea
                    label="Hypothesis"
                    value={newExpHypothesis}
                    onChange={(e) => setNewExpHypothesis(e.target.value)}
                    placeholder="Adding pricing and itinerary signals into the title will lift commercial CTR."
                    rows={3}
                  />
                  <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
                    <Input
                      label="Baseline CTR (%)"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={newExpBaselineCtr}
                      onChange={(e) => setNewExpBaselineCtr(e.target.value)}
                      helper="From your analytics. Leave blank until measured."
                    />
                    <Input
                      label="Variant CTR (%)"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={newExpVariantCtr}
                      onChange={(e) => setNewExpVariantCtr(e.target.value)}
                      helper="Leave blank until the variant has data."
                    />
                    <Button type="submit" loading={addingExp}>
                      Record experiment
                    </Button>
                  </div>
                </form>
              </Panel>

              {experiments.length === 0 ? (
                <EmptyState
                  title="No experiments recorded"
                  body="Log your first CTR hypothesis above and track it against its variant over time."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {experiments.map((experiment) => {
                    const lift = experiment.variant_ctr - experiment.baseline_ctr;
                    return (
                      <Panel key={experiment.id} tone="interactive">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h3 className="text-title-m text-ink-primary">{experiment.title}</h3>
                          <StatusTag
                            kind={
                              experiment.status === "complete"
                                ? "success"
                                : experiment.status === "running"
                                  ? "info"
                                  : "neutral"
                            }
                            label={experiment.status}
                          />
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <div>
                            <p className="font-mono text-mono-micro uppercase text-ink-tertiary">
                              Hypothesis
                            </p>
                            <p className="mt-1 text-body-s text-ink-secondary">{experiment.hypothesis}</p>
                          </div>
                          <div>
                            <p className="font-mono text-mono-micro uppercase text-ink-tertiary">Variant</p>
                            <p className="mt-1 font-mono text-mono-data text-ink-secondary">
                              {experiment.variant}
                            </p>
                          </div>
                          <div>
                            <p className="font-mono text-mono-micro uppercase text-ink-tertiary">Lift</p>
                            <p className="mt-1 font-mono text-mono-data text-ink-primary">
                              {experiment.baseline_ctr === 0 && experiment.variant_ctr === 0
                                ? "Not measured yet"
                                : `${experiment.baseline_ctr}% → ${experiment.variant_ctr}% (${lift > 0 ? "+" : ""}${lift.toFixed(1)})`}
                            </p>
                          </div>
                        </div>
                        <p className="mt-4 border-t border-line-subtle pt-3 text-body-s text-ink-secondary">
                          {experiment.result}
                        </p>
                      </Panel>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          {activeTab === "report" ? (
            <Panel variant="hero">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line-subtle pb-6">
                <div>
                  <p className="font-mono text-mono-micro uppercase text-ink-tertiary">
                    Formal SEO analysis
                  </p>
                  <h2 className="mt-2 text-display-m text-ink-primary">
                    {project?.name} — executive audit
                  </h2>
                  <p className="mt-2 font-mono text-mono-data text-ink-secondary">
                    {project?.website_url} · {project?.target_keyword}
                  </p>
                </div>
                <Button onClick={handleDownloadPdf} loading={downloadingPdf}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export PDF
                </Button>
              </div>

              <div className="mt-8 flex flex-col gap-8">
                <section>
                  <h3 className="text-title-m text-ink-primary">Executive summary</h3>
                  <p className="measure mt-3 text-body text-ink-secondary">
                    Rankace conducted an empirical search visibility audit of {project?.website_url}. The
                    site scored {scoreData?.scores.health ?? 0}/100 on technical health and{" "}
                    {scoreData?.scores.opportunity ?? 0}/100 on search visibility potential. The audit
                    recorded {issues.length} technical issues, of which {criticalIssuesCount} are
                    critical, and {gaps.length} competitor topic opportunities.
                  </p>
                </section>

                <section>
                  <h3 className="text-title-m text-ink-primary">Visibility breakdown</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {Object.entries(scoreData?.scores.breakdown ?? {}).map(([key, value]) => (
                      <ScoreMeter key={key} value={value} label={key} />
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-title-m text-ink-primary">Prioritised recommendations</h3>
                  <ol className="mt-4 flex flex-col gap-3">
                    {(scoreData?.recommendations ?? []).slice(0, 5).map((item, index) => (
                      <li
                        key={index}
                        className="rounded-md border border-line-subtle bg-surface-sunken p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-body-s font-semibold text-ink-primary">{item.title}</span>
                          <StatusTag kind={gapKind(item.priority)} label={`${item.priority} priority`} />
                        </div>
                        <p className="mt-2 text-body-s text-ink-secondary">{item.action}</p>
                      </li>
                    ))}
                  </ol>
                </section>

                <section>
                  <h3 className="text-title-m text-ink-primary">Method and limits</h3>
                  <p className="measure mt-3 text-body text-ink-secondary">
                    Scores are estimated from crawl evidence, published technical guidance and NLP topic
                    models. Rankace does not claim to know or reproduce Google&apos;s proprietary ranking
                    algorithm, and no score here should be read as a predicted position.
                  </p>
                </section>
              </div>
            </Panel>
          ) : null}
        </TabPanel>

        {tabItems
          .filter((item) => item.id !== activeTab)
          .map((item) => (
            <TabPanel key={item.id} id={item.id} hidden />
          ))}
      </main>
    </div>
  );
}
