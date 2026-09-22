"use client";

import { useMemo, useState } from "react";
import { ListMusic, Plus, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Piece, PieceStatus } from "@/lib/types";
import { PIECE_STATUSES } from "@/lib/pieces";
import { pieceStats } from "@/lib/stats";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import { Switch } from "@/components/ui/Switch";
import { inputClass, Select } from "@/components/ui/Field";
import { PieceCard } from "./PieceCard";
import { PieceDialog } from "./PieceDialog";

type Sort = "recent" | "time" | "title" | "added";
type StatusFilter = "all" | PieceStatus;

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "recent", label: "Recently practiced" },
  { id: "time", label: "Most practiced" },
  { id: "added", label: "Recently added" },
  { id: "title", label: "Title A–Z" },
];

export function RepertoireScreen() {
  const hydrated = useHydrated();
  const pieces = useStore((s) => s.pieces);
  const sessions = useStore((s) => s.sessions);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Piece | null>(null);

  const stats = useMemo(() => pieceStats(sessions, pieces), [sessions, pieces]);

  /** The set the status chips count against — everything except the archive
   *  filter, so a chip's number always matches what clicking it will show. */
  const inScope = useMemo(
    () => pieces.filter((p) => showArchived || !p.archived),
    [pieces, showArchived],
  );

  const counts = useMemo(() => {
    const map = new Map<StatusFilter, number>([["all", inScope.length]]);
    for (const piece of inScope) {
      map.set(piece.status, (map.get(piece.status) ?? 0) + 1);
    }
    return map;
  }, [inScope]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = inScope.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !`${p.title} ${p.composer}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const stat = (id: string) => stats.get(id);
    return [...list].sort((a, b) => {
      switch (sort) {
        case "time":
          return (stat(b.id)?.totalMs ?? 0) - (stat(a.id)?.totalMs ?? 0);
        case "title":
          return a.title.localeCompare(b.title);
        case "added":
          return b.addedAt - a.addedAt;
        case "recent":
        default:
          return (stat(b.id)?.lastPracticed ?? 0) - (stat(a.id)?.lastPracticed ?? 0);
      }
    });
  }, [inScope, search, statusFilter, sort, stats]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (piece: Piece) => {
    setEditing(piece);
    setDialogOpen(true);
  };
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setShowArchived(false);
  };

  const activeCount = pieces.filter((p) => !p.archived).length;
  const filtered = search.trim() !== "" || statusFilter !== "all";

  if (!hydrated) return <RepertoireSkeleton />;

  return (
    <div>
      <PageHeader
        title="Repertoire"
        subtitle={
          activeCount === 0
            ? "The pieces you're working on live here."
            : `${activeCount} ${activeCount === 1 ? "piece" : "pieces"} in progress`
        }
        action={
          <Button variant="primary" onClick={openAdd}>
            <Plus className="h-4 w-4" aria-hidden />
            Add piece
          </Button>
        }
      />

      {pieces.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="No pieces yet"
          description="Add what you're learning so you can attach pieces to sessions and see exactly where your practice time goes."
          action={
            <Button variant="primary" onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden />
              Add your first piece
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[12rem] flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub"
                  aria-hidden
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title or composer"
                  aria-label="Search pieces"
                  className={cn(inputClass, "h-10 pl-9", search && "pr-9")}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    title="Clear search"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-sub transition-colors duration-[130ms] hover:text-text"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
              <Select
                aria-label="Sort pieces"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="w-auto"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Switch checked={showArchived} onChange={setShowArchived} label="Archived" />
            </div>

            {/* Counts sit on the chips so you can see what a filter holds
                before committing to it. */}
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
              <FilterChip
                active={statusFilter === "all"}
                count={counts.get("all") ?? 0}
                onClick={() => setStatusFilter("all")}
              >
                All
              </FilterChip>
              {PIECE_STATUSES.map((s) => (
                <FilterChip
                  key={s.id}
                  active={statusFilter === s.id}
                  color={s.color}
                  count={counts.get(s.id) ?? 0}
                  title={s.blurb}
                  onClick={() => setStatusFilter(s.id)}
                >
                  {s.label}
                </FilterChip>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
              <p className="text-sm text-sub">No pieces match these filters.</p>
              {filtered && (
                <Button variant="subtle" size="sm" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((piece, i) => (
                <div
                  key={piece.id}
                  className="enter"
                  style={{ "--enter-delay": `${Math.min(i, 10) * 30}ms` } as React.CSSProperties}
                >
                  <PieceCard
                    piece={piece}
                    stat={stats.get(piece.id)}
                    onClick={() => openEdit(piece)}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <PieceDialog open={dialogOpen} piece={editing} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function RepertoireSkeleton() {
  return (
    <SkeletonScreen label="Loading your repertoire">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-32" delay={40} />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" delay={60} />
      </div>
      <div className="mb-5 space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-md" delay={100} />
          <Skeleton className="h-10 w-44 rounded-md" delay={120} />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" delay={140 + i * 25} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full rounded-lg" delay={280 + i * 40} />
        ))}
      </div>
    </SkeletonScreen>
  );
}
