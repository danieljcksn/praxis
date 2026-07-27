import {
  BookOpen,
  Brain,
  Check,
  Code2,
  Droplets,
  Footprints,
  Music2,
} from "lucide-react";
import type { HabitIcon as HabitIconName } from "@/lib/types";

const ICONS = {
  check: Check,
  book: BookOpen,
  code: Code2,
  mind: Brain,
  music: Music2,
  walk: Footprints,
  water: Droplets,
} satisfies Record<HabitIconName, typeof Check>;

export function HabitIcon({
  name,
  className,
}: {
  name: HabitIconName;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
