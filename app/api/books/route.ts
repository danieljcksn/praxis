import { NextRequest } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { Abandoned, CatalogueUnavailable, fetchDescription, searchBooks } from "@/lib/openlibrary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The catalogue proxy behind the add-a-book flow.
 *
 *  `?q=` searches; `?work=/works/OL…W` fetches one blurb. Both sit behind the
 *  same password gate as every other route, and both answer a catalogue
 *  failure with 502 and a sentence the UI can show as-is — the add dialog has
 *  a designed warning state and a manual-entry path, so an outage here costs
 *  autofill, never the ability to add a book. */
export async function GET(request: NextRequest) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  const params = request.nextUrl.searchParams;
  const work = params.get("work");
  const query = params.get("q") ?? "";

  try {
    if (work) {
      return Response.json({ description: await fetchDescription(work) });
    }
    if (query.trim().length < 2) {
      return Response.json({ results: [] });
    }
    // The signal is threaded through so a search the reader has already
    // replaced gives up its place in the upstream queue instead of spending
    // a rate-limited slot on an answer nobody is waiting for.
    return Response.json({ results: await searchBooks(query, 14, request.signal) });
  } catch (error) {
    if (error instanceof Abandoned) {
      return Response.json({ error: "Superseded." }, { status: 499 });
    }
    if (error instanceof CatalogueUnavailable) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    console.error("Book catalogue request failed", error);
    return Response.json({ error: "Could not reach the book catalogue." }, { status: 502 });
  }
}
