/**
 * UI Rendering and DOM Manipulation Module.
 */

// Helper functions from Section 16 of the specification
function degreesToCardinal(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function degreesToArrow(deg) {
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[Math.round(deg / 45) % 8];
}

function getWindDisplay(speed, direction) {
  const windSpeed = Math.round(Number(speed));
  if (!Number.isFinite(windSpeed) || windSpeed <= 0) {
    return null;
  }

  const windArrow = Number.isFinite(direction) ? degreesToArrow(direction) : '';
  return { speed: windSpeed, arrow: windArrow };
}

function getCurrentHourKey(timezone) {
  const now = new Date();

  if (!timezone) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}`;
  }

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(now);

    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}T${values.hour}`;
  } catch (error) {
    console.warn('Nie udało się użyć strefy czasu z API:', timezone, error);
    return getCurrentHourKey();
  }
}

function getCurrentHourIndex(hourlyTimes, timezone) {
  const currentHour = getCurrentHourKey(timezone);
  const exactIdx = hourlyTimes.findIndex(t => t.startsWith(currentHour));
  if (exactIdx !== -1) return exactIdx;

  const currentDate = currentHour.slice(0, 10);
  let fallbackIdx = -1;
  for (let i = 0; i < hourlyTimes.length; i++) {
    if (!hourlyTimes[i].startsWith(currentDate)) continue;
    if (hourlyTimes[i] <= currentHour) fallbackIdx = i;
  }
  return fallbackIdx;
}

function formatTime(isoString) {
  return isoString.slice(11, 16); // "2026-05-22T05:12" -> "05:12"
}

function getDateKeyFromHour(isoString) {
  return isoString ? isoString.slice(0, 10) : '';
}

function dateKeyToUtcTime(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return NaN;
  return Date.UTC(year, month - 1, day);
}

function getDayOffset(todayDateKey, dateKey) {
  const todayTime = dateKeyToUtcTime(todayDateKey);
  const targetTime = dateKeyToUtcTime(dateKey);
  if (!Number.isFinite(todayTime) || !Number.isFinite(targetTime)) return null;
  return Math.round((targetTime - todayTime) / 86400000);
}

function getWeekdayLabel(dateKey) {
  const days = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  const dateTime = dateKeyToUtcTime(dateKey);
  if (!Number.isFinite(dateTime)) return '';
  return days[new Date(dateTime).getUTCDay()];
}

function getDayLabel(isoDate, index, todayDateKey) {
  const dateKey = isoDate.slice(0, 10);
  if (todayDateKey) {
    const offset = getDayOffset(todayDateKey, dateKey);
    if (offset === 0) return 'Dziś';
    if (offset === 1) return 'Jutro';
  } else {
    if (index === 0) return 'Dziś';
    if (index === 1) return 'Jutro';
  }
  return getWeekdayLabel(dateKey);
}

function getDailyIndexForDate(dailyData, dateKey) {
  if (!dailyData?.time?.length || !dateKey) return 0;

  const exactIdx = dailyData.time.findIndex(day => day === dateKey);
  if (exactIdx !== -1) return exactIdx;

  const nextIdx = dailyData.time.findIndex(day => day > dateKey);
  return nextIdx !== -1 ? nextIdx : 0;
}

function uvColor(index) {
  if (index <= 2)  return '#2d7dd2'; // low
  if (index <= 5)  return '#f7c948'; // moderate
  if (index <= 7)  return '#f4801a'; // high
  if (index <= 10) return '#e05c2a'; // very high
  return '#9b44c8';                  // extreme
}

function formatTemp(celsius, unit = 'C') {
  if (unit === 'F') return `${Math.round(celsius * 9 / 5 + 32)}°`;
  return `${Math.round(celsius)}°`;
}

// Logic for generating key day summary sentence (Section 11)
function getDaySummary(hourlyData, currentIdx) {
  if (currentIdx === -1) return 'Brak szczegółów.';

  // Check from current hour to end of today (23:00)
  const currentISO = hourlyData.time[currentIdx];
  const todayPrefix = currentISO.slice(0, 10);
  
  let endIdx = hourlyData.time.length;
  for (let i = currentIdx; i < hourlyData.time.length; i++) {
    if (!hourlyData.time[i].startsWith(todayPrefix)) {
      endIdx = i;
      break;
    }
  }

  const range = {
    codes: hourlyData.weathercode.slice(currentIdx, endIdx),
    temps: hourlyData.temperature_2m.slice(currentIdx, endIdx),
    times: hourlyData.time.slice(currentIdx, endIdx)
  };

  // 1. Check for precipitation (worst weathercode >= 51)
  let worstPrecipIdx = -1;
  let worstPrecipCode = -1;
  for (let i = 0; i < range.codes.length; i++) {
    const code = range.codes[i];
    if (code >= 51 && code > worstPrecipCode) {
      worstPrecipCode = code;
      worstPrecipIdx = i;
    }
  }

  if (worstPrecipIdx !== -1) {
    const timeStr = formatTime(range.times[worstPrecipIdx]);
    const info = getWeatherInfo(worstPrecipCode, true);
    return `Około ${timeStr} spodziewany: ${info.label.toLowerCase()}.`;
  }

  // 2. Check for evening cooling (> 5 degrees drop)
  const currentTemp = range.temps[0];
  const eveningTemp = range.temps[range.temps.length - 1]; // ~23:00
  if (currentTemp - eveningTemp > 5) {
    return 'Wieczorem zapowiada się odczuwalne ochłodzenie.';
  }

  // 3. Fallback
  return 'Dziś stabilne warunki pogodowe, bez większych zmian.';
}


const UI = {
  // Screen views triggers
  showScreen(viewName) {
    const views = ['weather', 'city-list'];
    const dots = document.getElementById('dots-container');
    if (dots) dots.classList.toggle('hidden', viewName !== 'weather');
    const openCitiesBtn = document.getElementById('btn-open-cities');
    if (openCitiesBtn) openCitiesBtn.classList.toggle('hidden', viewName !== 'weather');

    views.forEach(v => {
      const el = document.getElementById(`screen-${v}`);
      if (el) {
        if (v === viewName) {
          el.classList.remove('hidden');
          el.classList.add('fade-in');
          window.scrollTo(0, 0);
          const scroller = el.querySelector('.app-content');
          if (scroller) scroller.scrollTop = 0;
        } else {
          el.classList.add('hidden');
          el.classList.remove('fade-in');
        }
      }
    });
  },

  // Set the dynamic linear gradient background
  setBackground(weathercode, isDay) {
    const bgEl = document.querySelector('.app-bg');
    const containerEl = document.querySelector('.app-container');
    if (!bgEl) return;

    const gradient = getBgGradient(weathercode, isDay);
    bgEl.style.background = gradient;

    // Contrast logic: Night themes are dark, so make text light
    if (!isDay) {
      containerEl.classList.add('text-light');
      document.body.style.backgroundColor = '#0b0f19'; // Match dark body background
    } else {
      containerEl.classList.remove('text-light');
      document.body.style.backgroundColor = ''; // Restore default body background
    }

    // Trigger visual weather animations (particles/rain/snow)
    this.updateWeatherEffects(weathercode, isDay);
  },

  // Generates and overlays animated particle elements based on weather state
  updateWeatherEffects(weathercode, isDay) {
    const effectsEl = document.getElementById('weather-effects');
    if (!effectsEl) return;

    // Clear previous elements and classes
    effectsEl.innerHTML = '';
    effectsEl.className = 'weather-effects';

    const effectType = getWeatherEffectType(weathercode, isDay);
    effectsEl.dataset.effect = effectType;
    effectsEl.dataset.weatherCode = String(weathercode);
    effectsEl.dataset.isDay = String(Boolean(isDay));

    if (effectType === 'rain' || effectType === 'storm') {
      // Create falling rain lines with varied weight, speed, and angle.
      const dropCount = effectType === 'storm' ? 72 : 42;
      const rainVariants = effectType === 'storm'
        ? ['rain-drop-heavy', 'rain-drop-heavy', 'rain-drop-mid', 'rain-drop-fine']
        : ['rain-drop-fine', 'rain-drop-mid', 'rain-drop-mid', 'rain-drop-heavy'];
      for (let i = 0; i < dropCount; i++) {
        const drop = document.createElement('div');
        const variant = rainVariants[Math.floor(Math.random() * rainVariants.length)];
        drop.className = `rain-drop ${variant}`;
        drop.style.left = `${Math.random() * 110 - 5}%`;
        drop.style.top = `${Math.random() * -100}px`;
        drop.style.animationDelay = `${Math.random() * 1.4}s`;
        drop.style.animationDuration = `${(effectType === 'storm' ? 0.26 : 0.36) + Math.random() * 0.46}s`;
        drop.style.setProperty('--rain-angle', `${12 + Math.random() * 18}deg`);
        drop.style.setProperty('--rain-drift', `${-32 - Math.random() * 92}px`);
        drop.style.setProperty('--rain-opacity', `${0.58 + Math.random() * 0.34}`);
        drop.style.setProperty('--rain-blur', `${Math.random() > 0.78 ? 0.45 : 0}px`);
        effectsEl.appendChild(drop);
      }
      if (effectType === 'storm') {
        effectsEl.classList.add('stormy-active');
        // Create lightning bolts
        const boltCount = 3;
        for (let i = 0; i < boltCount; i++) {
          const bolt = document.createElement('div');
          bolt.className = 'lightning-bolt';
          bolt.style.left = `${20 + Math.random() * 60}%`;
          bolt.style.height = `${150 + Math.random() * 250}px`;
          bolt.style.animationDelay = `${1 + Math.random() * 5}s`;
          effectsEl.appendChild(bolt);
        }
      }
    } else if (effectType === 'snow') {
      // Create drifting snowflakes
      const flakeCount = 34;
      for (let i = 0; i < flakeCount; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        const size = 3 + Math.random() * 5;
        flake.style.width = `${size}px`;
        flake.style.height = `${size}px`;
        flake.style.left = `${Math.random() * 100}%`;
        flake.style.top = `${Math.random() * -20}px`;
        flake.style.animationDelay = `${Math.random() * 5}s`;
        flake.style.animationDuration = `${2.4 + Math.random() * 2.8}s`;
        effectsEl.appendChild(flake);
      }
    } else if (effectType === 'sunny') {
      // Create sun glow
      const glow = document.createElement('div');
      glow.className = 'sun-glow';
      glow.style.width = '300px';
      glow.style.height = '300px';
      glow.style.top = '-78px';
      glow.style.right = '-82px';
      effectsEl.appendChild(glow);

      // Create sun rays
      const rayAngles = [-24, -8, 8, 24, 40, 56, 72, 88];
      rayAngles.forEach((angle, idx) => {
        const ray = document.createElement('div');
        ray.className = 'sun-ray';
        ray.style.setProperty('--ray-angle', `${angle}deg`);
        ray.style.right = `${-4 + idx * 22}px`;
        ray.style.animationDelay = `${idx * 0.28}s`;
        ray.style.height = `${170 + Math.random() * 80}px`;
        effectsEl.appendChild(ray);
      });

      // Create floating bokeh particles
      const particleCount = 14;
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'sun-particle';
        const size = 34 + Math.random() * 52;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 6}s`;
        particle.style.animationDuration = `${5.5 + Math.random() * 4.5}s`;
        effectsEl.appendChild(particle);
      }
    } else if (effectType === 'starry') {
      // Create stars
      const starCount = 40;
      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = 1.5 + Math.random() * 2.8;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 70}%`;
        star.style.animationDelay = `${Math.random() * 3}s`;
        star.style.animationDuration = `${1.1 + Math.random() * 1.8}s`;
        effectsEl.appendChild(star);
      }

      // Create shooting stars
      const shootingStarCount = 3;
      for (let i = 0; i < shootingStarCount; i++) {
        const ss = document.createElement('div');
        ss.className = 'shooting-star';
        ss.style.left = `${10 + Math.random() * 60}%`;
        ss.style.top = `${10 + Math.random() * 40}%`;
        ss.style.width = `${60 + Math.random() * 50}px`;
        ss.style.animationDelay = `${3 + Math.random() * 8}s`;
        ss.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;
        effectsEl.appendChild(ss);
      }
    } else if (effectType === 'cloudy') {
      // Create drifting cloud masses
      const cloudCount = 7;
      for (let i = 0; i < cloudCount; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'drift-cloud';
        const width = 160 + Math.random() * 130;
        const height = 80 + Math.random() * 60;
        cloud.style.width = `${width}px`;
        cloud.style.height = `${height}px`;
        cloud.style.top = `${10 + Math.random() * 50}%`;
        cloud.style.animationDelay = `${Math.random() * -40}s`;
        cloud.style.animationDuration = `${24 + Math.random() * 22}s`;
        effectsEl.appendChild(cloud);
      }
    } else if (effectType === 'fog') {
      // Create fog layers
      const fogCount = 5;
      for (let i = 0; i < fogCount; i++) {
        const fog = document.createElement('div');
        fog.className = 'fog-layer';
        fog.style.top = `${28 + i * 14}%`;
        fog.style.animationDelay = `${i * -4}s`;
        fog.style.animationDuration = `${8 + Math.random() * 6}s`;
        effectsEl.appendChild(fog);
      }
    }
  },

  // 1. Ekran 1 — Weather Details View
  renderWeatherScreen(city, weatherData, prefs) {
    // Determine current index of the hour
    const currentIdx = getCurrentHourIndex(weatherData.hourly.time, weatherData.timezone);
    if (currentIdx === -1) {
      this.showToast('Błąd indeksu czasu', 'error');
      return;
    }

    const weatherCode = weatherData.hourly.weathercode[currentIdx];
    const isDay = weatherData.hourly.is_day[currentIdx];
    const currentDateKey = getDateKeyFromHour(weatherData.hourly.time[currentIdx]);
    const currentDailyIdx = getDailyIndexForDate(weatherData.daily, currentDateKey);

    // Set background gradient & contrast
    this.setBackground(weatherCode, isDay);

    // Set header city name
    const headerTitle = document.getElementById('weather-header-title');
    if (headerTitle) {
      headerTitle.textContent = city.isGps && city.subtitle ? city.subtitle : city.name;
    }

    // Render Hero Section
    this.renderHero(weatherData.hourly, weatherData.daily, currentIdx, city, prefs, currentDailyIdx);

    // Render "Dziś w skrócie" summary box
    this.renderDaySummary(weatherData.hourly, weatherData.daily, currentIdx);

    // Render Hourly horizontal scroll list
    this.renderHourlyBar(weatherData.hourly, currentIdx, prefs);

    // Render 14-day daily forecast list
    this.renderDailyForecast(weatherData.daily, prefs, weatherData.hourly, currentIdx, currentDailyIdx);

    // Render Details Grid
    this.renderDetailsGrid(weatherData.hourly, weatherData.daily, currentIdx, currentDailyIdx);
  },

  renderHero(hourlyData, dailyData, currentIdx, city, prefs, dailyIdx = 0) {
    const heroIcon = document.getElementById('hero-icon');
    const heroTemp = document.getElementById('hero-temp');
    const heroDesc = document.getElementById('hero-desc');
    const heroFeelsLike = document.getElementById('hero-feels-like');
    const maxTempVal = document.getElementById('hero-temp-max');
    const minTempVal = document.getElementById('hero-temp-min');
    const locationIcon = document.getElementById('hero-location-icon');

    const code = hourlyData.weathercode[currentIdx];
    const isDay = hourlyData.is_day[currentIdx];
    const info = getWeatherInfo(code, isDay);

    if (heroIcon) heroIcon.innerHTML = info.icon;
    if (heroTemp) heroTemp.textContent = formatTemp(hourlyData.temperature_2m[currentIdx], prefs.unit);
    if (heroDesc) heroDesc.textContent = info.label;
    if (heroFeelsLike) {
      heroFeelsLike.textContent = `Odczuwalna ${formatTemp(hourlyData.apparent_temperature[currentIdx], prefs.unit)}`;
    }
    if (locationIcon) {
      locationIcon.style.display = 'inline-block';
      if (city.isGps) {
        locationIcon.textContent = 'my_location';
        locationIcon.style.color = 'var(--accent-blue)';
      } else {
        locationIcon.textContent = 'location_on';
        locationIcon.style.color = '#64748b'; // Slate 500
      }
    }

    const heroSunrise = document.getElementById('hero-sunrise');
    const heroSunset = document.getElementById('hero-sunset');
    if (heroSunrise) heroSunrise.textContent = `${formatTime(dailyData.sunrise[dailyIdx])}`;
    if (heroSunset) heroSunset.textContent = `${formatTime(dailyData.sunset[dailyIdx])}`;

    if (maxTempVal) maxTempVal.textContent = `Max: ${formatTemp(dailyData.temperature_2m_max[dailyIdx], prefs.unit)}`;
    if (minTempVal) minTempVal.textContent = `Min: ${formatTemp(dailyData.temperature_2m_min[dailyIdx], prefs.unit)}`;
  },

  renderDaySummary(hourlyData, dailyData, currentIdx) {
    const summaryText = document.getElementById('summary-text');
    if (summaryText) {
      summaryText.textContent = getDaySummary(hourlyData, currentIdx);
    }
  },

  renderHourlyBar(hourlyData, currentIdx, prefs) {
    const container = document.getElementById('hourly-scroll-container');
    if (!container) return;
    container.innerHTML = '';

    // Renders from current hour to end of next day
    const currentISO = hourlyData.time[currentIdx];
    const currentDateStr = currentISO.slice(0, 10);

    let itemsToRender = [];
    let separatorAdded = false;

    // Get up to ~33 hours limit or until the end of tomorrow (index max currentIdx + 36)
    const maxIdx = Math.min(currentIdx + 36, hourlyData.time.length);

    for (let i = currentIdx; i < maxIdx; i++) {
      const timeStr = hourlyData.time[i];
      const dateStr = timeStr.slice(0, 10);

      // Check if day changed, add tomorrow separator
      if (!separatorAdded && dateStr !== currentDateStr) {
        itemsToRender.push({ type: 'separator', label: 'Jutro' });
        separatorAdded = true;
      }

      itemsToRender.push({
        type: 'hour',
        time: formatTime(timeStr),
        isoTime: timeStr,
        code: hourlyData.weathercode[i],
        isDay: hourlyData.is_day[i],
        temp: formatTemp(hourlyData.temperature_2m[i], prefs.unit),
        windSpeed: hourlyData.windspeed_10m?.[i],
        windDir: hourlyData.winddirection_10m?.[i],
        isActive: i === currentIdx
      });
    }

    itemsToRender.forEach(item => {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'hourly-separator';
        sep.textContent = item.label;
        container.appendChild(sep);
      } else {
        const card = document.createElement('div');
        card.className = `hourly-card ${item.isActive ? 'active' : ''}`;
        card.dataset.time = item.isoTime;
        const wind = getWindDisplay(item.windSpeed, item.windDir);
        const windLabel = wind
          ? `${wind.arrow} ${wind.speed} <span class="wind-unit">km/h</span>`
          : '--';
        card.title = `${item.isActive ? 'Teraz' : item.time}: ${item.temp}${wind ? `, wiatr ${wind.speed} km/h` : ''}`;
        
        const info = getWeatherInfo(item.code, item.isDay);
        
        card.innerHTML = `
          <span class="hourly-time">${item.isActive ? 'Teraz' : item.time}</span>
          <span class="hourly-icon">${info.icon}</span>
          <span class="hourly-temp">${item.temp}</span>
          <span class="hourly-wind" aria-label="${wind ? `Wiatr ${wind.speed} km/h` : 'Brak danych o wietrze'}">${windLabel}</span>
        `;
        container.appendChild(card);
      }
    });
  },

  ensureForecastChartPanel(container) {
    let panel = document.getElementById('forecast-chart-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'forecast-chart-panel';
      panel.className = 'forecast-chart-panel hidden';
    }
    container.insertAdjacentElement('beforebegin', panel);
    return panel;
  },

  renderDailyForecast(dailyData, prefs, hourlyData, currentIdx, dailyStartIdx = 0) {
    const container = document.getElementById('forecast-list-container');
    if (!container) return;
    container.innerHTML = '';
    const chartPanel = this.ensureForecastChartPanel(container);
    chartPanel.classList.add('hidden');
    chartPanel.innerHTML = '';

    const todayDateKey = getDateKeyFromHour(hourlyData?.time?.[currentIdx]);
    const safeDailyStartIdx = Math.max(0, Math.min(dailyStartIdx, dailyData.time.length - 1));

    // Render up to 14 days
    const limit = Math.min(14, dailyData.time.length - safeDailyStartIdx);
    if (limit <= 0) return;
    
    // Calculate global min and max for temperature range bars
    let globalMin = Math.min(...dailyData.temperature_2m_min.slice(safeDailyStartIdx, safeDailyStartIdx + limit));
    let globalMax = Math.max(...dailyData.temperature_2m_max.slice(safeDailyStartIdx, safeDailyStartIdx + limit));
    if (globalMin === globalMax) globalMax += 1; // avoid div by 0
    const globalRange = globalMax - globalMin;
    for (let offset = 0; offset < limit; offset++) {
      const i = safeDailyStartIdx + offset;
      const dayName = getDayLabel(dailyData.time[i], offset, todayDateKey);
      const code = dailyData.weathercode[i];
      const info = getWeatherInfo(code, true);
      const dayMin = dailyData.temperature_2m_min[i];
      const dayMax = dailyData.temperature_2m_max[i];
      const minT = formatTemp(dayMin, prefs.unit);
      const maxT = formatTemp(dayMax, prefs.unit);
      const rainMm = Math.max(0, Number(dailyData.precipitation_sum?.[i] || 0));
      const hasRainAmount = rainMm > 0;
      const rainMmText = rainMm > 0 && rainMm < 0.1 ? '<0.1' : (rainMm >= 10 ? Math.round(rainMm) : rainMm.toFixed(1).replace('.0', ''));

      const prob = dailyData.precipitation_probability_max[i] || 0;
      const rainAmount = hasRainAmount ? `${rainMmText} mm` : 'brak';
      const rainDisplay = hasRainAmount ? `${rainMmText} mm` : '';
      const rainChance = prob >= 20 ? `${prob}%` : '';
      const wind = getWindDisplay(dailyData.windspeed_10m_max?.[i], dailyData.winddirection_10m_dominant?.[i]);
      const windInfo = wind ? `${wind.arrow}${wind.speed}` : '--';
      const windAria = wind ? `Wiatr maksymalny ${wind.speed} km/h` : 'Brak danych o wietrze';
      const chartEnabled = offset < 3;

      // Calculate width and position for temperature bar
      const leftPercent = ((dayMin - globalMin) / globalRange) * 100;
      const widthPercent = ((dayMax - dayMin) / globalRange) * 100;

      // Color based on temperature (cooler = blueish, hotter = orange/red)
      let barColor = 'var(--accent-orange)';
      if (dayMax < 0) barColor = 'var(--accent-blue)';
      else if (dayMax < 15) barColor = 'var(--accent-teal)';
      else if (dayMax > 28) barColor = 'var(--accent-red)';

      const displayWidthPercent = Math.max(widthPercent, 5);
      const displayLeftPercent = Math.max(0, Math.min(leftPercent, 100 - displayWidthPercent));
      const barStyle = `left: ${displayLeftPercent}%; width: ${displayWidthPercent}%; --bar-color: ${barColor};`;

      const row = document.createElement('div');
      row.className = chartEnabled ? 'forecast-row chart-enabled' : 'forecast-row';
      if (chartEnabled) {
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', `${dayName}. Pokaż wykres opadów i wiatru. Opady ${hasRainAmount ? rainAmount : 'brak'}${rainChance ? `, prawdopodobieństwo ${rainChance}` : ''}. ${windAria}`);
      }
      row.innerHTML = `
        <span class="forecast-day">${dayName}</span>
        <div class="forecast-icon-wrapper">
          <span class="forecast-icon">${info.icon}</span>
        </div>
        <div class="forecast-conditions ${hasRainAmount ? 'has-rain' : 'no-rain'}">
          <span class="forecast-condition rain ${hasRainAmount ? '' : 'empty'}" ${hasRainAmount ? '' : 'aria-hidden="true"'}>${hasRainAmount ? `${rainDisplay}${rainChance ? `<small>${rainChance}</small>` : ''}` : ''}</span>
          <span class="forecast-condition wind">${windInfo} <span class="wind-unit">km/h</span></span>
        </div>
        <div class="forecast-bar-container">
          <span class="forecast-temp min">${minT}</span>
          <div class="forecast-bar">
            <div class="forecast-bar-fill" style="${barStyle}"></div>
          </div>
          <span class="forecast-temp max">${maxT}</span>
        </div>
      `;
      if (chartEnabled) {
        const showChart = () => {
          container.querySelectorAll('.forecast-row.active').forEach(activeRow => {
            activeRow.classList.remove('active');
          });
          row.classList.add('active');
          this.renderForecastTrendChart(hourlyData, dailyData, i, currentIdx);
        };
        row.addEventListener('click', showChart);
        row.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            showChart();
          }
        });
      }
      container.appendChild(row);
    }

    const firstChartRow = container.querySelector('.forecast-row.chart-enabled');
    if (firstChartRow && hourlyData) {
      firstChartRow.classList.add('active');
      this.renderForecastTrendChart(hourlyData, dailyData, safeDailyStartIdx, currentIdx);
    }
  },

  renderForecastTrendChart(hourlyData, dailyData, dayIndex = 0, currentIdx = 0) {
    const panel = document.getElementById('forecast-chart-panel');
    if (!panel || !hourlyData || !dailyData || currentIdx < 0) return;

    const chartDate = dailyData.time?.[dayIndex];
    const currentDateKey = getDateKeyFromHour(hourlyData.time?.[currentIdx]);
    const dateStartIdx = chartDate ? hourlyData.time.findIndex(time => time.startsWith(chartDate)) : -1;
    const startIdx = chartDate === currentDateKey ? Math.max(0, currentIdx) : dateStartIdx;
    if (startIdx < 0) return;
    const endIdx = Math.min(startIdx + 24, hourlyData.time.length);
    const points = [];
    for (let i = startIdx; i < endIdx; i++) {
      points.push({
        time: hourlyData.time[i],
        rain: Number(hourlyData.precipitation?.[i] || 0),
        wind: Number(hourlyData.windspeed_10m?.[i] || 0)
      });
    }

    if (!points.length) return;

    const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
    const hexToRgb = hex => {
      const normalized = hex.replace('#', '');
      return [
        parseInt(normalized.slice(0, 2), 16),
        parseInt(normalized.slice(2, 4), 16),
        parseInt(normalized.slice(4, 6), 16)
      ];
    };
    const mixHex = (from, to, amount) => {
      const start = hexToRgb(from);
      const end = hexToRgb(to);
      const mixed = start.map((channel, index) => Math.round(channel + (end[index] - channel) * amount));
      return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
    };
    const scaleColor = (value, limit, low, mid, high) => {
      const ratio = clamp(value / limit);
      if (ratio < 0.5) return mixHex(low, mid, ratio * 2);
      return mixHex(mid, high, (ratio - 0.5) * 2);
    };
    const getRainColor = value => scaleColor(value, 6, '#69b8dc', '#f0a64b', '#d94b42');
    const getWindColor = value => scaleColor(value, 45, '#617d92', '#eba03d', '#d8433e');

    const maxRainActual = Math.max(0, ...points.map(point => point.rain));
    const maxWindActual = Math.max(0, ...points.map(point => point.wind));
    const maxRain = Math.max(0.4, maxRainActual);
    const maxWind = Math.max(1, maxWindActual);
    const maxRainText = maxRainActual > 0
      ? `${maxRainActual >= 10 ? Math.round(maxRainActual) : maxRainActual.toFixed(1).replace('.0', '')} mm`
      : '0 mm';
    const maxWindText = `${Math.round(maxWindActual)} km/h`;
    const chartDayLabel = getDayLabel(chartDate || points[0].time.slice(0, 10), dayIndex, currentDateKey);
    const formatRainScale = value => value >= 10 ? `${Math.round(value)}` : value.toFixed(1).replace('.0', '');
    const formatWindScale = value => `${Math.round(value)}`;
    const width = 320;
    const height = 144;
    const left = 42;
    const right = 44;
    const top = 16;
    const bottom = 26;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const step = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
    const barWidth = Math.max(4, Math.min(10, chartWidth / points.length * 0.56));

    const rainBars = points.map((point, index) => {
      const barHeight = Math.max(point.rain > 0 ? 2 : 0, (point.rain / maxRain) * chartHeight);
      const x = left + index * step - barWidth / 2;
      const y = top + chartHeight - barHeight;
      const opacity = point.rain > 0 ? (0.58 + clamp(point.rain / 6) * 0.34).toFixed(2) : '0';
      return `<rect class="forecast-chart-rain-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="2" style="--rain-color: ${getRainColor(point.rain)}; --rain-opacity: ${opacity};"/>`;
    }).join('');

    const windCoords = points.map((point, index) => {
      const x = left + index * step;
      const y = top + chartHeight - (point.wind / maxWind) * chartHeight;
      return { ...point, x, y };
    });

    const windSegments = windCoords.slice(1).map((point, index) => {
      const prev = windCoords[index];
      const averageWind = (prev.wind + point.wind) / 2;
      return `<path class="forecast-chart-wind-segment" d="M ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} L ${point.x.toFixed(1)} ${point.y.toFixed(1)}" style="--wind-color: ${getWindColor(averageWind)}"/>`;
    }).join('');

    const windPoints = windCoords
      .filter((_, index) => index % 4 === 0 || index === points.length - 1)
      .map(point => {
        return `<circle class="forecast-chart-wind-point" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.7" style="--wind-color: ${getWindColor(point.wind)}"/>`;
      }).join('');

    const labels = points
      .filter((_, index) => index % 6 === 0 || index === points.length - 1)
      .map((point, index, sampled) => {
        const originalIndex = index === sampled.length - 1 ? points.length - 1 : index * 6;
        const x = left + originalIndex * step;
        return `<text class="forecast-chart-axis-label" x="${x.toFixed(1)}" y="${height - 6}" text-anchor="middle">${formatTime(point.time)}</text>`;
      }).join('');

    const scaleTicks = [1, 0.5, 0];
    const rainScaleLabels = scaleTicks.map((tick, index) => {
      const y = top + chartHeight - tick * chartHeight;
      const value = formatRainScale(maxRain * tick);
      const suffix = index === 0 ? ' mm' : '';
      return `<text class="forecast-chart-y-label rain" x="${left - 7}" y="${(y + 3).toFixed(1)}" text-anchor="end">${value}${suffix}</text>`;
    }).join('');
    const windScaleLabels = scaleTicks.map((tick, index) => {
      const y = top + chartHeight - tick * chartHeight;
      const value = formatWindScale(maxWind * tick);
      const suffix = index === 0 ? ' km/h' : '';
      return `<text class="forecast-chart-y-label wind" x="${left + chartWidth + 7}" y="${(y + 3).toFixed(1)}" text-anchor="start">${value}${suffix}</text>`;
    }).join('');

    panel.className = 'forecast-chart-panel';
    panel.dataset.dayIndex = String(dayIndex);
    panel.innerHTML = `
      <div class="forecast-chart-head">
        <div class="forecast-chart-title">
          <span class="forecast-chart-eyebrow">${chartDayLabel} · 24h</span>
          <h3>Opady i wiatr</h3>
        </div>
        <div class="forecast-chart-actions">
          <div class="forecast-chart-scale">
            <span><i class="rain"></i>${maxRainText}</span>
            <span><i class="wind"></i>${maxWindText}</span>
          </div>
          <button class="forecast-chart-close" type="button" data-chart-close aria-label="Zamknij wykres">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      </div>
      <svg class="forecast-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Wykres opadów i wiatru dla ${chartDayLabel} na 24 godziny">
        <rect class="forecast-chart-plot-bg" x="${left}" y="${top}" width="${chartWidth}" height="${chartHeight}" rx="8"/>
        <line class="forecast-chart-axis rain-axis" x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}"/>
        <line class="forecast-chart-axis wind-axis" x1="${left + chartWidth}" y1="${top}" x2="${left + chartWidth}" y2="${top + chartHeight}"/>
        <line class="forecast-chart-grid" x1="${left}" y1="${top}" x2="${left + chartWidth}" y2="${top}"/>
        <line class="forecast-chart-grid" x1="${left}" y1="${top + chartHeight / 2}" x2="${left + chartWidth}" y2="${top + chartHeight / 2}"/>
        <line class="forecast-chart-grid baseline" x1="${left}" y1="${top + chartHeight}" x2="${left + chartWidth}" y2="${top + chartHeight}"/>
        ${rainScaleLabels}
        ${windScaleLabels}
        ${rainBars}
        ${windSegments}
        ${windPoints}
        ${labels}
      </svg>
    `;
    const closeButton = panel.querySelector('[data-chart-close]');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        panel.classList.add('hidden');
        panel.innerHTML = '';
        document.querySelectorAll('#forecast-list-container .forecast-row.active').forEach(activeRow => {
          activeRow.classList.remove('active');
        });
      });
    }
    requestAnimationFrame(() => {
      panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  },

  renderDetailsGrid(hourlyData, dailyData, currentIdx, dailyIdx = 0) {
    const sunriseVal = document.getElementById('details-sunrise');
    const sunsetVal = document.getElementById('details-sunset');
    const windSpeed = document.getElementById('details-wind-speed');
    const windDir = document.getElementById('details-wind-dir');
    const humidity = document.getElementById('details-humidity');
    const dewPoint = document.getElementById('details-dew-point');
    const uvIndex = document.getElementById('details-uv-index');
    const uvDesc = document.getElementById('details-uv-desc');
    const visibility = document.getElementById('details-visibility');
    const visibilityDesc = document.getElementById('details-visibility-desc');

    // Sunrise & Sunset
    if (sunriseVal) sunriseVal.textContent = formatTime(dailyData.sunrise[dailyIdx]);
    if (sunsetVal) sunsetVal.textContent = `Zachód: ${formatTime(dailyData.sunset[dailyIdx])}`;

    // Wind speed & Cardinal direction
    const speed = Math.round(hourlyData.windspeed_10m[currentIdx]);
    const dirDeg = hourlyData.winddirection_10m[currentIdx];
    if (windSpeed) windSpeed.textContent = `${speed} km/h`;
    if (windDir) windDir.textContent = degreesToCardinal(dirDeg);

    // Humidity
    const hum = hourlyData.relativehumidity_2m[currentIdx];
    if (humidity) humidity.textContent = `${hum}%`;
    
    // Dew Point estimation: T_d = T - ((100 - RH)/5)
    const t = hourlyData.temperature_2m[currentIdx];
    const dp = Math.round(t - ((100 - hum) / 5));
    if (dewPoint) dewPoint.textContent = `Punkt rosy ${dp}°`;

    // UV Index
    const uv = Math.round(hourlyData.uv_index[currentIdx]);
    if (uvIndex) {
      uvIndex.textContent = uv;
      uvIndex.style.color = uvColor(uv);
    }
    
    let uvText = 'Niski';
    if (uv > 2) uvText = 'Umiarkowany';
    if (uv > 5) uvText = 'Wysoki';
    if (uv > 7) uvText = 'Bardzo wysoki';
    if (uv > 10) uvText = 'Ekstremalny';
    if (uvDesc) uvDesc.textContent = uvText;

    // Visibility
    const visMeters = hourlyData.visibility[currentIdx]; // in meters
    const visKm = Math.round(visMeters / 1000);
    if (visibility) visibility.textContent = `${visKm} km`;
    
    let visText = 'Dobra';
    if (visKm < 1) visText = 'Bardzo słaba';
    else if (visKm < 4) visText = 'Słaba';
    else if (visKm < 10) visText = 'Umiarkowana';
    if (visibilityDesc) visibilityDesc.textContent = visText;
  },

  renderDots(cities, activeIndex, onSelect) {
    const container = document.getElementById('dots-container');
    if (!container) return;
    if (!cities || cities.length === 0) {
      container.innerHTML = '';
      container.dataset.citySignature = '';
      return;
    }

    const signature = cities.map(city => city.id).join('|');
    let track = container.querySelector('.city-pager-track');
    const shouldRebuild = !track || container.dataset.citySignature !== signature;

    if (shouldRebuild) {
      container.innerHTML = '';
      track = document.createElement('div');
      track.className = 'city-pager-track';

    cities.forEach((city, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'city-pager-item';
      item.dataset.index = String(index);
      item.setAttribute('aria-label', `Pokaż miasto ${city.name}`);
      item.textContent = city.isGps && city.subtitle && city.subtitle !== 'Brak uprawnień GPS'
        ? city.subtitle
        : city.name;
      item.addEventListener('click', () => {
        const itemIndex = Number(item.dataset.index);
        if (typeof onSelect === 'function') {
          onSelect(itemIndex);
        }
      });
      track.appendChild(item);
    });

      container.appendChild(track);
      container.dataset.citySignature = signature;
    }

    track.querySelectorAll('.city-pager-item').forEach((item, index) => {
      const city = cities[index];
      item.dataset.index = String(index);
      item.classList.toggle('active', index === activeIndex);
      item.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
      item.textContent = city.isGps && city.subtitle ? city.subtitle : city.name;
    });

    const activeItem = track.querySelector('.city-pager-item.active');
    if (activeItem) {
      requestAnimationFrame(() => {
        const targetLeft = activeItem.offsetLeft - (track.clientWidth - activeItem.offsetWidth) / 2;
        track.scrollTo({ left: Math.max(0, targetLeft), behavior: shouldRebuild ? 'auto' : 'smooth' });
      });
    }
  },

  // 2. Ekran 2 — Moje Miasta View
  renderCityList(cities, weatherMap, prefs, activeIndex, onSelect, onDelete) {
    const listContainer = document.getElementById('city-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const activeCity = cities[activeIndex] || cities[0];
    const savedCount = cities.filter(city => !city.isGps).length;
    const totalCount = cities.length;
    const listShell = document.createElement('div');
    listShell.className = 'city-list-shell';

    if (activeCity) {
      const overview = document.createElement('div');
      overview.className = 'city-list-overview';
      overview.innerHTML = `
        <div class="city-list-overview-main">
          <span class="city-list-overview-label">Aktywne miasto</span>
          <span class="city-list-overview-name">${activeCity.name}</span>
        </div>
        <div class="city-list-overview-count">
          <span class="material-symbols-outlined">location_city</span>
          <span>${totalCount}</span>
          <small>${totalCount === 1 ? 'miasto' : 'miasta'}</small>
        </div>
      `;
      listShell.appendChild(overview);
    }

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'city-list-items';

    cities.forEach((city, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = `city-card-wrapper ${index === activeIndex ? 'active' : ''}`;

      const card = document.createElement('button');
      card.className = 'city-card';
      card.setAttribute('aria-pressed', index === activeIndex ? 'true' : 'false');

      // Load card values if weather is cached/fetched
      const weather = weatherMap.get(city.id);
      
      let subtitle = city.admin1 ? `${city.admin1}, ${city.country_code}` : (city.country_code || '');
      if (city.isGps) {
        subtitle = city.subtitle || 'Wyszukiwanie lokalizacji...';
      }

      let cardWeatherHtml = '';
      if (city.isGps && (city.latitude === null || city.longitude === null)) {
        // GPS active but coords not ready
        cardWeatherHtml = `
          <div class="skeleton-loader" style="width: 80px; height: 32px;">
            <div class="skeleton-item" style="width: 100%; height: 100%;"></div>
          </div>
        `;
      } else if (weather && !weather.error) {
        const curIdx = getCurrentHourIndex(weather.hourly.time, weather.timezone);
        if (curIdx === -1) {
          cardWeatherHtml = `<span class="city-card-subtitle" style="color: var(--accent-red)">Brak godziny</span>`;
        } else {
          const tempVal = formatTemp(weather.hourly.temperature_2m[curIdx], prefs.unit);
          const code = weather.hourly.weathercode[curIdx];
          const isDay = weather.hourly.is_day[curIdx];
          const info = getWeatherInfo(code, isDay);

          cardWeatherHtml = `
            <span class="city-card-temp">${tempVal}</span>
            <span class="city-card-icon" aria-hidden="true">${info.icon}</span>
          `;
        }
      } else if (weather && weather.error) {
        cardWeatherHtml = `<span class="city-card-subtitle" style="color: var(--accent-red)">Błąd danych</span>`;
      } else {
        // Spinner or loading
        cardWeatherHtml = `
          <div class="skeleton-loader" style="width: 60px; height: 30px;">
            <div class="skeleton-item" style="width: 100%; height: 100%;"></div>
          </div>
        `;
      }

      const cityInitial = (city.name || '?').trim().charAt(0).toUpperCase();
      const cityMarker = city.isGps
        ? '<span class="material-symbols-outlined city-card-marker city-card-marker-gps">my_location</span>'
        : `<span class="city-card-marker">${cityInitial}</span>`;
      const holdHint = city.isGps ? '' : '<span class="city-card-hold-hint">Przytrzymaj, aby usunąć</span>';

      card.innerHTML = `
        <div class="city-card-info">
          ${cityMarker}
          <div class="city-card-names">
            <span class="city-card-title">
              <span class="city-card-title-text">${city.name}</span>
              ${index === activeIndex ? '<span class="city-card-active-label">Teraz</span>' : ''}
            </span>
            <span class="city-card-subtitle">${subtitle}</span>
            ${holdHint}
          </div>
        </div>
        <div class="city-card-weather">
          ${cardWeatherHtml}
        </div>
      `;

      let longPressTimer = null;
      let longPressTriggered = false;
      let pressStartX = 0;
      let pressStartY = 0;
      const clearLongPress = () => {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
        wrapper.classList.remove('holding');
      };

      if (!city.isGps) {
        card.addEventListener('pointerdown', (e) => {
          if (e.button !== 0 && e.pointerType === 'mouse') return;
          longPressTriggered = false;
          pressStartX = e.clientX;
          pressStartY = e.clientY;
          wrapper.classList.add('holding');
          longPressTimer = window.setTimeout(() => {
            longPressTriggered = true;
            clearLongPress();
            onDelete(index);
          }, 720);
        });

        card.addEventListener('pointermove', (e) => {
          if (!longPressTimer) return;
          if (Math.abs(e.clientX - pressStartX) > 10 || Math.abs(e.clientY - pressStartY) > 10) {
            clearLongPress();
          }
        });

        card.addEventListener('pointerup', clearLongPress);
        card.addEventListener('pointercancel', clearLongPress);
        card.addEventListener('pointerleave', clearLongPress);
      }

      // Tap card action -> change active city & go to Ekran 1
      card.addEventListener('click', (e) => {
        if (longPressTriggered) {
          longPressTriggered = false;
          e.preventDefault();
          return;
        }
        onSelect(index);
      });

      wrapper.appendChild(card);

      // Legacy swipe-delete block disabled; deletion is handled by long press above.
      if (false && !city.isGps) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'city-card-delete';
        deleteBtn.innerHTML = `
          <span class="material-symbols-outlined">delete</span>
          <span>Usuń</span>
        `;
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          onDelete(index);
        });

        wrapper.appendChild(deleteBtn);

        // Touch event swipe tracking
        let startX = 0;
        let startY = 0;
        const swipeThreshold = 50;

        card.addEventListener('touchstart', (e) => {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }, { passive: true });

        card.addEventListener('touchend', (e) => {
          const deltaX = startX - e.changedTouches[0].clientX;
          const deltaY = Math.abs(startY - e.changedTouches[0].clientY);

          // If horizontal swipe, ignore vertical scrolling
          if (deltaY < 30) {
            if (deltaX > swipeThreshold) {
              // Swipe left -> reveal delete button
              // Remove swiped state from all other items first
              document.querySelectorAll('.city-card-wrapper').forEach(w => {
                if (w !== wrapper) w.classList.remove('swiped');
              });
              wrapper.classList.add('swiped');
            } else if (deltaX < -swipeThreshold) {
              // Swipe right -> hide delete button
              wrapper.classList.remove('swiped');
            }
          }
        }, { passive: true });
      }

      itemsContainer.appendChild(wrapper);
    });

    if (savedCount === 0) {
      const note = document.createElement('div');
      note.className = 'city-list-empty-note';
      note.textContent = 'Dodane miasta pojawią się tutaj.';
      itemsContainer.appendChild(note);
    }

    listShell.appendChild(itemsContainer);
    listContainer.appendChild(listShell);
  },

  // 3. Ekran 3 — Wyszukiwanie View
  renderSearchResults(results, savedCities, onAddCity, options = {}) {
    const resultsContainer = document.getElementById('search-results-list');
    const stateContainer = document.getElementById('search-state-container');
    const resultsSection = resultsContainer ? resultsContainer.closest('.search-results-section') : null;
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';
    
    if (stateContainer) {
      stateContainer.classList.add('hidden');
    }

    if (!results || results.length === 0) {
      if (resultsSection) {
        resultsSection.classList.add('hidden');
      }
      if (stateContainer) {
        stateContainer.classList.add('hidden');
        const isPrompt = options.emptyMode === 'prompt';
        stateContainer.innerHTML = isPrompt
          ? `
            <span class="material-symbols-outlined state-icon">travel_explore</span>
            <span class="state-title">Wpisz nazwę miasta</span>
            <span class="state-desc">Wyniki pojawią się po wpisaniu co najmniej dwóch znaków.</span>
          `
          : `
            <span class="material-symbols-outlined state-icon">search_off</span>
            <span class="state-title">Brak wyników</span>
            <span class="state-desc">Nie znaleziono miast pasujących do zapytania.</span>
          `;
      }
      return;
    }

    if (resultsSection) {
      resultsSection.classList.remove('hidden');
    }

    results.forEach(res => {
      const isAlreadyAdded = savedCities.some(c => c.id === res.id);
      
      const item = document.createElement('li');
      item.className = 'search-result-item';
      if (isAlreadyAdded) item.classList.add('already-added');
      
      const details = res.admin1 ? `${res.admin1}, ${res.country}` : res.country;

      item.innerHTML = `
        <div class="search-result-info">
          <span class="search-result-name">${res.name}</span>
          <span class="search-result-details">${details}</span>
        </div>
        <button class="search-result-add-btn" aria-label="Dodaj ${res.name}" ${isAlreadyAdded ? 'disabled' : ''}>
          <span class="material-symbols-outlined">${isAlreadyAdded ? 'done' : 'add'}</span>
        </button>
      `;

      item.addEventListener('click', () => {
        if (!isAlreadyAdded) onAddCity(res);
      });

      resultsContainer.appendChild(item);
    });
  },

  // Skeleton Loader screen toggle
  showSkeleton(visible) {
    const mainContent = document.getElementById('weather-content-wrapper');
    const skeleton = document.getElementById('weather-skeleton-wrapper');
    if (!mainContent || !skeleton) return;

    if (visible) {
      mainContent.classList.add('hidden');
      skeleton.classList.remove('hidden');
    } else {
      mainContent.classList.remove('hidden');
      skeleton.classList.add('hidden');
    }
  },

  // Spinner inside geocoding input
  setSearchLoading(visible) {
    const spinner = document.getElementById('search-input-spinner');
    if (spinner) {
      spinner.style.display = visible ? 'block' : 'none';
    }
  },

  showCityDeleteConfirm(cityName, onConfirm) {
    const existing = document.querySelector('.delete-confirm-overlay');
    if (existing) existing.remove();

    const safeName = String(cityName || 'miasto').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));

    const overlay = document.createElement('div');
    overlay.className = 'delete-confirm-overlay';
    overlay.innerHTML = `
      <div class="delete-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
        <div class="delete-confirm-icon">
          <span class="material-symbols-outlined">location_off</span>
        </div>
        <div class="delete-confirm-copy">
          <span id="delete-confirm-title" class="delete-confirm-title">Usunąć miasto?</span>
          <span class="delete-confirm-desc">"${safeName}" zniknie z listy zapisanych miejsc.</span>
        </div>
        <div class="delete-confirm-actions">
          <button class="delete-confirm-btn secondary" type="button" data-action="cancel">Anuluj</button>
          <button class="delete-confirm-btn danger" type="button" data-action="confirm">Usuń</button>
        </div>
      </div>
    `;

    const close = () => {
      overlay.classList.remove('visible');
      window.setTimeout(() => overlay.remove(), 180);
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      close();
      onConfirm();
    });

    (document.querySelector('.app-container') || document.body).appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
  },

  // Global Toast Messages
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    container.innerHTML = `
      <div class="toast ${type}">
        <span class="material-symbols-outlined">
          ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
        </span>
        <span>${message}</span>
      </div>
    `;

    container.classList.add('visible');

    // Auto dismiss after 3 seconds
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      container.classList.remove('visible');
    }, 3000);
  },

  // Offline warnings (Removed by user request)
  showOfflineBanner(visible) {
    // Stub to prevent errors since the banner HTML was removed
  }
};
