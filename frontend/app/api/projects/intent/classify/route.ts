import { NextRequest, NextResponse } from "next/server";
import { classifyIntent } from "@/lib/intent";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query") || "";
  return NextResponse.json(classifyIntent(query));
}
