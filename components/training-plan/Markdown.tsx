import type { ReactNode } from "react";

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string): ReactNode[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong key={index} className="font-medium text-text">
            {inline(part.slice(2, -2))}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code key={index} className="rounded-sm bg-inset px-1 py-0.5 text-mini">
            {part.slice(1, -1)}
          </code>
        );
      }
      const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) {
        return /^https?:\/\//.test(link[2]) ? (
          <a
            key={index}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="break-words text-hevy underline decoration-hevy/35 underline-offset-2 hover:decoration-hevy"
          >
            {link[1]}
          </a>
        ) : (
          link[1]
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
}

const isBlockStart = (line: string) => /^(#{2,4}\s|>|[-*]\s|\d+\.\s|\|)/.test(line);
const cells = (line: string) =>
  line.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((cell) => cell.trim());

/** The subset the guide is written in: headings, lists, tables, quotes, inline marks. */
export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const key = blocks.length;

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.*)/);
    if (heading) {
      blocks.push(
        heading[1] === "####" ? (
          <h3 key={key} className="mt-6 text-lead font-medium text-text">
            {inline(heading[2])}
          </h3>
        ) : (
          <h2 key={key} className="mt-9 font-display text-title-lg text-text">
            {inline(heading[2])}
          </h2>
        ),
      );
      index += 1;
      continue;
    }

    if (line.startsWith("|") && /^\|[\s:|-]+\|?\s*$/.test(lines[index + 1] ?? "")) {
      const head = cells(line);
      index += 2;
      const rows: string[][] = [];
      while (lines[index]?.startsWith("|")) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={key} className="my-5 overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-left text-mini">
            <thead className="bg-soft text-sub-strong">
              <tr>
                {head.map((cell, cellIndex) => (
                  <th key={cellIndex} scope="col" className="px-3 py-2 font-medium">
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 align-top text-sub-strong">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (lines[index]?.startsWith(">")) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={key} className="my-5 border-l-2 border-hevy/40 pl-4 text-sub-strong">
          {inline(quote.join(" "))}
        </blockquote>,
      );
      continue;
    }

    const marker = /^[-*]\s+/.test(line) ? /^[-*]\s+/ : /^\d+\.\s+/.test(line) ? /^\d+\.\s+/ : null;
    if (marker) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index];
        if (marker.test(current)) items.push(current.replace(marker, ""));
        else if (/^\s+\S/.test(current) && items.length) {
          items[items.length - 1] += ` ${current.trim()}`;
        } else break;
        index += 1;
      }
      const ordered = marker.source.includes("d");
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List
          key={key}
          className={`my-4 space-y-2 pl-5 text-sub-strong ${ordered ? "list-decimal" : "list-disc"}`}
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </List>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (!paragraph.length) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={key} className="my-4 text-sub-strong">
        {inline(paragraph.join(" "))}
      </p>,
    );
  }

  return <div className="max-w-[70ch] text-base leading-[1.7]">{blocks}</div>;
}
