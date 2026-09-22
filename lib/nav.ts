import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  Dumbbell,
  GitGraph,
  Home,
  Library,
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

/** The six places the app can take you. Everything else is either a detail
 *  of one of these (see PRACTICE_NAV, BOOKS_NAV) or a preference, and does not
 *  earn a permanent seat in the header.
 *
 *  Six is the ceiling. Below md these become equal-width cells in the thumb
 *  bar; at 360px that is 60px each, which still holds "Overview" without
 *  truncating. A seventh would not. Reading sits beside Practice because both
 *  are deliberate work with a progress state and a log behind them; Habits,
 *  Training and GitHub are the passive-tracking cluster. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: Home, hint: "Everything, at a glance" },
  { href: "/practice", label: "Practice", icon: Timer, hint: "Session timer" },
  { href: "/books", label: "Reading", icon: BookOpen, hint: "Books and progress" },
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

/** Reading is three views of one subject, on the same terms Practice is. */
export const BOOKS_NAV: NavItem[] = [
  { href: "/books", label: "Library", icon: Library, hint: "Every book" },
  { href: "/books/log", label: "Log", icon: CalendarDays, hint: "Day by day" },
  { href: "/books/insights", label: "Insights", icon: ChartColumn, hint: "Pace and totals" },
];

const PRACTICE_HREFS = new Set(PRACTICE_NAV.map((item) => item.href));
const BOOKS_HREFS = new Set(BOOKS_NAV.map((item) => item.href));

/** Matches on a path boundary, so `/habits` never lights up for `/habits-x`. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True on the pages that should render the practice strip. */
export function inPracticeSection(pathname: string): boolean {
  return PRACTICE_NAV.some((item) => isActive(pathname, item.href));
}

/** True on the three reading views — but not on a single book, which is a
 *  level deeper. Showing the strip there would make the detail read as a peer
 *  of Library rather than as something inside it. */
export function inBooksSection(pathname: string): boolean {
  return BOOKS_HREFS.has(pathname);
}

/** Within a strip, the active view is the deepest href that matches, so
 *  `/books/log` lights "Log" rather than also lighting "Library" — whose href
 *  is necessarily its prefix. */
export function activeSectionHref(pathname: string, items: NavItem[]): string | null {
  const matches = items.filter((item) => isActive(pathname, item.href));
  if (matches.length === 0) return null;
  return matches.reduce((best, item) => (item.href.length > best.href.length ? item : best)).href;
}

/** The header highlights "Practice" for every page in the practice cluster,
 *  so the top-level location never goes blank while you're inside it. */
export function isPrimaryActive(pathname: string, href: string): boolean {
  if (href === "/practice") return inPracticeSection(pathname);
  if (href === "/" && PRACTICE_HREFS.has(pathname)) return false;
  return isActive(pathname, href);
}
