"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FlaskConical,
  Globe,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import { api, downloadBlob, getToken } from "../../../lib/api";
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
type CompetitorRow = { id: number; url: string; title: string; word_count: number; similarity: number };
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
  nodes: Array<{ id: number; url: string; depth: number; links: number }>;
  orphans: Array<{ id: number; url: string; depth: number; links: number }>;
  topics: string[];
  detected: Record<string, boolean>;
};

const TAB_IDS = [
  "overview",
  "technical",
  "keywords",
  "competitors",
  "architecture",
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [addingCompetitor, setAddingCompetitor] = useState(false);

  const [newExpTitle, setNewExpTitle] = useState("");
  const [newExpHypothesis, setNewExpHypothesis] = useState("");
  const [newExpVariant, setNewExpVariant] = useState("");
  const [newExpBaselineCtr, setNewExpBaselineCtr] = useState("2.5");
  const [newExpVariantCtr, setNewExpVariantCtr] = useState("3.8");
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
      const [proj, opps, techIssues, pgList, kwList, gapList, compList, expList, arch, intent] =
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
          )
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleTriggerCrawl() {
    if (!id) return;
    setCrawling(true);
    setError("");
    try {
      await api(`/api/projects/${id}/crawl`, { method: "POST" });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crawl failed");
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
      await api(`/api/projects/${id}/competitors`, {
        method: "POST",
        body: JSON.stringify({ url: newCompetitorUrl })
      });
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
    setAddingExp(true);
    try {
      await api(`/api/experiments?project_id=${id}`, {
        method: "POST",
        body: JSON.stringify({
          title: newExpTitle,
          hypothesis: newExpHypothesis,
          variant: newExpVariant,
          baseline_ctr: parseFloat(newExpBaselineCtr) || 0,
          variant_ctr: parseFloat(newExpVariantCtr) || 0,
          status: "running",
          result: "Experiment active; tracking baseline vs variant CTR progress."
        })
      });
      setNewExpTitle("");
      setNewExpHypothesis("");
      setNewExpVariant("");
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
      header: "In / Out",
      numeric: true,
      render: (row) => `${row.internal_links} / ${row.external_links}`
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

  const tabItems = [
    { id: "overview", label: "Overview" },
    { id: "technical", label: `Technical SEO (${issues.length})` },
    { id: "keywords", label: `Keywords (${keywords.length})` },
    { id: "competitors", label: `Gaps (${gaps.length})` },
    { id: "architecture", label: "Architecture" },
    { id: "experiments", label: `Experiments (${experiments.length})` },
    { id: "report", label: "Report" }
  ];

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
        {error ? (
          <p className="flex items-center gap-2 rounded-md border border-status-error/30 bg-status-error/10 px-4 py-3 text-body-s text-status-error">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Panel className="flex items-center justify-center">
            {loading ? (
              <Skeleton className="h-24 w-24 rounded-pill" />
            ) : (
              <ScoreMeter
                value={scoreData?.scores.health ?? 0}
                variant="ring"
                size="lg"
                label="SEO health"
              />
            )}
          </Panel>
          <StatBlock
            label="Visibility potential"
            value={scoreData?.scores.opportunity ?? 0}
            suffix="/100"
            tone="accent"
            loading={loading}
          />
          <StatBlock label="Critical issues" value={criticalIssuesCount} tone="error" loading={loading} />
          <StatBlock label="High severity" value={highIssuesCount} tone="warning" loading={loading} />
          <StatBlock label="Audited endpoints" value={pages.length} loading={loading} />
        </section>

        <Tabs
          ariaLabel="Project intelligence sections"
          value={activeTab}
          onChange={(next) => setActiveTab(next as TabId)}
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
                          value={Math.round((intentData.confidence || 0.8) * 100)}
                          variant="inline"
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

              {scoreData?.scores.breakdown ? (
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-mono-micro uppercase text-ink-tertiary">Severity</span>
                {SEVERITIES.map((severity) => {
                  const count =
                    severity === "all"
                      ? issues.length
                      : issues.filter((issue) => issue.severity === severity).length;
                  return (
                    <Button
                      key={severity}
                      variant={filterSeverity === severity ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setFilterSeverity(severity)}
                    >
                      {severity} ({count})
                    </Button>
                  );
                })}
              </div>

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
                        <StatusTag kind="neutral" label={`${competitor.similarity}%`} />
                      </div>
                      <p className="mt-2 truncate font-mono text-mono-data text-ink-secondary">
                        {competitor.url}
                      </p>
                      <p className="mt-3 font-mono text-mono-micro uppercase text-ink-tertiary">
                        {competitor.word_count.toLocaleString()} words · semantic comparison
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
                emptyBody="Add a competitor above, then re-run the comparison to populate the gap matrix."
              />
            </>
          ) : null}

          {activeTab === "architecture" ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <Panel>
                  <h2 className="text-title-m text-ink-primary">
                    Orphan pages ({architecture?.orphans?.length || 0})
                  </h2>
                  <p className="mt-2 text-body-s text-ink-secondary">
                    Pages with zero internal in-links below the root. Crawlers may never reach them.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {(architecture?.orphans || []).length === 0 ? (
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
                              <div className="mt-3 flex items-center justify-between border-t border-line-subtle pt-2">
                                <span className="font-mono text-mono-micro text-ink-tertiary">
                                  In-links {page.internal_links}
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
                      value={newExpBaselineCtr}
                      onChange={(e) => setNewExpBaselineCtr(e.target.value)}
                    />
                    <Input
                      label="Variant CTR (%)"
                      type="number"
                      step="0.1"
                      value={newExpVariantCtr}
                      onChange={(e) => setNewExpVariantCtr(e.target.value)}
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
                          <StatusTag kind="info" label={experiment.status} />
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
                              {experiment.baseline_ctr}% → {experiment.variant_ctr}% ({lift.toFixed(1)})
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
