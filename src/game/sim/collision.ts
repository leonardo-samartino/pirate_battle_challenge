import type { Vector2 } from './types';

export function circleCircleIntersects(
  first: Vector2,
  firstRadius: number,
  second: Vector2,
  secondRadius: number,
): boolean {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  const radius = firstRadius + secondRadius;
  return dx * dx + dy * dy <= radius * radius;
}

export function circleIntersectsIsland(
  position: Vector2,
  radius: number,
  island: { position: Vector2; radius: number },
): boolean {
  return circleCircleIntersects(position, radius, island.position, island.radius);
}

export function clampCircleToArena(
  position: Vector2,
  radius: number,
  width: number,
  height: number,
): Vector2 {
  return {
    x: Math.min(Math.max(position.x, radius), width - radius),
    y: Math.min(Math.max(position.y, radius), height - radius),
  };
} 