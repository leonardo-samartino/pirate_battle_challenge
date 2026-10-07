import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startMocks } from './mocks/browser';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { flushOutbox } from './api/outbox';
import { initializeE2EHooks } from './testing/e2eHooks';

initializeE2EHooks();
void startMocks().then(() => flushOutbox(queryClient)).finally(() => {
  window.addEventListener('online', () => { void flushOutbox(queryClient); });
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
    </StrictMode>,
  );
});
