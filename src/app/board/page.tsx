import type { Metadata } from "next";
import { Suspense } from "react";
import { StandaloneBoard } from "./StandaloneBoard";

export const metadata: Metadata = { title: "Board · Consultant in a Computer" };

export default function BoardPage() {
  return (
    <Suspense fallback={null}>
      <StandaloneBoard />
    </Suspense>
  );
}
