import { cn } from "../../lib/cn";

type PanelVariant = "flush" | "padded" | "sunken" | "hero";
type PanelTone = "default" | "interactive";

const VARIANTS: Record<PanelVariant, string> = {
  flush: "p-0",
  padded: "p-5",
  sunken: "bg-surface-sunken",
  hero: "p-6 rounded-lg md:p-8"
};

export type PanelProps = {
  variant?: PanelVariant;
  tone?: PanelTone;
  as?: "div" | "section" | "article" | "aside";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function Panel({
  variant = "padded",
  tone = "default",
  as: Tag = "div",
  className,
  children,
  ...rest
}: PanelProps) {
  const interactive = tone === "interactive" || variant === "hero";

  return (
    <Tag
      className={cn(
        "rounded-md border border-line-subtle bg-surface-1 shadow-panel",
        // Gradients cannot transition, so the surface cross-fade rides a
        // pseudo-layer. It must be z-index:-1 (NOT auto) inside an `isolate`
        // stacking context: a positioned pseudo with z-index:auto paints
        // ABOVE static in-flow children and would wash out the text.
        //
        // These variant utilities are written out in full and un-split on
        // purpose. Tailwind scans source text for complete class names; a
        // class assembled from fragments ("hover:" + "before:opacity-100")
        // is never emitted, and the rule silently does not exist. Verified:
        // shadow-lift (a literal in tailwind.config) generated fine while
        // every before: variant was absent from the built CSS.
        "relative isolate transition-[border-color,box-shadow] duration-300 ease-instrument",
        interactive &&
          "before:pointer-events-none before:absolute before:-z-10 before:inset-0 before:rounded-[inherit] before:opacity-0 before:transition-opacity before:duration-300 before:bg-gradient-to-b before:from-white/[0.03] before:to-transparent before:content-[''] hover:before:opacity-100",
        interactive && "hover:border-line-strong hover:shadow-lift",
        VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
