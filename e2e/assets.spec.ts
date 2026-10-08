import { test, expect } from './fixtures';

test('asset loading failure is visible and retry can recover', async ({ page }) => {
  await expect(page.getByText(/Loading assets/)).toBeVisible();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.unroute('**/*.png');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
});
