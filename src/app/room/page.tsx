import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomStage } from "@/components/room/RoomStage";

export const metadata: Metadata = { title: "Room view · Consultant in a Computer" };

export default function RoomPage() {
  return (
    <Suspense fallback={<div data-theme="light" className="h-dvh bg-paper" />}>
      <RoomStage />
    </Suspense>
  );
}
