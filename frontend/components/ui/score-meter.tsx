import { cn } from "../../lib/cn";
import { healthKind, healthLabel } from "./status-tag";

export type ScoreMeterProps = {
  value: number;
  variant?: "bar" | "ring" | "inline";
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const FILL: Record<string, string> = {
  success: "bg-status-success",
  warning: "bg-status-warning",
  error: "bg-status-error"
};

const TEXT: Record<string, string> = {
  success: "text-status-success",
  warning: "text-status-warning",
  error: "text-status-error"
};

const TRACKS: Record<NonNullable<ScoreMeterProps["size"]>, { track: string; radius: number; stroke: number }> = {
  sm: { track: "h-1", radius: 11, stroke: 6 },
  md: { track: "h-1.5", radius: 19, stroke: 8 },
  lg: { track: "h-2.5", radius: 30, stroke: 11 }
};

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function ScoreMeter({
  value,
  variant = "bar",
  label,
  showValue = true,
  size = "md",
  className
}: ScoreMeterProps) {
  const score = clampScore(value);
  const kind = healthKind(score);
  const fill = FILL[kind];
  const text = TEXT[kind];
  const scale = score / 100;

  if (variant === "ring") {
    const { radius, stroke } = TRACKS[size];
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - scale);
    const dimension = (radius + stroke) * 2;

    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <div className="relative" style={{ width: dimension, height: dimension }}>
          <svg
            width={dimension}
            height={dimension}
            role="img"
            aria-label={`${label ?? "Score"}: ${score} out of 100, ${healthLabel(score)}`}
          >
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              fill="none"
              stroke="var(--surface-sunken)"
              strokeWidth={stroke}
            />
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${dimension / 2} ${dimension / 2})`}
              className={cn(text, "transition-[stroke-dashoffset] duration-700 ease-instrument")}
            />
          </svg>
          <span
            data-numeric
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center font-mono tabular-nums",
              text
            )}
          >
            <span className={size === "lg" ? "text-title-l" : "text-title-m"}>{score}</span>
            {size === "lg" ? (
              <span className="font-mono text-mono-micro uppercase text-ink-tertiary">of 100</span>
            ) : null}
          </span>
        </div>
        {label ? <span className="text-label text-ink-secondary">{label}</span> : null}
        <span className="sr-only">{healthLabel(score)}</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <span className="relative block h-1 w-16 overflow-hidden rounded-pill bg-surface-sunken">
          <span
            className={cn("absolute inset-y-0 left-0 block w-full origin-left rounded-pill", fill)}
            style={{ transform: `scaleX(${scale})` }}
          />
        </span>
        {showValue ? (
          <span data-numeric className={cn("font-mono text-mono-data tabular-nums", text)}>
            {score}
          </span>
        ) : null}
      </span>
    );
  }

  const { track } = TRACKS[size];

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label || showValue ? (
        <div className="flex items-baseline justify-between gap-2">
          {label ? <span className="text-label text-ink-secondary">{label}</span> : <span />}
          {showValue ? (
            <span data-numeric className={cn("font-mono text-mono-data tabular-nums", text)}>
              {score}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-pill bg-surface-sunken ring-1 ring-inset ring-line-subtle",
          track
        )}
        role="img"
        aria-label={`${label ?? "Score"}: ${score} out of 100, ${healthLabel(score)}`}
      >
        <span
          className={cn("absolute inset-y-0 left-0 block w-full origin-left rounded-pill", fill)}
          style={{ transform: `scaleX(${scale})` }}
        />
      </div>
    </div>
  );
}
