"use client";

import { Check, Copy, Mic, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Chip } from "@/components/common/Chip";
import { Kbd } from "@/components/common/Kbd";
import { LevelMeter } from "@/components/session/ListeningPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getAllFrameworks } from "@/lib/frameworks/registry";
import { BUILTIN_FRAMEWORKS } from "@/lib/frameworks/builtins";
import { SAMPLE_SESSION_NAME } from "@/lib/transcript/sampleScript";
import { listMicrophones, startLevelMeter } from "@/lib/transcript/level";
import { speechSupported } from "@/lib/transcript/sources/mic";
import { createSession, listSessions } from "@/lib/session/storage";
import { isTypingTarget } from "@/lib/keyboard";
import { PasteDialog } from "./PasteDialog";

export const CONSENT_SENTENCE =
  "Quick note: I'm running an assistant that transcribes this session to suggest frameworks as we go. It uses Chrome's speech recognition, which sends audio to Google for processing. Say if you'd rather I didn't.";

const noop = () => () => {};

export function StartCard({ meetBotEnabled = false }: { meetBotEnabled?: boolean }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const supported = hydrated && speechSupported();
  const [name, setName] = useState("");
  const [roomMode, setRoomMode] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("default");
  const [level, setLevel] = useState<number | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [meetUrl, setMeetUrl] = useState("");
  const stopMeter = useRef<(() => void) | null>(null);
  const frameworks = hydrated ? getAllFrameworks() : BUILTIN_FRAMEWORKS;
  const recent = hydrated ? listSessions().slice(0, 4) : [];

  // If the mic is already allowed, show device names and a live level bar (no prompt before a click).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await navigator.permissions?.query({ name: "microphone" as PermissionName });
        if (cancelled || perm?.state !== "granted") return;
        const list = await listMicrophones();
        if (cancelled) return;
        setDevices(list);
        stopMeter.current = await startLevelMeter((l) => setLevel(l), deviceId === "default" ? undefined : deviceId);
      } catch {
        /* permissions API or mic unavailable — picker stays minimal */
      }
    })();
    return () => {
      cancelled = true;
      stopMeter.current?.();
      stopMeter.current = null;
    };
  }, [deviceId]);

  const startListening = useCallback(async () => {
    if (!supported || busy) return;
    setBusy(true);
    setMicError(null);
    try {
      // The permission prompt appears here, right after the click.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
      });
      stream.getTracks().forEach((t) => t.stop());
      stopMeter.current?.();
      const s = createSession({
        name,
        mode: roomMode ? "room" : "private",
        source: { kind: "mic", lang: "en-GB", deviceId: deviceId !== "default" ? deviceId : undefined },
      });
      router.push(`/session/${s.id}?start=1`);
    } catch (err) {
      const e = err as DOMException;
      setMicError(
        e?.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it from the address bar and try again."
          : e?.name === "NotFoundError"
            ? "No microphone found. Try the sample workshop or paste a transcript."
            : "Couldn't start the microphone.",
      );
      setBusy(false);
    }
  }, [supported, busy, deviceId, name, roomMode, router]);

  const startSample = useCallback(() => {
    const s = createSession({ name: name || SAMPLE_SESSION_NAME, mode: roomMode ? "room" : "private", source: { kind: "sample", speed: 1 } });
    router.push(`/session/${s.id}?start=1`);
  }, [name, roomMode, router]);

  const startPaste = useCallback(
    (text: string, instant: boolean) => {
      const s = createSession({
        name: name || "Pasted transcript",
        mode: roomMode ? "room" : "private",
        source: { kind: "paste", pasteText: text, instant, speed: 2 },
      });
      router.push(`/session/${s.id}?start=1`);
    },
    [name, roomMode, router],
  );

  const startBot = useCallback(() => {
    const s = createSession({ name: name || "Online workshop", mode: roomMode ? "room" : "private", source: { kind: "bot", meetUrl } });
    router.push(`/session/${s.id}?start=1`);
  }, [name, roomMode, meetUrl, router]);

  // Enter starts (primary path when available, otherwise the sample).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || pasteOpen || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && isTypingTarget(e) && t.id !== "session-name") return;
      if (t?.closest("button, a, [role=combobox], [role=switch]")) return;
      e.preventDefault();
      if (supported) void startListening();
      else startSample();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [supported, startListening, startSample, pasteOpen]);

  const copyConsent = async () => {
    try {
      await navigator.clipboard.writeText(CONSENT_SENTENCE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked; nothing else to do */
    }
  };

  const picked = devices.find((d) => d.deviceId === deviceId);
  const pickedNotDefault = deviceId !== "default" && picked;

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-6">
      <section className="flex flex-col gap-6 rounded-[12px] border border-hairline bg-surface p-7" aria-labelledby="start-title">
        <div className="flex flex-col gap-1.5">
          <h1 id="start-title" className="text-[22px] leading-tight">
            Start a workshop
          </h1>
          <p className="text-[14px] text-ink-muted">
            It listens, keeps a calm transcript, and quietly suggests a framework when one would help — already filled in.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" className="h-11 text-[14px]" onClick={startListening} disabled={!supported || busy} data-testid="start-listening">
            <Mic strokeWidth={1.5} />
            {busy ? "Starting…" : "Start listening"}
          </Button>
          <Button size="lg" variant="outline" className="h-11 text-[14px]" onClick={startSample} data-testid="try-sample">
            <Play strokeWidth={1.5} />
            Try a sample workshop
          </Button>
        </div>
        <div className="-mt-3 flex flex-col gap-1">
          {hydrated && !supported ? (
            <p className="text-[13px] text-ink-muted">Live listening needs Chrome. The sample and pasted transcripts work in any browser.</p>
          ) : null}
          {micError ? (
            <p role="alert" className="text-[13px] text-danger">
              {micError}
            </p>
          ) : null}
          <Button variant="link" className="h-auto self-start px-0 text-[13px] text-ink-muted" onClick={() => setPasteOpen(true)} data-testid="paste-link">
            Paste a transcript instead
          </Button>
        </div>

        <div className="flex flex-col gap-4 border-t border-hairline pt-5">
          <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
            Session name
            <Input id="session-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Untitled workshop" className="h-9 text-[14px] text-ink" />
          </label>

          <div className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
            <span id="mic-label">Microphone</span>
            <div className="flex items-center gap-3">
              <Select value={deviceId} onValueChange={setDeviceId}>
                <SelectTrigger aria-labelledby="mic-label" className="flex-1 text-[14px] text-ink">
                  <SelectValue placeholder="System default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">System default</SelectItem>
                  {devices
                    .filter((d) => d.deviceId && d.deviceId !== "default")
                    .map((d) => (
                      <SelectItem key={d.deviceId} value={d.deviceId}>
                        {d.label || "Microphone"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <span className="inline-flex h-8 w-14 items-center justify-center rounded-[8px] border border-hairline" role="img" aria-label={level === null ? "Input level (microphone not allowed yet)" : "Input level"}>
                <LevelMeter level={level ?? 0} active={level !== null} className={level !== null ? "text-live" : "text-ink-muted/50"} />
              </span>
            </div>
            {pickedNotDefault ? (
              <span className="text-[12px]">Chrome&apos;s speech recognition uses the system default mic; set this one as default in System Settings.</span>
            ) : level === null && hydrated ? (
              <span className="text-[12px]">The level shows once the microphone is allowed.</span>
            ) : null}
          </div>

          <label className="flex items-center justify-between gap-4 text-[14px]">
            <span className="flex flex-col">
              <span>{roomMode ? "Room" : "Private"}</span>
              <span className="text-[12px] text-ink-muted">
                {roomMode ? "Boards can go on the projector, with live captions." : "Only you see suggestions and boards."}
              </span>
            </span>
            <Switch checked={roomMode} onCheckedChange={setRoomMode} aria-label="Room mode" />
          </label>
        </div>

        {meetBotEnabled ? (
          <div className="flex flex-col gap-1.5 border-t border-hairline pt-5 text-[13px] text-ink-muted">
            Join an online call
            <div className="flex gap-2">
              <Input value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" className="h-9 text-[14px] text-ink" />
              <Button variant="outline" className="h-9" onClick={startBot} disabled={!/^https:\/\/meet\.google\.com\//.test(meetUrl)}>
                Join a call
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4 rounded-[8px] bg-sunken px-3.5 py-3 text-[13px]">
          <span className="text-ink-muted">Let the room know you&apos;re transcribing.</span>
          <Button variant="ghost" size="xs" onClick={copyConsent} className="shrink-0 text-ink-muted" aria-label="Copy a consent sentence">
            {copied ? <Check strokeWidth={1.5} /> : <Copy strokeWidth={1.5} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-ink-muted">Listens for</span>
          <div className="flex flex-wrap gap-1.5" data-testid="listens-for">
            {frameworks.map((f) => (
              <Chip key={f.id}>{f.shortName}</Chip>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between px-1 text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Kbd>Enter</Kbd> to start
        </span>
        <Link href="/library" className="hover:text-ink">
          Framework library
        </Link>
      </div>

      {recent.length ? (
        <nav aria-label="Recent sessions" className="flex flex-col gap-1 px-1">
          <span className="text-[12px] text-ink-muted">Recent</span>
          {recent.map((r) => (
            <Link key={r.id} href={`/session/${r.id}`} className="flex items-center justify-between rounded-md py-1 text-[13px] text-ink hover:text-accent-blue">
              <span className="truncate">{r.name}</span>
              <span className="text-mono-sm">{new Date(r.startedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      <PasteDialog open={pasteOpen} onOpenChange={setPasteOpen} onSubmit={startPaste} />
    </div>
  );
}
