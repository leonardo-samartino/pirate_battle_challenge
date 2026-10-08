# Pirate Battle

Pirate Battle is a React, TypeScript, PixiJS top-down naval shooter. The game rules run locally; ranking and match history use typed Axios contracts, TanStack Query, and MSW.

## Setup

```bash
npm install
npm run dev
```

The production deployment is https://pirate-battle-challenge-neon.vercel.app.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_MSW_ENABLED` | `true` | Enable the browser MSW worker, including production builds. |
| `VITE_API_BASE_URL` | `/api` | Axios API base URL. |
| `VITE_API_TIMEOUT_MS` | `4000` | Axios request timeout in milliseconds. |

## Controls and gameplay

- `W` / `ArrowUp`: move forward.
- `A` / `ArrowLeft` and `D` / `ArrowRight`: rotate.
- `Space`: front shot.
- `Q` / `E`: left/right broadside.
- Touch controls support movement and firing at the same time.
- `Escape` or the pause button pauses; resuming requires an explicit action.

Gameplay values are centralized in [`src/game/config.ts`](./src/game/config.ts). The current defaults are a 120-second session, a 4-second spawn interval, a 1280x720 arena, 100 player health, 180 units/second movement, 3.2 radians/second rotation, 10 projectile damage, 360 projectile speed, 520 projectile range, 2-second projectile lifetime, 0.35-second front cooldown, 0.8-second broadside cooldown, and a 420-unit Shooter attack range. Options validate session duration from 60 to 180 seconds and spawn interval from 0.5 to 30 seconds.

## Network scenarios

Open **Developer tools** in the main menu to select a scenario and reset it. A scenario can also be selected with `?scenario=<name>`. Use `?latency=off` for deterministic fast requests and `?seed=<number>` for reproducible seeded behavior. The URL scenario takes precedence over local storage. Available scenarios include `success`, `empty`, `multiple-pages`, `slow`, `variable-latency`, `out-of-order`, `timeout`, `network-error`, `http-4xx`, `http-5xx`, `ranking-fails`, `history-fails`, `timeout-after-save`, and `submit-unavailable-then-recovers`.

To reproduce a failure, open the game with the matching query parameter, open Captain's Log or finish a match, and use the visible Retry action. Reset returns the scenario and counters to the initial state. Failing HTTP requests in failure scenarios intentionally print red console lines; this is expected test evidence, not an unhandled application error.

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:report
```

The Playwright suite runs against a production build and stores visual baselines under `e2e/__screenshots__`.
