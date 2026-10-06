import { cn } from "../lib/cn";

/**
 * Regression gate for lib/cn.ts.
 *
 * The bug this pins: tailwind-merge's stock table treats every unknown
 * `text-*` class as a colour. Rankace also uses `text-` for FONT SIZES
 * (text-display-xl, text-label, text-mono-micro, ...), so every font size
 * was resolved as a competing colour and silently dropped from the output.
 *
 * Each case asserts a POSITIVE outcome. Writing them as "must not contain the
 * dropped class" would be a different (weaker) assertion and would pass even
 * if the merge broke some other way.
 */
type Case = { name: string; got: string; mustInclude: string[]; mustNotInclude?: string[] };

const cases: Case[] = [
  {
    name: "primary Button keeps BOTH its font size and its on-fill ink",
    got: cn(
      "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm font-medium",
      "transition-[background-color,border-color,color,transform,opacity] duration-150 ease-instrument",
      "bg-accent-fill text-accent-on hover:bg-accent-fill-hover active:bg-accent-fill-pressed",
      "h-8 px-3 text-label gap-1.5"
    ),
    mustInclude: ["text-accent-on", "text-label", "bg-accent-fill"]
  },
  {
    name: "StatusTag keeps its mono-micro size next to a status colour",
    got: cn(
      "inline-flex w-fit max-w-full items-center gap-1.5 self-start rounded-sm border px-2 py-1 text-left font-mono text-mono-micro uppercase",
      "text-status-error border-status-error/35 bg-status-error/10"
    ),
    mustInclude: ["text-mono-micro", "text-status-error", "uppercase"]
  },
  {
    name: "IntentTag accent colour survives beside the size",
    got: cn("font-mono text-mono-micro uppercase", "text-accent border-accent-line bg-accent-quiet"),
    mustInclude: ["text-mono-micro", "text-accent", "bg-accent-quiet"]
  },
  {
    name: "every custom display size survives beside an ink colour",
    got: cn("text-display-xl text-ink-primary"),
    mustInclude: ["text-display-xl", "text-ink-primary"]
  },
  {
    name: "a real COLOUR conflict still collapses to the last one",
    got: cn("text-ink-primary", "text-ink-secondary"),
    mustInclude: ["text-ink-secondary"],
    mustNotInclude: ["text-ink-primary"]
  },
  {
    name: "a real SIZE conflict still collapses to the last one",
    got: cn("text-body", "text-label"),
    mustInclude: ["text-label"],
    mustNotInclude: ["text-body"]
  },
  {
    name: "a SIZE is never collapsed by a colour (different groups)",
    got: cn("text-title-m", "text-accent"),
    mustInclude: ["text-title-m", "text-accent"]
  },
  {
    name: "three independent groups coexist: size + colour + layout",
    got: cn("text-title-m text-ink-secondary", "rounded-sm font-medium"),
    mustInclude: ["text-title-m", "text-ink-secondary", "rounded-sm", "font-medium"]
  }
];

let failures = 0;
for (const c of cases) {
  const missing = c.mustInclude.filter((m) => !c.got.includes(m));
  const present = (c.mustNotInclude ?? []).filter((m) => c.got.includes(m));
  if (missing.length || present.length) {
    failures++;
    console.log(`FAIL ${c.name}`);
    if (missing.length) console.log(`     missing: ${missing.join(", ")}`);
    if (present.length) console.log(`     should have collapsed: ${present.join(", ")}`);
    console.log(`     got: ${c.got}`);
  } else {
    console.log(`ok   ${c.name}`);
  }
}
console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL PASS");
process.exit(failures ? 1 : 0);
