import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ThemeProvider, themeScript } from "../components/ui/theme-provider";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  // "optional" lets the browser skip the webfont entirely when it is not
  // cached and paint the fallback instead -- the page looks wrong and never
  // corrects itself. "swap" is the only value that guarantees the real face.
  display: "swap",
  variable: "--font-display",
  preload: true
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-mono",
  preload: true
});

export const metadata: Metadata = {
  title: {
    default: "Rankace — Search Visibility Intelligence",
    template: "%s · Rankace"
  },
  description:
    "Rankace audits technical SEO health, classifies query intent, maps competitor content gaps and tracks CTR experiments, with the reasoning behind every score.",
  openGraph: {
    title: "Rankace — Search Visibility Intelligence",
    description:
      "Understand rankings, find opportunities and grow organic visibility with explainable search intelligence.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Rankace — Search Visibility Intelligence",
    description: "Explainable SEO health, intent and opportunity scoring."
  }
};

export const viewport: Viewport = {
  // Both themes ship a media entry so the mobile browser chrome follows the
  // active palette instead of staying dark behind a light page. The pair is
  // selected by prefers-color-scheme; the explicit data-theme attribute on
  // <html> is what actually drives the token layer.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#08090a" }
  ],
  colorScheme: "light dark"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` is required: the inline script below mutates
    // data-theme on <html> before React hydrates, so the server-rendered
    // attributes and the DOM can legitimately differ. Those attributes are
    // not used for anything React owns, so this is safe.
    <html lang="en" className={`${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs before first paint so a light-theme user never sees a dark
            flash. Kept in sync with ThemeProvider's resolution order. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-[100dvh] bg-canvas text-ink-primary antialiased">
        <ThemeProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          {children}
          <div className="grain-overlay" aria-hidden="true" />
        </ThemeProvider>
      </body>
    </html>
  );
}
