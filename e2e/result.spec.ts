import { test, expect } from './fixtures';
import { advance, startMatch } from './helpers';

test('result screen shows match details and persists after reload', async ({ page }) => {
  await startMatch(page);
  await advance(page, 120_000);
  await expect(page.getByRole('heading', { name: 'Match complete' })).toBeVisible();
  await expect(page.getByText(/Score:/)).toBeVisible();
  await expect(page.getByText(/Time played:/)).toBeVisible();
  await expect(page.getByText(/Record status:/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
});
