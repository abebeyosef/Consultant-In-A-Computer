import type { Metadata } from "next";
import { LibraryView } from "./LibraryView";

export const metadata: Metadata = { title: "Framework library · Consultant in a Computer" };

export default function LibraryPage() {
  return <LibraryView />;
}
