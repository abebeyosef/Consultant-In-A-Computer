import { SiteHeader } from "@/components/common/SiteHeader";
import { StartCard } from "@/components/start/StartCard";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-start justify-center px-6 pb-20 pt-[8vh] [@media(max-height:860px)]:pt-6">
        <StartCard meetBotEnabled={process.env.ENABLE_MEET_BOT === "1"} />
      </main>
    </div>
  );
}
