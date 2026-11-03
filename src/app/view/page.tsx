import type { Metadata } from "next";
import { SharedView } from "./SharedView";

export const metadata: Metadata = { title: "Shared board · Consultant in a Computer" };

export default function ViewPage() {
  return <SharedView />;
}
