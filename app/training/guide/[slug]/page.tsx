import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Markdown } from "@/components/training-plan/Markdown";
import { guideChapters } from "@/lib/training-plan/guide";

export const dynamicParams = false;

export function generateStaticParams() {
  return guideChapters().map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: guideChapters().find((chapter) => chapter.slug === slug)?.title ?? "Guia" };
}

export default async function TrainingGuideChapterPage({ params }: Props) {
  const { slug } = await params;
  const chapters = guideChapters();
  const index = chapters.findIndex((chapter) => chapter.slug === slug);
  if (index < 0) notFound();
  const chapter = chapters[index];
  const previous = chapters[index - 1];
  const next = chapters[index + 1];

  return (
    <article lang="pt-BR">
      <PageHeader
        eyebrow={`Capítulo ${chapter.number}`}
        tone="hevy"
        title={chapter.title}
        subtitle={`${chapter.minutes} minutos de leitura`}
      />
      <Markdown source={chapter.body} />
      <nav aria-label="Capítulos" className="mt-10 flex max-w-[70ch] justify-between gap-4 border-t border-border pt-5 text-sm">
        {previous ? (
          <Link href={`/training/guide/${previous.slug}`} className="min-w-0 text-sub hover:text-text">
            Anterior: {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/training/guide/${next.slug}`} className="min-w-0 text-right text-hevy hover:underline">
            Próximo: {next.title}
          </Link>
        )}
      </nav>
    </article>
  );
}
