import { useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [showFallbackHint, setShowFallbackHint] = useState(false);

  useEffect(() => {
    // 1. Determine if already in standalone mode
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };

    checkStandalone();

    // 2. Check if iOS
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    // 3. Check if we already captured the deferred prompt on the window object
    if (window.deferredPrompt) {
      setInstallPrompt(window.deferredPrompt);
    }

    const onInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.deferredPrompt = e as BeforeInstallPromptEvent;
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const onCustomPromptAvailable = (e: Event) => {
      const customEvent = e as CustomEvent<BeforeInstallPromptEvent>;
      if (customEvent.detail) {
        setInstallPrompt(customEvent.detail);
      }
    };

    // 4. Reset states when app is installed successfully
    const onAppInstalled = () => {
      window.deferredPrompt = null;
      setInstallPrompt(null);
      setIsStandalone(true);
      console.log("Wishtenter PWA installed successfully!");
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("pwa-prompt-available", onCustomPromptAvailable);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("pwa-prompt-available", onCustomPromptAvailable);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canInstall = !isStandalone && Boolean(installPrompt || isIOS);

  const install = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") {
          window.deferredPrompt = null;
          setInstallPrompt(null);
        }
      } catch (err) {
        console.error("PWA install prompt error:", err);
      }
      return;
    }
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }
    setShowFallbackHint(true);
  };

  return {
    canInstall,
    isStandalone,
    isIOS,
    showIOSHint,
    setShowIOSHint,
    showFallbackHint,
    setShowFallbackHint,
    install,
    hasNativePrompt: Boolean(installPrompt),
  };
}
