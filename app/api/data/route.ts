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
    // `code` matters: a 413 never resolves by retrying, so the client has to
    // be able to tell it apart from an ordinary failure and say something
    // actionable instead of "sync failed".
    return Response.json(
      { error: "Your data has outgrown a single sync payload.", code: "too-large" },
      { status: 413 },
    );
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
    const admin = getSupabaseAdmin();

    // A device running an older build reads the blob, drops the keys its
    // sanitizer doesn't know about, and writes it back — silently deleting
    // whatever the newer build added. Comparing the snapshot version turns
    // that into a rejected write instead of data loss. The version lives in
    // the jsonb rather than a column, so it is read from there.
    const { data: current, error: readError } = await admin
      .from("app_state")
      .select("data")
      .eq("id", "primary")
      .maybeSingle();
    // Failing open here would let the guard wave through exactly the write
    // it exists to stop, so an unreadable row is a refusal rather than an
    // assumption that the row is empty.
    if (readError) throw readError;
    const storedVersion = Number(
      (current?.data as { version?: unknown } | null)?.version ?? 0,
    );
    const incomingVersion = Number((snapshot as { version?: unknown }).version ?? 0);
    if (Number.isFinite(storedVersion) && incomingVersion < storedVersion) {
      return Response.json(
        {
          error: "This device is running an older version of praxis. Reload to sync.",
          code: "stale-client",
        },
        { status: 409 },
      );
    }

    const { error } = await admin.from("app_state").upsert({
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
