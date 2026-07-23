"use client";

import { useMemo, useState } from "react";
import { ListMusic, Plus, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Piece, PieceStatus } from "@/lib/types";
import { PIECE_STATUSES } from "@/lib/pieces";
import { pieceStats } from "@/lib/stats";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = pieces.filter((p) => {
      if (!showArchived && p.archived) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !`${p.title} ${p.composer}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const stat = (id: string) => stats.get(id);
    list = [...list].sort((a, b) => {
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
    return list;
  }, [pieces, sessions, search, statusFilter, sort, showArchived, stats]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (piece: Piece) => {
    setEditing(piece);
    setDialogOpen(true);
  };

  const activeCount = pieces.filter((p) => !p.archived).length;

  if (!hydrated) return <RepertoireSkeleton />;

  return (
    <div className="animate-[praxis-fade-in_0.3s_ease-out]">
      <PageHeader
        title="Repertoire"
        subtitle={activeCount === 0 ? "Your pieces live here" : `${activeCount} pieces in progress`}
        action={
          <Button variant="primary" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add piece
          </Button>
        }
      />

      {pieces.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="No pieces yet"
          description="Add the pieces you're learning so you can attach them to sessions and see where your time goes."
          action={
            <Button variant="primary" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add your first piece
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sub" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title or composer"
                  className={cn(inputClass, "h-10 pl-9")}
                />
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

            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
                All
              </FilterChip>
              {PIECE_STATUSES.map((s) => (
                <FilterChip
                  key={s.id}
                  active={statusFilter === s.id}
                  color={s.color}
                  onClick={() => setStatusFilter(s.id)}
                >
                  {s.label}
                </FilterChip>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-strong px-6 py-12 text-center text-[13px] text-sub">
              No pieces match these filters.
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setShowArchived(false);
                }}
                className="ml-2 text-accent transition-colors hover:text-accent-dim"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((piece, i) => (
                <div
                  key={piece.id}
                  className="animate-[praxis-fade-in_0.3s_ease-out_both]"
                  style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                >
                  <PieceCard piece={piece} stat={stats.get(piece.id)} onClick={() => openEdit(piece)} />
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

function FilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors duration-150",
        active
          ? "border-transparent bg-panel-hover text-text"
          : "border-border text-sub hover:border-border-strong hover:text-text",
      )}
    >
      {color && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: active ? color : "currentColor", opacity: active ? 1 : 0.5 }}
        />
      )}
      {children}
    </button>
  );
}

function RepertoireSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="mb-4 flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
