import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    demo: true,
    health: 78,
    opportunity: 82,
    critical_issues: 7,
    keyword_opportunities: 24,
    breakdown: {
      "Technical SEO": 84,
      Content: 91,
      "Keyword Fit": 76,
      "Internal Links": 68,
      "Intent Match": 94,
      "Content Gap": 79
    },
    note: "DEMO DATA — clearly labeled synthetic data, not real search-volume data."
  });
}
