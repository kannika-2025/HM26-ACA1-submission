"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("PotholeWatch service worker registration failed:", error);
      });
    }

    if (window.matchMedia("(display-mode: standalone)").matches || localStorage.getItem("potholewatch-install-dismissed") === "true") return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  if (!installEvent || dismissed) return null;

  async function install() {
    await installEvent?.prompt();
    setInstallEvent(null);
  }

  function dismiss() {
    localStorage.setItem("potholewatch-install-dismissed", "true");
    setDismissed(true);
  }

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-cyan-300/30 bg-slate-900 p-4 text-white shadow-2xl" aria-label="Install PotholeWatch AI">
      <Download className="h-5 w-5 shrink-0 text-cyan-300" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Install PotholeWatch AI</p>
        <p className="mt-1 text-xs text-slate-400">Keep civic reporting one tap away.</p>
      </div>
      <button type="button" onClick={install} className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">Install</button>
      <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
    </aside>
  );
}
