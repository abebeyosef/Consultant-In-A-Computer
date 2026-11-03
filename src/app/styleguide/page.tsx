"use client";

import { Pin, Plus } from "lucide-react";
import { useState } from "react";
import { Chip } from "@/components/common/Chip";
import { Spark } from "@/components/common/Spark";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { FlagCard } from "@/components/session/FlagCard";
import { ListeningPill } from "@/components/session/ListeningPill";
import { ShortcutBar } from "@/components/session/ShortcutBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const FRAMEWORKS = [
  "Value vs feasibility",
  "Impact vs effort",
  "SWOT",
  "Stakeholder map",
  "Jobs to be done",
  "Customer journey",
  "Five whys",
  "Options appraisal",
  "Business model canvas",
  "Build, buy or partner",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[13px] font-medium uppercase tracking-[0.06em] text-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  const [room, setRoom] = useState(false);
  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-14 px-8 py-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] leading-tight">Styleguide</h1>
          <p className="mt-1 text-ink-muted">A good consultant&apos;s notebook: warm paper, sharp ink, one quiet signal for the AI.</p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Colour">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {[
            ["bg", "bg-paper"],
            ["surface", "bg-surface"],
            ["ink", "bg-ink"],
            ["ink-muted", "bg-ink-muted"],
            ["accent", "bg-accent-blue"],
            ["signal (AI)", "bg-signal"],
            ["live", "bg-live"],
            ["danger", "bg-danger"],
          ].map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className={`h-12 rounded-[8px] border border-hairline ${cls}`} />
              <span className="text-mono-sm">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="flex flex-col gap-3">
          <p className="text-[28px] font-semibold tracking-[-0.02em]">Leave with three ideas we actually pursue</p>
          <p className="text-[15px]">UI and body text, Inter 15px. Calm, readable, never shouting.</p>
          <p className="max-w-[68ch] text-[17px] leading-[1.65]">
            Honestly, the summaries feel like the highest value to me, readers keep asking for them.{" "}
            <span className="text-ink-muted">The chatbot sounds great, but I think</span>
          </p>
          <span className="text-mono-sm">00:42 · 128 words</span>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Start listening</Button>
          <Button size="lg" variant="outline">Try a sample workshop</Button>
          <Button variant="ghost">Not now</Button>
          <Button variant="outline"><Pin strokeWidth={1.5} /> Mark moment</Button>
          <Button variant="danger">Stop</Button>
          <Button variant="link" className="px-0">Paste a transcript instead</Button>
        </div>
      </Section>

      <Section title="Listening pill">
        <div className="flex flex-wrap items-center gap-4">
          <ListeningPill state="listening" elapsedMs={754_000} />
          <ListeningPill state="listening" elapsedMs={754_000} unseen />
          <ListeningPill state="paused" elapsedMs={1_334_000} />
          <ListeningPill state="idle" elapsedMs={0} />
        </div>
      </Section>

      <Section title="Fields">
        <div className="flex max-w-[480px] flex-col gap-4">
          <Input placeholder="Untitled workshop" />
          <label className="flex items-center justify-between text-[14px]">
            <span>Room mode <span className="text-ink-muted">· show boards on a projector</span></span>
            <Switch checked={room} onCheckedChange={setRoom} />
          </label>
        </div>
      </Section>

      <Section title="Listens for">
        <div className="flex flex-wrap gap-2">
          {FRAMEWORKS.map((f) => (
            <Chip key={f}>{f}</Chip>
          ))}
        </div>
      </Section>

      <Section title="Flag card (AI)">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="w-[320px]">
            <FlagCard
              frameworkName="Value vs feasibility matrix"
              reason="You've listed six ideas and keep weighing their value against how hard they'd be."
              quote="The cancellation model is hugely valuable for the commercial team, but I'm not sure we have the data"
              fit="strong"
              fitHint="Several options being compared on value and difficulty."
              onOpen={() => {}}
              onNotNow={() => {}}
              onMute={() => {}}
              animate={false}
            />
          </div>
          <div className="w-[320px]">
            <FlagCard
              frameworkName="Stakeholder map"
              reason="Several people and their influence over the decision have come up."
              quote="Priya, our CTO, has to sign off anything that touches the platform"
              fit="possible"
              manual
              preparingSeconds={3}
              onOpen={() => {}}
              onNotNow={() => {}}
              animate={false}
            />
          </div>
        </div>
        <p className="flex items-center gap-2 text-[13px] text-ink-muted">
          <Spark size={12} /> The spark and amber appear only on AI content.
        </p>
      </Section>

      <Section title="Empty rail">
        <div className="flex h-[200px] w-[320px] flex-col rounded-[12px] border border-hairline bg-surface">
          <p className="m-auto max-w-[220px] text-center text-[14px] text-ink-muted">
            Suggestions appear here when a framework could help.
          </p>
          <div className="border-t border-hairline p-3">
            <Button variant="ghost" size="sm" className="w-full text-ink-muted"><Plus strokeWidth={1.5} /> Suggest a framework</Button>
          </div>
        </div>
      </Section>

      <Section title="Shortcut bar">
        <div className="overflow-hidden rounded-[12px] border border-hairline bg-paper">
          <ShortcutBar
            className="border-t-0"
            shortcuts={[
              { keys: ["M"], label: "Mark moment" },
              { keys: ["F"], label: "Focus" },
              { keys: ["⌘", "K"], label: "Frameworks" },
              { keys: ["B"], label: "Blank room" },
              { keys: ["Esc"], label: "Back" },
            ]}
          />
        </div>
      </Section>
    </main>
  );
}
