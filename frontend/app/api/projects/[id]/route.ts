import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProject } from "@/lib/standalone-store";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  const project = getProject(Number(id));
  if (!project) return NextResponse.json({ detail: "Project not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  if (!deleteProject(Number(id))) {
    return NextResponse.json({ detail: "Project not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
