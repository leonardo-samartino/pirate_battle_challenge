import { test as base } from '@playwright/test';
import { gotoGame } from './helpers';

export const test = base.extend({
  page: async ({ page }, use) => {
    await gotoGame(page, { scenario: 'success', latency: 'off' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.getByRole('button', { name: 'Play' }).waitFor();
    // Playwright's fixture callback is not a React hook.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from '@playwright/test';
