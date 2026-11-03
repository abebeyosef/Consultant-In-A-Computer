# Consultant in a Computer — Overnight Build Plan

> **For the coding agent (Claude Code):** this file is your full brief. Read it top to bottom before writing any code. You are working alone and unattended. Nobody can answer questions until morning, so never stop to ask: decide, log the decision in `DECISIONS.md`, and keep going. Track progress in `PROGRESS.md` (format in §12) so that a fresh session can pick up exactly where the last one stopped.

---

## 0. Before bed — checklist for Yosef (5 minutes)

1. Make an empty folder, e.g. `~/consultant-in-a-computer`, and put this file and `run-overnight.sh` in it.
2. Create `.env.local` in that folder:
   ```
   MODEL_API_KEY=your-meta-model-api-key
   MODEL_BASE_URL=https://api.meta.ai/v1
   MODEL_ID=muse-spark-1.1
   ```
   If your Model API dashboard offers a newer Muse Spark (1.2 or 1.3), put that ID in `MODEL_ID` instead.
3. Test the key (should print a short JSON reply, not an auth error):
   ```bash
   source .env.local && curl -s $MODEL_BASE_URL/chat/completions \
     -H "Authorization: Bearer $MODEL_API_KEY" -H "Content-Type: application/json" \
     -d "{\"model\":\"$MODEL_ID\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hi\"}]}"
   ```
4. Check tools: `node -v` (needs 20 or newer), `git --version`, and `claude -p "say hi"` (confirms Claude Code is logged in).
5. Plug the Mac in, keep the lid open, then:
   ```bash
   cd ~/consultant-in-a-computer && chmod +x run-overnight.sh && ./run-overnight.sh
   ```
6. In the morning: open `PROGRESS.md` first, then `npm run dev` and go to http://localhost:3000. `DEMO.md` will have the walkthrough.

Note: the runner uses `--dangerously-skip-permissions` so Claude Code never stalls on a permission prompt. Only run it inside this dedicated folder.

---

## 1. Mission

Build a **desktop-first web app** that listens to a live workshop, shows a calm live transcript, and quietly flags when a consulting framework would help. Clicking a flag opens that framework **already filled in from what was said**, on an **editable whiteboard**. A separate **room view** window can show accepted boards on the projector.

**Context:** Meta Hackathon submission. Demo is **Thursday 5 November 2026**. Built over three overnight runs (Mon, Tue, Wed). The product's brain is **Meta's Muse Spark model** via the Meta Model API.

### The demo that must work by Thursday (in priority order)

1. Click **"Try a sample workshop"** → transcript streams in → within ~60 seconds an amber flag appears with a reason and a quote → **Open board** shows a pre-filled value vs feasibility matrix → the facilitator drags and edits stickies.
2. The same with **live microphone** in Chrome.
3. **Paste a transcript** → flags appear → boards open.
4. **Send to room** → a second window shows the accepted board, light theme, large text.

Everything else is secondary. If time is short, protect these four paths above all else.

---

## 2. Operating rules for the agent

1. **Never ask questions.** Make the reasonable call, write one line in `DECISIONS.md` (what, why), continue.
2. **Work milestone by milestone** (§11), in order. Do not start a milestone until the previous one meets its "Done when" checks, unless it is blocked (rule 5).
3. **Keep it green.** Before every commit: `npm run lint && npm run typecheck && npm test && npm run build`. Fix failures before moving on.
4. **Commit after each milestone** with a message like `M4: transcript sources`, and tag `v0.1-night1` after M7, `v0.2-night2` after M11, `v0.3-night3` after M13. Local git only; do not push anywhere.
5. **Time-box.** If a milestone or a single problem eats more than ~45 minutes or 3 failed approaches, choose the simplest fallback that keeps the demo paths working, record it under "Blocked / fallbacks" in `PROGRESS.md`, and move on.
6. **Never break a demo path to build a later feature.** Later features go behind clean boundaries or feature flags.
7. **Mock mode is mandatory.** The app must work fully with no API key or a failing API (§6.5). Never block on the model.
8. **No paid services, no accounts, no deploys.** Everything runs locally. No secrets in git (`.env.local` is gitignored).
9. **Verify docs when unsure.** Library APIs change. If an Excalidraw/Next.js/shadcn API in this plan doesn't match the installed version, check the package's own types in `node_modules` or fetch the official docs, then adapt. The plan's intent wins over its exact code.
10. **Look at your own UI.** At the end of each UI milestone, take Playwright screenshots (1440×900, light and dark) into `qa/screenshots/`, view them, and fix anything that contradicts §8–9. Design quality is a core requirement, not polish.
11. **Keep `PROGRESS.md` current** after every milestone and before any long operation, so an interrupted session can resume. When every milestone is done or consciously skipped, write `STATUS: ALL_DONE` on its own line at the top.

---

## 3. Tech stack (fixed decisions)

| Need | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript**, latest stable via `create-next-app`, `src/` dir | API routes keep the model key server-side |
| Styling | **Tailwind CSS** (whatever version create-next-app installs) mapped to the CSS tokens in §8 | |
| Components | **shadcn/ui** (button, switch, dropdown-menu, command, tooltip, dialog, sonner, separator, scroll-area, toggle-group, input, textarea, select) | Restyle to tokens |
| Command menu | cmdk via shadcn Command | Cmd+K and "/" |
| Toasts | Sonner via shadcn | Errors and saves only, never for flags |
| Layout | react-resizable-panels | Transcript / board / rail |
| Icons | lucide-react, 16px, 1.5 stroke | |
| Motion | `motion` (formerly Framer Motion) | Respect reduced motion |
| Fonts | Inter + JetBrains Mono via `next/font/google` | |
| Whiteboard | **@excalidraw/excalidraw** (MIT), client-only via `next/dynamic` with `ssr: false`, import its CSS | |
| Transcription | Browser **Web Speech API** (Chrome) | Free; paste and sample fallbacks |
| Model | **Meta Model API** with the `openai` npm SDK pointed at `MODEL_BASE_URL` | §6 |
| Validation | zod | Validate every model response |
| Window sync | BroadcastChannel | Console ↔ room view |
| Storage | localStorage (sessions, boards, custom frameworks, muted list) | No backend DB tonight |
| Sharing | lz-string (compress board into URL hash) | §11 M10 |
| Tests | Vitest (unit), Playwright (e2e + screenshots) | Install Playwright's Chromium |

Scripts to add to `package.json`: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (vitest run), `e2e` (playwright test), `eval` (§6.6).

---

## 4. Architecture

```
Browser (console window)                         Server (Next.js API routes)
┌────────────────────────────────────────┐       ┌──────────────────────────────┐
│ TranscriptSource (mic | paste | sample │       │ POST /api/check  → Muse Spark │
│   | bot) ──► TranscriptStore            │──────►│ POST /api/fill   → Muse Spark │
│ CheckScheduler (pacing rules) ─────────┘       │ GET  /api/health → live|mock  │
│ SuggestionStore ──► FlagRail                    │ (mock engine if no key/error) │
│ BoardStore ──► Excalidraw board                 └──────────────────────────────┘
│ RoomBridge ──BroadcastChannel──► Room view window (/room)
└────────────────────────────────────────┘
```

### Suggested file structure

```
src/
  app/
    page.tsx                  # Start card
    session/[id]/page.tsx     # Live session console
    room/page.tsx             # Room view window
    view/page.tsx             # Read-only shared board (URL hash)
    library/page.tsx          # Framework library preview + custom frameworks
    api/check/route.ts
    api/fill/route.ts
    api/health/route.ts
  components/
    start/StartCard.tsx
    session/TopBar.tsx  ListeningPill.tsx  TranscriptView.tsx  FlagRail.tsx  FlagCard.tsx
    session/ShortcutBar.tsx  FocusMode.tsx
    board/BoardPanel.tsx  ExcalidrawCanvas.tsx  ProvisionalBar.tsx  SourcePopover.tsx
    room/RoomStage.tsx  CaptionBand.tsx
    common/Spark.tsx  (custom 4-point spark icon)
  lib/
    frameworks/types.ts  builtins.ts  layouts/{matrix2x2,canvas,table,chain}.ts  toSkeleton.ts
    transcript/types.ts  store.ts  sources/{mic,paste,sample,bot}.ts  sampleScript.ts
    brain/client.ts  prompts.ts  schemas.ts  mock.ts  scheduler.ts  evidence.ts
    board/store.ts  provisional.ts  share.ts
    room/bridge.ts
    storage.ts  keyboard.ts  ids.ts
  styles/tokens.css
scripts/
  test-model.ts  eval-check.ts
evals/check-cases.json
e2e/*.spec.ts
qa/screenshots/
```

Use small stores (React context + reducer, or Zustand if you prefer — log the choice). Keep pure logic in `lib/` so it's unit-testable.

---

## 5. Core data types

```ts
type TranscriptSegment = {
  id: string; startMs: number; endMs: number;
  text: string; final: boolean; marked?: boolean;
};

type Fit = 'strong' | 'possible';

type Suggestion = {
  id: string; frameworkId: string; fit: Fit;
  reason: string;               // one sentence, <= 20 words
  evidenceQuote: string;        // verbatim from transcript, <= 25 words
  evidenceSegmentIds: string[];
  createdAt: number;
  status: 'new' | 'seen' | 'opened' | 'dismissed';
  fillStatus: 'pending' | 'ready' | 'error';
  boardId?: string;
  manual: boolean;              // from "Suggest a framework" button
};

type FillItem = { text: string; sourceQuote?: string };
// Layout-specific fill payloads — see §7.

type Board = {
  id: string; sessionId: string; frameworkId: string; title: string;
  elements: unknown[];          // Excalidraw elements
  createdAt: number; updatedAt: number;
};

type Session = {
  id: string; name: string; mode: 'private' | 'room';
  startedAt: number; segments: TranscriptSegment[];
  suggestions: Suggestion[]; boardIds: string[];
  mutedFrameworkIds: string[];  // "Don't suggest this again today"
};
```

AI-placed Excalidraw elements carry `customData: { source: 'ai', suggestionId, sourceQuote, state: 'provisional' | 'accepted' }`.

---

## 6. The brain (Meta Model API)

### 6.1 Connection

- Base URL `https://api.meta.ai/v1`, bearer auth with `MODEL_API_KEY`, model from `MODEL_ID` (default `muse-spark-1.1`). The API is OpenAI-compatible.
- Use the `openai` npm package: `new OpenAI({ baseURL: process.env.MODEL_BASE_URL, apiKey: process.env.MODEL_API_KEY })`. The SDK does **not** auto-read `MODEL_API_KEY`; pass it explicitly.
- Use `chat.completions.create`. Request structured JSON via `response_format: { type: 'json_schema', ... }` and set `reasoning_effort: 'low'` for checks and `'medium'` for fills.
- **Defensive fallback:** if the API rejects `response_format` or `reasoning_effort` (HTTP 400), retry once without them, instruct "Reply with JSON only", strip any code fences, and parse. Always validate with zod. On a second failure, use the mock engine for that call.
- Timeouts: 20s for check, 40s for fill. One retry on 429/5xx with 2s backoff.
- Log each call (latency, tokens if returned, success) to the server console; never log the key.
- `scripts/test-model.ts` (M0) sends a tiny prompt and prints the reply or the error, so the morning-you can check connectivity in one command.

### 6.2 `/api/check` — "would a framework help right now?"

**Input:** recent transcript window (last ~3 minutes or 600 words, whichever is shorter), any marked moments (always included), the framework catalogue (id, name, whenToUse, signals — built-ins plus custom), recently suggested framework IDs, muted IDs, and `manual: boolean`.

**Output schema:**
```json
{ "fit": "strong" | "possible" | "none",
  "frameworkId": "string|null",
  "reason": "string",          // one sentence, plain English, addressed to the facilitator
  "evidenceQuote": "string" }  // copied verbatim from the transcript
```

**System prompt (starting point — tune in M7):**
```
You are a senior strategy consultant quietly supporting a workshop facilitator.
You read the latest part of a live workshop transcript and decide whether ONE
framework from the catalogue would genuinely help structure the discussion
right now. Be conservative: most of the time the answer is "none".

Return "strong" only when the room is clearly doing the work the framework is
for (e.g. comparing several options on two dimensions, mapping people and their
influence, weighing build/buy/partner). Return "possible" when it might help.
Never suggest a framework in the "recently suggested" or "muted" lists.

The reason must be one sentence under 20 words, written to the facilitator,
grounded in what was said ("You've listed six ideas and keep weighing value
against effort."). No hype, no percentages.
The evidenceQuote must be copied exactly from the transcript (max 25 words).
Reply with JSON matching the schema.
```

Server-side post-processing:
- If `manual` is false, treat `possible` as `none` (only strong fits auto-flag).
- **Evidence check** (`lib/brain/evidence.ts`): normalise case/punctuation and confirm the quote appears in the transcript. If not, pick the transcript sentence with the highest word overlap; if overlap is weak, drop the quote rather than show an invented one. Map the quote to segment IDs for the amber underline.

### 6.3 `/api/fill` — pre-fill the framework

Called **immediately** when a flag is created, so the board is ready before the facilitator clicks. Input: framework definition, fuller transcript (up to the last ~15 minutes; the context window is huge but keep latency low), marked moments. Output: the layout-specific payload in §7, each item with a short `text` (max ~8 words, sticky-note style) and a verbatim `sourceQuote`.

Prompt rules: use only what was said in the room (no invented facts); keep item text short and concrete; maximum 12 items per board; for matrices give integer scores 1–5 on each axis judged from the conversation; if the room said little about a slot, leave it empty (the board shows ghost labels).

### 6.4 Check scheduler and pacing (`lib/brain/scheduler.ts`, pure + unit-tested)

- Run a check every **30 seconds** if at least **40 new final words** have arrived since the last check. Also run one immediately after a "Mark moment" (M key), and on the manual button.
- Never more than one check in flight.
- **At most one new auto flag every 2 minutes. Never the same framework twice within 10 minutes.** Muted frameworks are excluded for the session.
- **Sample-workshop mode** uses a demo pacing profile: checks every 15s, minimum gap between flags 45s, so the scripted demo fires three flags in about three minutes. Put both profiles in one config object.
- Manual "Suggest a framework" ignores the time gap but still respects mutes; it may return `possible`.

### 6.5 Mock engine (`lib/brain/mock.ts`)

Used when `MODEL_API_KEY` is missing, `MOCK_MODE=1`, or a live call fails twice.
- **Check:** score each framework by its `signals` keyword list against the window (stemmed, case-insensitive); strong fit above a threshold you calibrate on the sample script and eval cases. Reason comes from a per-framework template ("Sounds like you're weighing options on value and how hard they'd be."). Evidence = the sentence with the most signal hits.
- **Fill:** if the transcript matches the sample workshop, return the **canned fills** in §10. Otherwise do a simple extraction (sentences with signal words, trimmed to ~8 words) so boards are never empty.
- `/api/health` reports `{ mode: 'live' | 'mock', model }`. The console shows a quiet in-window status ("Offline mode") when mocking — no toast.

### 6.6 Prompt evaluation (`npm run eval`)

`evals/check-cases.json` holds at least **10 short transcript snippets** you write (2–4 sentences each, workshop-realistic, original): 2 for value vs feasibility, 2 for impact vs effort, 2 for SWOT, 2 for stakeholder map, and 2 that should return **none** (logistics/small talk, and a discussion that's already decided). `scripts/eval-check.ts` runs `/api/check` logic on each against the live model and prints a pass/fail table plus latency. Target: **≥ 8/10**, with zero false positives on the "none" cases. Iterate on prompts and the `whenToUse`/`signals` text until met (time-boxed per rule 5). Skip gracefully in mock mode.

---

## 7. Framework library

Ten built-ins. Four are **tuned** (prompts, signals and demo optimised hardest): value vs feasibility, impact vs effort, SWOT, stakeholder map.

Each template is data, not code:
```ts
type FrameworkTemplate = {
  id: string; name: string; shortName: string;
  whenToUse: string;      // 1–2 sentences, fed to the model
  signals: string[];      // phrases/keywords, used by mock + prompt
  tuned: boolean; source: 'builtin' | 'custom';
  layout: Matrix2x2Layout | CanvasLayout | TableLayout | ChainLayout;
};
```

### 7.1 Four layout types (keep the renderer count small)

| Layout | Fill payload | Rendering |
|---|---|---|
| `matrix2x2` | `{ items: [{ text, x: 1-5, y: 1-5, sourceQuote }] }` | Titled frame, two labelled axes (low→high), four labelled quadrants. Place stickies by score, then nudge to avoid overlap (simple grid packing within each quadrant). |
| `canvas` | `{ blocks: { [blockId]: FillItem[] } }` | Fixed named blocks at relative positions (e.g. SWOT 2×2, BMC 9-block). Stickies stack inside each block. |
| `table` | `{ columns?: string[], cells: [{ row, col, text, sourceQuote }] }` | Header row + header column; stickies in cells. Some tables have dynamic columns. |
| `chain` | `{ problem, whys: FillItem[], rootCause, countermeasure }` | Vertical chain of boxes joined by arrows. |

### 7.2 The ten templates

| # | id | Name | Layout | Structure | Use when / signals (seed — refine in M7) |
|---|---|---|---|---|---|
| 1 | `value-feasibility` ★ | Value vs feasibility matrix | matrix2x2 | x: Feasibility, y: Value. Quadrants: Prioritise (high/high), Big bets (high value, low feasibility), Easy extras (low value, high feasibility), Park (low/low) | Choosing among several **opportunities, use cases or initiatives**, weighing value/impact/ROI against feasibility, data, tech, capability. "which should we pursue", "use case", "how hard", "do we have the data" |
| 2 | `impact-effort` ★ | Impact vs effort matrix | matrix2x2 | x: Effort, y: Impact. Quadrants: Quick wins (high impact, low effort), Major projects, Fill-ins, Thankless tasks | Prioritising **actions, tasks or fixes** by impact vs time/resources. "quick win", "low-hanging fruit", "how long would it take", "effort", "backlog" |
| 3 | `swot` ★ | SWOT | canvas | Strengths, Weaknesses, Opportunities, Threats (2×2) | Assessing a company/product/team's **position**: what we're good at, gaps, market shifts, competitors, risks |
| 4 | `stakeholder-map` ★ | Stakeholder map (power vs interest) | matrix2x2 | x: Interest, y: Power. Quadrants: Manage closely, Keep satisfied, Keep informed, Monitor | Several **people, teams or roles** named, buy-in, sign-off, resistance, champions, "who needs to be involved" |
| 5 | `jtbd` | Jobs to be done | canvas | Job statement (When… I want to… so I can…), Functional, Emotional, Social jobs, Pains, Gains | Discussing **what customers are trying to achieve**, why they buy/switch, unmet needs |
| 6 | `customer-journey` | Customer journey map | table | Columns = stages (dynamic; default Awareness, Consideration, Purchase, Onboarding, Use, Advocacy). Rows: Actions, Thoughts & feelings, Pain points, Opportunities | Walking through an **experience step by step**: "first they…, then…", touchpoints, drop-off |
| 7 | `five-whys` | Five whys | chain | Problem → Why ×5 → Root cause → Countermeasure | A **recurring problem**, symptoms, "why does this keep happening", blame |
| 8 | `options-appraisal` | Options appraisal (pros and cons) | table | Columns = options (dynamic, 2–4). Rows: Pros, Cons, Open questions | Debating **alternatives**: "option A vs B", "either we… or…", trade-offs |
| 9 | `business-model-canvas` | Business model canvas | canvas | Standard 9 blocks: Key partners, Key activities, Key resources, Value propositions, Customer relationships, Channels, Customer segments, Cost structure, Revenue streams | Shaping a **new venture or business model**: who pays, revenue, partners, channels, costs |
| 10 | `build-buy-partner` | Build, buy or partner | table | Columns: Build, Buy, Partner. Rows: Cost, Speed, Control & IP, Risk, Capability fit, Leaning | **Sourcing decision**: in-house vs vendor vs partnership, licensing, "should we build our own" |

★ = tuned. Disambiguation the prompt must handle: use **value vs feasibility** for strategic opportunity/use-case selection and **impact vs effort** for prioritising concrete actions or tasks; prefer **build/buy/partner** over options appraisal when the options are literally build, buy or partner.

Write each template's `whenToUse` (1–2 sentences) and 8–15 `signals` in your own words. Every framework must render as an **empty frame with ghost labels** too ("Add initiatives here") — never a blank canvas.

### 7.3 Custom frameworks (M11)

A simple form on `/library`: name, when to use, signals (comma-separated), layout type, and its labels (axes + quadrant names, or block names, or rows/columns, or chain steps). Stored in localStorage, included in checks and the Cmd+K menu, exportable/importable as JSON. This demonstrates "firms upload their own frameworks".

---

## 8. Design system

The mood is **"a good consultant's notebook"**: warm paper, sharp ink, one quiet signal colour for the AI. Closer to Granola and Linear than a neon AI dashboard. Borrow patterns, never logos, illustrations or exact layouts.

### 8.1 Tokens (put in `src/styles/tokens.css` and map into Tailwind)

```css
:root {
  --bg: #F8F7F3; --surface: #FFFFFF; --ink: #17191D; --ink-muted: #5E6470;
  --hairline: rgba(0,0,0,.08); --accent: #2F45D8; --signal: #E8A317;
  --signal-tint: rgba(232,163,23,.12); --live: #1F9D61; --danger: #C8372D;
  --radius-sm: 8px; --radius-md: 12px; --space: 4px;
  --font-ui: 'Inter', system-ui, sans-serif; --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --ease: cubic-bezier(.2,.8,.2,1); --dur: 180ms;
}
[data-theme='dark'] {
  --bg: #101114; --surface: #17191E; --ink: #ECEDEF; --ink-muted: #9BA1AC;
  --hairline: rgba(255,255,255,.08); --accent: #7D8CFF; --signal: #F2B84B;
  --signal-tint: rgba(242,184,75,.16); --live: #3CCB86; --danger: #F0675D;
}
```

| Token | Use |
|---|---|
| `--accent` ink-blue | Buttons, links, focus rings |
| `--signal` amber | **AI only**: flags, AI-placed board items, the "new suggestion" dot. Nothing else is amber. |
| `--live` green | "Listening" state only |
| `--danger` red | Stop and delete only |

### 8.2 Type
- UI/body: Inter 15px, line-height 1.5. Headings: Inter 600, tight letter-spacing.
- Transcript: Inter 17px, line-height 1.65, max ~68 characters per line.
- Timestamps/counters: JetBrains Mono 12px, muted.
- Room view: body ≥ 28px, titles ≥ 48px, contrast ≥ 7:1.

### 8.3 Shape and spacing
- 4px grid (gaps mostly 8/12/16/24). Radius 8px controls, 12px cards, full pill for the listening indicator.
- Hairline borders, flat surfaces. **Only one shadow on screen: the flag card.**
- Generous margins: the console should feel 30% emptier than seems necessary.

### 8.4 Icons
- Lucide 16px, 1.5 stroke, `--ink-muted` unless active.
- One custom mark: a small **four-point spark** in `--signal`, used only on AI content.

### 8.5 Motion
- 150–200ms, ease-out, no bounce.
- Transcript words fade from `--ink-muted` (interim) to `--ink` (final) — never rewrite text the user has already read.
- Flags slide 8px in from the right and fade up over 180ms. No shake, pulse or sound.
- The listening pill's three-bar level meter is the only constant motion.
- AI board items appear one by one with a 40ms stagger.
- `prefers-reduced-motion`: replace movement with simple fades.

### 8.6 Theme
- Console follows the system theme with a manual toggle (dark available for evening sessions).
- Room view is **light by default**, with a "dim room" toggle to the dark palette.

### 8.7 Never do
Chat box as the main AI surface · pop-ups, centred toasts or sounds for suggestions · live coaching on pace or talk time · dense jittery transcript · hidden or "undetectable" AI · AI writing straight onto what the room sees · percentage confidence scores · sparkles/purple gradients/glass everywhere · crowded whiteboard toolbars · dark projector by default.

---

## 9. Screens

### 9.1 Start card (`/`)
One centred card, 480px wide, on the paper background.
- **Two equal paths at the top:** "Start listening" (primary) and "Try a sample workshop".
- Fields: session name (optional, placeholder "Untitled workshop"), microphone picker with a live level bar, mode switch **Private / Room**.
- Under the primary button: muted link "Paste a transcript instead" (opens a textarea dialog; text is fed through the same pipeline, paced so flags can fire, with a "process instantly" option).
- **Consent line:** "Let the room know you're transcribing" + Copy button (copies one plain sentence, mentioning that Chrome's speech recognition sends audio to Google for processing).
- **"Listens for" chips:** small chips naming the frameworks in the library.
- Enter starts. The mic permission prompt appears only after the click.
- If the browser lacks Web Speech (not Chrome), disable "Start listening" with a one-line explanation and keep the other two paths.

### 9.2 Live session console (`/session/[id]`)
Three zones: 48px top bar, centred transcript column (max 720px), 320px flag rail on the right.
- **Top bar:** session name (left); centre: listening pill (green dot, three-bar level meter, elapsed time in mono, small amber dot when an unseen flag exists); right: Pause, "Open room view", room status indicator (outlined green when something is showing), red Stop.
- **Transcript:** plain paragraphs (no chat bubbles, no speaker labels); new paragraph after ~2s pause. Interim muted → final ink. Auto-scroll pinned to bottom; if the user scrolls up, stop following and show a "Jump to live" pill. Timestamps in a left gutter on hover only. Trigger lines for a flag get a faint amber underline; clicking a flag's quote scrolls to them.
- **Mark a moment:** M (or pin button) marks the last 30 seconds; marked lines get a small pin and feed the next check, which runs right away.
- **Focus mode:** F hides the transcript, leaving the pill and flags.
- **Empty states:** transcript "Listening. Your conversation will appear here." with the level meter; rail "Suggestions appear here when a framework could help." with a quiet "Suggest a framework" button at the rail's foot (always visible).
- **Shortcut bar** (Raycast-style footer, small and muted): shows the current context's actions with keys (Enter, M, F, ⌘K, B, Esc).
- Session state persists to localStorage; reloading the page restores it (mic resumes only on click).

### 9.3 Flag card (the signature element)
In the right rail, newest on top. Feels like a sticky note slid onto the desk, not an alert.
1. Spark + framework name, 15px semibold.
2. One-sentence reason, 14px ink.
3. Evidence quote in muted italics, clickable (scrolls transcript).
4. Fit label in words: "Strong fit" / "Possible fit" (hover reveals one line on what the model looked for).
5. Actions: primary **Open board**, secondary **Not now**, overflow menu "Don't suggest this again today".
- Look: `--signal-tint` background, 3px amber left edge, 12px radius, the only shadow on screen.
- Stays until handled. After 10 minutes untouched it collapses into a one-line "Earlier" list at the bottom of the rail.
- If the fill isn't ready, Open board shows "Preparing board…" with a seconds counter, then opens automatically when ready. If fill fails, open the empty framework with ghost labels and a quiet "Re-fill from transcript" action.

### 9.4 Board panel
Takes over the transcript column; the flag rail stays visible. Esc returns to the transcript.
- Excalidraw with most tools hidden (use its UIOptions / zen-like settings; keep select, hand, text, sticky/rectangle, arrow, eraser). Zoom to fit the framework on open.
- The framework is a titled **frame** holding the structure, drawn in ink at ~1.5px.
- **AI items are provisional:** amber-tinted background, amber dashed outline, small spark marker (e.g. a "✦" prefix or a tiny adjacent element). When the facilitator edits, moves or accepts one, it becomes a **solid neutral sticky** (white/paper fill, ink stroke, solid). Detect user edits by comparing element versions against those recorded at placement (update the record after your own programmatic changes).
- **Provisional bar** (floating, bottom centre): "Keep all", "Clear AI items", "Re-fill from transcript". Hidden once nothing is provisional.
- **Source:** selecting an AI sticky shows a small popover with the transcript line it came from (hover if feasible).
- **⌘K or "/"**: command menu listing every framework (built-in and custom) to open one without waiting for a flag; it pre-fills from the transcript.
- **Send to room** button top right (M8).
- Board switcher listing this session's boards (M9).

### 9.5 Room view (`/room`, opened with `window.open`)
- Calm holding screen: session name and a small listening pill.
- Shows a board only after "Send to room"; **accepted items only**, provisional ones hidden. Follows the facilitator's pan and zoom (FigJam-Spotlight style).
- B blanks the room view (from the console). Room mode adds an optional live caption band at the bottom (toggle with J).
- Light by default; "dim room" toggle.

---

## 10. Sample workshop (scripted demo)

Fictional client, original text. Replay at ~150 words per minute, emitting interim words then finalising each sentence, with a speed control (1×, 1.5×, 3×) visible only in sample mode. With the demo pacing profile, flags should fire at roughly the marked points. Calibrate so the **first flag lands within ~60 seconds**.

```
[00:00] Okay, thanks everyone for making the time. The goal today is simple: we've got a long list of AI ideas for Harbourline and we need to leave this room with three we actually pursue this quarter. Let me read back what we collected. Automatic summaries at the top of every article. Auto-tagging the archive so search actually works. A personalised morning newsletter. A model that predicts who's about to cancel their subscription. Audio versions of every article. And a chatbot that answers reader questions from the archive.

[00:30] Honestly, the summaries feel like the highest value to me, readers keep asking for them. The chatbot sounds great, but I think it's really hard, our archive data is a mess before 2015. Tagging is boring but it's easy, we could do it in a few weeks. The cancellation model is hugely valuable for the commercial team, but I'm not sure we have the data to make it feasible.
                                                       → FLAG 1: value vs feasibility (~0:45–0:60)

[01:00] Can I raise something before we rank these? None of this goes anywhere without the right people. Priya, our CTO, has to sign off anything that touches the platform, and she's stretched. The newsroom editors are nervous, some of them think summaries will cheapen the journalism, and they're quite vocal. Legal will want to review anything customer-facing. The commercial director is the opposite, she's desperate for the cancellation model and will champion it. And then there's the board, they barely know this project exists, but they control next year's budget.

[01:40] So we need a plan for who we bring in early and who we just keep updated. The union reps are interested but have no real veto. Our freelance network will hear about it eventually.
                                                       → FLAG 2: stakeholder map (~1:45–2:00)

[02:10] Okay, let's pick up audio articles, because that one has a decision attached. We could build our own text-to-speech pipeline, the dev team reckons three months. Or we buy an off-the-shelf voice service, we'd be live in two weeks, but it's about forty thousand a year and we don't control the voices. Or we partner with the podcast network we already work with, they'd produce it and share the ad revenue. Building gives us control and keeps the IP. Buying is fastest. Partnering is cheapest up front, but we'd be tied to them.

[02:50] My worry with building is we don't have audio engineers. My worry with buying is the cost scales with every article.
                                                       → FLAG 3: build, buy or partner (~2:55–3:10)

[03:10] Right, let's capture where we've landed and then take a ten-minute break.
```

### Canned mock fills for the sample

**Value vs feasibility** (x = feasibility, y = value, 1–5):
Article summaries (y5, x4) · Archive auto-tagging (y3, x5) · Personalised newsletter (y4, x3) · Cancellation prediction (y5, x2) · Audio articles (y3, x3) · Archive chatbot (y4, x1).

**Stakeholder map** (x = interest, y = power):
Priya, CTO — sign-off (y5, x4) · Commercial director — champion (y4, x5) · Newsroom editors — sceptical (y3, x5) · Legal — reviews customer-facing (y4, x2) · The board — controls budget (y5, x1) · Union reps — no veto (y1, x4) · Freelance network (y1, x1).

**Build, buy or partner:**
| | Build | Buy | Partner |
|---|---|---|---|
| Cost | Dev team time | ~£40k a year, scales per article | Cheapest up front, shared ad revenue |
| Speed | ~3 months | Live in 2 weeks | Depends on partner |
| Control & IP | Full control, keeps IP | No control of voices | Tied to partner |
| Risk | No audio engineers | Cost scales | Dependency |

Each canned item's `sourceQuote` is the matching line from the script.

---

## 11. Milestones

Phase A = night-one core loop (must finish). Phase B = night two. Phase C = night three. Keep going through all of them if time allows.

### Phase A — the core loop

**M0 — Bootstrap and model smoke test**
- `create-next-app` (TS, App Router, Tailwind, ESLint, `src/`), git init, `.gitignore` (include `.env.local`, `overnight.log`, `last-run.log`, `qa/screenshots/` optional), `.env.example`, scripts in §3, Vitest + Playwright set up, `PROGRESS.md` and `DECISIONS.md` created.
- `lib/brain/client.ts`, `/api/health`, `scripts/test-model.ts`.
- **Done when:** `npm run build` passes; `npx tsx scripts/test-model.ts` prints a model reply (or a clear "mock mode: no key" line); `/api/health` returns JSON. Record in PROGRESS.md whether the live model works.

**M1 — Design system and app shell**
- Tokens, fonts, Tailwind mapping, shadcn components restyled, theme toggle, Spark icon, panel layout, shortcut bar skeleton, `/styleguide` page showing buttons, flag card (static), pill, chips in light and dark.
- **Done when:** screenshots of `/styleguide` in both themes match §8 (check amber appears only on AI elements, one shadow, generous spacing).

**M2 — Framework library and renderers**
- `FrameworkTemplate` types + zod, all 10 templates (§7), four layout renderers producing Excalidraw skeleton elements via `convertToExcalidrawElements`, ghost labels for empty slots, `/library` page previewing each.
- Unit tests: each renderer produces non-overlapping stickies for a 12-item fill; empty fill renders ghost labels.
- **Done when:** all 10 render cleanly empty and with sample fills; tests pass; screenshots reviewed.

**M3 — Board**
- Excalidraw embed (client-only), open framework by ID, provisional styling via `customData`, accept-on-edit, provisional bar (Keep all / Clear AI / Re-fill), source popover on selection, ⌘K and "/" framework menu, Esc back, zoom-to-fit, staggered appearance, boards saved to localStorage.
- **Done when:** from `/library` you can open a board with canned fills, drag/edit a sticky (it turns solid), Keep all and Clear AI work, reload keeps the board.

**M4 — Transcript sources and live transcript UI**
- `TranscriptSource` interface with `mic`, `paste`, `sample` implementations (stub `bot` for M13).
- Mic: `continuous = true`, `interimResults = true`, `lang = 'en-GB'` (configurable), auto-restart on `end`/`error` while session is live, paragraph break after ~2s silence. Level meter via `getUserMedia` + `AnalyserNode`. Microphone picker via `enumerateDevices` (note: Web Speech uses the system default mic; show a one-line hint if the picked device differs).
- Start card (§9.1), session route, transcript view behaviours (§9.2), Mark moment, Focus mode, Pause/Stop, session persistence.
- **Done when:** sample replay streams with interim→final fade; paste works; in Chrome the mic produces live text (if the agent can't test the mic headlessly, ensure code paths are covered by unit tests and log it for morning manual check).

**M5 — Brain**
- `/api/check`, `/api/fill`, prompts, zod schemas, defensive fallback (§6.1), evidence check, mock engine with canned sample fills, scheduler with both pacing profiles, manual "Suggest a framework".
- Unit tests: scheduler pacing rules, evidence matching, mock detection on the sample script fires value-feasibility → stakeholder-map → build-buy-partner in that order.
- **Done when:** with `MOCK_MODE=1` the sample triggers three suggestions at sensible times; with the live key a check and a fill return valid JSON.

**M6 — Flag rail**
- Flag card per §9.3, arrival animation, amber dot on the pill, Not now, mute for today, Earlier collapse after 10 minutes, amber underline + quote click-to-scroll, Preparing board timer, fill kicked off at flag creation, Open board.
- **Done when:** the full loop works in mock mode: sample → flag → Open board → pre-filled matrix → edit.

**M7 — End-to-end hardening and prompt tuning** → tag `v0.1-night1`
- Playwright e2e (mock mode): sample path reaches an opened, pre-filled board; paste path creates at least one flag; reload restores session.
- With the live key: `npm run eval` until ≥ 8/10 (time-boxed); run the sample in live mode and confirm 2–3 sensible flags; record latencies.
- Screenshot QA pass on start, console (empty and busy), flag card, board, both themes.
- Write `README.md` (run instructions, mock vs live) and a first `DEMO.md`.
- **Done when:** all four demo paths in §1 that don't need the room view work; tag created.

### Phase B — room, polish, sharing

**M8 — Room view**
- `/room` window, BroadcastChannel bridge (`board`, `viewport`, `blank`, `hold`, `captions` messages), holding screen, Send to room (accepted items only), follow pan/zoom, B to blank, J for captions band in Room mode, dim-room toggle, room status indicator in console top bar. If the room window is opened after a send, it requests current state on load.
- **Done when:** e2e opens console + room page, sends a board, and the room page shows only accepted elements.

**M9 — Whiteboard and console polish**
- Board switcher, session summary panel (boards created, flags handled), improved overlap packing, better ghost labels, "Re-fill from transcript" merge behaviour (adds new AI items, never deletes accepted ones), reduced-motion check, keyboard focus states, empty/error states everywhere.
- **Done when:** screenshot QA shows no layout bugs at 1280×800 and 1728×1117.

**M10 — Sharing basics**
- Export board as PNG (Excalidraw `exportToBlob`) and `.excalidraw` JSON; "Copy share link" that compresses accepted elements with lz-string into `/view#…` (read-only Excalidraw); "Copy session notes" as Markdown (session name, date, boards with their items, marked moments).
- **Done when:** a copied link opened in a fresh tab shows the board read-only.

**M11 — Custom frameworks** → tag `v0.2-night2`
- §7.3 form on `/library`, JSON import/export, custom frameworks appear in checks, ⌘K and the start-screen chips.
- **Done when:** a custom 2×2 created in the form can be suggested (manual check) and opened pre-filled.

### Phase C — hardening and virtual sessions

**M12 — Demo hardening**
- Error boundaries; API failure → silent fallback to mock with in-window status; cap transcript window sizes; long-session performance (2-hour transcript doesn't lag: virtualise or chunk rendering if needed); first-run polish of "Try a sample workshop"; accessibility pass (labels, contrast, focus order); final `DEMO.md` with a 2-minute script and a 30-second fallback script (paste path).
- **Done when:** full e2e suite green; final screenshot pass reviewed.

**M13 — Google Meet bot (feature-flagged, isolated)** → tag `v0.3-night3`
- Goal: a virtual-session transcript source so the same flags/boards work for online workshops.
- Research current options first (fetch official docs; do not rely on memory): a hosted meeting-bot API with pay-as-you-go pricing such as Recall.ai, or an open-source self-hosted bot such as Attendee or Vexa. Prefer whichever can be built and at least partly tested tonight without an account; log the choice and costs in `DECISIONS.md`.
- Implement the `bot` `TranscriptSource` behind `ENABLE_MEET_BOT=1`: a "Join a call" input on the start card (paste a Meet link), the bot adapter, and transcript events flowing into the existing pipeline. If it needs a webhook or public URL, document the tunnel setup rather than building infrastructure.
- Write `MEET_BOT_SETUP.md`: what account/key is needed, cost, steps to enable, and what's untested.
- **Must not affect** any other path when the flag is off. If blocked, ship the interface + UI behind the flag with clear setup docs.

When M13 is done (or consciously skipped with reasons), write `STATUS: ALL_DONE` at the top of `PROGRESS.md`.

---

## 12. Progress, decisions and morning handover

### `PROGRESS.md` format
```
STATUS: IN_PROGRESS          (or ALL_DONE)
Last updated: <time>
Model: live | mock (why)

| Milestone | Status | Notes |
| M0 | DONE | ... |
| M1 | IN_PROGRESS | next step: ... |
...

## Next action
<exact next step for a fresh session>

## Blocked / fallbacks
- ...

## Needs Yosef's eyes in the morning
- e.g. live mic test in Chrome, eval results, anything uncertain
```

### `DECISIONS.md`
One line per decision: `- [M3] Used Zustand for board store — simpler selectors.`

### Morning deliverables
- `README.md`: how to run (`npm install`, `npm run dev`), mock vs live mode, env vars.
- `DEMO.md`: the Thursday walkthrough, keyboard shortcuts, and fallbacks if the mic or API fails.
- `PROGRESS.md` and `DECISIONS.md` up to date.
- `qa/screenshots/` with the latest screenshots.

---

## 13. Appendix

### `.env.example`
```
MODEL_API_KEY=
MODEL_BASE_URL=https://api.meta.ai/v1
MODEL_ID=muse-spark-1.1
MOCK_MODE=0
ENABLE_MEET_BOT=0
```

### Kickoff prompt (used by `run-overnight.sh` for every run)
```
You are building "Consultant in a Computer" unattended overnight.
Read BUILD_PLAN.md in full, then PROGRESS.md and DECISIONS.md if they exist.
Continue from the first milestone not marked DONE, following the operating
rules in section 2 exactly. Never ask questions; decide and log. Commit after
each milestone. Keep PROGRESS.md current so the next run can resume. If every
milestone is done or consciously skipped, write "STATUS: ALL_DONE" at the top
of PROGRESS.md and stop.
```
