import { NextRequest, NextResponse } from "next/server";
import { classifyIntent } from "@/lib/intent";

export async function POST(req: NextRequest) {
  let query = "";
  try {
    const body = (await req.json()) as { query?: string };
    query = typeof body?.query === "string" ? body.query : "";
  } catch {
    query = "";
  }
  return NextResponse.json(classifyIntent(query), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
