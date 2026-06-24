import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { loadRuntimeConfig } from '@/lib/runtimeConfig'

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        registration.update();
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      window.location.reload();
    },
  });
}

async function bootstrap() {
  // Mark standalone PWA so safe-top padding applies on Android + iOS
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) {
    document.documentElement.classList.add('pwa-standalone');
  }

  await loadRuntimeConfig()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
