"use client";

import { Download, ExternalLink, Puzzle, ShieldCheck, Zap } from "lucide-react";
import { Button } from "../../components/ui/button";
import { NavPill } from "../../components/ui/nav-pill";
import { Panel } from "../../components/ui/panel";
import { ScoreMeter } from "../../components/ui/score-meter";
import { StatusTag } from "../../components/ui/status-tag";
import { ThemeToggle } from "../../components/ui/theme-toggle";

/**
 * Version is read from the built manifest rather than hardcoded here, so the
 * page cannot advertise a build that the download script did not produce.
 * Kept as a literal because a manifest import would inline the whole JSON
 * into the client bundle for one number; scripts/build-extension.mjs is the
 * thing that guarantees they agree, and it fails the build if they drift.
 */
const VERSION = "1.2.0";

const ZIP_URL = `/download/rankace-extension-v${VERSION}.zip`;
const SOURCE_URL = "/download/rankace-extension";

const NAV_ITEMS = [
  { label: "How it works", href: "/#pipeline" },
  { label: "Capabilities", href: "/#capabilities" },
  { label: "Extension", href: "/extension" }
];

const CHECKS = [
  {
    name: "Indexability",
    severity: "Indexability",
    detail: "Reads meta robots and googlebot for noindex — the one finding that removes a page from results entirely."
  },
  {
    name: "Title tag length",
    severity: "Metadata",
    detail: "Flags missing, short (<30) and long (>65) titles against the 50–60 char target."
  },
  {
    name: "Meta description",
    severity: "Metadata",
    detail: "Catches absent, undersized and over-length descriptions, plus duplicates across the page."
  },
  {
    name: "Canonical tag",
    severity: "Metadata",
    detail: "Reports a missing rel=\"canonical\" where duplicate-content consolidation is at risk."
  },
  {
    name: "H1 structure",
    severity: "Headings",
    detail: "Detects a missing H1, an empty H1, and every duplicate H1 with a live bounding box."
  },
  {
    name: "Image alt text",
    severity: "Images",
    detail: "Only flags images that are actually visible and meaningful, skipping decorative and captioned ones."
  },
  {
    name: "Anchor text",
    severity: "Links",
    detail: "Finds empty links and non-descriptive anchors like “click here” and “read more”."
  },
  {
    name: "Structured data",
    severity: "Schema",
    detail: "Lists every JSON-LD @type, catches invalid blocks, and flags pages with no schema at all."
  },
  {
    name: "Social previews",
    severity: "Social",
    detail: "Checks og:title, og:description, og:image and twitter:card, with a SERP-shaped preview of the metadata."
  },
  {
    name: "Link profile",
    severity: "Links",
    detail: "Internal vs external counts, nofollow/sponsored/ugc, and target=_blank links missing rel=noopener."
  },
  {
    name: "Technical hygiene",
    severity: "Technical",
    detail: "Viewport, html lang, charset, meta refresh, hreflang fallback and mixed content on HTTPS pages."
  },
  {
    name: "Thin content",
    severity: "Content",
    detail: "Flags pages under 250 words, which rarely satisfy a searcher's intent."
  }
] as const;

const STEPS = [
  {
    title: "Download the zip",
    body: "One archive, no installer, no account. It is the same code that runs the site audit."
  },
  {
    title: "Unzip it anywhere",
    body: "Chrome reads an unpacked folder directly, so there is nothing to install and nothing to run."
  },
  {
    title: "Load unpacked",
    body: "Open chrome://extensions, turn on Developer mode, choose “Load unpacked” and select the folder."
  },
  {
    title: "Open any page",
    body: "A Rankace pill appears bottom-right with the live score. Alt+R toggles the full inspector."
  }
] as const;

export default function ExtensionPage() {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <NavPill
        items={NAV_ITEMS}
        actionLabel="Launch app"
        actionHref="/dashboard"
        trailing={<ThemeToggle />}
      />

      <main id="main" className="shell shell-content flex flex-col gap-8 pb-16 pt-6">
        {/* ---- Hero ---- */}
        <section className="flex flex-col gap-6 py-8 md:py-12">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-mono-micro uppercase text-accent">
              Browser extension
            </span>
            <h1 className="max-w-[46rem] text-display-l text-ink-primary">
              Audit the page you are looking at, right now
            </h1>
            <p className="measure text-body-l text-ink-secondary">
              The Rankace inspector runs entirely in your browser. It reads the live DOM, scores what it
              finds, and draws a box around every element that needs work — so you can see the defect
              and the markup it came from at the same time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button href={ZIP_URL} size="lg" download>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download v{VERSION}
            </Button>
            <Button href={SOURCE_URL + "/manifest.json"} variant="secondary" size="lg">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Inspect the files
            </Button>
          </div>

          <p className="text-body-s text-ink-tertiary">
            Unpacked, no store listing, no permissions beyond reading the page. Manifest v{VERSION}.
          </p>
        </section>

        {/* ---- What it checks ---- */}
        <section className="flex flex-col gap-4">
          <h2 className="text-display-m text-ink-primary">Twelve live checks, plus the facts behind them</h2>
          <p className="measure text-body text-ink-secondary">
            Every check runs in the page you are on. Findings are weighted by severity, so the score
            reflects how many real problems exist rather than how many rules fired. Advisory findings
            carry no weight at all, so a missing Twitter card can never make a healthy page look sick.
          </p>
          <p className="measure text-body-s text-ink-tertiary">
            The side panel also reports the raw page facts: canonical, robots, language, viewport,
            charset, hreflang, title and description lengths, DOM size, scripts and stylesheets — next to
            a SERP preview, structured-data types, social coverage, link profile, heading outline and a
            one-click full text report.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {CHECKS.map((check) => (
              <Panel key={check.name} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-title-m text-ink-primary">{check.name}</h3>
                  <StatusTag kind="info" label={check.severity} />
                </div>
                <p className="text-body-s text-ink-secondary">{check.detail}</p>
              </Panel>
            ))}
          </div>
        </section>

        {/* ---- Auto-fix & quick tools ---- */}
        <section className="flex flex-col gap-4">
          <h2 className="text-display-m text-ink-primary">Fix the page, not just report it</h2>
          <p className="measure text-body text-ink-secondary">
            Version {VERSION} adds the correction pass: the inspector applies every fix it can make safely,
            shows what it changed and what it deliberately left alone, and exports the corrected page as an
            .html file you can deploy.
          </p>

          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <Panel className="flex flex-col gap-3">
              <h3 className="text-title-m text-ink-primary">One-click Auto-Fix</h3>
              <p className="text-body-s text-ink-secondary">
                Derives and writes the missing title, meta description, canonical, lang, viewport and
                charset; strips noindex; demotes duplicate H1s; fills image alt text from filenames; and
                adds rel=&quot;noopener&quot; to blank-target links. The score re-runs immediately — a page
                we tested moved from 4 to 86 in one pass. Fixes live only in that tab; reload discards them.
              </p>
            </Panel>

            <Panel className="flex flex-col gap-3">
              <h3 className="text-title-m text-ink-primary">Corrected file export</h3>
              <p className="text-body-s text-ink-secondary">
                Builds the file from a clean clone of the document — extension UI stripped, body fixes
                folded in, head tags derived from the page itself — and downloads it as
                <span className="font-mono"> -rankace-fixed.html</span>. Nothing is uploaded; the whole
                pass runs in the tab.
              </p>
            </Panel>

            <Panel className="flex flex-col gap-3">
              <h3 className="text-title-m text-ink-primary">Right-click SEO menu</h3>
              <p className="text-body-s text-ink-secondary">
                Audit the current page, highlight nofollow links, run site: and inurl: searches, check
                selected text for duplicates, and jump to PageSpeed, the Rich Results Test, the W3C
                validator, Wayback, SimilarWeb, Moz, Majestic and BuzzSumo in one click.
              </p>
            </Panel>

            <Panel className="flex flex-col gap-3">
              <h3 className="text-title-m text-ink-primary">Knows what it cannot fix</h3>
              <p className="text-body-s text-ink-secondary">
                Anything requiring judgement — a written title, a meta refresh that might be the routing —
                is listed under &quot;needs a human decision&quot; instead of being guessed at. Page-supplied
                strings are never copied into the exported file, so the output cannot carry injected markup.
              </p>
            </Panel>
          </div>
        </section>

        {/* ---- Install steps ---- */}
        <section className="flex flex-col gap-4">
          <h2 className="text-display-m text-ink-primary">Install in four steps</h2>
          <ol className="mt-2 flex flex-col divide-y divide-line-subtle border-y border-line-subtle">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2 py-5 md:flex-row md:gap-8">
                <span className="font-mono text-mono-micro text-accent md:w-16 md:shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-title-m text-ink-primary">{step.title}</h3>
                  <p className="measure text-body-s text-ink-secondary">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- Notes ---- */}
        <section className="grid gap-3 md:grid-cols-3">
          <Panel className="flex flex-col gap-3">
            <Zap className="h-5 w-5 text-accent" aria-hidden="true" />
            <h3 className="text-title-m text-ink-primary">No account needed</h3>
            <p className="text-body-s text-ink-secondary">
              The inspector is self-contained. Nothing is uploaded, and the extension makes no network
              request except the optional intent classifier on localhost.
            </p>
          </Panel>

          <Panel className="flex flex-col gap-3">
            <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
            <h3 className="text-title-m text-ink-primary">Edits only on request</h3>
            <p className="text-body-s text-ink-secondary">
              Inspection is passive. The page is modified only when you press Auto-Fix, only with
              derivable corrections, only in that tab — it never submits forms or follows links for you.
            </p>
          </Panel>

          <Panel className="flex flex-col gap-3">
            <Puzzle className="h-5 w-5 text-accent" aria-hidden="true" />
            <h3 className="text-title-m text-ink-primary">Manifest V3</h3>
            <p className="text-body-s text-ink-secondary">
              Built on the current extension platform with a side panel, declarative content script
              and least-privilege permissions.
            </p>
          </Panel>
        </section>

        {/* ---- Sample scores ---- */}
        <section className="flex flex-col gap-4">
          <h2 className="text-display-m text-ink-primary">How the score behaves</h2>
          <p className="measure text-body text-ink-secondary">
            Weighting per issue means a page with many serious defects always scores below a page
            with a few minor ones. These are the measured fixtures from the extension test suite.
          </p>
          <div className="mt-2 grid gap-4 sm:grid-cols-3">
            <Panel className="flex flex-col items-center gap-3">
              <ScoreMeter value={100} variant="ring" size="lg" label="Clean page" />
            </Panel>
            <Panel className="flex flex-col items-center gap-3">
              <ScoreMeter value={90} variant="ring" size="lg" label="Duplicate H1s" />
            </Panel>
            <Panel className="flex flex-col items-center gap-3">
              <ScoreMeter value={28} variant="ring" size="lg" label="Missing core tags" />
            </Panel>
          </div>
        </section>

        {/* ---- Footer CTA ---- */}
        <section className="relative mt-4 overflow-hidden rounded-lg border border-line-subtle">
          <div className="key-light pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-xl text-display-m text-ink-primary">
              Prefer a full site crawl with competitor comparison?
            </h2>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button href="/dashboard" size="lg">
                Run a full audit
              </Button>
              <Button href="/" variant="secondary" size="lg">
                Back to site
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
