import { test, expect } from './fixtures';
import { openCaptainsLog, setScenario } from './helpers';

test('ranking and history show pagination and edge disabled states', async ({ page }) => {
  await openCaptainsLog(page);
  await expect(page.getByRole('heading', { name: "Captain's Log" })).toBeVisible();
  await expect(page.getByText(/PAGE 1 OF/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await page.getByRole('tab', { name: 'Match History' }).click();
  await expect(page.getByText('No completed matches yet.')).toBeVisible();
});

test('error state provides an accessible retry action', async ({ page }) => {
  await setScenario(page, 'ranking-fails');
  await openCaptainsLog(page);
  await expect(page.getByRole('alert')).toContainText('Unable to load records');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
