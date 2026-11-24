"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

/**
 * Theme switch. Rendered as a 3-way radio group rather than a two-state
 * toggle because the app also honours the OS preference, and once a user
 * has touched it there is no way back to "follow the system" with a
 * binary switch -- which is exactly the setting people want to reset.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, followSystemTheme, followingSystem, mounted } = useTheme();

  const options = [
    { value: "light" as const, label: "Light", Icon: Sun },
    { value: "dark" as const, label: "Dark", Icon: Moon },
    { value: "system" as const, label: "System", Icon: Monitor }
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-pill border border-line-subtle bg-surface-sunken p-0.5 ${className}`}
    >
      {options.map(({ value, label, Icon }) => {
        // Exactly ONE radio may be checked in a radiogroup.
        //
        // The previous expression evaluated `followingSystem` for the System
        // option and `value === theme` for the others INDEPENDENTLY, so while
        // following the OS both "System" and the resolved theme were checked
        // at once -- measured in the accessibility tree as Dark AND System
        // both aria-checked=true. The OS-following state must suppress the
        // concrete-theme highlight entirely, which is what the ternary below
        // does: system mode selects System; a stored choice selects that theme.
        const active = mounted && (followingSystem ? value === "system" : value === theme);
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => (value === "system" ? followSystemTheme() : setTheme(value))}
            className={[
              "inline-flex h-7 w-7 items-center justify-center rounded-pill transition-colors duration-150 ease-instrument",
              active
                ? "bg-surface-1 text-ink-primary shadow-panel"
                : "text-ink-tertiary hover:text-ink-secondary"
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
