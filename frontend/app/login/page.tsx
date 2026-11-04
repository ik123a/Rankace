"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { api, setToken, API_URL } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/field";
import { Panel } from "../../components/ui/panel";
import { Tabs } from "../../components/ui/tabs";
import { ScoreMeter } from "../../components/ui/score-meter";
import { IntentTag, type IntentClass } from "../../components/ui/status-tag";
import { Mark } from "../../components/ui/nav-pill";
import { ThemeToggle } from "../../components/ui/theme-toggle";

const SAMPLE_QUERY = "best laptops under 50000";

type Readout = {
  intent: IntentClass;
  confidence: number;
  why: string;
  live: boolean;
};

const OFFLINE: Readout = {
  intent: "Commercial Investigation",
  confidence: 0.88,
  why: "Matched 'best' to Commercial Investigation; matched 'under' to Price Constraint.",
  live: false
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("demo@rankace.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [readout, setReadout] = useState<Readout>(OFFLINE);

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      try {
        const res = await fetch(
          `${API_URL}/api/projects/intent/classify?query=${encodeURIComponent(SAMPLE_QUERY)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { intent: string; confidence: number; why: string };
        if (cancelled) return;
        setReadout({
          intent: data.intent as IntentClass,
          confidence: data.confidence,
          why: data.why,
          live: true
        });
      } catch {
        if (!cancelled) setReadout(OFFLINE);
      }
    }

    probe();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { name, email, password };
      const data = await api(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (data?.access_token) {
        setToken(data.access_token);
        router.push("/dashboard");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail("demo@rankace.local");
    setPassword("demo1234");
    setMode("login");
  }

  return (
    <main id="main" className="grid min-h-[100dvh] lg:grid-cols-[1fr_1.1fr]">
      <section className="flex flex-col justify-between px-gutter py-6 lg:py-10">
        <div className="flex items-start justify-between gap-3">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 self-start rounded-sm py-1 text-label text-ink-tertiary transition-colors duration-150 ease-instrument hover:text-ink-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to site
          </Link>
          <ThemeToggle />
        </div>

        {/* One measure, one edge: the back link, the card and the closing
            note all start at the shell's left edge instead of the card
            being centred while its neighbours stayed pinned. */}
        <div className="flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <Mark />
          <h1 className="mt-8 text-display-m text-ink-primary">
            {mode === "login" ? "Sign in to your workspace" : "Create a Rankace account"}
          </h1>
          <p className="measure mt-3 text-body text-ink-secondary">
            {mode === "login"
              ? "Pick up your crawls, keyword opportunities and growth experiments where you left them."
              : "Start auditing technical health, query intent and competitor topic gaps."}
          </p>

          <div className="mt-8">
            <Tabs
              variant="pill"
              mode="filter"
              ariaLabel="Account mode"
              value={mode}
              onChange={(next) => {
                setMode(next === "register" ? "register" : "login");
                setError("");
              }}
              items={[
                { id: "login", label: "Sign in" },
                { id: "register", label: "Create account" }
              ]}
              className="w-fit"
            />
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            {mode === "register" ? (
              <Input
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                autoComplete="name"
                required
              />
            ) : null}

            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              error={error || undefined}
            />

            <Button type="submit" size="lg" loading={loading} className="w-full">
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line-subtle pt-6">
            <p className="text-label text-ink-tertiary">Just exploring?</p>
            <Button variant="tertiary" size="sm" onClick={fillDemo}>
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              Use demo credentials
            </Button>
          </div>
        </div>

        <p className="text-label text-ink-tertiary">
          Rankace reports empirical SEO signals. It does not claim to reproduce Google&apos;s ranking
          algorithm.
        </p>
      </section>

      <section className="relative hidden overflow-hidden border-l border-line-subtle bg-canvas lg:block">
        <div className="key-light pointer-events-none absolute inset-0" />
        <div className="rim-light pointer-events-none absolute inset-0" />
        <div className="instrument-grid pointer-events-none absolute inset-0 opacity-60" />

        <div className="relative flex h-full flex-col justify-center px-12 py-16">
          <p className="font-mono text-mono-micro uppercase text-ink-tertiary">Live capability check</p>
          <h2 className="mt-3 max-w-md text-display-m text-ink-primary">
            The classifier runs before you sign in
          </h2>
          <p className="measure mt-4 text-body text-ink-secondary">
            Every score Rankace produces is explainable. Here is the same intent engine the product
            uses, returning its reasoning rather than a black-box number.
          </p>

          <Panel className="mt-10 max-w-md">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-mono-micro uppercase text-ink-tertiary">Query</span>
              <span className="font-mono text-mono-micro uppercase text-ink-tertiary">
                {readout.live ? "Live" : "Example"}
              </span>
            </div>
            <p className="mt-2 font-mono text-body-s text-ink-primary">&quot;{SAMPLE_QUERY}&quot;</p>

            <div className="mt-6 flex flex-col gap-3">
              <IntentTag intent={readout.intent} />
              <ScoreMeter
                value={Math.round(readout.confidence * 100)}
                label="Classifier confidence"
                showHealthWord={false}
              />
            </div>

            <div className="mt-6 border-t border-line-subtle pt-4">
              <p className="font-mono text-mono-micro uppercase text-ink-tertiary">Attribution</p>
              <p className="mt-2 text-body-s leading-relaxed text-ink-secondary">{readout.why}</p>
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
}
