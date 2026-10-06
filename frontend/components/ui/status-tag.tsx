import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Compass,
  CreditCard,
  FlaskConical,
  Info,
  Target,
  XCircle
} from "lucide-react";
import { cn } from "../../lib/cn";

export type StatusKind = "success" | "warning" | "error" | "info" | "neutral" | "demo";
export type IntentClass = "Informational" | "Navigational" | "Commercial Investigation" | "Transactional";

type Glyph = typeof Info;

const STATUS: Record<StatusKind, { cls: string; Icon: Glyph }> = {
  success: { cls: "text-status-success border-status-success/35 bg-status-success/10", Icon: CheckCircle2 },
  warning: { cls: "text-status-warning border-status-warning/35 bg-status-warning/10", Icon: AlertTriangle },
  error: { cls: "text-status-error border-status-error/35 bg-status-error/10", Icon: XCircle },
  info: { cls: "text-status-info border-status-info/35 bg-status-info/10", Icon: Info },
  neutral: { cls: "text-ink-secondary border-line bg-surface-2", Icon: CircleDashed },
  demo: { cls: "text-status-warning border-status-warning/40 bg-status-warning/10", Icon: FlaskConical }
};

const INTENT: Record<IntentClass, { cls: string; Icon: Glyph }> = {
  Informational: { cls: "text-status-info border-status-info/35 bg-status-info/10", Icon: BookOpen },
  Navigational: { cls: "text-status-success border-status-success/35 bg-status-success/10", Icon: Compass },
  "Commercial Investigation": { cls: "text-accent border-accent-line bg-accent-quiet", Icon: Target },
  Transactional: { cls: "text-status-warning border-status-warning/35 bg-status-warning/10", Icon: CreditCard }
};

function Tag({ cls, Icon, label }: { cls: string; Icon: Glyph; label: string }) {
  return (
    <span
      className={cn(
        // w-fit / self-start: as a flex child in a column container a tag
        // otherwise stretches to the full column width and reads as a
        // full-width chip instead of a label.
        "inline-flex w-fit max-w-full items-center gap-1.5 self-start rounded-sm border px-2 py-1 text-left font-mono text-mono-micro uppercase",
        cls
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

export function StatusTag({ kind, label }: { kind: StatusKind; label: string }) {
  const { cls, Icon } = STATUS[kind];
  return <Tag cls={cls} Icon={Icon} label={label} />;
}

export function IntentTag({ intent, label }: { intent: IntentClass; label?: string }) {
  const { cls, Icon } = INTENT[intent];
  return <Tag cls={cls} Icon={Icon} label={label ?? intent} />;
}

export function healthKind(score: number): StatusKind {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "error";
}

export function healthLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Needs work";
  return "At risk";
}
