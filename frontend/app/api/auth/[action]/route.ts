import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, registerUser } from "@/lib/standalone-store";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> | { action: string } }
) {
  const { action } = await Promise.resolve(context.params);
  let body: { name?: string; email?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON request body." }, { status: 400 });
  }

  if (action === "login") {
    const auth = authenticateUser(body.email || "", body.password || "");
    if (!auth) {
      return NextResponse.json(
        { detail: "Incorrect email or password. Try demo@rankace.local / demo1234." },
        { status: 401 }
      );
    }
    return NextResponse.json(auth);
  }

  if (action === "register") {
    try {
      const auth = registerUser(body.name || "", body.email || "", body.password || "");
      return NextResponse.json(auth);
    } catch (err: unknown) {
      return NextResponse.json(
        { detail: err instanceof Error ? err.message : "Registration failed" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ detail: `Unknown auth action: ${action}` }, { status: 404 });
}
