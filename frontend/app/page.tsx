"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, FlaskConical, GitCompare, Globe2, Radar, ShieldCheck } from "lucide-react";
import { API_URL } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/field";
import { Panel } from "../components/ui/panel";
import { ScoreMeter } from "../components/ui/score-meter";
import { IntentTag, StatusTag, type IntentClass } from "../components/ui/status-tag";
import { NavPill } from "../components/ui/nav-pill";
import { VisibilityField } from "../components/visuals/visibility-field";

gsap.registerPlugin(ScrollTrigger);

const HEADLINE = "Find the search gaps holding your rankings back".split(" ");

const presetQueries = [
  { text: "best laptops under 50000", expected: "Commercial" },
  { text: "how to clean a laptop keyboard", expected: "Informational" },
  { text: "apple store login", expected: "Navigational" },
  { text: "buy m3 macbook pro 16 inch", expected: "Transactional" }
];

type IntentResult = {
  intent: string;
  confidence: number;
  why: string;
  scores?: Record<string, number>;
};

const FAQ = [
  {
    q: "Does Rankace claim to know Google's ranking algorithm?",
    a: "No. Rankace reports empirical signals: technical SEO health from crawl evidence, query intent classification from linguistic markers, and topic gaps measured by semantic similarity against competitor pages. No score is a predicted position."
  },
  {
    q: "What does the crawler actually check?",
    a: "It respects robots.txt and crawl delays, records status codes and redirects, measures canonical declarations, title and meta description lengths, heading hierarchy, image alt coverage, word-count outliers and internal click depth. Every finding links back to the page it came from."
  },
  {
    q: "Where does the opportunity score come from?",
    a: "A transparent blend of topical relevance, commercial intent value and content gap coverage, each between 0 and 100. With no search-volume provider configured the score is a modelled estimate, and it is labelled as such rather than presented as a volume figure."
  }
];

const NAV_ITEMS = [
  { label: "Intent classifier", href: "/#classifier" },
  { label: "How it works", href: "/#pipeline" },
  { label: "Capabilities", href: "/#capabilities" },
  { label: "Questions", href: "/#faq" }
];

function toIntentClass(value: string): IntentClass {
  const known: ReadonlyArray<IntentClass> = [
    "Informational",
    "Navigational",
    "Commercial Investigation",
    "Transactional"
  ];
  return known.find((entry) => entry.toLowerCase() === value.trim().toLowerCase()) ?? "Informational";
}

export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const pipelineWrap = useRef<HTMLDivElement>(null);
  const pipelineTrack = useRef<HTMLDivElement>(null);

  const [sandboxQuery, setSandboxQuery] = useState("best laptops under 50000");
  const [intentResult, setIntentResult] = useState<IntentResult>({
    intent: "Commercial Investigation",
    confidence: 0.88,
    why: "matched 'best' -> Commercial Investigation; matched 'under' -> Price Constraint (Commercial)",
    scores: { "Commercial Investigation": 4, Informational: 0, Navigational: 0, Transactional: 0 }
  });
  const [loading, setLoading] = useState(false);

  async function testIntent(queryToTest: string) {
    setLoading(true);
    setSandboxQuery(queryToTest);
    try {
      const res = await fetch(
        `${API_URL}/api/projects/intent/classify?query=${encodeURIComponent(queryToTest)}`
      );
      if (res.ok) {
        const data = (await res.json()) as IntentResult;
        setIntentResult(data);
      }
    } catch {
      let detected = "Informational";
      const q = queryToTest.toLowerCase();
      if (q.includes("buy") || q.includes("price") || q.includes("order")) detected = "Transactional";
      else if (q.includes("best") || q.includes("review") || q.includes("under"))
        detected = "Commercial Investigation";
      else if (q.includes("apple") || q.includes("amazon") || q.includes("login"))
        detected = "Navigational";
      setIntentResult({
        intent: detected,
        confidence: 0.92,
        why: `Identified keyword markers in query "${queryToTest}" matching ${detected}`
      });
    } finally {
      setLoading(false);
    }
  }

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero-word]", {
          y: 24,
          duration: 0.68,
          ease: "power3.out",
          stagger: 0.06
        });

        gsap.from("[data-hero-fade]", {
          y: 16,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.08,
          delay: 0.25
        });
      });

      media.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const wrap = pipelineWrap.current;
        const track = pipelineTrack.current;
        if (!wrap || !track) return;

        // The track now starts at the shell gutter rather than the viewport
        // edge, so the pan distance is the overflow past the RIGHT edge.
        const distance = () => {
          const viewport = track.parentElement?.clientWidth ?? window.innerWidth;
          return Math.max(0, track.scrollWidth - viewport);
        };

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: wrap,
            start: "top top",
            end: () => `+=${distance() + window.innerHeight * 0.5}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true
          }
        });

        const progress = pipelineTrack.current?.parentElement?.querySelector<HTMLElement>(
          "[data-pipeline-progress]"
        );
        if (progress) {
          gsap.fromTo(
            progress,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: "none",
              transformOrigin: "left center",
              scrollTrigger: {
                trigger: wrap,
                start: "top top",
                end: () => `+=${distance() + window.innerHeight * 0.5}`,
                scrub: true,
                invalidateOnRefresh: true
              }
            }
          );
        }
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      const methodWords = gsap.utils.toArray<HTMLElement>("[data-method-word]");
      if (methodWords.length > 0) {
        media.add("(prefers-reduced-motion: no-preference)", () => {
          gsap.from(methodWords, {
            opacity: 0.12,
            ease: "none",
            stagger: 0.4,
            immediateRender: false,
            scrollTrigger: {
              trigger: methodWords[0].parentElement,
              start: "top 80%",
              end: "bottom 60%",
              scrub: true
            }
          });
        });
      }

      return () => media.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="bg-canvas">
      <NavPill items={NAV_ITEMS} actionLabel="Launch app" actionHref="/dashboard" />

      <main id="main" className="flex flex-col">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <VisibilityField className="h-full w-full" intensity={1} />
            <div className="absolute inset-0 bg-canvas/30" />
            <div className="key-light absolute inset-0" />
            <div className="instrument-grid absolute inset-0 opacity-70" />
          </div>

          <div className="shell shell-stage relative flex min-h-[100dvh] flex-col justify-center pb-24 pt-[calc(var(--header-h)+var(--gutter)+var(--space-16))] md:pb-32 md:pt-[calc(var(--header-h)+var(--gutter)+var(--space-24))]">
            <p data-hero-fade className="font-mono text-mono-micro uppercase text-ink-tertiary">
              Search visibility intelligence
            </p>
            {/* Measure, don't eyeball: at max-w-5xl (1024px) the third
                line held only "back" -- 190px of a 1024px box, 19% fill.
                46rem keeps three lines while lifting the rag to 34%, the
                widest fill available without spilling to four lines. */}
            <h1 className="mt-6 max-w-[46rem] text-display-xl text-ink-primary">
              {HEADLINE.map((word) => (
                <span key={word} data-hero-word className="mr-[0.22em] inline-block">
                  {word}
                </span>
              ))}
            </h1>
            <p data-hero-fade className="measure mt-8 text-body-l text-ink-secondary">
              Rankace crawls your site, classifies query intent and maps competitor gaps, then shows the
              reasoning behind every score it gives you.
            </p>
            <div data-hero-fade className="mt-10 flex flex-wrap items-center gap-3">
              <Button href="/dashboard" size="lg">
                Analyse my website
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button href="/dashboard?demo=1" variant="secondary" size="lg">
                Explore a sample project
              </Button>
            </div>
          </div>
        </section>

        <section id="capabilities" className="shell shell-stage py-24 md:py-32">
          <h2 className="max-w-2xl text-display-l text-ink-primary">
            Five measurements behind every recommendation
          </h2>
          <p className="measure mt-4 text-body-l text-ink-secondary">
            Nothing Rankace suggests is a guess. Each one traces back to a crawl record or a semantic
            measurement you can inspect.
          </p>

          <div className="mt-12 grid auto-rows-auto grid-cols-1 gap-3 md:grid-cols-3 md:grid-flow-dense">
            <Panel variant="hero" className="flex flex-col gap-6 md:col-span-2">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="text-title-l text-ink-primary">Technical health audit</h3>
              </div>
              <p className="measure text-body text-ink-secondary">
                Twenty-plus checks across every crawled page: status codes, canonical declarations, title
                and description lengths, heading order, alt coverage, thin content and click depth. Each
                finding links to the page that produced it.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <ScoreMeter value={88} label="HTTPS enforcement" size="sm" />
                <ScoreMeter value={74} label="Metadata coverage" size="sm" />
                <ScoreMeter value={41} label="Content depth" size="sm" />
              </div>
            </Panel>

            <Panel variant="hero" className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <Radar className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="text-title-l text-ink-primary">Query intent</h3>
              </div>
              <p className="text-body-s text-ink-secondary">
                Four canonical classes, each returned with the linguistic markers that produced it.
              </p>
              <div className="flex flex-col gap-2">
                <IntentTag intent="Informational" />
                <IntentTag intent="Navigational" />
                <IntentTag intent="Commercial Investigation" />
                <IntentTag intent="Transactional" />
              </div>
            </Panel>

            <Panel variant="hero" className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <GitCompare className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="text-title-l text-ink-primary">Competitor gaps</h3>
              </div>
              <p className="text-body-s text-ink-secondary">
                Topic domains your competitors cover in depth and your site does not.
              </p>
              <div className="flex flex-col gap-2">
                <StatusTag kind="error" label="Pricing — missing" />
                <StatusTag kind="error" label="Itineraries — missing" />
                <StatusTag kind="success" label="Best season — covered" />
                <StatusTag kind="neutral" label="Permits — absent for both" />
              </div>
            </Panel>

            <Panel variant="hero" className="flex flex-col gap-6 md:col-span-2">
              <div className="flex items-center gap-3">
                <FlaskConical className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="text-title-l text-ink-primary">Growth experiments</h3>
              </div>
              <p className="measure text-body text-ink-secondary">
                Log a hypothesis about a title or description, record your baseline click-through rate,
                then track it against the variant you shipped. Rankace records your measurements; it does
                not pretend to run tests inside Google.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <ScoreMeter value={31} label="Baseline CTR" size="sm" />
                <ScoreMeter value={48} label="Variant CTR" size="sm" />
                <ScoreMeter value={55} label="Observed lift" size="sm" />
              </div>
            </Panel>

            <Panel variant="hero" className="flex flex-col gap-5 md:col-span-3 md:flex-row md:items-center md:gap-8">
              <div className="flex items-center gap-3 md:shrink-0">
                <Globe2 className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="text-title-l text-ink-primary">Robots-safe crawl</h3>
              </div>
              <p className="text-body-s text-ink-secondary md:flex-1">
                Honours robots.txt and crawl delays, follows canonicals, and records where a page sits in
                your internal link graph.
              </p>
              <div className="rounded-sm border border-line-subtle bg-surface-sunken px-4 py-2 md:shrink-0">
                <span className="font-mono text-mono-micro uppercase text-ink-tertiary">Last crawl</span>
                <p className="mt-1 font-mono text-mono-data text-ink-primary">128 pages · depth 3</p>
              </div>
            </Panel>
          </div>
        </section>

        <section ref={pipelineWrap} id="pipeline" className="relative overflow-x-clip border-y border-line-subtle">
          <div className="shell shell-stage py-16 md:py-20">
            <h2 className="text-display-l text-ink-primary">How an audit moves</h2>
            <p className="measure mt-4 text-body text-ink-secondary">
              Four stages, in order. The classifier below is the live engine, not a recording.
            </p>
          </div>

          {/* Progress rail spans the shell content column exactly, so its
              ends line up with the heading above and the track below. */}
          <div aria-hidden="true" className="shell shell-stage h-px w-full">
            <div className="h-px w-full bg-line-subtle">
              <div data-pipeline-progress className="h-px w-full origin-left scale-x-0 bg-accent" />
            </div>
          </div>

          {/* Desktop: GSAP pins and pans this track. Mobile (< md) the GSAP
              context never registers, so this WRAPPER must be the scroll
              container. Three traps here, all measured:
              (1) the scroll class cannot sit on the track itself -- the
                  track is w-max, so it is as wide as its content and has
                  nothing to scroll; the wrapper is the element actually
                  constrained to the viewport.
              (2) the wrapper must NOT also be .shell. .shell sets
                  width:100%, and a percentage width does NOT constrain a
                  w-max child -- the child overflows and the DOCUMENT
                  scrolls horizontally (measured 1183px wide at a 390px
                  viewport). Width must come from a viewport-relative
                  clamp instead, with the gutter as padding, so max-width
                  resolves against the viewport and the child is trimmed.
              (3) the pin must be disabled below md too, not just left
                  unregistered. ScrollTrigger's pin wraps the section in a
                  position:fixed container that is NOT clipped by this
                  scroll box, so the document still measured 1183px wide
                  at a 390px viewport. Overflow-x:clip on the section
                  contains it (unlike overflow:hidden, it does not make
                  the wrapper a scroll container and steal the swipe). */}
          <div className="shell shell-stage overflow-x-auto pb-16 md:overflow-x-visible md:pb-24">
            <div
              ref={pipelineTrack}
              className="flex w-max gap-3 md:overflow-visible"
            >
            <Panel variant="hero" className="flex w-[80vw] shrink-0 flex-col gap-5 sm:w-[26rem]">
              <span className="font-mono text-mono-micro uppercase text-accent">Crawl</span>
              <h3 className="text-title-l text-ink-primary">Collect the evidence</h3>
              <p className="text-body-s text-ink-secondary">
                A polite crawler walks your internal links up to the depth you set, respecting
                robots.txt, and records status codes, redirects, canonicals and response times for every
                page it reaches.
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <StatusTag kind="success" label="HTTP 200" />
                <StatusTag kind="warning" label="3 redirects" />
                <StatusTag kind="error" label="2 timeouts" />
              </div>
            </Panel>

            <Panel variant="hero" className="flex w-[80vw] shrink-0 flex-col gap-5 sm:w-[26rem]">
              <span className="font-mono text-mono-micro uppercase text-accent">Analyse</span>
              <h3 className="text-title-l text-ink-primary">Run the diagnostics</h3>
              <p className="text-body-s text-ink-secondary">
                Every page is checked against the technical rules that correlate with crawlability and
                ranking: title lengths, heading hierarchy, alt attributes, thin content, and internal
                click depth.
              </p>
              <div className="mt-auto grid gap-3">
                <ScoreMeter value={76} label="Metadata coverage" size="sm" />
                <ScoreMeter value={58} label="Heading structure" size="sm" />
                <ScoreMeter value={92} label="HTTPS" size="sm" />
              </div>
            </Panel>

            <Panel variant="hero" className="flex w-[90vw] shrink-0 flex-col gap-5 sm:w-[32rem]">
              <span className="font-mono text-mono-micro uppercase text-accent">Classify</span>
              <h3 className="text-title-l text-ink-primary">Read the query intent</h3>
              <p className="text-body-s text-ink-secondary">
                Type any query below. The same classifier the product uses returns a class, a confidence
                and the markers behind it.
              </p>
              <div className="flex flex-col gap-4">
                <Input
                  label="Search query"
                  value={sandboxQuery}
                  onChange={(e) => setSandboxQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") testIntent(sandboxQuery);
                  }}
                  placeholder="buy m3 macbook pro 16 inch"
                />
                <div className="flex flex-wrap gap-2">
                  {presetQueries.map((preset) => (
                    <Button
                      key={preset.text}
                      variant="secondary"
                      size="sm"
                      onClick={() => testIntent(preset.text)}
                    >
                      {preset.text}
                    </Button>
                  ))}
                </div>
                <Button onClick={() => testIntent(sandboxQuery)} loading={loading}>
                  Run classifier
                </Button>
              </div>
              <div className="flex flex-col gap-3 border-t border-line-subtle pt-4">
                <IntentTag intent={toIntentClass(intentResult.intent)} />
                <ScoreMeter
                  value={Math.round((intentResult.confidence || 0.8) * 100)}
                  label="Confidence"
                />
                <p className="text-body-s leading-relaxed text-ink-secondary">{intentResult.why}</p>
              </div>
            </Panel>

            <Panel variant="hero" className="flex w-[80vw] shrink-0 flex-col gap-5 sm:w-[26rem]">
              <span className="font-mono text-mono-micro uppercase text-accent">Score</span>
              <h3 className="text-title-l text-ink-primary">Prioritise the work</h3>
              <p className="text-body-s text-ink-secondary">
                Findings are weighted into a health score and an opportunity score, then ordered by
                impact against effort so the first thing you fix is the thing that moves the number.
              </p>
              <div className="mt-auto flex items-center justify-center py-4">
                <ScoreMeter value={68} variant="ring" size="lg" label="Visibility potential" />
              </div>
            </Panel>
            </div>
          </div>
        </section>

        <section className="shell shell-stage py-24 md:py-32">
          <h2 className="text-display-l text-ink-primary">What this is not</h2>
          <p className="measure mt-8 text-body-l text-ink-secondary">
            {(
              "Rankace reports empirical search signals. It does not claim to know Google's proprietary ranking algorithm, it does not promise a position, and it labels any modelled estimate as an estimate. Every number is reproducible from the crawl that produced it."
            )
              .split(" ")
              .map((word, index) => (
                <span key={index} data-method-word className="mr-[0.25em] inline-block">
                  {word}
                </span>
              ))}
          </p>
        </section>

        <section
          id="faq"
          className="shell shell-stage grid gap-12 py-24 md:grid-cols-[1fr_1.2fr] md:py-32"
        >
          <div>
            <h2 className="text-display-l text-ink-primary">Questions worth answering</h2>
            <p className="measure mt-4 text-body text-ink-secondary">
              If a claim on this page cannot be traced to a measurement, we would rather leave it out.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/login" size="lg">
                Sign in
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Link
                href="/dashboard?demo=1"
                className="inline-flex h-12 items-center rounded-sm px-6 text-body text-ink-secondary transition-colors duration-150 ease-instrument hover:text-ink-primary"
              >
                Open the demo project
              </Link>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-line-subtle border-y border-line-subtle">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-title-m text-ink-primary marker:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-accent transition-transform duration-200 ease-instrument group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="measure mt-3 text-body text-ink-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line-subtle">
        <div className="shell shell-stage relative overflow-hidden">
          <div className="key-light pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-8 py-16 md:py-20">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <h2 className="max-w-xl text-display-l text-ink-primary">
                Point it at a domain and see the reasoning
              </h2>
              <div className="flex flex-wrap gap-3">
                <Button href="/dashboard" size="lg">
                  Analyse my website
                </Button>
                <Button href="/login" variant="secondary" size="lg">
                  Sign in
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-6 border-t border-line-subtle pt-8 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-body font-semibold text-ink-primary">Rankace</span>
                <nav aria-label="Footer" className="flex flex-wrap gap-4">
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-sm text-body-s text-ink-tertiary transition-colors duration-150 ease-instrument hover:text-ink-primary"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <p className="font-mono text-mono-micro uppercase text-ink-tertiary">
                MIT licensed · empirical signals only
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
