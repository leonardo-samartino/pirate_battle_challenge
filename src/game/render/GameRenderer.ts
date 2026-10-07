import {
  Container,
  Graphics,
  Sprite,
  Texture,
  type Application,
} from 'pixi.js';
import type { GameConfig } from '../config';
import type { Enemy, MatchState, PlayerShip, Projectile, SimEvent, Vector2 } from '../sim/types';
import type { AssetName } from './assetManifest';
import type { LoadedAssets } from './AssetLoader';

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
  private readonly effectViews: EffectView[] = [];
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
    this.projectileViews.forEach((sprite) => sprite.destroy());
    this.effectViews.forEach((effect) => effect.sprite.destroy());
    this.world.destroy({ children: true });
    this.shipViews.clear();
    this.projectileViews.clear();
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
    while (this.islands.children.length < state.islands.length) {
      const sprite = new Sprite(this.texture('island'));
      sprite.anchor.set(0.5);
      this.islands.addChild(sprite);
    }
    state.islands.forEach((island, index) => {
      const sprite = this.islands.children[index] as Sprite;
      sprite.position.set(island.position.x, island.position.y);
      sprite.width = island.radius * 2;
      sprite.height = island.radius * 2;
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
    view.sprite.rotation = ship.rotation;
    view.sprite.width = ship.radius * 2.5;
    view.sprite.height = ship.radius * 2.5;
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
  }

  private applyEvents(events: readonly SimEvent[]): void {
    events.forEach((event) => {
      if (event.type === 'shotFired') this.addEffect(event.projectile.position, 'muzzle', 0.12, event.projectile.direction);
      if (event.type === 'hit') this.addEffect(event.position, 'smoke', 0.2);
      if (event.type === 'shipDestroyed') this.addEffect(event.position, 'explosion', 0.5);
    });
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
