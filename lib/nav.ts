import {
  CalendarDays,
  ChartColumn,
  CircleCheck,
  Dumbbell,
  GitGraph,
  Home,
  ListMusic,
  Timer,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  /** Spoken by the icon-only mobile rail and by tooltips. */
  hint: string;
}

/** The five places the app can take you. Everything else is either a detail
 *  of one of these (see PRACTICE_NAV) or a preference, and does not earn a
 *  permanent seat in the header. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: Home, hint: "Everything, at a glance" },
  { href: "/practice", label: "Practice", icon: Timer, hint: "Session timer" },
  { href: "/habits", label: "Habits", icon: CircleCheck, hint: "Daily check-ins" },
  { href: "/training", label: "Training", icon: Dumbbell, hint: "Hevy and Strava" },
  { href: "/github", label: "GitHub", icon: GitGraph, hint: "Contribution activity" },
];

/** Practice is four views of one subject, so they travel together as a
 *  contextual strip on those pages instead of as loose icons in the header. */
export const PRACTICE_NAV: NavItem[] = [
  { href: "/practice", label: "Session", icon: Timer, hint: "The timer" },
  { href: "/history", label: "History", icon: CalendarDays, hint: "Every logged session" },
  { href: "/stats", label: "Stats", icon: ChartColumn, hint: "Trends and totals" },
  { href: "/repertoire", label: "Repertoire", icon: ListMusic, hint: "Your pieces" },
];

const PRACTICE_HREFS = new Set(PRACTICE_NAV.map((item) => item.href));

/** Matches on a path boundary, so `/habits` never lights up for `/habits-x`. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True on the pages that should render the practice strip. */
export function inPracticeSection(pathname: string): boolean {
  return PRACTICE_NAV.some((item) => isActive(pathname, item.href));
}

/** The header highlights "Practice" for every page in the practice cluster,
 *  so the top-level location never goes blank while you're inside it. */
export function isPrimaryActive(pathname: string, href: string): boolean {
  if (href === "/practice") return inPracticeSection(pathname);
  if (href === "/" && PRACTICE_HREFS.has(pathname)) return false;
  return isActive(pathname, href);
}
