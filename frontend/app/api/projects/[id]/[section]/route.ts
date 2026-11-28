import { NextRequest, NextResponse } from "next/server";
import { classifyIntent } from "@/lib/intent";
import {
  addProjectCompetitor,
  computeOpportunities,
  computeProjectReadiness,
  getProject,
  runLiveCrawl,
  updateProjectStatus
} from "@/lib/standalone-store";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; section: string }> | { id: string; section: string } }
) {
  const { id, section } = await Promise.resolve(context.params);
  const project = getProject(Number(id));
  if (!project) return NextResponse.json({ detail: "Project not found" }, { status: 404 });

  switch (section) {
    case "crawl-status":
      return NextResponse.json(project.crawl_status);
    case "opportunities":
      return NextResponse.json(computeOpportunities(project));
    case "technical-seo":
      return NextResponse.json(project.issues);
    case "pages":
      return NextResponse.json(project.pages);
    case "keywords":
      return NextResponse.json(project.keywords);
    case "content-gaps": {
      const compTopics = project.competitors.flatMap((c) => c.topics || []);
      const yourText = project.pages.map((p) => `${p.title} ${p.meta_description}`).join(" ").toLowerCase();
      const gaps = Array.from(new Set(compTopics)).slice(0, 12).map((topic) => {
        const covered = yourText.includes(topic.toLowerCase());
        return {
          topic,
          your_coverage: covered,
          competitor_coverage: true,
          gap_level: covered ? "low" : "high"
        };
      });
      return NextResponse.json(gaps);
    }
    case "competitors":
      return NextResponse.json(project.competitors);
    case "architecture":
      return NextResponse.json({
        nodes: project.pages.map((p) => ({
          id: p.id,
          url: p.url,
          depth: p.depth,
          in_links: p.in_links,
          out_links: p.internal_links
        })),
        orphans: project.pages.filter((p) => p.depth > 0 && p.in_links === 0),
        orphan_scan_available: project.pages.length > 0,
        topics: Array.from(new Set(project.pages.map((p) => p.title).filter(Boolean))).slice(0, 8),
        detected: {}
      });
    case "intent":
      return NextResponse.json(classifyIntent(project.target_keyword));
    case "readiness": {
      const force = req.nextUrl.searchParams.get("refresh") === "true";
      const data = await computeProjectReadiness(project, force);
      return NextResponse.json(data);
    }
    default:
      return NextResponse.json({ detail: `Unknown project section: ${section}` }, { status: 404 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; section: string }> | { id: string; section: string } }
) {
  const { id, section } = await Promise.resolve(context.params);
  const projectId = Number(id);

  if (section === "archive") {
    const updated = updateProjectStatus(projectId, "archived");
    return updated ? NextResponse.json(updated) : NextResponse.json({ detail: "Project not found" }, { status: 404 });
  }
  if (section === "unarchive") {
    const updated = updateProjectStatus(projectId, "active");
    return updated ? NextResponse.json(updated) : NextResponse.json({ detail: "Project not found" }, { status: 404 });
  }
  if (section === "crawl") {
    try {
      const updated = await runLiveCrawl(projectId);
      return NextResponse.json({ status: "done", pages_crawled: updated.pages.length });
    } catch (err: unknown) {
      return NextResponse.json(
        { detail: err instanceof Error ? err.message : "Crawl failed" },
        { status: 400 }
      );
    }
  }
  if (section === "competitors") {
    try {
      const body = (await req.json()) as { url?: string };
      if (!body?.url) return NextResponse.json({ detail: "Competitor URL is required" }, { status: 400 });
      const created = await addProjectCompetitor(projectId, body.url);
      return NextResponse.json(created, { status: 201 });
    } catch (err: unknown) {
      return NextResponse.json(
        { detail: err instanceof Error ? err.message : "Failed to add competitor" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ detail: `Unsupported action: ${section}` }, { status: 404 });
}
