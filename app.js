// Atmos fetches public Open-Meteo data, then renders all temperatures from Celsius.
const $ = (id) => document.getElementById(id);
const state = { unit: "c", weather: null, rainSeeded: false, suggestions: [], activeSuggestion: -1, suggestionRequest: 0 };
const els = {
  form: $("searchForm"), input: $("cityInput"), status: $("statusMessage"),
  suggestions: $("citySuggestions"),
  loading: $("loadingOverlay"), dashboard: $("dashboard"), location: $("locationButton"),
  celsius: $("celsiusButton"), fahrenheit: $("fahrenheitButton"),
};

// WMO code groups cover clear, cloudy, fog, drizzle, rain, snow, showers, and storms.
function weatherInfo(code) {
  if (code === 0) return { text: "Clear sky", icon: "☀️", kind: "sunny" };
  if (code === 1) return { text: "Mainly clear", icon: "🌤️", kind: "sunny" };
  if (code === 2) return { text: "Partly cloudy", icon: "⛅", kind: "cloudy" };
  if (code === 3) return { text: "Overcast", icon: "☁️", kind: "cloudy" };
  if ([45, 48].includes(code)) return { text: "Foggy", icon: "🌫️", kind: "cloudy" };
  if ([51, 53, 55].includes(code)) return { text: "Drizzle", icon: "🌦️", kind: "rainy" };
  if ([56, 57].includes(code)) return { text: "Freezing drizzle", icon: "🌧️", kind: "rainy" };
  if ([61, 63, 65].includes(code)) return { text: "Rain", icon: "🌧️", kind: "rainy" };
  if ([66, 67].includes(code)) return { text: "Freezing rain", icon: "🌧️", kind: "rainy" };
  if ([71, 73, 75, 77].includes(code)) return { text: "Snow", icon: "❄️", kind: "cloudy" };
  if ([80, 81, 82].includes(code)) return { text: "Rain showers", icon: "🌦️", kind: "rainy" };
  if ([85, 86].includes(code)) return { text: "Snow showers", icon: "🌨️", kind: "cloudy" };
  if ([95, 96, 99].includes(code)) return { text: "Thunderstorm", icon: "⛈️", kind: "rainy" };
  return { text: "Changeable", icon: "🌤️", kind: "cloudy" };
}

function toDisplay(celsius) {
  return state.unit === "c" ? celsius : (celsius * 9 / 5) + 32;
}
function temperature(celsius) { return `${Math.round(toDisplay(celsius))}°`; }
function formatHour(localTime, index) {
  if (index === 0) return "Now";
  // Open-Meteo returns wall-clock times in the forecast location's timezone.
  const [hours, minutes] = localTime.split("T")[1].split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], { hour: "numeric" });
}

function setAtmosphere(code, isDay) {
  const info = weatherInfo(code);
  // Night takes precedence over clear/cloudy states, while rain remains visibly rainy.
  const kind = info.kind === "rainy" ? "rainy" : (!isDay ? "night" : info.kind);
  document.body.className = `weather-${kind}`;
  $("currentIcon").textContent = kind === "night" && info.kind === "sunny" ? "🌙" : info.icon;
  if (kind === "rainy") seedRain();
}

function seedRain() {
  if (state.rainSeeded) return;
  const rain = $("rain");
  for (let i = 0; i < 55; i++) {
    const drop = document.createElement("i");
    drop.className = "drop";
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDuration = `${0.65 + Math.random() * 0.7}s`;
    drop.style.animationDelay = `${Math.random() * -2}s`;
    rain.append(drop);
  }
  state.rainSeeded = true;
}

function render() {
  const data = state.weather;
  if (!data) return;
  const { current, hourly, daily, location } = data;
  const currentInfo = weatherInfo(current.weather_code);
  $("cityName").textContent = location.name + (location.country ? `, ${location.country}` : "");
  $("currentDate").textContent = new Date(`${current.time.slice(0, 10)}T12:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  $("currentTemp").textContent = Math.round(toDisplay(current.temperature_2m));
  $("currentUnit").textContent = state.unit === "c" ? "°C" : "°F";
  $("weatherDescription").textContent = currentInfo.text;
  $("feelsLike").textContent = `${temperature(current.apparent_temperature)}${state.unit === "c" ? "C" : "F"}`;
  $("humidity").textContent = `${Math.round(current.relative_humidity_2m)}%`;
  $("windSpeed").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  setAtmosphere(current.weather_code, current.is_day === 1);

  let start = hourly.time.findIndex((t) => t >= current.time);
  if (start < 0) start = 0;
  $("hourlyForecast").innerHTML = hourly.time.slice(start, start + 24).map((time, offset) => {
    const i = start + offset;
    return `<div class="hour-item"><span class="hour-time">${formatHour(time, offset)}</span><span class="hour-icon" aria-hidden="true">${weatherInfo(hourly.weather_code[i]).icon}</span><span class="hour-temp">${temperature(hourly.temperature_2m[i])}</span></div>`;
  }).join("");

  $("dailyForecast").innerHTML = daily.time.map((date, i) => {
    const day = new Date(`${date}T12:00:00`);
    const dayName = i === 0 ? "Today" : day.toLocaleDateString([], { weekday: "short" });
    const description = weatherInfo(daily.weather_code[i]);
    const rain = Math.round(daily.precipitation_probability_max[i] ?? 0);
    return `<div class="day-row"><div class="day-name">${dayName}<small>${day.toLocaleDateString([], { month: "short", day: "numeric" })}</small></div><div class="day-weather"><span aria-hidden="true">${description.icon}</span><span>${description.text}</span></div><div class="temp-range"><span>${temperature(daily.temperature_2m_max[i])}</span><span class="range-track" aria-hidden="true"></span><span class="low">${temperature(daily.temperature_2m_min[i])}</span></div><div class="rain-chance">💧 ${rain}%</div></div>`;
  }).join("");
}

async function fetchForecast(location) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: location.latitude, longitude: location.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    timezone: "auto", forecast_days: "7",
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error("We couldn’t reach the forecast service. Please try again.");
  return response.json();
}

async function loadByCoordinates(location) {
  els.loading.hidden = false;
  els.dashboard.setAttribute("aria-busy", "true");
  els.status.textContent = "";
  try {
    const forecast = await fetchForecast(location);
    state.weather = { current: forecast.current, hourly: forecast.hourly, daily: forecast.daily, location };
    render();
  } catch (error) {
    els.status.textContent = error.message || "Something went wrong while fetching weather. Please try again.";
  } finally {
    els.loading.hidden = true;
    els.dashboard.setAttribute("aria-busy", "false");
  }
}

// Common local transliterations help when a city is indexed under another spelling.
const spellingAlternates = {
  cumilla: ["Comilla", "Kumilla"],
  comilla: ["Cumilla", "Kumilla"],
  kumilla: ["Cumilla", "Comilla"],
};
function cityAlternates(name) {
  const key = name.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  return spellingAlternates[key] || [];
}

async function geocode(name, count = 1) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name, count: String(count), language: "en", format: "json" });
  const response = await fetch(url);
  if (!response.ok) throw new Error("Search is unavailable right now. Please try again.");
  return (await response.json()).results || [];
}

function closeSuggestions() {
  els.suggestions.hidden = true;
  els.input.setAttribute("aria-expanded", "false");
  els.input.removeAttribute("aria-activedescendant");
  state.activeSuggestion = -1;
}

function showSuggestions(results) {
  state.suggestions = results.slice(0, 5);
  state.activeSuggestion = -1;
  els.suggestions.replaceChildren();
  if (!state.suggestions.length) {
    closeSuggestions();
    return;
  }
  state.suggestions.forEach((city, index) => {
    const option = document.createElement("div");
    option.className = "suggestion-option";
    option.id = `city-suggestion-${index}`;
    option.role = "option";
    option.setAttribute("aria-selected", "false");
    const pin = document.createElement("span");
    pin.className = "suggestion-pin";
    pin.setAttribute("aria-hidden", "true");
    pin.textContent = "⌖";
    const copy = document.createElement("span");
    copy.className = "suggestion-copy";
    const name = document.createElement("span");
    name.className = "suggestion-name";
    name.textContent = city.name;
    const detail = document.createElement("span");
    detail.className = "suggestion-detail";
    detail.textContent = [city.admin1, city.country].filter(Boolean).join(" · ") || "Location";
    copy.append(name, detail);
    option.append(pin, copy);
    // Keep focus in the search field so arrow-key navigation remains predictable.
    option.addEventListener("mousedown", (event) => event.preventDefault());
    option.addEventListener("click", () => chooseCity(city));
    els.suggestions.append(option);
  });
  els.suggestions.hidden = false;
  els.input.setAttribute("aria-expanded", "true");
}

function highlightSuggestion(index) {
  const options = [...els.suggestions.querySelectorAll("[role=option]")];
  if (!options.length) return;
  state.activeSuggestion = (index + options.length) % options.length;
  options.forEach((option, i) => option.setAttribute("aria-selected", String(i === state.activeSuggestion)));
  els.input.setAttribute("aria-activedescendant", options[state.activeSuggestion].id);
}

function chooseCity(city) {
  closeSuggestions();
  els.input.value = city.name;
  loadByCoordinates(city);
}

let suggestionTimer;
els.input.addEventListener("input", () => {
  clearTimeout(suggestionTimer);
  const query = els.input.value.trim();
  if (query.length < 2) {
    closeSuggestions();
    return;
  }
  suggestionTimer = setTimeout(async () => {
    const requestId = ++state.suggestionRequest;
    try {
      let results = await geocode(query, 5);
      // Fill missing suggestion slots from known spellings (for example Cumilla / Comilla).
      if (results.length < 5) {
        for (const alternate of cityAlternates(query)) {
          const more = await geocode(alternate, 5 - results.length);
          for (const city of more) {
            const duplicate = results.some((item) => item.id === city.id || (item.latitude === city.latitude && item.longitude === city.longitude));
            if (!duplicate) results.push(city);
            if (results.length === 5) break;
          }
          if (results.length === 5) break;
        }
      }
      if (requestId === state.suggestionRequest && els.input.value.trim() === query) showSuggestions(results);
    } catch {
      if (requestId === state.suggestionRequest) closeSuggestions();
    }
  }, 250);
});

els.input.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" && !els.suggestions.hidden) {
    event.preventDefault();
    highlightSuggestion(state.activeSuggestion + 1);
  } else if (event.key === "ArrowUp" && !els.suggestions.hidden) {
    event.preventDefault();
    highlightSuggestion(state.activeSuggestion < 0 ? state.suggestions.length - 1 : state.activeSuggestion - 1);
  } else if (event.key === "Escape") {
    closeSuggestions();
  } else if (event.key === "Enter" && !els.suggestions.hidden && state.activeSuggestion >= 0) {
    event.preventDefault();
    chooseCity(state.suggestions[state.activeSuggestion]);
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-wrap")) closeSuggestions();
});

async function searchCity(name) {
  closeSuggestions();
  els.loading.hidden = false;
  els.dashboard.setAttribute("aria-busy", "true");
  els.status.textContent = "";
  try {
    let results = await geocode(name, 1);
    // Retry known spelling variants only if the exact query produced no city.
    for (const alternate of cityAlternates(name)) {
      if (results.length) break;
      results = await geocode(alternate, 1);
    }
    if (!results.length) throw new Error(`We couldn’t find “${name}”. Try another city name.`);
    await loadByCoordinates(results[0]);
  } catch (error) {
    els.status.textContent = error.message || "Network error. Check your connection and try again.";
  } finally {
    els.loading.hidden = true;
    els.dashboard.setAttribute("aria-busy", "false");
  }
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = els.input.value.trim();
  if (city) searchCity(city);
});
els.location.addEventListener("click", () => {
  if (!navigator.geolocation) {
    els.status.textContent = "Your browser doesn’t support location. Search for a city instead.";
    return;
  }
  els.status.textContent = "";
  els.loading.hidden = false;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => loadByCoordinates({ name: "Your location", country: "", latitude: coords.latitude, longitude: coords.longitude }),
    (error) => {
      els.loading.hidden = true;
      els.status.textContent = error.code === error.PERMISSION_DENIED ? "Location permission was denied. You can search for a city instead." : "We couldn’t read your location. Please try again or search for a city.";
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
  );
});
function chooseUnit(unit) {
  state.unit = unit;
  els.celsius.classList.toggle("active", unit === "c");
  els.fahrenheit.classList.toggle("active", unit === "f");
  els.celsius.setAttribute("aria-pressed", String(unit === "c"));
  els.fahrenheit.setAttribute("aria-pressed", String(unit === "f"));
  render(); // Re-render from the stored Celsius values so switching units is immediate.
}
els.celsius.addEventListener("click", () => chooseUnit("c"));
els.fahrenheit.addEventListener("click", () => chooseUnit("f"));

// Dhaka is the first-load default; no API key or account is required.
searchCity("Dhaka");
