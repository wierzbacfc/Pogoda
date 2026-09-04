'use client';

import { useState, useEffect, useRef } from 'react';
import { searchCity } from '@/lib/api';
import { City, GeocodingResult } from '@/lib/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Search, MapPin, Plus, Loader2, X } from 'lucide-react';

interface SearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  existingCityIds: (number | string)[];
  onCityAdded: (city: City) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export default function SearchSheet({
  isOpen,
  onClose,
  existingCityIds,
  onCityAdded,
  showToast,
}: SearchSheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setError(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await searchCity(query);
        setResults(data || []);
      } catch (err) {
        console.error('Błąd wyszukiwania:', err);
        setError(true);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleAddCity = (result: GeocodingResult) => {
    if (existingCityIds.includes(result.id)) {
      showToast(`${result.name} jest już na liście`, 'info');
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

    onCityAdded(newCity);
    showToast(`Dodano ${result.name}`, 'success');
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Dodaj miasto">
      <div className="flex flex-col h-full max-h-[70vh] gap-3">
        {/* Search Input Bar */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj miasta (np. Kraków, Londyn)..."
            className="w-full bg-zinc-800/80 border border-white/10 rounded-2xl pl-10 pr-10 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
          />
          {query.length > 0 && !loading && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-full"
            >
              <X size={14} />
            </button>
          )}
          {loading && (
            <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
          )}
        </div>

        {/* Results List */}
        <div className="flex flex-col gap-2 overflow-y-auto flex-1 pb-4">
          {results.length > 0 &&
            results.map((result) => (
              <div
                key={result.id}
                onClick={() => handleAddCity(result)}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white tracking-tight truncate">{result.name}</div>
                  <div className="text-xs text-zinc-400 truncate">
                    {result.admin1 ? `${result.admin1}, ` : ''}{result.country}
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-blue-400">
                  <Plus size={15} />
                </div>
              </div>
            ))}

          {query.trim().length >= 2 && !loading && !error && results.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm font-medium text-zinc-400">Nie znaleziono wyników dla &quot;{query}&quot;</p>
              <p className="text-xs text-zinc-500 mt-1">Upewnij się, że nazwa miasta jest poprawna.</p>
            </div>
          )}

          {error && (
            <div className="text-center py-10">
              <p className="text-sm font-medium text-red-400">Błąd podczas wyszukiwania</p>
              <p className="text-xs text-zinc-500 mt-1">Sprawdź połączenie z internetem.</p>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
