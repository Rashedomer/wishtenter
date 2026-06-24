import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { loadRuntimeConfig } from '@/lib/runtimeConfig'

const SW_RESET_KEY = 'wishtenter-sw-reset-v2';

if (import.meta.env.PROD) {
  if (!localStorage.getItem(SW_RESET_KEY) && 'serviceWorker' in navigator) {
    localStorage.setItem(SW_RESET_KEY, '1');
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister();
    });
  }

  registerSW({
    immediate: false,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        registration.update();
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });
}

async function bootstrap() {
  const root = document.getElementById('root');
  if (!root) {
    document.body.innerHTML = '<p style="padding:24px;font-family:system-ui">Wishtenter failed to start.</p>';
    return;
  }

  // Mark standalone PWA so safe-top padding applies on Android + iOS
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) {
    document.documentElement.classList.add('pwa-standalone');
  }

  try {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (err) {
    console.error('Wishtenter bootstrap error:', err);
    root.innerHTML =
      '<p style="padding:24px;font-family:system-ui;text-align:center">Unable to load Wishtenter. Please check your connection and try again.</p>';
    return;
  }

  void loadRuntimeConfig();
}

bootstrap()
