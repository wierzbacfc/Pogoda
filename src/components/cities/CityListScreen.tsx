'use client';

import { City, WeatherResult } from '@/lib/types';
import CityCard from './CityCard';
import { Plus, MapPin } from 'lucide-react';

interface CityListScreenProps {
  cities: City[];
  weatherMap: Map<string | number, WeatherResult>;
  activeCityIndex: number;
  onSelectCity: (index: number) => void;
  onDeleteCity: (index: number) => void;
  onAddCity: () => void;
}

export default function CityListScreen({
  cities,
  weatherMap,
  activeCityIndex,
  onSelectCity,
  onDeleteCity,
  onAddCity,
}: CityListScreenProps) {
  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Zapisane miasta</h2>
          <p className="text-xs text-blue-100/70 mt-0.5 font-medium">Przełączaj i zarządzaj swoimi lokalizacjami</p>
        </div>
        <button
          onClick={onAddCity}
          className="w-9 h-9 rounded-2xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center hover:bg-blue-500/25 active:scale-95 transition-all shadow-lg"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Cities list */}
      <div className="flex flex-col gap-3">
        {cities.map((city, index) => {
          const weather = weatherMap.get(city.id);
          return (
            <CityCard
              key={city.id}
              city={city}
              weather={weather}
              isActive={index === activeCityIndex}
              index={index}
              onSelect={onSelectCity}
              onDelete={onDeleteCity}
            />
          );
        })}

        {/* Add city button */}
        <button
          onClick={onAddCity}
          className="w-full py-4 mt-2 rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-dashed border-white/15 text-zinc-300 hover:border-blue-400/50 hover:text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg group"
        >
          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:border-blue-400/30 transition-all">
            <Plus className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Dodaj nową lokalizację</span>
        </button>
      </div>
    </div>
  );
}
