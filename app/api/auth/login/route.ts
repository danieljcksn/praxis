import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  passwordsMatch,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const configuredPassword = process.env.APP_PASSWORD;
  const sessionSecret = process.env.AUTH_SECRET;
  if (!configuredPassword || !sessionSecret) {
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!passwordsMatch(password, configuredPassword)) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ error: "That password is not right." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(sessionSecret),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
