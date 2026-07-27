import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function isAuthenticatedRequest(request: NextRequest): Promise<boolean> {
  return verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.AUTH_SECRET,
  );
}

export async function requireApiSession(
  request: NextRequest,
): Promise<Response | null> {
  if (await isAuthenticatedRequest(request)) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
