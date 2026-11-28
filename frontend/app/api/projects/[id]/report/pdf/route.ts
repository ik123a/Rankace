import { NextRequest, NextResponse } from "next/server";
import { buildProjectPdfBytes, getProject } from "@/lib/standalone-store";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  const project = getProject(Number(id));
  if (!project) return NextResponse.json({ detail: "Project not found" }, { status: 404 });
  if (!project.pages.length) {
    return NextResponse.json({ detail: "Run a crawl first before exporting a PDF report." }, { status: 400 });
  }
  const pdf = buildProjectPdfBytes(project);
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rankace_report_${id}.pdf"`
    }
  });
}
