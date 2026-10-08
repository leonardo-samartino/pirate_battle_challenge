import { test, expect } from './fixtures';
import { setOptions } from './helpers';

test('options validate and persist after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByLabel('Game session time').fill('1');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await setOptions(page, { sessionSeconds: 120, spawnSeconds: 3 });
  await page.reload();
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByLabel('Enemy spawn time')).toHaveValue('3');
});
