import { test, expect } from './fixtures';
import { advance, getState, holdKey, startMatch } from './helpers';

test.describe('movement', () => {
  test('moves and rotates without leaving the arena', async ({ page }) => {
    await startMatch(page);
    const initial = await getState(page);
    await holdKey(page, 'ArrowUp', 1000);
    await holdKey(page, 'ArrowLeft', 500);
    await holdKey(page, 'ArrowRight', 500);
    await advance(page, 100);
    const state = await getState(page);
    expect(state?.player.position.x).toBeGreaterThanOrEqual(0);
    expect(state?.player.position.y).toBeGreaterThanOrEqual(0);
    expect(state?.player.position.x).toBeLessThanOrEqual(1280);
    expect(state?.player.position.y).toBeLessThanOrEqual(720);
    expect(state?.player.position).not.toEqual(initial?.player.position);
  });
});
