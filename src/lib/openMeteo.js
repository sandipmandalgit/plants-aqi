/**
 * Open-Meteo air quality client.
 *
 * Free, keyless and CORS-open, and — unlike WAQI — it returns raw µg/m³ rather
 * than a pre-computed US sub-index. That matters here: India's CPCB index can
 * be calculated directly from the measurements instead of reverse-engineered.
 *
 * The data is CAMS model output, not a ground station. It is current to the
 * hour everywhere, which WAQI's Indian feed currently is not, but it is a
 * simulation — see `SOURCE` for what the UI tells the visitor.
 *
 * Attribution: data by Open-Meteo.com, CC BY 4.0.
 */

import { aqiFromConcentrations } from './pollutants'

const ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality'
const WEATHER_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

const HOURLY = [
  'pm2_5',
  'pm10',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'ozone',
  'carbon_monoxide',
]

/** Open-Meteo's field names → the keys the rest of the app uses. */
const FIELD_MAP = {
  pm2_5: 'pm25',
  pm10: 'pm10',
  nitrogen_dioxide: 'no2',
  sulphur_dioxide: 'so2',
  ozone: 'o3',
  carbon_monoxide: 'co',
}

export const SOURCE = {
  id: 'open-meteo',
  name: 'Open-Meteo (CAMS)',
  kind: 'model',
  note: 'Modelled from the Copernicus atmosphere service, not a ground station.',
  href: 'https://open-meteo.com/',
}

/**
 * Averaging windows, per scale. Each authority defines its breakpoints against
 * a specific window, and using the wrong one silently shifts every sub-index.
 *
 * CPCB: "sub-indices are calculated using the 24-hourly average concentration,
 * 8-hourly in the case of CO and O3", taking the worst 8-hour block of the day.
 * EPA agrees on the particulates and the 8-hour pollutants, but defines NO2 and
 * SO2 on the peak 1-hour value instead.
 */
const WINDOWS = {
  india: {
    pm25: { hours: 24, stat: 'mean' },
    pm10: { hours: 24, stat: 'mean' },
    no2: { hours: 24, stat: 'mean' },
    so2: { hours: 24, stat: 'mean' },
    o3: { hours: 8, stat: 'max' },
    co: { hours: 8, stat: 'max' },
  },
  us: {
    pm25: { hours: 24, stat: 'mean' },
    pm10: { hours: 24, stat: 'mean' },
    no2: { hours: 1, stat: 'max' },
    so2: { hours: 1, stat: 'max' },
    o3: { hours: 8, stat: 'max' },
    co: { hours: 8, stat: 'max' },
  },
}

/** Mean of a numeric series, ignoring gaps. Null when nothing usable is left. */
function mean(values) {
  const usable = values.filter((v) => Number.isFinite(v))
  if (usable.length === 0) return null
  return usable.reduce((sum, v) => sum + v, 0) / usable.length
}

/**
 * The highest rolling n-hour mean in the series — the rule both authorities use
 * for O3 and CO, and EPA for its 1-hour gases. Windows that are more than half
 * empty are skipped rather than averaged from a couple of points.
 */
function rollingMax(values, hours) {
  if (hours <= 1) {
    const usable = values.filter((v) => Number.isFinite(v))
    return usable.length ? Math.max(...usable) : null
  }
  if (values.length < hours) return mean(values)

  let best = null
  for (let end = values.length; end >= hours; end--) {
    const window = values.slice(end - hours, end)
    if (window.filter((v) => Number.isFinite(v)).length < hours / 2) continue

    const m = mean(window)
    if (m != null && (best == null || m > best)) best = m
  }
  return best ?? mean(values)
}

/** Index of the first forecast hour — everything at or past "now". */
function observedCount(times) {
  const now = Date.now()
  const i = times.findIndex((t) => new Date(t).getTime() > now)
  return i === -1 ? times.length : i
}

/**
 * Collapse the hourly series into one concentration per pollutant, using the
 * given scale's windows. Forecast hours are dropped before averaging.
 */
function summarise(hourly, scale) {
  const times = hourly.time ?? []
  const end = observedCount(times)
  const windows = WINDOWS[scale] ?? WINDOWS.india
  const concentrations = {}

  for (const field of HOURLY) {
    const key = FIELD_MAP[field]
    const series = (hourly[field] ?? []).slice(0, end)
    if (series.length === 0) continue

    const { hours, stat } = windows[key] ?? { hours: 24, stat: 'mean' }
    const value =
      stat === 'max' ? rollingMax(series.slice(-24), hours) : mean(series.slice(-hours))

    if (value != null) concentrations[key] = value
  }

  return { concentrations, observedAt: end > 0 ? times[end - 1] : null }
}

/**
 * Temperature, humidity and wind for the conditions strip. A separate endpoint
 * from air quality, same keyless service. Failure here must not sink the
 * reading, so the caller treats it as optional.
 */
async function fetchWeather(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
    wind_speed_unit: 'ms',
    timezone: 'auto',
  })

  try {
    const res = await fetch(`${WEATHER_ENDPOINT}?${params}`, { signal })
    if (!res.ok) return null

    const body = await res.json()
    const c = body.current
    if (!c) return null

    return {
      t: c.temperature_2m,
      h: c.relative_humidity_2m,
      w: c.wind_speed_10m,
    }
  } catch {
    return null
  }
}

/**
 * A reading for a coordinate. `past_days=1` gives the 24 hours of history the
 * averaging needs; the forecast hours that come with it are trimmed off.
 */
export async function fetchAirQuality(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: HOURLY.join(','),
    past_days: '1',
    forecast_days: '1',
    timezone: 'auto',
  })

  const [res, weather] = await Promise.all([
    fetch(`${ENDPOINT}?${params}`, { signal }),
    fetchWeather(lat, lon, { signal }),
  ])
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`)

  const body = await res.json()
  if (body.error) throw new Error(body.reason || 'Open-Meteo request failed')
  if (!body.hourly?.time?.length) throw new Error('Open-Meteo returned no hourly data')

  const indiaSeries = summarise(body.hourly, 'india')
  const usSeries = summarise(body.hourly, 'us')
  const observedAt = indiaSeries.observedAt

  if (Object.keys(indiaSeries.concentrations).length === 0) {
    throw new Error('Open-Meteo returned no usable pollutant data')
  }

  const india = aqiFromConcentrations(indiaSeries.concentrations, 'india')
  const us = aqiFromConcentrations(usSeries.concentrations, 'us')

  return {
    source: SOURCE,
    aqi: us.aqi,
    aqiFor: { india: india.aqi, us: us.aqi },
    dominantFor: { india: india.dominant, us: us.dominant },
    concentrations: india.sub,
    concentrationsFor: { india: india.sub, us: us.sub },
    fullAqiFor: { india: india.full, us: us.full },
    fullDominantFor: { india: india.fullDominant, us: us.fullDominant },
    gasExceedsFor: { india: india.gasExceeds, us: us.gasExceeds },
    indiaSufficient: india.sufficient,
    updated: observedAt,
    coords: [body.latitude, body.longitude],
    // Filled in by the caller, which knows the place name and the station.
    station: null,
    distanceKm: null,
    weather,
    pollutants: {},
    attributions: [{ name: 'Open-Meteo.com (CAMS)', url: 'https://open-meteo.com/' }],
  }
}
