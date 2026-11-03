# Decisions
- [M0] Scaffolded with create-next-app (Next 16.4, React 19.3, Tailwind 4) in a temp dir and copied in, because the project folder was not empty.
- [M0] Disabled Next 16's `cacheComponents`/`partialPrefetching` defaults — the app is client-heavy and local; avoids GET handlers that read env being prerendered at build.
- [M0] @types/node bumped to ^24 to satisfy vitest 5 peer deps.
- [M0] shadcn initialised with the radix base (`radix-nova` style); components restyled to tokens in M1.
- [M0] Model client: openai SDK with maxRetries 0 and our own retry policy (one transient retry after 2s, one 400 → plain-JSON retry), plus a small circuit breaker (3 failures → mock for 60s).
- [M0] .env.local has MODEL_ID=muse-spark-1.3 (newer than plan's 1.1); used as-is.
- [M0] CLI scripts load .env.local with a tiny loader (scripts/load-env.ts) rather than adding dotenv.
