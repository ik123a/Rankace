import { Inbox } from "lucide-react";
import { cn } from "../../lib/cn";

export type EmptyStateProps = {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-md border border-dashed border-line bg-surface-1 px-5 py-8",
        className
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-line-subtle bg-surface-2 text-ink-tertiary">
        <Inbox className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-title-m text-ink-primary">{title}</p>
        {body ? <p className="measure text-body-s text-ink-secondary">{body}</p> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
