STATUS: IN_PROGRESS
Last updated: 2026-11-03 02:20
Model: live (muse-spark-1.3 via api.meta.ai). Latency: smoke ~4s; checks 4–10s; fills 11–50s (minimal effort, hedged after 10s)

| Milestone | Status | Notes |
|---|---|---|
| M0 | DONE | build green; `npm run test-model` OK live; /api/health returns JSON |
| M1 | DONE | tokens, fonts, themed shadcn, Spark, pill, flag card, /styleguide screenshots reviewed |
| M2 | DONE | 10 templates, 4 renderers (pure skeletons), /library SVG previews, 37 unit tests |
| M3 | DONE | BoardPanel (Excalidraw), accept-on-edit, provisional bar, source popover, ⌘K, localStorage; verified with qa/tools/board-*.mjs |
| M4 | DONE | start card, console, sample/paste replay, mic (Web Speech, unit-tested with a fake), mark, focus, pause/resume, reload restore |
| M5 | DONE | check/fill routes, prompts, mock engine (canned sample fills), scheduler (2 profiles), evidence check; sample fires VF→SH→BBP in mock and live |
| M6 | IN_PROGRESS | rail mostly built in M4/M5; next: verify preparing timer, quote scroll, mute, earlier; screenshots |
| M7 | TODO | |
| M8 | TODO | |
| M9 | TODO | |
| M10 | TODO | |
| M11 | TODO | |
| M12 | TODO | |
| M13 | TODO | |

## Next action
M6: verify flag rail behaviours (Preparing board timer, quote click-to-scroll + amber underline, Not now, mute, Earlier collapse), fix issues, screenshots light/dark.

## Blocked / fallbacks
- none yet

## Needs Yosef's eyes in the morning
- Live microphone in Chrome (can't be tested headlessly): Start listening → speak → text should appear; covered by unit tests with a fake SpeechRecognition.
