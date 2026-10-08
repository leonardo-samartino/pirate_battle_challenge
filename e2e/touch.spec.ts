import { test, expect } from './fixtures';
import { startMatch } from './helpers';

test.describe('touch controls', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    void page;
    test.skip(testInfo.project.name !== 'chromium-mobile', 'Touch coverage runs on mobile only.');
  });

  test.fixme('touch buttons hold movement and firing concurrently and show portrait guidance (CDP touch events do not reach the React joystick handler in this Playwright mobile profile)', async ({ page }) => {
    await startMatch(page);
    await page.waitForTimeout(100);
    const forward = page.getByRole('application', { name: 'Movement joystick' });
    const fire = page.getByRole('button', { name: 'Fire front' });
    await expect(forward).toBeVisible();
    const before = await page.evaluate(() => window.__PIRATE_E2E__?.getState());
    const box = await forward.boundingBox();
    if (!box) throw new Error('Movement joystick is not visible.');
    const fireBox = await fire.boundingBox();
    if (!fireBox) throw new Error('Fire button is not visible.');
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { id: 11, x: box.x + box.width / 2, y: box.y + 8 },
        { id: 12, x: fireBox.x + fireBox.width / 2, y: fireBox.y + fireBox.height / 2 },
      ],
    });
    await page.evaluate(() => window.__PIRATE_E2E__?.advance(500));
    const during = await page.evaluate(() => window.__PIRATE_E2E__?.getState());
    expect(during?.player.position).not.toEqual(before?.player.position);
    expect(during?.projectiles.count).toBeGreaterThan(0);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByRole('button', { name: 'Fire front' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText('Rotate your device to landscape.')).toBeVisible();
  });
});
