import { NextRequest } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { getGitHubActivity } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function respond(request: NextRequest, force: boolean) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  try {
    return Response.json(await getGitHubActivity({ force }));
  } catch (error) {
    console.error("Could not load GitHub activity", error);
    return Response.json({ error: "Could not load GitHub activity." }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return respond(request, false);
}

export async function POST(request: NextRequest) {
  return respond(request, true);
}
