# Pirate Battle Architecture

## Boundaries

React owns screen transitions, forms, dialogs, persistence wiring, and semantic HUD text. The simulation in `src/game/sim` owns all continuous match state and rules without importing React or PixiJS. `src/game/input` converts keyboard and pointer gestures into typed commands. `src/game/render` observes simulation state/events and owns Pixi display objects. `src/ui/GameCanvas.tsx` is the lifecycle bridge between React and Pixi.

## Simulation

`Simulation` accumulates capped real time and advances `step` at a fixed 1/60-second timestep. The immutable `GameConfig` snapshot is created when a match starts. `step` handles movement, island and arena collision, weapons, projectiles, enemy behavior, spawning, score, damage, and terminal states. Events are drained by the renderer for effects; the renderer never changes game rules.

## Rendering and cleanup

`AssetLoader` loads and caches the manifest before combat, reports progress, and throws an `AssetLoadError` for visible retry handling. `GameRenderer` reuses maps of ship/projectile views, scales the logical arena uniformly with letterboxing, and destroys its display tree and observers on teardown. `GameCanvas` cancels async initialization, removes the ticker callback, destroys the renderer before the Pixi application, and guards cleanup for React StrictMode mount/unmount/mount.

## Input, pause, and accessibility

Keyboard listeners exist only while the gameplay screen is active. Touch controls merge independent pointer commands, so movement and firing can be simultaneous. Pause clears commands and the simulation accumulator; blur and hidden-tab events pause automatically. `useFocusTrap` is shared by pause, Options, result, and Captain's Log to provide initial focus, keyboard cycling, Escape, opener restoration, and inert background content.

## Persistence and current limits

Options and the last completed result use versioned localStorage keys. `beforeunload` and explicit pause-overlay exits abandon the active simulation without creating a result. Ranking/history network integration, MSW scenarios, and remote record persistence are intentionally not documented as implemented here and remain the next feature task.
