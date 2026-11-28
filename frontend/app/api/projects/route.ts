import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/standalone-store";

export async function GET() {
  return NextResponse.json(listProjects());
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: string; website_url?: string; target_keyword?: string };
    if (!body?.name || !body?.website_url || !body?.target_keyword) {
      return NextResponse.json({ detail: "Project name, website URL, and target keyword are required." }, { status: 400 });
    }
    const created = createProject({
      name: body.name,
      website_url: body.website_url,
      target_keyword: body.target_keyword
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Could not create project" },
      { status: 400 }
    );
  }
}
