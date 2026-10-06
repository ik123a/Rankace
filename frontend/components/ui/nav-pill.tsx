"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./button";
import { ThemeToggle } from "./theme-toggle";

export type NavPillProps = {
  items: ReadonlyArray<{ label: string; href: string }>;
  actionLabel: string;
  actionHref: string;
  trailing?: React.ReactNode;
  className?: string;
  /** The theme switch is opt-out per call site: the marketing nav and the
   *  app chrome both want it, but a modal or an embed should not inherit it. */
  showThemeToggle?: boolean;
};

export function Mark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-line-subtle bg-surface-2">
        <svg viewBox="0 0 32 32" className="h-4 w-4" aria-hidden="true">
          <path
            d="M7 22.5 L13.5 14 L18.5 18 L25 8.5"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="25" cy="8.5" r="2.8" fill="var(--accent)" />
        </svg>
      </span>
      <span className="text-body font-semibold tracking-tight text-ink-primary">Rankace</span>
    </span>
  );
}

export function NavPill({
  items,
  actionLabel,
  actionHref,
  trailing,
  className,
  showThemeToggle = true
}: NavPillProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className={cn("header-bar", className)}>
      <nav
        aria-label="Primary"
        className="glass shell shell-stage flex h-14 items-center justify-between gap-4 rounded-pill border border-line-subtle bg-surface-canvas/80 px-4 backdrop-blur-xl md:h-16"
      >
        <Link href="/" className="rounded-sm pr-2">
          <Mark />
          <span className="sr-only">Rankace home</span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-block whitespace-nowrap rounded-pill px-3 py-2 text-body-s text-ink-secondary transition-colors duration-150 ease-instrument hover:bg-surface-2 hover:text-ink-primary"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {trailing}
          {showThemeToggle ? <ThemeToggle /> : null}
          <Button href={actionHref} size="sm" className="hidden md:inline-flex">
            {actionLabel}
          </Button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-pill p-2 text-ink-secondary transition-colors duration-150 ease-instrument hover:bg-surface-2 hover:text-ink-primary md:hidden"
          >
            {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {open ? (
        <ul
          id="mobile-nav"
          className="shell shell-stage mt-2 flex flex-col gap-1 rounded-lg border border-line-subtle bg-surface-1 p-2 shadow-panel md:hidden"
        >
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-sm px-3 py-2.5 text-body-s text-ink-secondary transition-colors duration-150 ease-instrument hover:bg-surface-2 hover:text-ink-primary"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li className="mt-1">
            <Button href={actionHref} size="sm" className="w-full" onClick={() => setOpen(false)}>
              {actionLabel}
            </Button>
          </li>
        </ul>
      ) : null}
    </header>
  );
}
