STATUS: IN_PROGRESS
Last updated: 2026-11-03 01:25
Model: live (muse-spark-1.3 via api.meta.ai; text ~3.7s, JSON ~4s on smoke test)

| Milestone | Status | Notes |
|---|---|---|
| M0 | DONE | build green; `npm run test-model` OK live; /api/health returns JSON |
| M1 | DONE | tokens, fonts, themed shadcn, Spark, pill, flag card, /styleguide screenshots reviewed |
| M2 | DONE | 10 templates, 4 renderers (pure skeletons), /library SVG previews, 37 unit tests |
| M3 | DONE | BoardPanel (Excalidraw), accept-on-edit, provisional bar, source popover, ⌘K, localStorage; verified with qa/tools/board-*.mjs |
| M4 | DONE | start card, console, sample/paste replay, mic (Web Speech, unit-tested with a fake), mark, focus, pause/resume, reload restore |
| M5 | IN_PROGRESS | next: /api/check, /api/fill, prompts, mock engine, scheduler; replace useBrain stub |
| M6 | TODO | |
| M7 | TODO | |
| M8 | TODO | |
| M9 | TODO | |
| M10 | TODO | |
| M11 | TODO | |
| M12 | TODO | |
| M13 | TODO | |

## Next action
M5: schemas/prompts, /api/check + /api/fill (live + defensive fallback + mock), mock engine with canned sample fills, scheduler (pure, 2 pacing profiles), real useBrain (replace stub in src/components/session/useBrain.ts).

## Blocked / fallbacks
- none yet

## Needs Yosef's eyes in the morning
- Live microphone in Chrome (can't be tested headlessly): Start listening → speak → text should appear; covered by unit tests with a fake SpeechRecognition.
