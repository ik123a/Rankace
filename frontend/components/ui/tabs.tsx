"use client";

import { useRef } from "react";
import { cn } from "../../lib/cn";

export type TabItem = { id: string; label: string };

export type TabsProps = {
  items: ReadonlyArray<TabItem>;
  value: string;
  onChange: (id: string) => void;
  variant?: "rail" | "underline" | "pill";
  /** "tabs" needs a TabPanel per item; "filter" is a panel-less view switcher. */
  mode?: "tabs" | "filter";
  ariaLabel: string;
  className?: string;
};

export function Tabs({
  items,
  value,
  onChange,
  variant = "underline",
  mode = "tabs",
  ariaLabel,
  className
}: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const isFilter = mode === "filter";

  function focusAt(index: number) {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
      isFilter ? "button" : '[role="tab"]'
    );
    buttons?.[index]?.focus();
  }

  function moveFocus(currentIndex: number, delta: number, activate: boolean) {
    const nextIndex = (currentIndex + delta + items.length) % items.length;
    const next = items[nextIndex];
    if (!next) return;
    if (activate) onChange(next.id);
    focusAt(nextIndex);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = items.findIndex((item) => item.id === value);
    if (currentIndex < 0) return;
    const activate = !isFilter;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(currentIndex, 1, activate);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(currentIndex, -1, activate);
    } else if (event.key === "Home") {
      event.preventDefault();
      const first = items[0];
      if (first) {
        if (activate) onChange(first.id);
        focusAt(0);
      }
    } else if (event.key === "End") {
      event.preventDefault();
      const last = items[items.length - 1];
      if (last) {
        if (activate) onChange(last.id);
        focusAt(items.length - 1);
      }
    }
  }

  return (
    <div
      ref={listRef}
      role={isFilter ? "group" : "tablist"}
      aria-label={ariaLabel}
      aria-orientation={isFilter ? undefined : variant === "rail" ? "vertical" : "horizontal"}
      onKeyDown={onKeyDown}
      className={cn(
        "flex",
        variant === "rail" && "flex-col gap-1",
        variant === "underline" && "gap-1 border-b border-line-subtle",
        variant === "pill" && "gap-1 rounded-pill border border-line-subtle bg-surface-1 p-1",
        className
      )}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role={isFilter ? undefined : "tab"}
            id={isFilter ? undefined : `tab-${item.id}`}
            aria-pressed={isFilter ? selected : undefined}
            aria-selected={isFilter ? undefined : selected}
            aria-controls={isFilter ? undefined : `panel-${item.id}`}
            tabIndex={isFilter ? undefined : selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative whitespace-nowrap text-body-s font-medium",
              "transition-[color,background-color,box-shadow] duration-150 ease-instrument",
              variant === "rail" && "rounded-sm px-3 py-2 text-left",
              variant === "underline" && "px-4 py-3",
              variant === "pill" && "rounded-pill px-3 py-1.5 font-mono text-mono-data",
              selected ? "text-ink-primary" : "text-ink-tertiary hover:text-ink-secondary",
              variant === "pill" && selected && "bg-surface-2"
            )}
          >
            {item.label}
            {selected ? (
              variant === "pill" ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-pill ring-1 ring-inset ring-accent-line"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute bg-accent",
                    variant === "underline" && "inset-x-2 -bottom-px h-0.5 rounded-pill",
                    variant === "rail" && "inset-y-1 left-0 w-0.5 rounded-pill"
                  )}
                />
              )
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  children,
  className,
  hidden = false
}: {
  id: string;
  children?: React.ReactNode;
  className?: string;
  hidden?: boolean;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      hidden={hidden}
      className={cn("focus-visible:outline-none", hidden && "hidden", className)}
    >
      {children}
    </div>
  );
}
