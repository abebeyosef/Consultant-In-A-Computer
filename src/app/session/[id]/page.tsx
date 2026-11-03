import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionConsole } from "@/components/session/SessionConsole";

export const metadata: Metadata = { title: "Session · Consultant in a Computer" };

export default async function SessionPage(props: PageProps<"/session/[id]">) {
  const { id } = await props.params;
  return (
    <Suspense fallback={<div className="h-dvh bg-paper" />}>
      <SessionConsole id={id} />
    </Suspense>
  );
}
