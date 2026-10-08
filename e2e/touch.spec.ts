import { test, expect } from './fixtures';
import { startMatch } from './helpers';

test.describe('touch controls', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    void page;
    test.skip(testInfo.project.name !== 'chromium-mobile', 'Touch coverage runs on mobile only.');
  });

  test('touch buttons hold movement and firing concurrently and show portrait guidance', async ({ page }) => {
    await startMatch(page);
    const forward = page.getByRole('button', { name: 'Forward' });
    const fire = page.getByRole('button', { name: 'Fire front' });
    const before = await page.evaluate(() => window.__PIRATE_E2E__?.getState());
    await forward.dispatchEvent('pointerdown', { pointerId: 11, pointerType: 'touch', isPrimary: true });
    await fire.dispatchEvent('pointerdown', { pointerId: 12, pointerType: 'touch', isPrimary: false });
    await page.evaluate(() => window.__PIRATE_E2E__?.advance(500));
    const during = await page.evaluate(() => window.__PIRATE_E2E__?.getState());
    expect(during?.player.position).not.toEqual(before?.player.position);
    expect(during?.projectiles.count).toBeGreaterThan(0);
    await forward.dispatchEvent('pointerup', { pointerId: 11, pointerType: 'touch', isPrimary: true });
    await fire.dispatchEvent('pointerup', { pointerId: 12, pointerType: 'touch', isPrimary: false });
    await expect(page.getByRole('button', { name: 'Fire front' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText('Rotate your device to landscape.')).toBeVisible();
  });
});
