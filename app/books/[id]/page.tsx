import type { Metadata } from "next";
import { BookScreen } from "@/components/books/BookScreen";

export const metadata: Metadata = { title: "Book" };

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookScreen id={id} />;
}
