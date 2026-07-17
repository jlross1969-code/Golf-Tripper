import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosVisible, setIosVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Detect iOS Safari (no beforeinstallprompt support)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = (window.navigator as any).standalone === true;
    if (ios && !standalone) {
      setIsIOS(true);
      setIosVisible(true);
      return;
    }

    // Android / Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
    setIosVisible(false);
  };

  // Android install banner
  if (visible && !isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-card border border-primary/40 rounded-xl p-4 shadow-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">⛳</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">Install Golf Trip App</p>
            <p className="text-xs text-muted-foreground">Add to your home screen for quick access</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" onClick={handleInstall} className="gap-1.5 text-xs h-8">
              <Download className="w-3 h-3" />
              Install
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari instructions banner
  if (iosVisible && isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-card border border-primary/40 rounded-xl p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">⛳</span>
              <p className="font-semibold text-foreground text-sm">Install Golf Trip App</p>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 -mt-0.5 flex-shrink-0" onClick={handleDismiss}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tap the <strong className="text-foreground">Share</strong> button{" "}
            <span className="inline-block">⬆️</span> at the bottom of your browser, then tap{" "}
            <strong className="text-foreground">"Add to Home Screen"</strong> to install.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
