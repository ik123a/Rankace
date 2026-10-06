"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "tertiary" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // `text-accent-on`, NOT `text-ink-primary`: the label sits on a saturated
  // fill and the correct ink inverts per theme. See --on-accent-fill.
  primary:
    "bg-accent-fill text-accent-on hover:bg-accent-fill-hover active:bg-accent-fill-pressed",
  secondary: "bg-surface-1 text-ink-primary border border-line hover:border-line-strong hover:bg-surface-2",
  ghost: "bg-transparent text-accent hover:bg-accent-quiet",
  tertiary: "bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-surface-1",
  danger: "bg-danger-fill text-white hover:bg-danger-fill-hover"
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-label gap-1.5",
  md: "h-10 px-4 text-body-s gap-2",
  lg: "h-12 px-6 text-body gap-2.5"
};

type SharedProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
};

export type ButtonProps = SharedProps &
  (
    | ({ href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href">)
    | ({ href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "href">)
  );

function classes(variant: Variant, size: Size, className?: string): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm font-medium",
    "transition-[background-color,border-color,color,transform,opacity] duration-150 ease-instrument",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

function Inner({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <>
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : null}
      <span className="inline-flex items-center gap-2 whitespace-nowrap">{children}</span>
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const { variant = "primary", size = "md", loading = false, className, children } = props;
  const cls = classes(variant, size, className);

  if (props.href !== undefined) {
    const { href, variant: _variant, size: _size, loading: _loading, className: _className, children: _children, ...rest } = props;
    return (
      <Link href={href} className={cls} aria-busy={loading || undefined} {...rest}>
        <Inner loading={loading}>{children}</Inner>
      </Link>
    );
  }

  const { variant: _v, size: _s, loading: _l, className: _c, children: _ch, type = "button", ...rest } = props;
  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Inner loading={loading}>{children}</Inner>
    </button>
  );
});
