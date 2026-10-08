import { test, expect } from './fixtures';
import { advance, getHud, getState, startMatch } from './helpers';

test.describe('combat', () => {
  test('front and side controls produce the expected projectiles and cooldowns', async ({ page }) => {
    await startMatch(page);
    await page.keyboard.down('Space');
    await advance(page, 20);
    await page.keyboard.up('Space');
    const front = await getState(page);
    expect(front?.projectiles.count).toBe(1);
    await page.keyboard.down('Q');
    await advance(page, 20);
    await page.keyboard.up('Q');
    const left = await getState(page);
    expect(left?.projectiles.count).toBeGreaterThanOrEqual(3);
    await page.keyboard.down('E');
    await advance(page, 20);
    await page.keyboard.up('E');
    const right = await getState(page);
    expect(right?.projectiles.count).toBeGreaterThanOrEqual(3);
    expect(right?.player.cooldowns).toBeDefined();
  });

  test('shots do not change HUD score without a confirmed kill', async ({ page }) => {
    await startMatch(page);
    const before = await getHud(page);
    await page.keyboard.down('Space');
    await advance(page, 100);
    await page.keyboard.up('Space');
    const after = await getHud(page) as { score: number; playerHealth: number };
    expect(after.score).toBe((before as { score: number }).score);
    expect(after.playerHealth).toBe((before as { playerHealth: number }).playerHealth);
  });
});
