# Consultant in a Computer

A desktop-first web app that listens to a live workshop, keeps a calm transcript, and
quietly flags when a consulting framework would help. Clicking a flag opens that
framework **already filled in from what was said**, on an editable whiteboard.

The brain is Meta's **Muse Spark** model via the Meta Model API (OpenAI-compatible).
Everything also works fully offline with a built-in mock engine.

## Run it

Needs Node 20+ and Chrome (for live microphone transcription).

```bash
npm install
cp .env.example .env.local   # then fill in MODEL_API_KEY (optional)
npm run dev                  # http://localhost:3000
```

For the demo machine, a production build is snappier:

```bash
npm run build && npm start
```

## Live vs mock mode

| | Live | Mock (offline) |
|---|---|---|
| When | `MODEL_API_KEY` set and `MOCK_MODE` not `1` | No key, `MOCK_MODE=1`, or the API fails twice in a row |
| Checks | Muse Spark decides if a framework fits (≈4–10 s) | Keyword/signal scoring per framework |
| Fills | Muse Spark pre-fills the board (≈10–40 s, hedged) | Canned fills for the sample workshop; simple extraction otherwise |

`GET /api/health` reports `{ mode: "live" | "mock", model }`. The console shows a quiet
"Offline mode" label in the suggestions rail when mocking. A circuit breaker drops to
mock for 60 s after three consecutive API failures, so the demo never stalls.

### Environment variables (`.env.local`)

| Var | Default | Meaning |
|---|---|---|
| `MODEL_API_KEY` | — | Meta Model API key. Leave empty for mock mode. |
| `MODEL_BASE_URL` | `https://api.meta.ai/v1` | API base URL |
| `MODEL_ID` | `muse-spark-1.1` | Model id (this machine uses `muse-spark-1.3`) |
| `MOCK_MODE` | `0` | `1` forces the offline engine |
| `ENABLE_MEET_BOT` | `0` | Google Meet bot transcript source (Phase C, experimental) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint`, `npm run typecheck`, `npm test` | ESLint, `tsc`, Vitest unit tests |
| `npm run e2e` | Builds, then runs Playwright e2e against `next start` in mock mode (port 3100) |
| `npm run test-model` | One-shot connectivity check against the live model |
| `npm run eval` | Runs the check prompt on `evals/check-cases.json` against the live model (target ≥ 8/10, no false positives). `-- --mock` scores the offline engine |

## How it works

- **Transcript sources** (`src/lib/transcript/sources`): Web Speech microphone, pasted text, and the scripted sample workshop (replayed at ~150 wpm with 1×/1.5×/3× speed).
- **Scheduler** (`src/lib/brain/scheduler.ts`): checks every 30 s when ≥ 40 new words arrived (15 s in the sample), one in flight, at most one auto flag per 2 min (45 s in the sample), never the same framework twice in 10 min.
- **API routes**: `/api/check` (would a framework help now?), `/api/fill` (pre-fill the chosen framework), `/api/health`. Every model reply is validated with zod; evidence quotes are verified against the transcript and dropped if invented.
- **Board**: Excalidraw. AI stickies are provisional (amber, dashed) until the facilitator moves, edits or keeps them.
- **Storage**: localStorage only (sessions, boards, mutes). No backend database, no accounts.

See `DEMO.md` for the walkthrough and `BUILD_PLAN.md` for the full spec.
