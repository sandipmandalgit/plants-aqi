/**
 * AQI scales.
 *
 * India is the default. CPCB's National AQI is not the US EPA scale with
 * different words on it — the breakpoints differ, so the same air yields a
 * different number on each. Both are offered so a reading can be checked
 * against the scale a visitor already knows.
 *
 * `key` values are shared across scales by severity rank, so the plant
 * recommender keeps working when the scale changes.
 */

/** India — CPCB National Air Quality Index. Colours are CPCB's own. */
export const CPCB_BANDS = [
  {
    key: 'good',
    label: 'Good',
    max: 50,
    color: '#55a84f',
    ink: '#0c3a13',
    blurb: 'Minimal impact.',
    advice: 'Open the windows. This is a great day to be outdoors.',
  },
  {
    key: 'satisfactory',
    label: 'Satisfactory',
    max: 100,
    color: '#a3c853',
    ink: '#2c3a08',
    blurb: 'Minor breathing discomfort to sensitive people.',
    advice: 'Fine for most. Sensitive people should watch for symptoms.',
  },
  {
    key: 'moderate',
    label: 'Moderate',
    max: 200,
    color: '#f7d038',
    ink: '#4a3a02',
    blurb: 'Breathing discomfort to people with lung or heart disease, children and older adults.',
    advice: 'Shift long outdoor exertion away from the morning and evening peaks.',
  },
  {
    key: 'poor',
    label: 'Poor',
    max: 300,
    color: '#f29c33',
    ink: '#4d2a02',
    blurb: 'Breathing discomfort to most people on prolonged exposure.',
    advice: 'Keep windows shut at peak hours and run indoor air cleaning.',
  },
  {
    key: 'very-poor',
    label: 'Very Poor',
    max: 400,
    color: '#e93f33',
    ink: '#4d0f0a',
    blurb: 'Respiratory illness on prolonged exposure.',
    advice: 'Avoid outdoor exertion. Wear an N95 if you must go out.',
  },
  {
    key: 'severe',
    label: 'Severe',
    max: Infinity,
    color: '#af2d24',
    ink: '#3d0a06',
    blurb: 'Affects healthy people and seriously impacts those with existing disease.',
    advice: 'Stay indoors, seal gaps, and keep purification running constantly.',
  },
]

/** United States — EPA AQI, the scale WAQI publishes natively. */
export const EPA_BANDS = [
  {
    key: 'good',
    label: 'Good',
    max: 50,
    color: '#00a65a',
    ink: '#0a4a2c',
    blurb: 'Air quality is satisfactory and poses little or no risk.',
    advice: 'Open the windows. This is a great day to be outdoors.',
  },
  {
    key: 'satisfactory',
    label: 'Moderate',
    max: 100,
    color: '#d4b106',
    ink: '#5a4a03',
    blurb: 'Acceptable, though a few pollutants may affect sensitive people.',
    advice: 'Fine for most. Sensitive people should watch for symptoms.',
  },
  {
    key: 'moderate',
    label: 'Unhealthy for Sensitive Groups',
    max: 150,
    color: '#e8730c',
    ink: '#6b3403',
    blurb: 'Children, elders and people with asthma may feel effects.',
    advice: 'Reduce long or intense outdoor activity if you are sensitive.',
  },
  {
    key: 'poor',
    label: 'Unhealthy',
    max: 200,
    color: '#d9363e',
    ink: '#6b1418',
    blurb: 'Everyone may begin to experience health effects.',
    advice: 'Keep windows shut at peak hours and run indoor air cleaning.',
  },
  {
    key: 'very-poor',
    label: 'Very Unhealthy',
    max: 300,
    color: '#8b3fa8',
    ink: '#42174f',
    blurb: 'Health alert — the risk of effects is increased for everyone.',
    advice: 'Avoid outdoor exertion. Wear an N95 if you must go out.',
  },
  {
    key: 'severe',
    label: 'Hazardous',
    max: Infinity,
    color: '#7a1226',
    ink: '#450a15',
    blurb: 'Emergency conditions. The entire population is likely affected.',
    advice: 'Stay indoors, seal gaps, and keep purification running constantly.',
  },
]

export const SCALES = {
  india: {
    id: 'india',
    short: 'India',
    name: 'CPCB National AQI',
    authority: 'Central Pollution Control Board',
    bands: CPCB_BANDS,
  },
  us: {
    id: 'us',
    short: 'US',
    name: 'US EPA AQI',
    authority: 'US Environmental Protection Agency',
    bands: EPA_BANDS,
  },
}

export const DEFAULT_SCALE = 'india'

export function bandsFor(scale = DEFAULT_SCALE) {
  return (SCALES[scale] ?? SCALES[DEFAULT_SCALE]).bands
}

/** Resolve a numeric AQI to its band on the given scale. */
export function bandFor(aqi, scale = DEFAULT_SCALE) {
  const bands = bandsFor(scale)
  const n = Number(aqi)
  if (!Number.isFinite(n)) return bands[1]
  return bands.find((b) => n <= b.max) ?? bands[bands.length - 1]
}

/** Position of an AQI value on a 0-500 gauge, clamped to 0-100 %. */
export function gaugePercent(aqi) {
  const n = Number(aqi)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, (n / 500) * 100))
}

/** Human labels for the pollutant keys WAQI returns in `iaqi`. */
export const POLLUTANT_LABELS = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  o3: 'Ozone',
  no2: 'NO₂',
  so2: 'SO₂',
  co: 'CO',
  t: 'Temp',
  h: 'Humidity',
  w: 'Wind',
  p: 'Pressure',
  dew: 'Dew pt.',
}

export const POLLUTANT_UNITS = {
  t: '°C',
  h: '%',
  w: 'm/s',
  p: 'hPa',
  dew: '°C',
}

/** The pollutants we surface as chips, in priority order. */
export const PRIMARY_POLLUTANTS = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co']

/** Kept for callers that only ever wanted the default scale's bands. */
export const AQI_BANDS = CPCB_BANDS
