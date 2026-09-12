# TeacherAid — demo build

The live opener from a TeacherAid class, as a web app the audience opens by QR.
Built for Startup Weekend Bitola, 11–13 September 2026.

- `/host` — projector screen: QR, joined counter, live vote bars, reveal with reasons,
  mini leaderboard, class summary. Keys: **Space** next · **N** next question ·
  **R** reset · **S** simulation (fake students, no network) · **F** fullscreen.
  Query: `?sim=1` start in simulation, `?reset=1` reset on load, `?motion=0` no entrance
  animations, `?key=` host key (default `bitola`, or `HOST_KEY`).
- `/j/BITOLA` — the phone: auto nickname → Join → vote → one-line reason → result → rank.
- `/print` — A4 QR sheet.

Content (questions, class, topic, app name) lives in `content/opener.json`.

## Run

```bash
pnpm install
pnpm dev
```

Without Upstash credentials the session lives in the dev server's memory — enough for
rehearsal. In production set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
(or the `KV_REST_API_*` pair the Vercel marketplace injects).

## Stack

Next.js 16 (App Router) · Tailwind 4 · Upstash Redis · GSAP for the reveal · polling, not
sockets, on purpose. Design context in `.impeccable.md`.
