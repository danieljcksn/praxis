import { NextRequest } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { isCloudSnapshot } from "@/lib/cloud";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("app_state")
      .select("data, updated_at")
      .eq("id", "primary")
      .maybeSingle();
    if (error) throw error;
    return Response.json({
      data: data?.data ?? null,
      updatedAt: data?.updated_at ?? null,
    });
  } catch (error) {
    console.error("Failed to read app state", error);
    return Response.json({ error: "Could not load cloud data." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_000_000) {
    return Response.json({ error: "Payload is too large." }, { status: 413 });
  }

  let snapshot: unknown;
  try {
    snapshot = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!isCloudSnapshot(snapshot)) {
    return Response.json({ error: "Invalid data shape." }, { status: 400 });
  }

  try {
    const { error } = await getSupabaseAdmin().from("app_state").upsert({
      id: "primary",
      data: snapshot,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return Response.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Failed to save app state", error);
    return Response.json({ error: "Could not save cloud data." }, { status: 500 });
  }
}
