"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Habit, HabitColor, HabitIcon as HabitIconName } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextField } from "@/components/ui/Field";
import { HabitIcon } from "./HabitIcon";

export const HABIT_COLORS: Record<HabitColor, { label: string; hex: string }> = {
  mint: { label: "Mint", hex: "#54d6ad" },
  violet: { label: "Violet", hex: "#ad8cff" },
  coral: { label: "Coral", hex: "#ff7d7d" },
  amber: { label: "Amber", hex: "#f4a259" },
  sky: { label: "Sky", hex: "#69b7ff" },
};

const ICONS: HabitIconName[] = ["check", "book", "code", "mind", "music", "walk", "water"];

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
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? "");
    setDescription(habit?.description ?? "");
    setColor(habit?.color ?? "mint");
    setIcon(habit?.icon ?? "check");
    setConfirmDelete(false);
  }, [habit, open]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (habit) {
      useStore.getState().updateHabit(habit.id, {
        name: trimmed,
        description: description.trim(),
        color,
        icon,
      });
      toast.success("Habit updated");
    } else {
      useStore.getState().addHabit({ name: trimmed, description, color, icon });
      toast.success("Habit created");
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? "Edit habit" : "Create a habit"}
      description="One small square at a time."
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {habit ? (
            <Button
              variant="danger"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                useStore.getState().deleteHabit(habit.id);
                toast.show("Habit deleted");
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              {confirmDelete ? "Confirm delete" : "Delete"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
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
            {(Object.entries(HABIT_COLORS) as Array<
              [HabitColor, (typeof HABIT_COLORS)[HabitColor]]
            >).map(([value, meta]) => (
              <button
                key={value}
                type="button"
                onClick={() => setColor(value)}
                aria-label={meta.label}
                aria-pressed={color === value}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] transition-[border-color,background-color,transform] duration-150 active:scale-[0.97]",
                  color === value
                    ? "border-white/20 bg-white/[0.06] text-text"
                    : "border-border text-sub hover:border-border-strong hover:text-text",
                )}
              >
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: meta.hex }} />
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
                aria-label={value}
                aria-pressed={icon === value}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border transition-[border-color,background-color,color,transform] duration-150 active:scale-[0.96]",
                  icon === value
                    ? "border-white/20 bg-white/[0.07] text-text"
                    : "border-border text-sub hover:border-border-strong hover:text-text",
                )}
              >
                <HabitIcon name={value} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
