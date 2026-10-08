import { test, expect } from './fixtures';
import { holdTouch, startMatch } from './helpers';

test.describe('touch controls', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    void page;
    test.skip(testInfo.project.name !== 'chromium-mobile', 'Touch coverage runs on mobile only.');
  });

  test('touch buttons are available and portrait guidance is visible in portrait', async ({ page }) => {
    await startMatch(page);
    await holdTouch(page, 'Forward', 250);
    await expect(page.getByRole('button', { name: 'Fire front' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText('Rotate your device to landscape.')).toBeVisible();
  });
});
