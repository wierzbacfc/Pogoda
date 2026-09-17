import { HourlyData, AirQualityData } from './types';

export type CyclingRating = 'excellent' | 'good' | 'moderate' | 'difficult' | 'poor';

export interface HourlyCyclingCondition {
  index: number;
  hourLabel: string; // 'Teraz', '15:00', itp.
  timeString: string;
  score: number; // 0 - 100
  rating: CyclingRating;
  label: string; // 'Idealnie', 'Dobre', 'Umiarkowane', 'Trudne', 'Niezalecane'
  badgeColor: string;
  gradient: string;
  dotColor: string;
  textColor: string;
  temp: number;
  feelsLike: number;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
  precipProb: number;
  humidity: number;
  weatherCode: number;
  mainIssue: string | null;
}

export interface CyclingAnalysis {
  current: HourlyCyclingCondition;
  all4Hours: HourlyCyclingCondition[];
  overallRating: CyclingRating;
  overallScore: number;
  overallLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  headline: string;
  advice: string;
  gearRecommendations: { label: string; icon: string }[];
  primaryIssue: string | null;
}

function calculateHourScore(
  hourlyData: HourlyData,
  idx: number,
  isCurrent: boolean,
  airQuality?: AirQualityData
): HourlyCyclingCondition {
  const temp = Math.round(hourlyData.temperature_2m[idx] ?? 15);
  const feelsLike = Math.round(hourlyData.apparent_temperature[idx] ?? temp);
  const rain = hourlyData.precipitation[idx] ?? 0;
  const precipProb = hourlyData.precipitation_probability?.[idx] ?? 0;
  const windSpeed = Math.round(hourlyData.windspeed_10m[idx] ?? 0);
  const windGusts = Math.round(hourlyData.windgusts_10m?.[idx] ?? windSpeed * 1.35);
  const humidity = Math.round(hourlyData.relativehumidity_2m[idx] ?? 50);
  const weatherCode = hourlyData.weathercode[idx] ?? 0;
  const aqi = airQuality?.european_aqi ?? 28;

  let score = 100;
  const issues: string[] = [];

  // 1. Zjawiska niebezpieczne i opady
  if (weatherCode >= 95) {
    score = 0;
    issues.push('Burza z piorunami');
  } else if ([56, 57, 66, 67, 71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    score = Math.min(score, 15);
    issues.push('Śnieg / oblodzenie');
  } else if (rain > 2.0 || [65, 82].includes(weatherCode)) {
    score = Math.min(score, 15);
    issues.push(`Ulewa (${rain.toFixed(1)} mm)`);
  } else if (rain > 0.5 || [63, 81].includes(weatherCode)) {
    score = Math.min(score, 35);
    issues.push(`Deszcz (${rain.toFixed(1)} mm)`);
  } else if (rain > 0.1 || [51, 53, 55, 61, 80].includes(weatherCode)) {
    score = Math.min(score, 52);
    issues.push('Mżawka / deszcz');
  } else if (precipProb >= 65) {
    score -= 22;
    issues.push(`Ryzyko opadów (${precipProb}%)`);
  } else if (precipProb >= 35) {
    score -= 10;
  }

  // 2. Wiatr i porywy
  if (windGusts >= 58 || windSpeed >= 42) {
    score = Math.min(score, 12);
    issues.push(`Niebezpieczne porywy (${windGusts} km/h)`);
  } else if (windGusts >= 46 || windSpeed >= 32) {
    score = Math.min(score, 32);
    issues.push(`Bardzo silny wiatr (${windGusts} km/h)`);
  } else if (windGusts >= 36 || windSpeed >= 24) {
    score -= 24;
    issues.push(`Porywisty wiatr (${windGusts} km/h)`);
  } else if (windSpeed >= 16) {
    score -= 10;
    if (windGusts >= 28) issues.push(`Odczuwalny wiatr (${windSpeed} km/h)`);
  }

  // 3. Komfort termiczny (odczuwalna)
  if (feelsLike < -3) {
    score = Math.min(score, 20);
    issues.push(`Mróz (${feelsLike}°C)`);
  } else if (feelsLike <= 3) {
    score -= 28;
    issues.push(`Przymrozek / ziąb (${feelsLike}°C)`);
  } else if (feelsLike <= 9) {
    score -= 14;
    issues.push(`Chłód (${feelsLike}°C)`);
  } else if (feelsLike > 32) {
    score = Math.min(score, 25);
    issues.push(`Ekstremalny upał (${feelsLike}°C)`);
  } else if (feelsLike > 28) {
    score -= 15;
    issues.push(`Upał (${feelsLike}°C)`);
  }

  // 4. Nawierzchnia i wilgotność
  if (humidity >= 92 && rain <= 0.1) {
    score -= 10;
    issues.push('Mokra / śliska nawierzchnia');
  }

  // 5. Jakość powietrza (smog)
  if (aqi > 75) {
    score = Math.min(score, 30);
    issues.push('Smog (złe powietrze)');
  } else if (aqi > 50) {
    score -= 12;
    issues.push('Umiarkowany smog');
  }

  score = Math.max(0, Math.min(100, score));

  // Klasyfikacja ratingu i kolorystyka
  let rating: CyclingRating = 'excellent';
  let label = 'Idealnie';
  let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
  let gradient = 'from-emerald-400 to-teal-400';
  let dotColor = 'bg-emerald-400';
  let textColor = 'text-emerald-400';

  if (score >= 80) {
    rating = 'excellent';
    label = 'Idealnie';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
    gradient = 'from-emerald-400 to-teal-400';
    dotColor = 'bg-emerald-400';
    textColor = 'text-emerald-400';
  } else if (score >= 60) {
    rating = 'good';
    label = 'Dobre';
    badgeColor = 'bg-teal-500/20 text-teal-300 border-teal-400/30';
    gradient = 'from-teal-400 to-cyan-400';
    dotColor = 'bg-teal-400';
    textColor = 'text-teal-400';
  } else if (score >= 40) {
    rating = 'moderate';
    label = 'Umiarkowane';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-400/30';
    gradient = 'from-amber-400 to-yellow-400';
    dotColor = 'bg-amber-400';
    textColor = 'text-amber-400';
  } else if (score >= 20) {
    rating = 'difficult';
    label = 'Trudne';
    badgeColor = 'bg-orange-500/20 text-orange-300 border-orange-400/30';
    gradient = 'from-orange-500 to-amber-500';
    dotColor = 'bg-orange-400';
    textColor = 'text-orange-400';
  } else {
    rating = 'poor';
    label = 'Niezalecane';
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-400/30';
    gradient = 'from-rose-500 to-red-600';
    dotColor = 'bg-rose-500';
    textColor = 'text-rose-400';
  }

  const rawTime = hourlyData.time[idx] || '';
  const timeString = rawTime.length >= 16 ? rawTime.slice(11, 16) : '';
  const hourLabel = isCurrent ? 'Teraz' : timeString || `+${idx}`;

  return {
    index: idx,
    hourLabel,
    timeString,
    score,
    rating,
    label,
    badgeColor,
    gradient,
    dotColor,
    textColor,
    temp,
    feelsLike,
    windSpeed,
    windGusts,
    precipitation: rain,
    precipProb,
    humidity,
    weatherCode,
    mainIssue: issues[0] || null,
  };
}

export function getCyclingAnalysis(
  hourlyData: HourlyData,
  currentIdx: number,
  airQuality?: AirQualityData
): CyclingAnalysis {
  const hours: HourlyCyclingCondition[] = [];
  for (let i = 0; i < 4; i++) {
    const idx = currentIdx + i;
    if (idx < hourlyData.time.length) {
      hours.push(calculateHourScore(hourlyData, idx, i === 0, airQuality));
    }
  }

  const current = hours[0] || calculateHourScore(hourlyData, currentIdx, true, airQuality);

  // Średnia ważona z priorytetem bieżącej godziny
  const weights = [0.4, 0.3, 0.2, 0.1];
  let totalWeight = 0;
  let weightedSum = 0;
  hours.forEach((h, i) => {
    const w = weights[i] ?? 0.1;
    weightedSum += h.score * w;
    totalWeight += w;
  });

  const minScore = Math.min(...hours.map((h) => h.score));
  let overallScore = Math.round(weightedSum / (totalWeight || 1));
  if (minScore <= 15) {
    overallScore = Math.min(overallScore, 25);
  }

  let overallRating: CyclingRating = 'excellent';
  let overallLabel = 'Idealne warunki';
  let badgeBg = 'bg-emerald-500/15';
  let badgeBorder = 'border-emerald-400/30';
  let badgeText = 'text-emerald-300';

  if (overallScore >= 80) {
    overallRating = 'excellent';
    overallLabel = 'Idealne warunki';
    badgeBg = 'bg-emerald-500/15';
    badgeBorder = 'border-emerald-400/30';
    badgeText = 'text-emerald-300';
  } else if (overallScore >= 60) {
    overallRating = 'good';
    overallLabel = 'Dobre warunki';
    badgeBg = 'bg-teal-500/15';
    badgeBorder = 'border-teal-400/30';
    badgeText = 'text-teal-300';
  } else if (overallScore >= 40) {
    overallRating = 'moderate';
    overallLabel = 'Umiarkowane';
    badgeBg = 'bg-amber-500/15';
    badgeBorder = 'border-amber-400/30';
    badgeText = 'text-amber-300';
  } else if (overallScore >= 20) {
    overallRating = 'difficult';
    overallLabel = 'Trudne warunki';
    badgeBg = 'bg-orange-500/15';
    badgeBorder = 'border-orange-400/30';
    badgeText = 'text-orange-300';
  } else {
    overallRating = 'poor';
    overallLabel = 'Niezalecane';
    badgeBg = 'bg-rose-500/15';
    badgeBorder = 'border-rose-400/30';
    badgeText = 'text-rose-300';
  }

  const futureWorse = hours.slice(1).find((h) => h.score < current.score - 18);
  const futureBetter = hours.slice(1).find((h) => h.score > current.score + 18);
  const allIssues = hours.map((h) => h.mainIssue).filter(Boolean) as string[];
  const primaryIssue = allIssues[0] || null;

  let headline = '';
  let advice = '';

  if (current.score >= 70 && futureWorse) {
    headline = `Świetnie teraz, pogorszenie od ${futureWorse.timeString || '+1h'}`;
    advice = `Najlepsze okno pogodowe masz w tej chwili. Od godziny ${futureWorse.timeString || 'później'} prognozowany jest: ${futureWorse.mainIssue?.toLowerCase() || 'spadek komfortu'}. Warto zaplanować wcześniejszy powrót.`;
  } else if (current.score < 50 && futureBetter) {
    headline = `Obecnie trudniej, poprawa od ${futureBetter.timeString || '+2h'}`;
    advice = `Aura ulega stabilizacji. Od okolic ${futureBetter.timeString} warunki ulegną odczuwalnej poprawie – warto odczekać chwilę przed wyruszeniem na trasę.`;
  } else if (overallScore >= 80) {
    headline = 'Stabilna, doskonała aura na kolejne 3h';
    advice = 'Świetne warunki do jazdy. Sucha nawierzchnia, łagodny wiatr i wysoki komfort termiczny sprzyjają dłuższej trasie rowerowej lub treningowi.';
  } else if (overallScore >= 60) {
    headline = 'Dobre warunki do jazdy na rowerze';
    advice = primaryIssue
      ? `Aura sprzyja jeździe, choć miej na uwadze: ${primaryIssue.toLowerCase()}. Trasa będzie przyjemna.`
      : 'Warunki w pełni sprzyjają zarówno rekreacyjnej przejażdżce, jak i miejskim dojazdom.';
  } else if (overallScore >= 40) {
    headline = 'Wymagające warunki, zachowaj ostrożność';
    advice = `Jazda jest możliwa, lecz wymaga przygotowania (${allIssues.slice(0, 2).join(', ').toLowerCase()}). Dostosuj prędkość i ekwipunek.`;
  } else {
    headline = 'Niezalecana jazda na rowerze';
    advice = `Warunki na trasie są niebezpieczne lub bardzo nieprzyjemne (${allIssues.slice(0, 2).join(', ').toLowerCase()}). Zalecamy przełożenie wyjazdu.`;
  }

  // Dobór ekwipunku i ubioru
  const gearRecommendations: { label: string; icon: string }[] = [];

  const maxRain = Math.max(...hours.map((h) => h.precipitation));
  const maxProb = Math.max(...hours.map((h) => h.precipProb));
  if (maxRain > 0.4) {
    gearRecommendations.push({ label: 'Kurtka przeciwdeszczowa', icon: '🌧️' });
    gearRecommendations.push({ label: 'Błotniki rowerowe', icon: '🛡️' });
  } else if (maxRain > 0 || maxProb >= 35) {
    gearRecommendations.push({ label: 'Lekka wiatrówka hydrofobowa', icon: '🧥' });
  }

  const maxGust = Math.max(...hours.map((h) => h.windGusts));
  if (maxGust >= 32) {
    gearRecommendations.push({ label: 'Wiatroszczelna kamizelka', icon: '💨' });
    gearRecommendations.push({ label: 'Okulary sportowe (ochrona oczu)', icon: '🕶️' });
  }

  const minFeels = Math.min(...hours.map((h) => h.feelsLike));
  const maxFeels = Math.max(...hours.map((h) => h.feelsLike));
  if (minFeels < 0) {
    gearRecommendations.push({ label: 'Ciepłe rękawice i kominiarka', icon: '🧤' });
    gearRecommendations.push({ label: 'Bielizna termiczna (cebulka)', icon: '❄️' });
  } else if (minFeels <= 8) {
    gearRecommendations.push({ label: 'Rękawiczki i komin na szyję', icon: '🧤' });
    gearRecommendations.push({ label: 'Długie spodnie / ocieplacze', icon: '👖' });
  } else if (minFeels <= 14) {
    gearRecommendations.push({ label: 'Dłuższy rękaw / kamizelka', icon: '🧥' });
  } else if (maxFeels >= 26) {
    gearRecommendations.push({ label: 'Duży bidon z elektrolitami', icon: '💧' });
    gearRecommendations.push({ label: 'Krem UV i przewiewna odzież', icon: '☀️' });
  } else {
    gearRecommendations.push({ label: 'Krótki strój rowerowy', icon: '👕' });
  }

  const anyNight = hours.some((h) => (hourlyData.is_day?.[h.index] ?? 1) === 0);
  if (anyNight) {
    gearRecommendations.push({ label: 'Oświetlenie rowerowe (przód/tył)', icon: '💡' });
  } else {
    gearRecommendations.push({ label: 'Okulary przeciwsłoneczne', icon: '🕶️' });
  }

  const uniqueGear = gearRecommendations
    .filter((item, index, self) => index === self.findIndex((t) => t.label === item.label))
    .slice(0, 4);

  return {
    current,
    all4Hours: hours,
    overallRating,
    overallScore,
    overallLabel,
    badgeBg,
    badgeBorder,
    badgeText,
    headline,
    advice,
    gearRecommendations: uniqueGear,
    primaryIssue,
  };
}
