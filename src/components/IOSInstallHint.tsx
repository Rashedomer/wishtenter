import { Share, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

type IOSInstallHintProps = {
  open: boolean;
  onClose: () => void;
};

export function IOSInstallHint({ open, onClose }: IOSInstallHintProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Share size={18} className="text-primary" />
          <h3 className="font-bold text-foreground">Install on iPhone/iPad</h3>
        </div>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Tap the Share button in Safari</li>
          <li>Select &ldquo;Add to Home Screen&rdquo;</li>
          <li>Tap Add — Wishtenter will open like an app</li>
        </ol>
        <Button onClick={onClose} className="w-full mt-5 h-10 font-semibold">
          Got it
        </Button>
      </div>
    </div>
  );
}

export function DesktopInstallHint({ open, onClose }: IOSInstallHintProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Monitor size={18} className="text-primary" />
          <h3 className="font-bold text-foreground">Install Wishtenter</h3>
        </div>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Open this site in Chrome or Edge</li>
          <li>Click the install icon in the address bar (⊕ or computer icon)</li>
          <li>Or use browser menu → &ldquo;Install Wishtenter&rdquo;</li>
        </ol>
        <Button onClick={onClose} className="w-full mt-5 h-10 font-semibold">
          Got it
        </Button>
      </div>
    </div>
  );
}
