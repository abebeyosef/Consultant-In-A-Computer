# Google Meet bot — setup (experimental, off by default)

A virtual-session transcript source: a bot joins a Google Meet call, and its live
transcript flows through the same pipeline as the microphone (flags, boards, room view).
Everything is behind `ENABLE_MEET_BOT=1`; with the flag off, the start card shows no
"Join a call" field and `/api/bot` answers 404.

## Provider choice

| Option | Licence / model | Meet support | Transcript delivery | Cost | Why / why not |
|---|---|---|---|---|---|
| **Vexa** (chosen) | Apache-2.0; hosted (`api.cloud.vexa.ai`) or self-hosted (Docker) | Listed as production-ready | REST polling `GET /transcripts/google_meet/{code}` — **no webhook, no public URL** | Hosted: $2 free credit on sign-up (~6 bot-hours at ~$0.30/h); self-hosted: free + your own STT | Works from a laptop with no tunnel; open source |
| Recall.ai | Hosted, closed | Yes | Webhooks / real-time endpoints (need a public URL for webhooks) | Pay-as-you-go ~$0.50/recording hour (2026 blog; pricing page still shows $0.70) + $0.15/h transcription | Mature, but needs an account and card, and webhooks need a tunnel |
| Attendee | Open source, self-host (Django + Postgres + Redis) | README lists Meet on the roadmap at time of checking | Polling | Free self-hosted; transcription via Deepgram key | Heavier to run; Meet support unclear |

Sources checked on 3 Nov 2026: github.com/Vexa-ai/vexa, docs.vexa.ai/api/meetings.md,
docs.recall.ai/docs/quickstart, recall.ai/blog/new-recall-ai-pricing-for-2026, github.com/attendee-labs/attendee.

## Try it without any account (mock provider)

```bash
ENABLE_MEET_BOT=1 MEET_BOT_PROVIDER=mock npm run dev
```

Start card → paste any Meet link (e.g. `https://meet.google.com/abc-defg-hij`) → **Join a call**.
After ~3 s the "call" starts and the sample workshop arrives as if spoken in the meeting.
This is what the e2e test (`e2e/bot.spec.ts`) exercises.

## Real calls with Vexa (hosted)

1. Sign up at vexa.ai, create an API key (no card needed for the free credit).
2. In `.env.local`:
   ```
   ENABLE_MEET_BOT=1
   MEET_BOT_PROVIDER=vexa
   VEXA_API_KEY=your-key
   VEXA_API_BASE=https://api.cloud.vexa.ai
   ```
3. `npm run dev`, start a Meet, paste its link on the start card, **Join a call**.
4. In Meet, **admit** the bot ("Workshop notes") when it knocks.
5. Text appears within a few seconds of speech; flags and boards work as with the mic.
   **Stop** in the console removes the bot from the call.

Self-hosted Vexa: `git clone https://github.com/Vexa-ai/vexa && make all`, then set
`VEXA_API_BASE=http://localhost:18056` and the printed API key. It needs a transcription
backend (Vexa's free token or your own GPU STT), otherwise bot requests answer 503.

## How it's built

- `src/lib/bot/server.ts` — provider adapter (Vexa REST + in-memory mock). The key stays on the server.
- `src/app/api/bot/route.ts` — `POST` join, `GET` poll, `DELETE` leave (all 404 unless the flag is on).
- `src/lib/transcript/sources/bot.ts` — `BotSource`: polls every 2 s, emits each completed
  segment once (`lib/bot/diff.ts`), shows incomplete ones as interim, new paragraph on a
  speaker change or a 2 s gap. Pause stops reading (the bot stays in the call).
- A reload resumes from the saved position (already-seen segments are skipped; a 409
  "bot already in this call" is treated as success).

## Untested / caveats

- **Not tested against a real Vexa account or a real Meet call** (no account overnight).
  The Vexa request/response shapes follow its published API reference; `normaliseVexa`
  is unit-tested against the documented example.
- Consent: tell participants a bot is transcribing (the start card's consent line applies).
- Google Workspace domains may block external bots or require host admission.
- Vexa's WebSocket stream is not used (its README says it is not live in the open-core
  stack); polling every 2 s adds ~1–3 s of latency.
