import { NextRequest, NextResponse } from "next/server";
import { addExperiment, listExperiments } from "@/lib/standalone-store";

export async function GET(req: NextRequest) {
  const projectId = Number(req.nextUrl.searchParams.get("project_id"));
  if (!projectId) return NextResponse.json([]);
  return NextResponse.json(listExperiments(projectId));
}

export async function POST(req: NextRequest) {
  const projectId = Number(req.nextUrl.searchParams.get("project_id"));
  if (!projectId) return NextResponse.json({ detail: "project_id is required" }, { status: 400 });
  try {
    const body = await req.json();
    const row = addExperiment(projectId, body);
    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to save experiment" },
      { status: 400 }
    );
  }
}
