import { HourlyData, DailyData, TemperatureUnit } from './types';

export function formatTemp(celsius: number, unit: TemperatureUnit = 'C') {
  if (unit === 'F') {
    return `${Math.round(celsius * 9 / 5 + 32)}°`;
  }
  return `${Math.round(celsius)}°`;
}

export function formatTime(isoString: string) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export function getDateKeyFromHour(isoString: string) {
  if (!isoString) return '';
  return isoString.split('T')[0];
}

export function getCurrentHourKey(timezone?: string) {
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  };
  if (timezone) opts.timeZone = timezone;
  
  const formatter = new Intl.DateTimeFormat('sv-SE', opts);
  const parts = formatter.formatToParts(new Date());
  let y = '', m = '', d = '', h = '';
  
  for (const part of parts) {
    if (part.type === 'year') y = part.value;
    else if (part.type === 'month') m = part.value;
    else if (part.type === 'day') d = part.value;
    else if (part.type === 'hour') h = part.value;
  }
  
  if (!y || !m || !d || !h) {
    return new Date().toISOString().substring(0, 13) + ':00';
  }
  return `${y}-${m}-${d}T${h}:00`;
}

export function getCurrentHourIndex(hourlyTimes: string[], timezone?: string) {
  const currentKey = getCurrentHourKey(timezone);
  const idx = hourlyTimes.findIndex(t => t.startsWith(currentKey));
  if (idx !== -1) return idx;
  
  const now = new Date();
  const nowTime = now.getTime();
  let minDiff = Infinity;
  let bestIdx = 0;
  
  hourlyTimes.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - nowTime);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i;
    }
  });
  
  return bestIdx;
}

export function getDayLabel(isoDate: string, index: number, todayDateKey?: string) {
  if (index === 0) return 'Dziś';
  if (index === 1) return 'Jutro';
  
  const date = new Date(isoDate);
  const days = ['Niedz.', 'Pon.', 'Wt.', 'Śr.', 'Czw.', 'Pt.', 'Sob.'];
  return days[date.getDay()];
}

export function getWeekdayLabel(dateKey: string) {
  const date = new Date(dateKey);
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  return days[date.getDay()];
}

export function getDayOffset(todayDateKey: string, dateKey: string) {
  const d1 = new Date(todayDateKey);
  const d2 = new Date(dateKey);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function dateKeyToUtcTime(dateKey: string) {
  return new Date(dateKey + 'T12:00:00Z').getTime();
}

export function getDailyIndexForDate(dailyData: DailyData, dateKey: string) {
  return dailyData.time.findIndex(t => t === dateKey);
}

export function degreesToCardinal(deg: number) {
  const dirs = ['Pn', 'Pn-Wsch', 'Wsch', 'Pd-Wsch', 'Pd', 'Pd-Zach', 'Zach', 'Pn-Zach'];
  return dirs[Math.round(deg / 45) % 8];
}

export function getWindDirectionDetails(deg: number) {
  const dirs = [
    { short: 'N', pl: 'Północny', code: 'Pn' },
    { short: 'NE', pl: 'Płn.-Wsch.', code: 'Pn-Wsch' },
    { short: 'E', pl: 'Wschodni', code: 'Wsch' },
    { short: 'SE', pl: 'Płd.-Wsch.', code: 'Pd-Wsch' },
    { short: 'S', pl: 'Południowy', code: 'Pd' },
    { short: 'SW', pl: 'Płd.-Zach.', code: 'Pd-Zach' },
    { short: 'W', pl: 'Zachodni', code: 'Zach' },
    { short: 'NW', pl: 'Płn.-Zach.', code: 'Pn-Zach' },
  ];
  const idx = Math.round(deg / 45) % 8;
  return {
    ...dirs[idx],
    deg: Math.round(deg),
  };
}

export function getMoonPhaseInfo(date: Date = new Date()) {
  const lp = 2551442.877; // Lunar synodic period in seconds
  const now = date.getTime() / 1000;
  const newMoonRef = 947163600; // Jan 6, 2000 18:14 UTC
  const phase = (((now - newMoonRef) % lp) + lp) % lp / lp;

  if (phase < 0.03 || phase > 0.97) return { icon: '🌑', label: 'Nów', percent: 0 };
  if (phase < 0.22) return { icon: '🌒', label: 'Młody księżyc', percent: Math.round(phase * 100 * 2) };
  if (phase < 0.28) return { icon: '🌓', label: 'Pierwsza kwadra', percent: 50 };
  if (phase < 0.47) return { icon: '🌔', label: 'Przybywający', percent: Math.round(50 + (phase - 0.25) * 200) };
  if (phase < 0.53) return { icon: '🌕', label: 'Pełnia', percent: 100 };
  if (phase < 0.72) return { icon: '🌖', label: 'Ubywający', percent: Math.round(100 - (phase - 0.5) * 200) };
  if (phase < 0.78) return { icon: '🌗', label: 'Ostatnia kwadra', percent: 50 };
  return { icon: '🌘', label: 'Stary księżyc', percent: Math.round((1 - phase) * 100 * 2) };
}

export function isWeekendDay(isoDate: string) {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export function degreesToArrow(deg: number) {
  const dirs = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
  return dirs[Math.round(deg / 45) % 8];
}

export function getWindDisplay(speed: number, direction: number) {
  if (speed == null || direction == null) return null;
  return {
    speed: Math.round(speed),
    arrow: degreesToArrow(direction)
  };
}

export function gpsDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function uvColor(index: number) {
  if (index < 3) return '#34d399'; 
  if (index < 6) return '#fbbf24'; 
  if (index < 8) return '#f97316'; 
  if (index < 11) return '#ef4444'; 
  return '#8b5cf6'; 
}

export function uvDescription(index: number) {
  if (index < 3) return 'Niski';
  if (index < 6) return 'Umiarkowany';
  if (index < 8) return 'Wysoki';
  if (index < 11) return 'Bardzo wysoki';
  return 'Ekstremalny';
}

export function getDaySummary(hourlyData: HourlyData, currentIdx: number) {
  if (!hourlyData || currentIdx < 0 || currentIdx >= hourlyData.time.length) return '';
  
  const endOfDayIdx = currentIdx + (24 - (currentIdx % 24));
  const remainingHours = hourlyData.weathercode.slice(currentIdx, endOfDayIdx);
  
  const rainHours = remainingHours.filter(code => [61,63,65,66,67,80,81,82].includes(code)).length;
  const snowHours = remainingHours.filter(code => [71,73,75,77,85,86].includes(code)).length;
  
  if (rainHours > 3) return 'Spodziewaj się opadów deszczu przez większość dnia.';
  if (rainHours > 0) return 'Możliwe przelotne opady deszczu.';
  if (snowHours > 0) return 'Możliwe opady śniegu.';
  
  const cloudyHours = remainingHours.filter(code => [3,45,48].includes(code)).length;
  if (cloudyHours > remainingHours.length / 2) return 'Przewaga chmur do końca dnia.';
  
  return 'Dobra pogoda do końca dnia.';
}

export function getWeatherStoryline(hourlyData: HourlyData, currentIdx: number): string {
  if (!hourlyData || currentIdx < 0 || currentIdx >= hourlyData.time.length) return 'Dobre warunki pogodowe';
  return getDaySummary(hourlyData, currentIdx) || 'Stabilna pogoda w ciągu najbliższych godzin';
}

export function getSunArcProgress(sunriseIso?: string, sunsetIso?: string) {
  if (!sunriseIso || !sunsetIso) {
    return { progress: 0.5, isDay: true, countdown: 'Dzień' };
  }
  const now = Date.now();
  const rise = new Date(sunriseIso).getTime();
  const set = new Date(sunsetIso).getTime();
  const isDay = now >= rise && now <= set;
  let progress = 0;
  let countdown = '';
  
  if (isDay) {
    progress = Math.max(0, Math.min(1, (now - rise) / Math.max(1, set - rise)));
    const diffMs = set - now;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    countdown = `Zachód za ${hours}h ${mins}m`;
  } else if (now < rise) {
    progress = 0;
    const diffMs = rise - now;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    countdown = `Wschód za ${hours}h ${mins}m`;
  } else {
    progress = 1;
    countdown = 'Noc';
  }
  return { progress, isDay, countdown };
}

export function getMoonPhase() {
  const date = new Date();
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();
  if (month < 3) {
    year--;
    month += 12;
  }
  const c = 365.25 * year;
  const e = 30.6 * month;
  const jd = c + e + day - 694039.09;
  let phase = (jd / 29.53058867) % 1;
  if (phase < 0) phase += 1;
  
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);
  
  if (phase < 0.03 || phase > 0.97) return { name: 'Nów', icon: '🌑', phase, illumination };
  if (phase < 0.22) return { name: 'Przybywający sierp', icon: '🌒', phase, illumination };
  if (phase < 0.28) return { name: 'Pierwsza kwadra', icon: '🌓', phase, illumination };
  if (phase < 0.47) return { name: 'Przybywający garb', icon: '🌔', phase, illumination };
  if (phase < 0.53) return { name: 'Pełnia', icon: '🌕', phase, illumination };
  if (phase < 0.72) return { name: 'Ubywający garb', icon: '🌖', phase, illumination };
  if (phase < 0.78) return { name: 'Ostatnia kwadra', icon: '🌗', phase, illumination };
  return { name: 'Ubywający sierp', icon: '🌘', phase, illumination };
}

export function getAqiStatus(aqi: number) {
  if (aqi <= 20) return { label: 'Bardzo dobra', color: '#10b981', bgColor: 'bg-emerald-500/10', desc: 'Jakość powietrza jest idealna.', advice: 'Świetny czas na aktywność na świeżym powietrzu.' };
  if (aqi <= 40) return { label: 'Dobra', color: '#34d399', bgColor: 'bg-emerald-500/10', desc: 'Jakość powietrza jest zadowalająca.', advice: 'Dobre warunki do przebywania na zewnątrz.' };
  if (aqi <= 60) return { label: 'Umiarkowana', color: '#fbbf24', bgColor: 'bg-amber-500/10', desc: 'Akceptowalna jakość powietrza.', advice: 'Wrażliwe osoby powinny ograniczyć dłuższy wysiłek.' };
  if (aqi <= 80) return { label: 'Dostateczna', color: '#f97316', bgColor: 'bg-orange-500/10', desc: 'Wrażliwe osoby mogą odczuwać objawy.', advice: 'Zalecane ograniczenie dłuższego przebywania na zewnątrz.' };
  if (aqi <= 100) return { label: 'Zła', color: '#ef4444', bgColor: 'bg-red-500/10', desc: 'Zalecane ograniczenie aktywności.', advice: 'Ogranicz przebywanie na zewnątrz do minimum.' };
  return { label: 'Bardzo zła', color: '#8b5cf6', bgColor: 'bg-purple-500/10', desc: 'Poważne zanieczyszczenie powietrza.', advice: 'Pozostań w pomieszczeniu i zamknij okna.' };
}

export function getBeaufortInfo(speedKmh: number) {
  const kmh = Math.max(0, speedKmh || 0);
  if (kmh < 1) return { bft: 0, label: 'Cisza', percent: 2, desc: 'Dym unosi się pionowo.' };
  if (kmh <= 5) return { bft: 1, label: 'Powiew', percent: 8, desc: 'Ruch powietrza ledwo wyczuwalny.' };
  if (kmh <= 11) return { bft: 2, label: 'Słaby wiatr', percent: 16, desc: 'Liście szeleszczą, wiatr czuć na twarzy.' };
  if (kmh <= 19) return { bft: 3, label: 'Łagodny wiatr', percent: 25, desc: 'Liście i małe gałązki w ciągłym ruchu.' };
  if (kmh <= 28) return { bft: 4, label: 'Umiarkowany', percent: 34, desc: 'Podnosi kurz i kawałki papieru.' };
  if (kmh <= 38) return { bft: 5, label: 'Dość silny', percent: 45, desc: 'Małe drzewa kołyszą się.' };
  if (kmh <= 49) return { bft: 6, label: 'Silny wiatr', percent: 55, desc: 'Grube gałęzie w ruchu, trudność z parasolem.' };
  if (kmh <= 61) return { bft: 7, label: 'Bardzo silny', percent: 68, desc: 'Całe drzewa w ruchu, opór przy chodzeniu.' };
  if (kmh <= 74) return { bft: 8, label: 'Wichura', percent: 80, desc: 'Łamie gałęzie, utrudniony chód pod wiatr.' };
  if (kmh <= 88) return { bft: 9, label: 'Silna wichura', percent: 90, desc: 'Drobne uszkodzenia budynków, dachówki.' };
  return { bft: 10, label: 'Sztorm', percent: 100, desc: 'Wyrywa drzewa z korzeniami, znaczne szkody.' };
}

export function getVisibilityInfo(meters?: number) {
  const m = meters ?? 10000;
  const km = (m / 1000).toFixed(1);
  if (m >= 10000) return { km: '10+', label: 'Doskonała', color: 'text-emerald-400', advice: 'Idealna widoczność na drodze i w podróży.' };
  if (m >= 5000) return { km, label: 'Dobra', color: 'text-teal-300', advice: 'Warunki w pełni bezpieczne.' };
  if (m >= 2000) return { km, label: 'Umiarkowana', color: 'text-amber-300', advice: 'Lekkie zamglenie w oddali.' };
  if (m >= 1000) return { km, label: 'Słaba (Zamglenie)', color: 'text-orange-400', advice: 'Zachowaj ostrożność podczas jazdy.' };
  return { km, label: 'Gęsta mgła', color: 'text-rose-400', advice: 'Bardzo niebezpieczne warunki na drodze!' };
}

export function getCloudCoverInfo(percent?: number) {
  const val = Math.min(100, Math.max(0, percent ?? 0));
  if (val < 15) return { percent: val, label: 'Bezchmurnie', desc: 'Czyste niebo z pełnym nasłonecznieniem.' };
  if (val < 40) return { percent: val, label: 'Małe zachmurzenie', desc: 'Pojedyncze obłoki, dużo słońca.' };
  if (val < 70) return { percent: val, label: 'Częściowe zachm.', desc: 'Słońce na przemian z chmurami.' };
  if (val < 90) return { percent: val, label: 'Duże zachmurzenie', desc: 'Niebo w większości przesłonięte chmurami.' };
  return { percent: val, label: 'Całkowite zachm.', desc: 'Jednolita, gęsta pokrywa chmur.' };
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
