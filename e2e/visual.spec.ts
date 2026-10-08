import { test, expect } from './fixtures';
import { advance, startMatch } from './helpers';

test('main menu visual baseline', async ({ page }) => {
  await expect(page.locator('main')).toHaveScreenshot('main-menu.png');
});

test('stable arena visual baseline', async ({ page }) => {
  await page.goto('/?e2e=1&seed=1&clock=manual&scenario=success&latency=off');
  await page.getByRole('button', { name: 'Play' }).waitFor();
  await startMatch(page);
  await advance(page, 1000);
  await expect(page.locator('.game-shell')).toHaveScreenshot('arena-stable.png');
});

test('result visual baseline', async ({ page }) => {
  await startMatch(page);
  await advance(page, 120_000);
  await expect(page.locator('.result-panel')).toHaveScreenshot('result.png');
});
