import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/training-plan/Markdown";
import { PageIntro } from "@/components/training-plan/ui";
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
    <article lang="pt-BR" className="max-w-[44rem]">
      <PageIntro kicker={`Capítulo ${chapter.number}, ${chapter.minutes} minutos`} title={chapter.title} />
      <div className="mt-8">
        <Markdown source={chapter.body} />
      </div>
      <nav aria-label="Capítulos" className="mt-12 flex justify-between gap-6 border-t border-border pt-5 text-lead">
        {previous ? (
          <Link href={`/training/guide/${previous.slug}`} className="min-w-0 text-sub transition-colors duration-[130ms] ease-out hover:text-text">
            {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/training/guide/${next.slug}`} className="min-w-0 text-right text-text underline underline-offset-4">
            {next.title}
          </Link>
        )}
      </nav>
    </article>
  );
}
