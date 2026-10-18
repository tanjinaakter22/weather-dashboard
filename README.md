# 🌦️ Atmos: Live Weather Dashboard

A beautiful, responsive weather dashboard that shows real-time weather for any city in the world. Built with plain HTML, CSS, and JavaScript, using the free Open-Meteo API (no API key required).

🔗 **Live Demo:** https://tanjinaakter22.github.io/weather-dashboard/

---

## ✨ Features

- 🔍 **City search** with smart handling of spelling variations (e.g., Comilla / Cumilla / Kumilla)
- 📍 **"Use my location"** button powered by the browser Geolocation API
- 🌡️ **Current weather**: temperature, feels-like, humidity, wind speed, and a weather description with emoji icon
- ⏰ **24-hour hourly forecast** in a horizontally scrollable row
- 📅 **7-day daily forecast** with min/max temperature and rain probability
- 🔄 **°C / °F toggle** that updates all values instantly
- 🎨 **Animated backgrounds** that change with weather and time of day
- 🪟 **Glassmorphism UI**, fully mobile-friendly
- ⚠️ **Loading spinner and friendly error messages** for failed searches or network issues

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Page structure |
| CSS3 | Styling, animations, glassmorphism design |
| JavaScript (ES6) | App logic, API calls, DOM updates |
| Open-Meteo Geocoding API | Convert city names to coordinates |
| Open-Meteo Forecast API | Weather data |

---

## 🚀 How to Run Locally

1. Clone the repository:
```bash
   git clone https://github.com/tanjinaakter22/weather-dashboard.git
```
2. Open the project folder:
```bash
   cd weather-dashboard
```
3. Open `index.html` in any modern browser (an internet connection is required to fetch weather data).

No installation, build step, or API key is needed.

---

## 🧠 How It Works

1. The user searches for a city name.
2. The Geocoding API returns the city's latitude and longitude.
3. The
