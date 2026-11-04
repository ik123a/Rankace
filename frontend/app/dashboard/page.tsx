"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Archive,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  LogOut,
  RotateCcw,
  Trash2
} from "lucide-react";
import { api, getToken, logout } from "../../lib/api";
import { absoluteTime, formatNumber, relativeTime } from "../../lib/format";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { EmptyState } from "../../components/ui/empty-state";
import { Input } from "../../components/ui/field";
import { Panel } from "../../components/ui/panel";
import { Skeleton } from "../../components/ui/skeleton";
import { StatBlock } from "../../components/ui/stat-block";
import { StatusTag } from "../../components/ui/status-tag";
import { Tabs } from "../../components/ui/tabs";
import { Mark } from "../../components/ui/nav-pill";
import { ThemeToggle } from "../../components/ui/theme-toggle";

type Project = {
  id: number;
  name: string;
  website_url: string;
  target_keyword: string;
  status: string;
  created_at: string;
};

type DemoData = {
  demo: boolean;
  health: number;
  opportunity: number;
  critical_issues: number;
  keyword_opportunities: number;
  breakdown: Record<string, number>;
  note: string;
};

type Overview = {
  projects: { total: number; active: number; archived: number };
  pages_audited: number;
  health: number | null;
  projects_audited: number;
  open_actions: number;
  keywords: number;
  last_audit: {
    project_id: number;
    status: string;
    pages_crawled: number;
    finished_at: string | null;
    started_at: string | null;
  } | null;
};

const FILTERS = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" }
] as const;

type Filter = (typeof FILTERS)[number]["id"];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showDemoParam = searchParams.get("demo") === "1";

  const [projects, setProjects] = useState<Project[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<Filter>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");

    const token = getToken();
    if (!token && !showDemoParam) {
      router.push("/login");
      return;
    }

    try {
      // The aggregate is a separate, optional read: a failure there must not
      // take down the roster, which is the page's actual job.
      const [data, summary] = await Promise.all([
        api<Project[]>("/api/projects"),
        api<Overview>("/api/projects/overview").catch(() => null)
      ]);
      setProjects(data || []);
      setOverview(summary);

      if (showDemoParam) {
        const demo = await api<DemoData>("/api/demo").catch(() => null);
        setDemoData(demo);
      }
    } catch (e) {
      if (showDemoParam) {
        setProjects([]);
      } else {
        setError(e instanceof Error ? e.message : "Failed to load projects");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDemoParam]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    try {
      const newProject = await api<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          website_url: normalizedUrl,
          target_keyword: keyword.trim()
        })
      });

      // This used to promise "Baseline crawl is being initialised" -- nothing
      // started a crawl. Creating a project only stores the domain and target
      // query; the first audit is an explicit action. Say what actually
      // happened so the empty cockpit is not a surprise.
      setSuccessMsg(
        `Project "${newProject.name}" created. Open it and run the first audit to populate its scores.`
      );
      setName("");
      setUrl("");
      setKeyword("");
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    }
  }

  async function handleArchive(id: number) {
    try {
      await api(`/api/projects/${id}/archive`, { method: "POST" });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to archive project");
    }
  }

  async function handleUnarchive(id: number) {
    try {
      await api(`/api/projects/${id}/unarchive`, { method: "POST" });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to restore project");
    }
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await api(`/api/projects/${target.id}`, { method: "DELETE" });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    }
  }

  const filteredProjects = projects.filter((project) =>
    statusFilter === "all" ? true : project.status === statusFilter
  );
  const activeProjectsCount = projects.filter((project) => project.status === "active").length;

  // Demo mode substitutes the labelled synthetic figures. Every other number on
  // this row is a real count from /api/projects/overview; the previous version
  // hardcoded 88/100, 94% and an "Online" status that came from nothing.
  const usingDemo = Boolean(showDemoParam && demoData);
  const meanHealth = usingDemo ? demoData?.health ?? null : overview?.health ?? null;
  const healthTone =
    meanHealth === null ? "neutral" : meanHealth >= 80 ? "success" : meanHealth >= 50 ? "warning" : "error";

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="header-bar border-b border-line-subtle bg-canvas/85 backdrop-blur-xl">
        <div className="shell shell-content flex h-[var(--header-h)] items-center justify-between gap-4">
          <Link href="/" className="rounded-sm">
            <Mark />
            <span className="sr-only">Rankace home</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-sm px-3 py-2 text-body-s text-ink-secondary transition-colors duration-150 ease-instrument hover:bg-surface-1 hover:text-ink-primary sm:block"
            >
              Site
            </Link>
            <ThemeToggle />
            <Button variant="secondary" size="sm" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="shell shell-content flex flex-col gap-8 pb-16 pt-6">
        <div>
          <h1 className="text-display-m text-ink-primary">Projects</h1>
          <p className="measure mt-2 text-body text-ink-secondary">
            Every crawl, keyword opportunity and growth experiment for the sites you track.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }, (_, index) => <StatBlock key={index} label="" value={0} loading />)
          ) : (
            <>
              <StatBlock
                label="Active projects"
                value={activeProjectsCount}
                suffix={overview ? `of ${overview.projects.total}` : undefined}
              />
              <StatBlock
                label="Pages audited"
                value={formatNumber(overview?.pages_audited ?? 0)}
                suffix={overview?.open_actions ? `${overview.open_actions} open actions` : undefined}
              />
              <StatBlock
                label="Mean health"
                value={meanHealth ?? "—"}
                suffix={meanHealth === null ? undefined : "/100"}
                tone={healthTone}
                demo={usingDemo}
              />
              <StatBlock
                label="Last audit"
                value={
                  usingDemo
                    ? "Sample"
                    : relativeTime(overview?.last_audit?.finished_at ?? overview?.last_audit?.started_at)
                }
              />
            </>
          )}
        </div>

        {overview?.last_audit && !usingDemo ? (
          <p className="-mt-4 text-label text-ink-tertiary">
            Most recent audit ran on project{" "}
            <Link
              href={`/projects/${overview.last_audit.project_id}`}
              className="rounded-sm text-accent transition-opacity hover:opacity-80"
            >
              #{overview.last_audit.project_id}
            </Link>{" "}
            <time
              dateTime={overview.last_audit.finished_at ?? overview.last_audit.started_at ?? undefined}
              title={absoluteTime(overview.last_audit.finished_at ?? overview.last_audit.started_at)}
            >
              ({relativeTime(overview.last_audit.finished_at ?? overview.last_audit.started_at)})
            </time>
            , status {overview.last_audit.status}, {overview.last_audit.pages_crawled} pages.
          </p>
        ) : null}

        {showDemoParam && demoData ? (
          <Panel tone="interactive" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusTag kind="demo" label="Demo data" />
              <p className="text-body-s text-ink-secondary">{demoData.note}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag kind="error" label={`${demoData.critical_issues} defects`} />
              <StatusTag kind="info" label={`${demoData.keyword_opportunities} opportunities`} />
              <StatusTag kind="success" label={`Visibility ${demoData.opportunity}/100`} />
            </div>
          </Panel>
        ) : null}

        {error ? (
          <p className="flex items-center gap-2 rounded-md border border-status-error/30 bg-status-error/10 px-4 py-3 text-body-s text-status-error">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {successMsg ? (
          <p className="flex items-center gap-2 rounded-md border border-status-success/30 bg-status-success/10 px-4 py-3 text-body-s text-status-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {successMsg}
          </p>
        ) : null}

        <Panel>
          <h2 className="text-title-m text-ink-primary">Initialise a new project</h2>
          <p className="measure mt-2 text-body-s text-ink-secondary">
            Give Rankace a domain and the query you care about. The first crawl establishes the
            baseline every later score is measured against.
          </p>
          <form onSubmit={handleCreate} className="mt-6 grid gap-4 md:grid-cols-4 md:items-end">
            <Input
              label="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Northwind Cloud"
              required
            />
            <Input
              label="Website domain"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="northwind.com"
              required
            />
            <Input
              label="Target keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="enterprise kubernetes hosting"
              required
            />
            <Button type="submit" className="w-full">
              Initialise audit
            </Button>
          </form>
        </Panel>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-title-l text-ink-primary">Roster</h2>
            <Tabs
              variant="pill"
              mode="filter"
              ariaLabel="Filter projects by status"
              value={statusFilter}
              onChange={(next) => setStatusFilter(next as Filter)}
              items={FILTERS.map((filter) => ({ id: filter.id, label: filter.label }))}
              className="w-fit"
            />
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <Panel key={index}>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-3 h-3 w-48" />
                    <Skeleton className="mt-6 h-9 w-full" />
                  </Panel>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <EmptyState
                title={statusFilter === "archived" ? "No archived projects" : "No projects yet"}
                body={
                  statusFilter === "archived"
                    ? "Archived projects stay here with their crawl history intact."
                    : "Initialise your first project above to run a technical audit and start mapping search opportunities."
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <Panel key={project.id} tone="interactive" className="flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="truncate text-title-m text-ink-primary">{project.name}</h3>
                      <StatusTag
                        kind={project.status === "active" ? "success" : "neutral"}
                        label={project.status}
                      />
                    </div>

                    <a
                      href={project.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-body-s text-ink-secondary transition-colors duration-150 ease-instrument hover:text-accent"
                    >
                      <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{project.website_url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                    </a>

                    <div className="mt-4 rounded-sm border border-line-subtle bg-surface-sunken px-3 py-2">
                      <span className="font-mono text-mono-micro uppercase text-ink-tertiary">
                        Target query
                      </span>
                      <p className="mt-1 truncate font-mono text-mono-data text-ink-primary">
                        {project.target_keyword}
                      </p>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-subtle pt-4">
                      <Link
                        href={`/projects/${project.id}`}
                        className="inline-flex items-center gap-1.5 rounded-sm text-body-s text-accent transition-opacity duration-150 ease-instrument hover:opacity-80"
                      >
                        Open audit
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      <div className="flex items-center gap-1">
                        {project.status === "active" ? (
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handleArchive(project.id)}
                            aria-label={`Archive ${project.name}`}
                          >
                            <Archive className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        ) : (
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handleUnarchive(project.id)}
                            aria-label={`Restore ${project.name}`}
                          >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => setPendingDelete(project)}
                          aria-label={`Delete ${project.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this project?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" and every crawl record it owns will be removed. This cannot be undone.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirmed}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete project
            </Button>
          </>
        }
      >
        <p className="text-body-s text-ink-secondary">
          Prefer to keep the history? Close this and use archive instead.
        </p>
      </Dialog>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-canvas">
          <p className="font-mono text-mono-data text-ink-tertiary">Loading projects</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
