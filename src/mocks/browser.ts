import { setupWorker } from 'msw/browser';
import { configureFromUrl } from './scenarios';
import { handlers } from './handlers';

const worker = setupWorker(...handlers);

declare global {
  interface Window {
    __mswWorker?: typeof worker;
  }
}

export async function startMocks(): Promise<void> {
  configureFromUrl();
  if (import.meta.env.VITE_MSW_ENABLED === 'false') return;
  if (import.meta.env.DEV) {
    window.__mswWorker = worker;
  }
  try {
    await worker.start({
      serviceWorker: { url: '/mockServiceWorker.js' },
      onUnhandledFrame: 'warn',
    });
  } catch (error) {
    console.warn('MSW could not start; continuing without request interception.', error);
  }
}
