import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface GuideChapter {
  slug: string;
  number: number;
  title: string;
  minutes: number;
  body: string;
}

const DIR = path.join(process.cwd(), "content/training/guide");
const WORDS_PER_MINUTE = 200;

export function guideChapters(): GuideChapter[] {
  return readdirSync(DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const raw = readFileSync(path.join(DIR, file), "utf8");
      const [firstLine, ...rest] = raw.trimStart().split("\n");
      const number = Number.parseInt(file, 10);
      return {
        slug: file.replace(/^\d+-/, "").replace(/\.md$/, ""),
        number,
        title: firstLine.replace(/^#+\s*/, "").replace(/^\d+\.\s*/, ""),
        minutes: Math.max(1, Math.round(raw.split(/\s+/).length / WORDS_PER_MINUTE)),
        body: rest.join("\n"),
      };
    });
}
