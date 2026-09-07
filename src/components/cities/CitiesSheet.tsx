'use client';

import React, { useState, useEffect, useRef } from 'react';
import { City, WeatherResult, GeocodingResult } from '@/lib/types';
import { searchCity } from '@/lib/api';
import { gpsDistance } from '@/lib/utils';
import CityCard from './CityCard';
import { Search, Settings, X, Plus, MapPin, Loader2 } from 'lucide-react';
import { useBottomSheetGestures } from '@/hooks/useBottomSheetGestures';

interface CitiesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cities: City[];
  weatherMap: Map<string | number, WeatherResult>;
  activeCityIndex: number;
  onSelectCity: (index: number) => void;
  onDeleteCity: (index: number) => void;
  onAddCity: (city: City) => void;
  onOpenSettings: () => void;
  onRetryGps?: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export default function CitiesSheet({
  isOpen,
  onClose,
  cities,
  weatherMap,
  activeCityIndex,
  onSelectCity,
  onDeleteCity,
  onAddCity,
  onOpenSettings,
  onRetryGps,
  showToast,
}: CitiesSheetProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [mountedInDom, setMountedInDom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isDragging,
    isClosing,
    triggerClose,
    sheetStyle,
    backdropOpacity,
    dragHandlers,
    handlePointerDown,
  } = useBottomSheetGestures({
    isOpen,
    onClose,
    modalId: 'cities',
    threshold: 80,
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setQuery('');
      setSearchResults([]);
      const raf = requestAnimationFrame(() => {
        setMountedInDom(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setMountedInDom(false);
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      setSearchError(false);
      try {
        const results = await searchCity(query);
        setSearchResults(results || []);
      } catch (err) {
        console.error('Search error:', err);
        setSearchError(true);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleAddSearchResult = (result: GeocodingResult) => {
    const existingNearby = cities.find(c => {
      if (c.id === result.id || c.name.toLowerCase() === result.name.toLowerCase()) return true;
      if (c.latitude != null && c.longitude != null && result.latitude != null && result.longitude != null) {
        const dist = gpsDistance(c.latitude, c.longitude, result.latitude, result.longitude);
        return dist < 15;
      }
      return false;
    });

    if (existingNearby) {
      showToast(`Ta okolica (${existingNearby.name}) jest już na Twojej liście`, 'info');
      setQuery('');
      setSearchResults([]);
      return;
    }

    const newCity: City = {
      id: result.id,
      name: result.name,
      country_code: result.country_code,
      admin1: result.admin1,
      latitude: result.latitude,
      longitude: result.longitude,
      isGps: false,
    };

    onAddCity(newCity);
    setQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  const effectiveSheetStyle: React.CSSProperties = {
    ...sheetStyle,
    transform: (!mountedInDom && !isDragging) || isClosing
      ? 'translate3d(0, 100%, 0)'
      : sheetStyle.transform,
  };

  const effectiveBackdropOpacity = !mountedInDom ? 0 : backdropOpacity;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity duration-280"
        onClick={() => triggerClose()}
        style={{ opacity: effectiveBackdropOpacity }}
      />

      {/* Sheet Container */}
      <div 
        {...dragHandlers}
        style={effectiveSheetStyle}
        className="relative z-10 w-full max-w-[420px] mx-auto max-h-[88vh] bg-zinc-900/95 backdrop-blur-xl border-t border-white/15 rounded-t-[32px] pt-2 pb-5 px-4 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] flex flex-col gap-3 will-change-transform select-none"
      >
        {/* Drag Handle with generous touch target */}
        <div 
          className="w-24 py-2 mx-auto cursor-grab active:cursor-grabbing flex items-center justify-center touch-none select-none -mt-0.5" 
          onPointerDown={handlePointerDown}
          onClick={() => triggerClose()}
          title="Przeciągnij w dół, aby zamknąć"
        >
          <div className="w-12 h-1.5 rounded-full bg-zinc-500/80 hover:bg-zinc-400 transition-colors" />
        </div>

        {/* Sheet Title */}
        <div className="flex items-center justify-between px-1 pt-0.5 pb-0.5 border-b border-white/5 select-none">
          <span className="text-xs uppercase tracking-wider font-bold text-zinc-300">
            {query.trim().length >= 2 ? 'Wyniki wyszukiwania' : `Moje lokalizacje (${cities.length})`}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">
            {query.trim().length >= 2 ? 'Wybierz miasto, aby dodać' : 'Przeciągnij w dół / Cofnij'}
          </span>
        </div>

        {/* Scrollable Content (Cities List or Search Results) */}
        <div data-scrollable="true" className="flex-1 min-h-0 overflow-y-auto max-h-[65vh] flex flex-col gap-2.5 py-1 pr-0.5 [&::-webkit-scrollbar]{display:none}">
          {query.trim().length >= 2 ? (
            /* Search Results */
            searchResults.length > 0 ? (
              searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleAddSearchResult(result)}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-[0.98] cursor-pointer shrink-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center text-blue-400 shrink-0">
                    <MapPin size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{result.name}</div>
                    <div className="text-xs text-zinc-400 truncate">
                      {result.admin1 ? `${result.admin1}, ` : ''}{result.country}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Plus size={14} />
                  </div>
                </div>
              ))
            ) : !searching && !searchError ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                Nie znaleziono miast pasujących do &quot;{query}&quot;
              </div>
            ) : searchError ? (
              <div className="text-center py-8 text-red-400 text-xs">
                Wystąpił błąd podczas wyszukiwania
              </div>
            ) : null
          ) : (
            /* Saved Cities List */
            cities.map((city, index) => {
              const weather = weatherMap.get(city.id);
              return (
                <CityCard
                  key={city.id}
                  city={city}
                  weather={weather}
                  isActive={index === activeCityIndex}
                  index={index}
                  onSelect={(idx) => {
                    triggerClose(() => onSelectCity(idx));
                  }}
                  onDelete={onDeleteCity}
                  onRetryGps={onRetryGps}
                />
              );
            })
          )}
        </div>

        {/* Bottom Search & Action Controls Row */}
        <div className="pt-2 border-t border-white/10 flex items-center gap-2">
          {/* Search Input on the Bottom */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj miasta..."
              className="w-full bg-zinc-800/80 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
            />
            {query.length > 0 && !searching && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-full"
              >
                <X size={14} />
              </button>
            )}
            {searching && (
              <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
            title="Ustawienia"
            aria-label="Ustawienia"
          >
            <Settings size={18} />
          </button>

          {/* Close Button */}
          <button
            onClick={() => triggerClose()}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
            title="Zamknij"
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
