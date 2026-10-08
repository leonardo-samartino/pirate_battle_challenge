import type { Page } from '@playwright/test';

interface GotoOptions {
  seed?: number;
  scenario?: string;
  latency?: 'off' | 'on';
  clock?: 'manual';
}

export interface E2EState {
  elapsedSeconds: number;
  player: { position: { x: number; y: number } };
  [key: string]: unknown;
}

export async function gotoGame(page: Page, options: GotoOptions = {}): Promise<void> {
  const params = new URLSearchParams({ e2e: '1', scenario: options.scenario ?? 'success', latency: options.latency ?? 'off' });
  if (options.seed !== undefined) params.set('seed', String(options.seed));
  if (options.clock) params.set('clock', options.clock);
  await page.goto(`/?${params.toString()}`);
  await page.getByRole('button', { name: 'Play' }).waitFor();
}

export async function setOptions(page: Page, values: { sessionSeconds: number; spawnSeconds: number }): Promise<void> {
  if (!(await page.getByLabel('Game session time').isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Options' }).click();
  }
  await page.getByLabel('Game session time').fill(String(values.sessionSeconds));
  await page.getByLabel('Enemy spawn time').fill(String(values.spawnSeconds));
  await page.getByRole('button', { name: 'Save' }).click();
}

export async function startMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Play' }).click();
  await page.locator('.game-canvas canvas').waitFor();
}

export async function advance(page: Page, milliseconds: number): Promise<void> {
  await page.evaluate((ms) => window.__PIRATE_E2E__?.advance(ms), milliseconds);
}

export async function getState(page: Page): Promise<E2EState | undefined> {
  return page.evaluate(() => window.__PIRATE_E2E__?.getState());
}

export async function pressKey(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
}

export async function holdKey(page: Page, key: string, milliseconds = 250): Promise<void> {
  await page.keyboard.down(key);
  await advance(page, milliseconds);
  await page.keyboard.up(key);
}

export async function openCaptainsLog(page: Page, tab: 'Ranking' | 'Match History' = 'Ranking'): Promise<void> {
  await page.getByRole('button', { name: "Captain's Log" }).click();
  if (tab !== 'Ranking') await page.getByRole('tab', { name: tab }).click();
}

export async function setScenario(page: Page, scenario: string): Promise<void> {
  await page.locator('details.scenario-panel').evaluate((element) => {
    (element as HTMLDetailsElement).open = true;
  });
  await page.locator('#network-scenario').selectOption(scenario);
}

export async function getHud(page: Page): Promise<unknown> {
  return page.evaluate(() => window.__PIRATE_E2E__?.getHud());
}

export async function holdTouch(page: Page, label: string, milliseconds = 250): Promise<void> {
  const button = page.getByRole('button', { name: label });
  await button.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true });
  await advance(page, milliseconds);
  await button.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', isPrimary: true });
}
