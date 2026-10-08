import { test, expect } from './fixtures';
import { advance, getState, startMatch } from './helpers';

test('default matches spawn both enemy types at the configured interval', async ({ page }) => {
  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByLabel('Enemy spawn time').fill('0.5');
  await page.getByRole('button', { name: 'Save' }).click();
  await startMatch(page);
  await advance(page, 4000);
  const state = await getState(page);
  const types = new Set((state?.enemies ?? []).map((enemy) => enemy.type));
  expect(types.has('chaser')).toBe(true);
  expect(types.has('shooter')).toBe(true);
  expect(state?.spawnCount).toBeGreaterThanOrEqual(2);
});
