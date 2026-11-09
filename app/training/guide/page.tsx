import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/training-plan/ui";
import { guideChapters } from "@/lib/training-plan/guide";

export const metadata: Metadata = { title: "Guia" };

export default function TrainingGuidePage() {
  const chapters = guideChapters();
  const minutes = chapters.reduce((total, chapter) => total + chapter.minutes, 0);

  return (
    <div lang="pt-BR" className="max-w-[44rem]">
      <PageIntro title="Guia">
        <p>O porquê de cada decisão, para você nunca mais treinar no escuro. Cerca de {minutes} minutos no total.</p>
      </PageIntro>
      <ol className="mt-10 border-t border-border">
        {chapters.map((chapter) => (
          <li key={chapter.slug} className="border-b border-border">
            <Link
              href={`/training/guide/${chapter.slug}`}
              className="flex min-h-14 items-baseline gap-4 py-3.5 text-title text-sub-strong transition-colors duration-[130ms] ease-out hover:text-text"
            >
              <span className="w-6 shrink-0 tabnum text-sub">{chapter.number}</span>
              <span className="min-w-0 flex-1 text-text">{chapter.title}</span>
              <span className="shrink-0 text-sm tabnum text-sub">{chapter.minutes} min</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
