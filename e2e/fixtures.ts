import { test as base, expect } from '@playwright/test';
import { gotoGame } from './helpers';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    page.on('console', (message) => {
      if (message.type() === 'error'
        && !message.text().includes('request')
        && !message.text().includes('Failed to load resource')
        && !message.text().includes('503 (Service Unavailable)')) consoleErrors.push(message.text());
    });
    await gotoGame(page, { scenario: 'success', latency: 'off', clock: 'manual' });
    if (testInfo.title.includes('asset loading failure')) {
      await page.evaluate(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      });
      await page.addInitScript(() => {
        navigator.serviceWorker.register = async () => {
          throw new Error('Service worker disabled for asset failure test.');
        };
      });
      const client = await page.context().newCDPSession(page);
      await client.send('Network.clearBrowserCache');
      await page.route('**/*.png', (route) => route.abort());
      await page.reload();
    }
    if (!testInfo.title.includes('asset loading failure')) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      await page.getByRole('button', { name: 'Play' }).waitFor();
    }
    // Playwright's fixture callback is not a React hook.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
    expect(pageErrors, pageErrors.map((error) => error.message).join('\n')).toHaveLength(0);
    expect(consoleErrors, consoleErrors.join('\n')).toHaveLength(0);
  },
});

export { expect } from '@playwright/test';
