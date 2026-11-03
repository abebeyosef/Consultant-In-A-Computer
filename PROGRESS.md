STATUS: IN_PROGRESS
Last updated: 2026-11-03 06:30
Model: live (muse-spark-1.3 via api.meta.ai). Latency: smoke ~4s; checks 4–10s; fills 11–50s (minimal effort, hedged after 10s)

| Milestone | Status | Notes |
|---|---|---|
| M0 | DONE | build green; `npm run test-model` OK live; /api/health returns JSON |
| M1 | DONE | tokens, fonts, themed shadcn, Spark, pill, flag card, /styleguide screenshots reviewed |
| M2 | DONE | 10 templates, 4 renderers (pure skeletons), /library SVG previews, 37 unit tests |
| M3 | DONE | BoardPanel (Excalidraw), accept-on-edit, provisional bar, source popover, ⌘K, localStorage; verified with qa/tools/board-*.mjs |
| M4 | DONE | start card, console, sample/paste replay, mic (Web Speech, unit-tested with a fake), mark, focus, pause/resume, reload restore |
| M5 | DONE | check/fill routes, prompts, mock engine (canned sample fills), scheduler (2 profiles), evidence check; sample fires VF→SH→BBP in mock and live |
| M6 | DONE | flag card, arrival, pill dot, Not now, mute, Earlier, quote scroll + underline, Preparing timer → auto-open; verified live (qa/tools/rail-check.mjs) |
| M7 | DONE | e2e 5/5 (mock); live eval 10/10, 0 false positives, median 5.8s; live sample 3 flags in order; README + DEMO draft; tag v0.1-night1 |
| M8 | DONE | /room + BroadcastChannel bridge, Send to room (accepted only), follow pan/zoom (clipped to board), B blank, J captions, dim room, status menu; e2e room.spec (2) green |
| M9 | DONE | board switcher, session summary, pill "Ended", provisional bar fits at 1280, start card fits at 800 high; QA shots at 1280×800 + 1728×1117 both themes |
| M10 | DONE | Share menu (read-only link → /view#, PNG, .excalidraw, session notes Markdown), summary "Copy session notes"; e2e share.spec (fresh context opens link read-only) green |
| M11 | DONE | /library "Add a framework" form (4 layouts), edit/remove, JSON import/export; appears in checks, ⌘K, chips; e2e custom.spec green; live check+fill verified; tag v0.2-night2 |
| M12 | DONE | error boundaries, perf check (2 h transcript, 0 long tasks), axe clean both themes, scan pacing for instant paste, final DEMO.md (2-min + 30-s scripts); 11/11 e2e green |
| M13 | IN_PROGRESS | next: research meeting-bot options, bot source behind ENABLE_MEET_BOT |

## Next action
M13: research Recall.ai / Attendee / Vexa from official docs (log choice + costs in DECISIONS), implement `bot` TranscriptSource behind ENABLE_MEET_BOT=1 (start-card "Join a call", server adapter, transcript events into the pipeline), MEET_BOT_SETUP.md; must not affect any path with the flag off. Then tag v0.3-night3 and write STATUS: ALL_DONE.

## Blocked / fallbacks
- none yet

## Needs Yosef's eyes in the morning
- Live fills take 17–30 s (hedged); the flag shows "Preparing board… Ns" meanwhile. If too slow on demo day, MOCK_MODE=1 gives instant canned sample boards.
- Live microphone in Chrome (can't be tested headlessly): Start listening → speak → text should appear; covered by unit tests with a fake SpeechRecognition.
