import { NextResponse } from "next/server";
import { buildOverview } from "@/lib/standalone-store";

export async function GET() {
  return NextResponse.json(buildOverview());
}
