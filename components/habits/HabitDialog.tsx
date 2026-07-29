"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import type { Habit, HabitColor, HabitIcon as HabitIconName } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useArmedConfirm } from "@/lib/hooks/useArmedConfirm";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextField } from "@/components/ui/Field";
import { HabitIcon } from "./HabitIcon";

export const HABIT_COLORS: Record<HabitColor, { label: string; hex: string }> = {
  mint: { label: "Mint", hex: "var(--color-habit-mint)" },
  violet: { label: "Violet", hex: "var(--color-habit-violet)" },
  coral: { label: "Coral", hex: "var(--color-habit-coral)" },
  amber: { label: "Amber", hex: "var(--color-habit-amber)" },
  sky: { label: "Sky", hex: "var(--color-habit-sky)" },
};

const ICONS: HabitIconName[] = ["check", "book", "code", "mind", "music", "walk", "water"];
const ICON_LABELS: Record<HabitIconName, string> = {
  check: "Check",
  book: "Reading",
  code: "Code",
  mind: "Mind",
  music: "Music",
  walk: "Walking",
  water: "Water",
};

export function HabitDialog({
  open,
  habit,
  onClose,
}: {
  open: boolean;
  habit?: Habit | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<HabitColor>("mint");
  const [icon, setIcon] = useState<HabitIconName>("check");

  const confirmDeleteAction = useCallback(() => {
    if (!habit) return;
    useStore.getState().deleteHabit(habit.id);
    toast.show(`"${habit.name}" deleted`);
    onClose();
  }, [habit, onClose]);

  const del = useArmedConfirm(confirmDeleteAction);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? "");
    setDescription(habit?.description ?? "");
    setColor(habit?.color ?? "mint");
    setIcon(habit?.icon ?? "check");
    del.reset();
  }, [habit, open, del]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (habit) {
      useStore
        .getState()
        .updateHabit(habit.id, { name: trimmed, description: description.trim(), color, icon });
      toast.success("Habit updated");
    } else {
      useStore.getState().addHabit({ name: trimmed, description: description.trim(), color, icon });
      toast.success("Habit created");
    }
    onClose();
  };

  const toggleArchive = () => {
    if (!habit) return;
    useStore.getState().updateHabit(habit.id, { archived: !habit.archived });
    toast.show(habit.archived ? `"${habit.name}" restored` : `"${habit.name}" archived`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? "Edit habit" : "Create a habit"}
      description={
        habit
          ? "Changes apply to the whole history, not just today."
          : "One small square at a time."
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          {habit ? (
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={del.trigger}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {del.armed ? "Confirm delete" : "Delete"}
              </Button>
              {/* Archiving keeps the history and the grid; deleting does not. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleArchive}
                title={
                  habit.archived
                    ? "Bring this habit back to the active list"
                    : "Hide from the list but keep every check-in"
                }
              >
                {habit.archived ? (
                  <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Archive className="h-3.5 w-3.5" aria-hidden />
                )}
                {habit.archived ? "Restore" : "Archive"}
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={!name.trim()}>
              {habit ? "Save changes" : "Create habit"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Name" htmlFor="habit-name">
          <TextField
            id="habit-name"
            data-autofocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
            placeholder="e.g. Read for 20 minutes"
            maxLength={80}
          />
        </Field>

        <Field label="A gentle reminder" htmlFor="habit-description" hint="optional">
          <TextArea
            id="habit-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Why does this matter?"
            maxLength={180}
          />
        </Field>

        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {(
              Object.entries(HABIT_COLORS) as Array<[HabitColor, (typeof HABIT_COLORS)[HabitColor]]>
            ).map(([value, meta]) => (
              <button
                key={value}
                type="button"
                onClick={() => setColor(value)}
                aria-label={meta.label}
                aria-pressed={color === value}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md border px-3 text-mini",
                  "transition-[border-color,background-color,color,transform] duration-[130ms] ease-out",
                  "active:scale-[0.97]",
                  color === value
                    ? "border-border-strong bg-soft-strong text-text"
                    : "border-border text-sub hover:border-border-strong hover:text-text",
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: meta.hex }}
                  aria-hidden
                />
                {meta.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Icon">
          <div className="flex flex-wrap gap-2">
            {ICONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setIcon(value)}
                aria-label={ICON_LABELS[value]}
                title={ICON_LABELS[value]}
                aria-pressed={icon === value}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md border",
                  "transition-[border-color,background-color,color,transform] duration-[130ms] ease-out",
                  "active:scale-[0.96]",
                  icon === value
                    ? "border-border-strong bg-soft-strong text-text"
                    : "border-border text-sub hover:border-border-strong hover:text-text",
                )}
              >
                <HabitIcon name={value} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </Field>

        {/* A live preview of the two states the card will show. */}
        <Field label="Preview">
          <div className="flex items-center gap-3 rounded-md border border-border bg-inset px-3 py-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"
              style={{
                backgroundColor: `color-mix(in srgb, ${HABIT_COLORS[color].hex} 11%, transparent)`,
                borderColor: `color-mix(in srgb, ${HABIT_COLORS[color].hex} 16%, transparent)`,
                color: HABIT_COLORS[color].hex,
              }}
              aria-hidden
            >
              <HabitIcon name={icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-text">
              {name.trim() || "Your habit"}
            </span>
            <span className="flex gap-1" aria-hidden>
              {[100, 72, 48, 26, 0].map((mix) => (
                <span
                  key={mix}
                  className="h-3 w-3 rounded-sm border border-grid-border"
                  style={{
                    backgroundColor:
                      mix === 0
                        ? "var(--color-grid-empty)"
                        : `color-mix(in srgb, ${HABIT_COLORS[color].hex} ${mix}%, var(--color-grid-empty))`,
                  }}
                />
              ))}
            </span>
          </div>
        </Field>
      </div>
    </Modal>
  );
}
