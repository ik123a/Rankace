import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { Skeleton } from "./skeleton";

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  numeric?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export type DataTableProps<T> = {
  caption: string;
  columns: ReadonlyArray<Column<T>>;
  rows: ReadonlyArray<T>;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyBody,
  emptyAction,
  className
}: DataTableProps<T>) {
  const headCell = (column: Column<T>) =>
    cn(
      "px-4 py-3 font-mono text-mono-micro uppercase text-ink-tertiary",
      column.align === "right" ? "text-right" : "text-left"
    );

  const bodyCell = (column: Column<T>) =>
    cn("px-4 py-3 text-body-s", column.numeric ? "text-right font-mono tabular-nums" : "text-left", column.className);

  if (error) {
    return (
      <div className="rounded-md border border-line-subtle bg-surface-1 p-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-body-s text-status-error">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
          {onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-line-subtle bg-surface-1">
        <div className="border-b border-line-subtle px-4 py-3">
          <Skeleton className="h-3 w-32" />
        </div>
        {Array.from({ length: 4 }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 border-b border-line-subtle px-4 py-4 last:border-b-0"
          >
            {columns.map((column) => (
              <Skeleton key={column.key} className={cn("h-3", column.numeric ? "ml-auto w-12" : "w-28")} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-line-subtle bg-surface-1 shadow-panel",
        className
      )}
    >
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-raised bg-surface-2">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={headCell(column)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-line-subtle transition-colors duration-150 ease-instrument last:border-b-0 hover:bg-surface-2"
              >
                {columns.map((column) => (
                  <td key={column.key} className={bodyCell(column)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line-subtle md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="flex flex-col gap-2 px-4 py-4">
            {columns.map((column, index) => (
              <div key={column.key} className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-mono-micro uppercase text-ink-tertiary">{column.header}</span>
                <span
                  className={cn(
                    "min-w-0 truncate text-right text-body-s",
                    column.numeric && "font-mono tabular-nums"
                  )}
                >
                  {index === 0 ? <span className="font-medium text-ink-primary">{column.render(row)}</span> : column.render(row)}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
