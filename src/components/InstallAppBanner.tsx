import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { IOSInstallHint } from "@/components/IOSInstallHint";

const DISMISS_KEY = "wishtenter-pwa-dismissed";

export default function InstallAppBanner() {
  const { canInstall, isStandalone, install, showIOSHint, setShowIOSHint } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  if (dismissed || isStandalone || !canInstall) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    await install();
    dismiss();
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-lg rounded-2xl border border-border bg-card p-4 shadow-xl sm:left-auto sm:right-6 safe-bottom mb-[env(safe-area-inset-bottom)]">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm">Install Wishtenter App</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Add to your home screen for quick access to wishlists and gifts.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleInstall} className="h-8 text-xs font-semibold gap-1.5">
                <Download size={14} />
                Install App
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss} className="h-8 text-xs">
                Not now
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground p-1 shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <IOSInstallHint open={showIOSHint} onClose={() => setShowIOSHint(false)} />
    </>
  );
}
