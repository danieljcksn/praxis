import type { Metadata } from "next";
import { BookLogScreen } from "@/components/books/BookLogScreen";

export const metadata: Metadata = { title: "Reading log" };

export default function BookLogPage() {
  return <BookLogScreen />;
}
