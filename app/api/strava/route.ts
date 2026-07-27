import { NextRequest } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { getStravaActivities } from "@/lib/strava";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function respond(request: NextRequest, force: boolean) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;
  try {
    return Response.json(await getStravaActivities({ force }));
  } catch (error) {
    console.error("Could not load Strava activity", error);
    return Response.json({ error: "Could not load Strava activity." }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return respond(request, false);
}

export async function POST(request: NextRequest) {
  return respond(request, true);
}
