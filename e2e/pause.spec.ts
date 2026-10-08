import { test, expect } from './fixtures';
import { advance, getState, startMatch } from './helpers';

test('Escape and pause button freeze the simulation until resume', async ({ page }) => {
  await startMatch(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Game paused' })).toBeVisible();
  const paused = await getState(page);
  await advance(page, 5000);
  expect(await getState(page)).toEqual(paused);
  await page.getByRole('button', { name: 'Resume' }).click();
  await advance(page, 1000);
  expect((await getState(page))?.elapsedSeconds).toBeGreaterThan(paused?.elapsedSeconds ?? 0);
});

test('blur pauses the game', async ({ page }) => {
  await startMatch(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'Game paused' })).toBeVisible();
});
