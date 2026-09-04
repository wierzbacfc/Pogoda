'use client';

import { Navigation2 } from 'lucide-react';

interface CityDotsProps {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function CityDots({ count, activeIndex, onSelect }: CityDotsProps) {
  if (count <= 1) return null;

  const maxDots = 8;
  const showDots = Math.min(count, maxDots);
  const showMore = count > maxDots;

  return (
    <div className="flex items-center justify-center gap-2 py-2.5 z-20">
      {Array.from({ length: showDots }).map((_, i) => {
        const isActive = i === activeIndex;
        const isGps = i === 0;

        if (isGps) {
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`p-1 rounded-full transition-all duration-300 active:scale-90 cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] scale-110'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
              aria-label="Twoja lokalizacja"
              title="Twoja lokalizacja"
            >
              <Navigation2 size={12} className={isActive ? 'fill-current' : ''} />
            </button>
          );
        }

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`transition-all duration-300 active:scale-90 cursor-pointer ${
              isActive
                ? 'w-4.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                : 'w-1.5 h-1.5 rounded-full bg-white/25 hover:bg-white/40'
            }`}
            aria-label={`Miasto ${i + 1}`}
          />
        );
      })}
      {showMore && <span className="text-zinc-500 text-xs tracking-widest leading-none pb-0.5">...</span>}
    </div>
  );
}
