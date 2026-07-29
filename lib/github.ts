import type { GitHubActivity, GitHubContribution } from "@/lib/github-activity";

const USERNAME = "danieljcksn";
const CONTRIBUTIONS_URL = `https://github.com/users/${USERNAME}/contributions`;

function parseContributionCalendar(html: string): GitHubContribution[] {
  const contributions: GitHubContribution[] = [];
  const cellPattern =
    /<td\b(?=[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})")(?=[^>]*\bdata-level="([0-4])")[^>]*><\/td>\s*<tool-tip\b[^>]*>([^<]*)<\/tool-tip>/gi;

  for (const match of html.matchAll(cellPattern)) {
    const countMatch = match[3].match(/^([\d,]+)\s+contributions?\s+on/i);
    contributions.push({
      date: match[1],
      level: Number(match[2]),
      count: countMatch ? Number(countMatch[1].replaceAll(",", "")) : 0,
    });
  }

  if (contributions.length < 350) {
    throw new Error("GitHub returned an incomplete contribution calendar.");
  }

  return contributions.sort((left, right) => left.date.localeCompare(right.date));
}

export async function getGitHubActivity({
  force = false,
}: {
  force?: boolean;
} = {}): Promise<GitHubActivity> {
  const response = await fetch(CONTRIBUTIONS_URL, {
    headers: {
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "praxis-life-os",
    },
    ...(force ? { cache: "no-store" as const } : { next: { revalidate: 15 * 60 } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub contribution request failed with ${response.status}.`);
  }

  const html = await response.text();
  const contributions = parseContributionCalendar(html);
  const displayedTotal = html
    .match(/id="js-contribution-activity-description"[^>]*>\s*([\d,]+)/i)?.[1]
    ?.replaceAll(",", "");
  const total = displayedTotal
    ? Number(displayedTotal)
    : contributions.reduce((sum, day) => sum + day.count, 0);

  return {
    username: USERNAME,
    total,
    contributions,
    syncedAt: new Date().toISOString(),
    profileUrl: `https://github.com/${USERNAME}`,
  };
}
