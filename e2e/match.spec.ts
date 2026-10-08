import { test, expect } from './fixtures';
import { advance, getState, startMatch } from './helpers';

test('match ends at the configured duration and freezes', async ({ page }) => {
  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByLabel('Game session time').fill('60');
  await page.getByRole('button', { name: 'Save' }).click();
  await startMatch(page);
  await advance(page, 60_000);
  await expect(page.getByRole('heading', { name: 'Match complete' })).toBeVisible();
  const ended = await getState(page);
  await advance(page, 10_000);
  expect(await getState(page)).toEqual(ended);
});

test('Play Again starts with a fresh match state', async ({ page }) => {
  await startMatch(page);
  await advance(page, 120_000);
  await expect(page.getByRole('heading', { name: 'Match complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Play Again' }).click();
  await expect.poll(async () => (await getState(page))?.status).toBe('running');
  const state = await getState(page);
  expect(state?.status).toBe('running');
  expect(state?.score).toBe(0);
  expect(state?.elapsedSeconds).toBe(0);
});
