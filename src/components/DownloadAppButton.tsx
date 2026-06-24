import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { IOSInstallHint, DesktopInstallHint } from "@/components/IOSInstallHint";

type DownloadAppButtonProps = {
  className?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  label?: string;
  showIcon?: boolean;
  isProminent?: boolean;
};

export default function DownloadAppButton({
  className = "",
  size = "default",
  variant = "outline",
  label = "Download App",
  showIcon = true,
  isProminent = false,
}: DownloadAppButtonProps) {
  const { isStandalone, install, showIOSHint, setShowIOSHint, showFallbackHint, setShowFallbackHint } = usePwaInstall();

  if (isStandalone) return null;

  if (isProminent) {
    return (
      <>
        <div className="relative group inline-block w-full sm:w-auto">
          {/* Subtle glowing animated backdrop */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-yellow rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
          
          <Button
            type="button"
            size={size}
            onClick={install}
            className={`relative w-full sm:w-auto px-8 h-12 text-base font-bold bg-background text-foreground border-2 border-transparent bg-clip-padding rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] gap-2 flex items-center justify-center cursor-pointer ${className}`}
          >
            {/* Gradient border effect */}
            <span className="absolute inset-0 rounded-xl p-[2px] bg-gradient-to-r from-primary to-yellow -z-10 block" />
            
            {showIcon && <Download size={18} className="text-primary group-hover:translate-y-[1px] transition-transform" />}
            <span>{label}</span>
            <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-extrabold tracking-wider uppercase ml-1">
              PWA
            </span>
          </Button>
        </div>
        <IOSInstallHint open={showIOSHint} onClose={() => setShowIOSHint(false)} />
        <DesktopInstallHint open={showFallbackHint} onClose={() => setShowFallbackHint(false)} />
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={install}
        className={`gap-2 font-semibold cursor-pointer ${className}`}
      >
        {showIcon && <Download size={18} />}
        {label}
      </Button>
      <IOSInstallHint open={showIOSHint} onClose={() => setShowIOSHint(false)} />
      <DesktopInstallHint open={showFallbackHint} onClose={() => setShowFallbackHint(false)} />
    </>
  );
}
