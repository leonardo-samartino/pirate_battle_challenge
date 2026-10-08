import {
  Container,
  Graphics,
  Sprite,
  Texture,
  type Application,
} from 'pixi.js';
import type { GameConfig } from '../config';
import type { Enemy, MatchState, PlayerShip, SimEvent, Vector2 } from '../sim/types';
import type { AssetName } from './assetManifest';
import type { LoadedAssets } from './AssetLoader';

// Ship art faces down, while simulation rotation zero faces right (+x).
const SHIP_ART_FORWARD_OFFSET = -Math.PI / 2;
const SHIP_ART_WIDTH_SCALE = 2.5;
const SHIP_ART_HEIGHT_SCALE = 4.25;

interface ShipView {
  sprite: Sprite;
  healthBackground: Graphics;
  healthFill: Graphics;
  damaged: boolean;
}

interface EffectView {
  sprite: Sprite;
  remainingSeconds: number;
}

interface IslandView {
  sprite: Sprite;
  mask: Graphics;
}

interface TrailView {
  graphics: Graphics;
}

const SOUND_ASSETS = {
  shot: '/assets/sounds/cannon_fire_1.wav',
  hit: '/assets/sounds/ship_wood_hit_1.wav',
  explosion: '/assets/sounds/ship_explosion_1.wav',
} as const;

export class GameRenderer {
  private readonly app: Application;
  private readonly config: GameConfig;
  private readonly assets: LoadedAssets;
  private readonly world = new Container();
  private readonly water = new Container();
  private readonly islands = new Container();
  private readonly projectiles = new Container();
  private readonly ships = new Container();
  private readonly effects = new Container();
  private readonly shipViews = new Map<string, ShipView>();
  private readonly projectileViews = new Map<string, Sprite>();
  private readonly trailViews: TrailView[] = [];
  private readonly effectViews: EffectView[] = [];
  private readonly islandViews: IslandView[] = [];
  private readonly sounds = new Map<keyof typeof SOUND_ASSETS, HTMLAudioElement>();
  private readonly background: Sprite;
  private readonly resizeObserver: ResizeObserver;
  private destroyed = false;

  public constructor(app: Application, config: GameConfig, assets: LoadedAssets, container: HTMLElement) {
    this.app = app;
    this.config = config;
    this.assets = assets;
    this.background = new Sprite(this.texture('water'));
    this.background.anchor.set(0.5);
    this.world.addChild(this.water, this.islands, this.projectiles, this.ships, this.effects);
    this.water.addChild(this.background);
    this.app.stage.addChild(this.world);
    (Object.keys(SOUND_ASSETS) as Array<keyof typeof SOUND_ASSETS>).forEach((name) => {
      this.sounds.set(name, new Audio(SOUND_ASSETS[name]));
    });
    this.resizeObserver = new ResizeObserver(() => this.resize(container.clientWidth, container.clientHeight));
    this.resizeObserver.observe(container);
    this.resize(container.clientWidth, container.clientHeight);
  }

  public render(state: MatchState, events: readonly SimEvent[], deltaSeconds = 1 / 60): void {
    if (this.destroyed) return;
    this.syncBackground();
    this.syncIslands(state);
    this.syncShips(state);
    this.syncProjectiles(state);
    this.applyEvents(events);
    this.updateEffects(deltaSeconds);
  }

  public screenToWorld(screenX: number, screenY: number): Vector2 {
    const bounds = this.app.canvas.getBoundingClientRect();
    return {
      x: (screenX - bounds.left - this.world.x) / this.world.scale.x,
      y: (screenY - bounds.top - this.world.y) / this.world.scale.y,
    };
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0 || this.destroyed) return;
    this.app.renderer.resize(width, height);
    const scale = Math.min(width / this.config.arena.width, height / this.config.arena.height);
    this.world.scale.set(scale);
    this.world.position.set(
      (width - this.config.arena.width * scale) / 2,
      (height - this.config.arena.height * scale) / 2,
    );
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizeObserver.disconnect();
    this.shipViews.forEach((view) => this.destroyShipView(view));
    this.islandViews.forEach(({ sprite, mask }) => {
      sprite.destroy();
      mask.destroy();
    });
    this.projectileViews.forEach((sprite) => sprite.destroy());
    this.trailViews.forEach(({ graphics }) => graphics.destroy());
    this.effectViews.forEach((effect) => effect.sprite.destroy());
    this.sounds.forEach((sound) => {
      sound.pause();
      sound.currentTime = 0;
      sound.src = '';
    });
    this.sounds.clear();
    this.world.destroy({ children: true });
    this.shipViews.clear();
    this.islandViews.length = 0;
    this.projectileViews.clear();
    this.trailViews.length = 0;
    this.effectViews.length = 0;
  }

  private texture(name: AssetName): Texture {
    return this.assets[name];
  }

  private syncBackground(): void {
    this.background.texture = this.texture('water');
    this.background.width = this.config.arena.width;
    this.background.height = this.config.arena.height;
    this.background.position.set(this.config.arena.width / 2, this.config.arena.height / 2);
  }

  private syncIslands(state: MatchState): void {
    while (this.islandViews.length < state.islands.length) {
      const sprite = new Sprite(this.texture('island'));
      const mask = new Graphics();
      sprite.anchor.set(0.5);
      sprite.mask = mask;
      this.islands.addChild(sprite, mask);
      this.islandViews.push({ sprite, mask });
    }
    state.islands.forEach((island, index) => {
      const islandView = this.islandViews[index];
      if (!islandView) return;
      const { sprite, mask } = islandView;
      sprite.position.set(island.position.x, island.position.y);
      sprite.width = island.radius * 2;
      sprite.height = island.radius * 2;
      mask.position.set(island.position.x, island.position.y);
      mask.clear().circle(0, 0, island.radius).fill(0xffffff);
    });
  }

  private syncShips(state: MatchState): void {
    const visible = new Set<string>(['player', ...state.enemies.map((enemy) => enemy.id)]);
    this.shipViews.forEach((view, id) => {
      if (!visible.has(id)) {
        this.destroyShipView(view);
        this.shipViews.delete(id);
      }
    });
    this.syncShip(state.player, true);
    state.enemies.forEach((enemy) => this.syncShip(enemy, false));
  }

  private syncShip(ship: PlayerShip | Enemy, isPlayer: boolean): void {
    const enemy = isPlayer ? undefined : ship as Enemy;
    const damaged = ship.health / ship.maxHealth <= 0.5;
    let view = this.shipViews.get(ship.id);
    if (!view) {
      view = {
        sprite: new Sprite(this.texture(this.shipTextureName(enemy, isPlayer, damaged))),
        healthBackground: new Graphics(),
        healthFill: new Graphics(),
        damaged,
      };
      view.sprite.anchor.set(0.5);
      view.healthBackground.position.set(-ship.radius, -ship.radius - 12);
      view.healthFill.position.set(-ship.radius, -ship.radius - 12);
      this.ships.addChild(view.sprite, view.healthBackground, view.healthFill);
      this.shipViews.set(ship.id, view);
    }
    if (view.damaged !== damaged) {
      view.sprite.texture = this.texture(this.shipTextureName(enemy, isPlayer, damaged));
      view.damaged = damaged;
    }
    view.sprite.position.set(ship.position.x, ship.position.y);
    view.sprite.rotation = ship.rotation + SHIP_ART_FORWARD_OFFSET;
    view.sprite.width = ship.radius * SHIP_ART_WIDTH_SCALE;
    view.sprite.height = ship.radius * SHIP_ART_HEIGHT_SCALE;
    view.healthBackground.clear().roundRect(-ship.radius, 0, ship.radius * 2, 4, 2).fill(0x26100d);
    view.healthFill.clear().roundRect(-ship.radius, 0, ship.radius * 2 * Math.max(0, ship.health / ship.maxHealth), 4, 2).fill(isPlayer ? 0x54d66b : 0xed544c);
    view.healthBackground.position.set(ship.position.x, ship.position.y - ship.radius - 12);
    view.healthFill.position.set(ship.position.x, ship.position.y - ship.radius - 12);
  }

  private shipTextureName(enemy: Enemy | undefined, isPlayer: boolean, damaged: boolean): AssetName {
    if (isPlayer) return damaged ? 'playerShipDamaged' : 'playerShip';
    if (enemy?.type === 'chaser') return damaged ? 'chaserShipDamaged' : 'chaserShip';
    return damaged ? 'shooterShipDamaged' : 'shooterShip';
  }

  private destroyShipView(view: ShipView): void {
    view.sprite.destroy();
    view.healthBackground.destroy();
    view.healthFill.destroy();
  }

  private syncProjectiles(state: MatchState): void {
    const visible = new Set(state.projectiles.map((projectile) => projectile.id));
    this.projectileViews.forEach((sprite, id) => {
      if (!visible.has(id)) {
        sprite.destroy();
        this.projectileViews.delete(id);
      }
    });
    state.projectiles.forEach((projectile) => {
      let sprite = this.projectileViews.get(projectile.id);
      if (!sprite) {
        sprite = new Sprite(this.texture('cannonball'));
        sprite.anchor.set(0.5);
        this.projectiles.addChild(sprite);
        this.projectileViews.set(projectile.id, sprite);
      }
      sprite.position.set(projectile.position.x, projectile.position.y);
      sprite.rotation = Math.atan2(projectile.direction.y, projectile.direction.x);
      sprite.width = projectile.radius * 2;
      sprite.height = projectile.radius * 2;
    });
    while (this.trailViews.length < state.projectiles.length) {
      const graphics = new Graphics();
      this.projectiles.addChildAt(graphics, 0);
      this.trailViews.push({ graphics });
    }
    this.trailViews.forEach(({ graphics }, index) => {
      const projectile = state.projectiles[index];
      if (!projectile) {
        graphics.visible = false;
        return;
      }
      graphics.visible = true;
      const length = Math.min(24, 8 + projectile.distanceTravelled * 0.02);
      const startX = projectile.position.x - projectile.direction.x * length;
      const startY = projectile.position.y - projectile.direction.y * length;
      const middleX = projectile.position.x - projectile.direction.x * length * 0.5;
      const middleY = projectile.position.y - projectile.direction.y * length * 0.5;
      const ageAlpha = Math.max(0.15, 1 - projectile.ageSeconds / this.config.projectile.lifetimeSeconds);
      graphics.clear()
        .moveTo(startX, startY).lineTo(middleX, middleY).stroke({ width: 5, color: 0xffffff, alpha: ageAlpha * 0.2 })
        .moveTo(middleX, middleY).lineTo(projectile.position.x, projectile.position.y).stroke({ width: 3, color: 0xffffff, alpha: ageAlpha * 0.65 });
    });
  }

  private applyEvents(events: readonly SimEvent[]): void {
    events.forEach((event) => {
      if (event.type === 'shotFired') {
        this.addEffect(event.projectile.position, 'muzzle', 0.12, event.projectile.direction);
        this.playSound('shot');
      }
      if (event.type === 'hit') {
        this.addEffect(event.position, 'smoke', 0.2);
        this.playSound('hit');
      }
      if (event.type === 'shipDestroyed') {
        this.addEffect(event.position, 'explosion', 0.5);
        this.playSound('explosion');
      }
    });
  }

  private playSound(name: keyof typeof SOUND_ASSETS): void {
    const sound = this.sounds.get(name);
    if (!sound) return;
    sound.currentTime = 0;
    void sound.play().catch(() => undefined);
  }

  private addEffect(position: Vector2, name: 'muzzle' | 'smoke' | 'explosion', duration: number, directionValue?: Vector2): void {
    const sprite = new Sprite(this.texture(name));
    sprite.anchor.set(0.5);
    sprite.position.set(position.x, position.y);
    if (directionValue) sprite.rotation = Math.atan2(directionValue.y, directionValue.x);
    this.effects.addChild(sprite);
    this.effectViews.push({ sprite, remainingSeconds: duration });
  }

  private updateEffects(deltaSeconds: number): void {
    for (let index = this.effectViews.length - 1; index >= 0; index -= 1) {
      const effect = this.effectViews[index];
      effect.remainingSeconds -= deltaSeconds;
      effect.sprite.alpha = Math.max(0, effect.remainingSeconds / 0.5);
      if (effect.remainingSeconds <= 0) {
        effect.sprite.destroy();
        this.effectViews.splice(index, 1);
      }
    }
  }
}
