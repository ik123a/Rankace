import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../lib/cn";
import { Skeleton } from "./skeleton";

export type StatBlockProps = {
  label: string;
  value: number | string;
  suffix?: string;
  delta?: number;
  tone?: "neutral" | "success" | "warning" | "error" | "accent";
  demo?: boolean;
  loading?: boolean;
  className?: string;
};

const TONES: Record<NonNullable<StatBlockProps["tone"]>, string> = {
  neutral: "text-ink-primary",
  success: "text-status-success",
  warning: "text-status-warning",
  error: "text-status-error",
  accent: "text-accent"
};

export function StatBlock({
  label,
  value,
  suffix,
  delta,
  tone = "neutral",
  demo = false,
  loading = false,
  className
}: StatBlockProps) {
  if (loading) {
    return (
      <div className={cn("rounded-md border border-line-subtle bg-surface-1 p-4", className)}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-16" />
      </div>
    );
  }

  const rising = (delta ?? 0) >= 0;
  const DeltaIcon = rising ? TrendingUp : TrendingDown;

  return (
    <div className={cn("rounded-md border border-line-subtle bg-surface-1 p-4 shadow-panel", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-mono-micro uppercase text-ink-tertiary">{label}</span>
        {demo ? (
          <span className="rounded-sm border border-status-warning/40 bg-status-warning/10 px-1.5 py-0.5 font-mono text-mono-micro uppercase text-status-warning">
            Demo
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span data-numeric className={cn("font-mono text-title-l tabular-nums", TONES[tone])}>
          {value}
        </span>
        {suffix ? <span className="font-mono text-body-s text-ink-tertiary">{suffix}</span> : null}
        {delta !== undefined ? (
          <span
            className={cn(
              "ml-1 inline-flex items-center gap-1 font-mono text-mono-data",
              rising ? "text-status-success" : "text-status-error"
            )}
          >
            <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {rising ? "+" : ""}
            {delta}
          </span>
        ) : null}
      </div>
    </div>
  );
}
