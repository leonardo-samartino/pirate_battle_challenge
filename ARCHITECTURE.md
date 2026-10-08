# Architecture

## React, PixiJS, and lifecycle

React owns menus, dialogs, forms, semantic HUD text, screen transitions, and persistence wiring. `GameCanvas` creates Pixi only after assets load, attaches one ticker callback, and destroys the callback, renderer, observer, audio, and Pixi application on cleanup. Cancellation guards make async loading safe under React StrictMode's mount/unmount/mount cycle.

The simulation is framework-independent. `Simulation` snapshots the typed `GameConfig` when a match starts, while `GameRenderer` observes state and drains presentation events. React is not rendered once per frame.

## Simulation, collisions, and balance

Each ticker update is accumulated and stepped at a fixed 1/60 second. Movement, rotation, cooldowns, projectiles, damage, score, enemy AI, spawning, terminal state, arena bounds, and island collisions are implemented in `src/game/sim`. Ships and projectiles use circle collision checks. Islands are fixed at `(280,180,r70)` and `(1000,540,r85)`.

The defaults in `src/game/config.ts` are 120 seconds, 4-second spawns, 1280x720 arena, player health 100, movement 180 units/second, rotation 3.2 radians/second, Chaser/Shooter speeds 85/55, projectile damage 10/8, Chaser collision damage 25, projectile speed/range/lifetime 360/520/2 seconds, front/broadside cooldowns 0.35/0.8 seconds, and Shooter range 420. The player moves only forward by design; there is no reverse control. Options accept 60-180 seconds and 0.5-30-second spawn intervals. The match uses an immutable configuration snapshot.

## Resources and local persistence

`AssetLoader` loads and caches individual textures before combat and reports a visible retryable error. `GameRenderer` reuses entity views and releases display objects, masks, sounds, and observers. Versioned local-storage keys persist options, the player identity, the latest completed result, confirmed records, and pending outbox records. Abandoned matches never enter the result or outbox.

## Ranking, history, cache, and MSW

`src/api/contracts.ts` defines the ranking, history, and match contracts. Axios maps timeout, network, and HTTP failures to typed `ApiError` values. TanStack Query keys include page, page size, player, and configuration; query functions receive AbortSignals, retry only retryable errors, and invalidate ranking/history after a successful submit. MSW uses the same handlers in the browser and Vitest node server. Fixtures are deterministic per configuration and confirmed records are idempotent by `matchId`.

The outbox writes a finished record before submitting it, deduplicates in-flight submissions, retains retryable failures, and flushes on startup, reconnect, and Retry. A successful response removes the record and invalidates both query families, so pending records recover after reload without duplicates.

## Test instrumentation

`?e2e=1` exposes `window.__PIRATE_E2E__`; `?clock=manual` stops real ticker advancement while `advance(ms)` calls the real fixed-step simulation and renders once. `?perf=1` exposes `window.__PIRATE_PERF__`, which records ticker frame times and entity counts in preallocated arrays without affecting normal play.

## Limitations

- `test.fixme` E2E test: `e2e/touch.spec.ts` — `touch controls › touch buttons hold movement and firing concurrently and show portrait guidance` remains fixme because CDP touch events do not reach the React joystick handler in this Playwright mobile profile after an honest pointer-event and CDP multi-touch attempt.
- Islands are fixed rather than procedurally generated.
- Collision geometry is circle-based rather than polygonal.
- Reverse movement is not part of the design.
