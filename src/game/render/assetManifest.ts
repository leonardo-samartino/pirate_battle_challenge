export const ASSET_MANIFEST = {
  // tile_73 is the blue wave tile; tile_17 is a sand/grass terrain tile used for islands.
  water: '/assets/png/default/tiles/tile_73.png',
  island: '/assets/png/default/tiles/tile_17.png',
  // The ship variants are intentionally paired so damage is visible without changing entity size.
  playerShip: '/assets/png/default/ships/ship_1.png',
  playerShipDamaged: '/assets/png/default/ships/ship_2.png',
  chaserShip: '/assets/png/default/ships/ship_3.png',
  chaserShipDamaged: '/assets/png/default/ships/ship_4.png',
  shooterShip: '/assets/png/default/ships/ship_5.png',
  shooterShipDamaged: '/assets/png/default/ships/ship_6.png',
  // These are the repository's cannonball and fire/explosion feedback sprites.
  cannonball: '/assets/png/default/ship_parts/cannon_ball.png',
  muzzle: '/assets/png/default/effects/fire_1.png',
  explosion: '/assets/png/default/effects/explosion_1.png',
  smoke: '/assets/png/default/effects/explosion_2.png',
  playerHealthFrame: '/assets/png/default/ui/hud/health_frame.png',
  playerHealthGreen: '/assets/png/default/ui/hud/health_fill_green.png',
  enemyHealthFrame: '/assets/png/default/ui/hud/enemy_health_frame.png',
  enemyHealthGreen: '/assets/png/default/ui/hud/enemy_health_fill_green.png',
  enemyHealthRed: '/assets/png/default/ui/hud/enemy_health_fill_red.png',
} as const;

export type AssetName = keyof typeof ASSET_MANIFEST;
