import { test, expect } from './fixtures';
import { advance, getState, openCaptainsLog, setScenario, startMatch } from './helpers';

test('API failures do not block starting another match', async ({ page }) => {
  await setScenario(page, 'http-5xx');
  await startMatch(page);
  expect((await getState(page))?.status).toBe('running');
});

test('timeout-after-save exposes retryable result state without blocking navigation', async ({ page }) => {
  await setScenario(page, 'timeout-after-save');
  await startMatch(page);
  await advance(page, 120_000);
  await expect(page.getByRole('heading', { name: 'Match complete' })).toBeVisible();
  await expect(page.getByText(/Record status:/)).toBeVisible();
  await page.getByRole('button', { name: 'Main Menu' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await openCaptainsLog(page, 'Match History');
  await expect(page.getByRole('heading', { name: "Captain's Log" })).toBeVisible();
});

test('out-of-order scenario keeps paged log usable', async ({ page }) => {
  await setScenario(page, 'out-of-order');
  await openCaptainsLog(page);
  await expect(page.getByText(/PAGE/)).toBeVisible();
});
