'use client';

import React, { useEffect, useState } from 'react';
import { X, RefreshCw, Navigation2, Sliders, Database, Download, CheckCircle2 } from 'lucide-react';
import { useBottomSheetGestures } from '@/hooks/useBottomSheetGestures';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAll: () => void;
  onRetryGps: () => void;
  weatherLoading: boolean;
  citiesCount?: number;
  onClearCache?: () => void;
  showToast?: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  onRefreshAll,
  onRetryGps,
  weatherLoading,
  citiesCount = 3,
  onClearCache,
  showToast,
}: SettingsModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const {
    isDragging,
    sheetStyle,
    backdropOpacity,
    dragHandlers,
    handlePointerDown,
  } = useBottomSheetGestures({
    isOpen,
    onClose,
    modalId: 'settings',
    threshold: 80,
  });

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast?.('Aplikacja została zainstalowana!', 'success');
        setDeferredPrompt(null);
      }
    } else {
      showToast?.('Użyj opcji "Dodaj do ekranu głównego" w menu przeglądarki', 'info');
    }
  };

  const handleClearData = () => {
    try {
      // Clear weather cached keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('wpwa_weather_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      if (onClearCache) {
        onClearCache();
      } else {
        onRefreshAll();
      }
      showToast?.('Wyczyszczono pamięć podręczną i pobrano świeże dane', 'success');
      onClose();
    } catch (e) {
      showToast?.('Błąd podczas czyszczenia pamięci', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        style={{ opacity: backdropOpacity }}
      />

      {/* Sheet / Modal Container */}
      <div 
        {...dragHandlers}
        style={sheetStyle}
        className={`relative z-10 w-full max-w-[420px] mx-auto max-h-[88vh] overflow-y-auto bg-zinc-900/95 backdrop-blur-2xl border-t border-white/15 rounded-t-[32px] pt-2 pb-6 px-5 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] flex flex-col gap-4 ${
          isDragging ? '' : 'animate-in slide-in-from-bottom duration-300'
        } [&::-webkit-scrollbar]{display:none}`}
        data-scrollable="true"
      >
        {/* Drag Handle with generous touch target */}
        <div 
          className="w-24 py-2 mx-auto cursor-grab active:cursor-grabbing flex items-center justify-center touch-none select-none -mt-0.5" 
          onPointerDown={handlePointerDown}
          onClick={onClose}
          title="Przeciągnij w dół, aby zamknąć"
        >
          <div className="w-12 h-1.5 rounded-full bg-zinc-500/80 hover:bg-zinc-400 transition-colors" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 select-none">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Sliders size={15} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Ustawienia</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Zamknij"
          >
            <X size={16} />
          </button>
        </div>

        {/* App Info Card */}
        <div className="flex flex-col gap-2.5 bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">Wersja aplikacji</span>
            <span className="font-mono font-semibold text-blue-400 bg-blue-500/10 border border-blue-400/20 px-2 py-0.5 rounded-full text-[11px]">
              2.1 PWA
            </span>
          </div>

          <div className="border-t border-white/5" />

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">Źródło prognozy</span>
            <span className="font-semibold text-zinc-300">Open-Meteo API</span>
          </div>
        </div>

        {/* Offline Cache & PWA Controls */}
        <div className="flex flex-col gap-2.5 bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <Database size={13} className="text-blue-400" />
              <span>Pamięć podręczna</span>
            </div>
            <span className="font-semibold text-zinc-300 text-[11px]">
              {citiesCount} {citiesCount === 1 ? 'lokalizacja' : 'lokalizacje'} offline
            </span>
          </div>

          <div className="border-t border-white/5" />

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">Instalacja PWA</span>
            {isInstalled ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                <CheckCircle2 size={12} /> Zainstalowana
              </span>
            ) : (
              <button
                onClick={handleInstallApp}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 underline"
              >
                <Download size={11} /> Zainstaluj na telefonie
              </button>
            )}
          </div>

          <div className="border-t border-white/5" />

          <button
            onClick={handleClearData}
            className="w-full py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/5 text-[11px] text-zinc-300 font-medium transition-all"
          >
            Wyczyść pamięć podręczną pogody
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-0.5">
          <button
            onClick={() => {
              onRefreshAll();
              onClose();
            }}
            className="w-full py-2.5 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 active:scale-[0.98] border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <RefreshCw size={14} className={weatherLoading ? 'animate-spin' : ''} />
            <span>Odśwież wszystkie dane</span>
          </button>

          <button
            onClick={() => {
              onRetryGps();
              onClose();
            }}
            className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Navigation2 size={13} className="text-blue-400" />
            <span>Zaktualizuj pozycję GPS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
