/** @type {import('tailwindcss').Config} */
const instrument = "cubic-bezier(0.16, 1, 0.3, 1)";

module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--surface-canvas)",
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          sunken: "var(--surface-sunken)"
        },
        line: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)"
        },
        ink: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)"
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          pressed: "var(--accent-pressed)",
          quiet: "var(--accent-quiet)",
          line: "var(--accent-line)",
          fill: "var(--accent-fill)",
          "fill-hover": "var(--accent-fill-hover)",
          "fill-pressed": "var(--accent-fill-pressed)",
          // Label colour for text sitting ON a filled accent surface. A
          // separate token from `ink` because the correct value inverts with
          // the theme: light ink on the dark rose in dark mode, white on it
          // in light mode. Reaching for `text-ink-primary` here silently
          // produced near-black-on-rose at 3.39:1 in the light theme.
          on: "var(--on-accent-fill)"
        },
        danger: {
          fill: "var(--danger-fill)",
          "fill-hover": "var(--danger-fill-hover)"
        },
        status: {
          success: "var(--status-success)",
          warning: "var(--status-warning)",
          error: "var(--status-error)",
          info: "var(--status-info)"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      fontSize: {
        // Display steps get a slightly tighter line height than DESIGN.md
        // section 3 specifies. At 1.02 / 1.06 the XL measured 89.76px on an
        // 88px face -- multi-line display type needs the extra leading or the
        // descenders of one line collide with the caps of the next.
        "display-xl": ["clamp(2.75rem, 5.6vw, 5rem)", { lineHeight: "1.04", letterSpacing: "-0.045em", fontWeight: "500" }],
        "display-l": ["clamp(2.25rem, 4.4vw, 3.75rem)", { lineHeight: "1.08", letterSpacing: "-0.038em", fontWeight: "500" }],
        "display-m": ["clamp(1.75rem, 2.8vw, 2.5rem)", { lineHeight: "1.14", letterSpacing: "-0.032em", fontWeight: "500" }],
        // A touch more presence on the smallest steps, where tracking alone
        // cannot carry hierarchy.
        "title-l": ["1.5rem", { lineHeight: "1.22", letterSpacing: "-0.022em", fontWeight: "600" }],
        "title-m": ["1.125rem", { lineHeight: "1.32", letterSpacing: "-0.018em", fontWeight: "600" }],
        "body-l": ["1.0625rem", { lineHeight: "1.68", letterSpacing: "-0.005em", fontWeight: "400" }],
        body: ["0.9375rem", { lineHeight: "1.62", letterSpacing: "-0.003em", fontWeight: "400" }],
        "body-s": ["0.8125rem", { lineHeight: "1.52", letterSpacing: "-0.001em", fontWeight: "400" }],
        label: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.008em", fontWeight: "500" }],
        "mono-data": ["0.8125rem", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "500" }],
        // Wide tracking on a 11px uppercase face needs a little more room
        // or it reads as a solid block rather than a label.
        "mono-micro": ["0.6875rem", { lineHeight: "1.34", letterSpacing: "0.16em", fontWeight: "500" }]
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)"
      },
      boxShadow: {
        // Elevation reads from CSS vars so the light theme can INVERT the
        // recipe. These used to be literal rgba() arrays, which meant a
        // dark-only shadow on every theme -- on white a 0.85-alpha
        // near-black drop reads as a smudge, not depth.
        panel: "var(--shadow-panel)",
        pop: "var(--shadow-pop)",
        // The lift a hero panel gets on hover: a rim, not a bigger blur.
        lift: "var(--shadow-lift)"
      },
      zIndex: {
        base: "var(--z-base)",
        raised: "var(--z-raised)",
        overlay: "var(--z-overlay)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
        grain: "var(--z-grain)"
      },
      transitionTimingFunction: {
        instrument
      },
      maxWidth: {
        // Content caps. Paired with .shell so the gutter sits outside the
        // cap; the bare utility is kept for the few callers that manage
        // their own horizontal padding.
        content: "var(--shell-content)",
        stage: "var(--shell-stage)",
        shellStage: "var(--shell-max)",
        shellContent: "calc(var(--shell-content) + 2 * var(--gutter))"
      },
      spacing: {
        gutter: "var(--gutter)"
      }
    }
  },
  plugins: []
};
