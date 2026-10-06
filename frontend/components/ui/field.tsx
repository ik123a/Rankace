"use client";

import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

const CONTROL =
  "w-full rounded-sm border bg-surface-sunken px-3 py-2.5 text-body-s text-ink-primary placeholder:text-ink-tertiary " +
  "transition-[border-color,box-shadow] duration-150 ease-instrument disabled:opacity-40";

function controlClass(invalid: boolean | undefined, disabled: boolean | undefined): string {
  return cn(
    CONTROL,
    invalid ? "border-status-error" : "border-line hover:border-line-strong",
    "focus:outline-none focus-visible:border-accent focus-visible:shadow-[0_0_0_2px_var(--accent-quiet)]",
    disabled && "cursor-not-allowed"
  );
}

type FieldShellProps = {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (ids: { controlId: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
};

export function FieldShell({ label, helper, error, required, className, children }: FieldShellProps) {
  const controlId = useId();
  const helperId = `${controlId}-helper`;
  const errorId = `${controlId}-error`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={controlId} className="text-label text-ink-secondary">
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </label>
      {children({ controlId, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="text-label text-status-error">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-label text-ink-tertiary">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export type InputProps = {
  label: string;
  helper?: string;
  error?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, required, className, ...rest },
  ref
) {
  return (
    <FieldShell label={label} helper={helper} error={error} required={required} className={className}>
      {({ controlId, describedBy, invalid }) => (
        <input
          ref={ref}
          id={controlId}
          className={controlClass(invalid, rest.disabled)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

export type TextareaProps = {
  label: string;
  helper?: string;
  error?: string;
  className?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helper, error, required, className, ...rest },
  ref
) {
  return (
    <FieldShell label={label} helper={helper} error={error} required={required} className={className}>
      {({ controlId, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={controlId}
          className={cn(controlClass(invalid, rest.disabled), "min-h-24 resize-y")}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

export type SelectProps = {
  label: string;
  helper?: string;
  error?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  className?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className" | "children">;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helper, error, required, options, className, ...rest },
  ref
) {
  return (
    <FieldShell label={label} helper={helper} error={error} required={required} className={className}>
      {({ controlId, describedBy, invalid }) => (
        <select
          ref={ref}
          id={controlId}
          className={controlClass(invalid, rest.disabled)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
});
