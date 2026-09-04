'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Determine correct relative path to sw.js based on window.location
    let swPath = (window.location.pathname.endsWith('/')
      ? window.location.pathname
      : window.location.pathname + '/') + 'sw.js';
    if (swPath.indexOf('.html') !== -1) {
      swPath = swPath.substring(0, swPath.lastIndexOf('/') + 1) + 'sw.js';
    }

    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const onUpdateFound = (reg: ServiceWorkerRegistration) => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        // When installed AND another SW is already controlling the page, an update is ready!
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          setWaitingWorker(newWorker);
          setUpdateAvailable(true);
        }
      });
    };

    navigator.serviceWorker.register(swPath).then((reg) => {
      // 1. If a worker is already waiting in background
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
        setUpdateAvailable(true);
      }

      // 2. Listen for newly discovered updates
      reg.addEventListener('updatefound', () => onUpdateFound(reg));

      // 3. Immediately trigger a background check on mount
      try {
        reg.update().catch(() => {});
      } catch {
        // ignore
      }

      // 4. Periodically check for updates (every 5 minutes)
      const intervalId = setInterval(() => {
        try {
          reg.update().catch(() => {});
        } catch {
          // ignore
        }
      }, 5 * 60 * 1000);

      // 5. Check whenever user switches back to the app/tab
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          try {
            reg.update().catch(() => {});
          } catch {
            // ignore
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }).catch((err) => {
      console.warn('SW registration warning:', err);
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-20 left-3.5 right-3.5 max-w-[390px] mx-auto z-50 pointer-events-auto select-none animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-blue-400/40 shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white tracking-tight truncate">
              Dostępna nowa wersja!
            </span>
            <span className="text-[10px] text-zinc-400 truncate">
              Kliknij, aby zaktualizować aplikację
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-500/30 flex items-center gap-1.5 transition-all disabled:opacity-60"
          >
            <RefreshCw size={12} className={isUpdating ? 'animate-spin' : ''} />
            <span>{isUpdating ? 'Wgrywam...' : 'Aktualizuj'}</span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
            aria-label="Zamknij powiadomienie"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
