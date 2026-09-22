import type { Metadata } from "next";
import { LibraryScreen } from "@/components/books/LibraryScreen";

export const metadata: Metadata = { title: "Reading" };

export default function BooksPage() {
  return <LibraryScreen />;
}
