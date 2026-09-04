'use client';

import React from 'react';
import { Cloud, MapPin, Settings } from 'lucide-react';
import { ViewName } from '@/lib/types';

interface BottomNavProps {
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
}

export function BottomNav({ activeView, onNavigate }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard' as ViewName, label: 'Pogoda', Icon: Cloud },
    { id: 'cities' as ViewName, label: 'Miasta', Icon: MapPin },
    { id: 'settings' as ViewName, label: 'Ustawienia', Icon: Settings },
  ];

  return (
    <div className="fixed bottom-3.5 left-1/2 -translate-x-1/2 w-[calc(100%-1.75rem)] max-w-[364px] z-40 pointer-events-auto">
      <nav className="flex items-center justify-between p-1 rounded-full bg-zinc-950/85 backdrop-blur-2xl border border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.7),0_0_1px_rgba(255,255,255,0.2)]">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`relative flex items-center justify-center gap-1.5 py-2 px-4 rounded-full transition-all duration-300 active:scale-95 ${
                isActive
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40 shadow-[0_0_16px_rgba(59,130,246,0.3)] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium'
              }`}
            >
              <Icon
                size={17}
                strokeWidth={isActive ? 2.5 : 2}
                className={`shrink-0 transition-transform duration-300 ${
                  isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] text-blue-400' : ''
                }`}
              />
              <span className="text-xs tracking-tight">{label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-0.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,1)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
