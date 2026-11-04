"use client";

import { useState } from "react";
import { Button } from "../../components/ui/button";
import { DataTable, type Column } from "../../components/ui/data-table";
import { Dialog } from "../../components/ui/dialog";
import { EmptyState } from "../../components/ui/empty-state";
import { Input, Select } from "../../components/ui/field";
import { NavPill } from "../../components/ui/nav-pill";
import { Panel } from "../../components/ui/panel";
import { ScoreMeter } from "../../components/ui/score-meter";
import { Skeleton, SkeletonText } from "../../components/ui/skeleton";
import { StatBlock } from "../../components/ui/stat-block";
import { healthKind, IntentTag, StatusTag } from "../../components/ui/status-tag";
import { TabPanel, Tabs } from "../../components/ui/tabs";
import { VisibilityField } from "../../components/visuals/visibility-field";

type Row = { id: string; page: string; issue: string; severity: "high" | "medium" | "low" };

const ROWS: Row[] = [
  { id: "1", page: "/pricing", issue: "Missing meta description", severity: "high" },
  { id: "2", page: "/docs/intro", issue: "H1 duplicated on page", severity: "medium" },
  { id: "3", page: "/blog/seo-guide", issue: "Image missing alt text", severity: "low" }
];

const COLUMNS: ReadonlyArray<Column<Row>> = [
  { key: "page", header: "Page", render: (row) => <span className="font-mono text-mono-data">{row.page}</span> },
  { key: "issue", header: "Issue", render: (row) => row.issue },
  {
    key: "severity",
    header: "Severity",
    align: "right",
    render: (row) => (
      <StatusTag
        kind={row.severity === "high" ? "error" : row.severity === "medium" ? "warning" : "neutral"}
        label={row.severity}
      />
    )
  }
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="flex flex-col gap-4">
      <h2 className="font-mono text-mono-micro uppercase text-ink-tertiary">{title}</h2>
      {children}
    </Panel>
  );
}

export default function ShowcasePage() {
  const [tab, setTab] = useState("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldPaused, setFieldPaused] = useState(false);

  return (
    <main id="main" className="shell shell-content flex flex-col gap-8 pb-16 pt-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-display-l text-ink-primary">Primitive showcase</h1>
        <p className="measure text-body text-ink-secondary">
          Every primitive from <span className="font-mono text-mono-data text-ink-primary">DESIGN.md</span> section
          5, in each required state. This route exists for visual QA and is not linked from production navigation.
        </p>
      </header>

      <Group title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button href="/login">Renders link</Button>
        </div>
      </Group>

      <Group title="Panels">
        <div className="grid gap-3 md:grid-cols-3">
          <Panel>Padded, default elevation.</Panel>
          <Panel tone="interactive">Interactive, lifts border on hover.</Panel>
          <Panel variant="sunken">Sunken, for wells and inputs.</Panel>
        </div>
        <Panel variant="hero">Hero panel, radius lg, marketing only.</Panel>
      </Group>

      <Group title="Status tags">
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag kind="success" label="Passing" />
          <StatusTag kind="warning" label="Needs work" />
          <StatusTag kind="error" label="Failing" />
          <StatusTag kind="info" label="Informational" />
          <StatusTag kind="neutral" label="Not run" />
          <StatusTag kind="demo" label="Demo data" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IntentTag intent="Informational" />
          <IntentTag intent="Navigational" />
          <IntentTag intent="Commercial Investigation" />
          <IntentTag intent="Transactional" />
        </div>
      </Group>

      <Group title="Stat blocks">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatBlock label="Visibility" value={82} suffix="/100" tone="success" />
          <StatBlock label="Health" value={47} suffix="/100" tone="warning" />
          <StatBlock label="Crawl errors" value={3} tone="error" />
          <StatBlock label="Tracked projects" value={12} delta={2} />
          <StatBlock label="Demo visibility" value={74} suffix="/100" demo />
          <StatBlock label="Loading" value={0} loading />
        </div>
      </Group>

      <Group title="Score meters">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <ScoreMeter value={88} label="SEO health" />
            <ScoreMeter value={61} label="Visibility potential" />
            <ScoreMeter value={22} label="Thin content rate" size="sm" />
          </div>
          <div className="flex items-start gap-4">
            <ScoreMeter value={82} variant="ring" size="md" />
            <ScoreMeter value={64} variant="ring" size="lg" label="Opportunity" />
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-label text-ink-secondary">Inline, in a table row</span>
            <ScoreMeter value={91} variant="inline" />
            <ScoreMeter value={48} variant="inline" />
            <ScoreMeter value={12} variant="inline" />
          </div>
        </div>
      </Group>

      <Group title="Fields">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Project name" placeholder="acme-cloud" helper="Shown in the project roster." />
          <Input
            label="Website domain"
            placeholder="acme.com"
            required
            error="That domain could not be reached."
          />
          <Input label="Disabled" placeholder="Locked field" disabled />
          <Select
            label="Crawl depth"
            defaultValue="3"
            options={[
              { value: "1", label: "1 click" },
              { value: "3", label: "3 clicks" },
              { value: "5", label: "5 clicks" }
            ]}
          />
        </div>
      </Group>

      <Group title="Tabs">
        <Tabs
          items={[
            { id: "overview", label: "Overview" },
            { id: "technical", label: "Technical" },
            { id: "keywords", label: "Keywords" }
          ]}
          value={tab}
          onChange={setTab}
          ariaLabel="Showcase tabs"
        />
        {["overview", "technical", "keywords"].map((id) => (
          <TabPanel key={id} id={id} hidden={id !== tab}>
            <p className="text-body-s text-ink-secondary">
              Selected panel: <span className="font-mono text-mono-data text-ink-primary">{id}</span>. Arrow keys
              move between tabs, Home and End jump to the ends.
            </p>
          </TabPanel>
        ))}
        <div className="pt-2">
          <Tabs
            variant="pill"
            mode="filter"
            items={[
              { id: "active", label: "Active" },
              { id: "archived", label: "Archived" },
              { id: "all", label: "All" }
            ]}
            value="active"
            onChange={() => undefined}
            ariaLabel="Filter pills"
          />
        </div>
      </Group>

      <Group title="Data table">
        <DataTable caption="Technical issues" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />
        <DataTable caption="Loading state" columns={COLUMNS} rows={[]} rowKey={(row) => row.id} loading />
        <DataTable
          caption="Error state"
          columns={COLUMNS}
          rows={[]}
          rowKey={(row) => row.id}
          error="Could not load technical issues."
          onRetry={() => undefined}
        />
      </Group>

      <Group title="Empty, skeletons and dialog">
        <EmptyState
          title="No projects yet"
          body="Create a project with a domain and a target keyword to run the first crawl."
          action={<Button size="sm">Create project</Button>}
        />
        <div className="flex flex-col gap-3">
          <SkeletonText lines={3} />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <div>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
        </div>
      </Group>

      <Group title="Navigation pill">
        <NavPill
          items={[
            { label: "Capabilities", href: "/#capabilities" },
            { label: "Pipeline", href: "/#pipeline" },
            { label: "Method", href: "/#method" }
          ]}
          actionLabel="Launch app"
          actionHref="/dashboard"
        />
      </Group>

      <Group title="Visibility field">
        <div className="relative h-72 overflow-hidden rounded-md border border-line-subtle bg-canvas">
          <VisibilityField className="absolute inset-0 h-full w-full" paused={fieldPaused} />
          <div className="key-light pointer-events-none absolute inset-0" />
          <p className="absolute bottom-3 left-4 font-mono text-mono-micro uppercase text-ink-tertiary">
            Signature visual
          </p>
        </div>
        <div>
          <Button variant="secondary" size="sm" onClick={() => setFieldPaused((value) => !value)}>
            {fieldPaused ? "Resume field" : "Pause field"}
          </Button>
        </div>
      </Group>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Delete this project?"
        description="The project and every crawl record it owns will be removed. This cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setDialogOpen(false)}>
              Delete project
            </Button>
          </>
        }
      >
        <p className="flex items-center gap-2 text-body-s text-ink-secondary">
          Current status
          <StatusTag kind={healthKind(38)} label="At risk" />
        </p>
      </Dialog>
    </main>
  );
}
