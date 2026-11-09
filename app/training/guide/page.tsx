import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardLink } from "@/components/ui/Card";
import { guideChapters } from "@/lib/training-plan/guide";

export const metadata: Metadata = { title: "Guia" };

export default function TrainingGuidePage() {
  const chapters = guideChapters();
  const minutes = chapters.reduce((total, chapter) => total + chapter.minutes, 0);

  return (
    <div lang="pt-BR">
      <PageHeader
        eyebrow="Físico"
        tone="hevy"
        title="Guia"
        subtitle={`${chapters.length} capítulos, cerca de ${minutes} minutos de leitura`}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {chapters.map((chapter) => (
          <CardLink key={chapter.slug} href={`/training/guide/${chapter.slug}`} tone="hevy">
            <p className="text-micro tabnum text-sub">
              Capítulo {chapter.number} · {chapter.minutes} min
            </p>
            <h2 className="mt-1.5 text-title text-text">{chapter.title}</h2>
          </CardLink>
        ))}
      </div>
    </div>
  );
}
