import { test, expect } from './fixtures';
import { advance, getState, gotoGame, holdKey, setOptions, startMatch } from './helpers';

test('main menu exposes keyboard reachable controls', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Play' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Options' })).toBeFocused();
});

test('options validate and persist through reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByLabel('Game session time').fill('10');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await setOptions(page, { sessionSeconds: 120, spawnSeconds: 3 });
  await page.reload();
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByLabel('Game session time')).toHaveValue('120');
  await expect(page.getByLabel('Enemy spawn time')).toHaveValue('3');
});

test('manual clock advances the real simulation and keyboard movement', async ({ page }) => {
  await gotoGame(page, { seed: 1, clock: 'manual', latency: 'off' });
  await startMatch(page);
  const before = await getState(page);
  await holdKey(page, 'ArrowUp', 1000);
  await advance(page, 0);
  const after = await getState(page);
  expect(after.elapsedSeconds).toBeCloseTo(1, 1);
  expect(after.player.position).not.toEqual(before.player.position);
});

test('same seed produces the same state after five seconds', async ({ page }) => {
  const run = async (): Promise<unknown> => {
    await gotoGame(page, { seed: 1, clock: 'manual', latency: 'off' });
    await startMatch(page);
    await advance(page, 5000);
    return getState(page);
  };
  const first = await run();
  await page.reload();
  const second = await run();
  expect(second).toEqual(first);
});
