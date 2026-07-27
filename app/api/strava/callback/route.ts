import { NextRequest, NextResponse } from "next/server";
import { passwordsMatch } from "@/lib/session";
import { exchangeStravaCode } from "@/lib/strava";

const STATE_COOKIE = "praxis_strava_state";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const storedState = request.cookies.get(STATE_COOKIE)?.value ?? "";
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL("/training?strava=denied", request.url));
  if (!code || !state || !storedState || !passwordsMatch(state, storedState)) {
    return NextResponse.redirect(new URL("/training?strava=invalid", request.url));
  }

  try {
    const callback = new URL("/api/strava/callback", request.nextUrl.origin);
    await exchangeStravaCode(code, callback.toString());
    const response = NextResponse.redirect(new URL("/training?strava=connected", request.url));
    response.cookies.set({
      name: STATE_COOKIE,
      value: "",
      path: "/api/strava/callback",
      maxAge: 0,
    });
    return response;
  } catch (reason) {
    console.error("Strava OAuth callback failed", reason);
    return NextResponse.redirect(new URL("/training?strava=error", request.url));
  }
}
