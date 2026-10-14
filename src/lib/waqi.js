/**
 * Thin client for the World Air Quality Index (WAQI) API.
 *
 * Requests go through our own /api/waqi proxy (api/waqi.js), which holds the
 * token server-side in WAQI_TOKEN and lets the CDN cache answers. Get a free
 * token at https://aqicn.org/data-platform/token/ — without one the proxy falls
 * back to WAQI's shared "demo" token, which only resolves a fixed sample station.
 */

import { haversineKm, reverseGeocodeCity } from './geo'
import { toIndianAQI } from './pollutants'

/** Set at build time from whether WAQI_TOKEN exists — the token itself is never bundled. */
export const IS_DEMO_TOKEN = import.meta.env.VITE_WAQI_IS_DEMO === 'true'

async function request(query) {
  const res = await fetch(`/api/waqi?${new URLSearchParams(query)}`)
  if (res.status === 429) throw new Error('Too many requests — try again in a minute.')

  const body = await res.json().catch(() => null)
  if (!body || body.status !== 'ok') {
    // WAQI puts the reason in `data` when status is "error" (e.g. "Invalid key").
    throw new Error(typeof body?.data === 'string' ? body.data : 'WAQI request failed')
  }
  return body.data
}

/** Nearest monitoring station to a coordinate. */
export function fetchByCoords(lat, lon) {
  return request({ feed: `geo:${lat};${lon}` })
}

/**
 * Named city, path or station-uid feed — "delhi", "india/delhi/anand-vihar"
 * or "@2556". `/` and the uid `@` are structural, so they survive encoding.
 */
export function fetchByCity(city) {
  return request({ feed: city })
}

/** Station search for the city picker. Returns [] rather than throwing on a miss. */
export async function searchStations(keyword) {
  if (!keyword.trim()) return []
  try {
    return await request({ search: keyword.trim() })
  } catch {
    return []
  }
}

/**
 * The reading for a coordinate.
 *
 * `/feed/geo:` is the precise path and is exact across Europe, but for India it
 * either fails outright or returns a wildly wrong station (see
 * `stationDistanceKm`). So its answer is distance-checked, and anything
 * implausible falls back to resolving the city by name and picking the best
 * station in it.
 */
export async function fetchNearest(lat, lon) {
  const here = { lat: Number(lat), lon: Number(lon) }
  let viaGeo = null

  try {
    viaGeo = await fetchByCoords(lat, lon)
    const km = stationDistanceKm(viaGeo, here)
    if (km == null || km <= MAX_STATION_KM) return viaGeo
  } catch {
    // Fall through to the city lookup below.
  }

  const viaCity = await findStationViaCity(here)
  if (viaCity) return viaCity

  // The geo answer was implausible but it is all we have.
  if (viaGeo) return viaGeo
  throw new Error('No monitoring station could be resolved for this location.')
}

/**
 * Reverse-geocode the coordinate to a city, then pick the best of that city's
 * stations. Used when the geo endpoint fails or answers with a station too far
 * away to describe the visitor's air.
 */
async function findStationViaCity(here) {
  const city = await reverseGeocodeCity(here.lat, here.lon)
  if (!city) return null

  const stations = await searchStations(city)
  const ranked = stations
    .filter((s) => Array.isArray(s.station?.geo) && s.station.geo.length === 2)
    .map((s) => ({
      uid: s.uid,
      km: haversineKm(here, { lat: s.station.geo[0], lon: s.station.geo[1] }),
    }))
    .sort((a, b) => a.km - b.km)

  if (ranked.length === 0) {
    try {
      return await fetchByCity(city)
    } catch {
      return null
    }
  }

  // The closest station is not always the best one: some report no PM2.5 at
  // all, and some stopped updating months ago. Fetch a handful of the nearest
  // and score them, so proximity does not outrank having usable, current data.
  const candidates = await Promise.all(
    ranked.slice(0, CANDIDATE_COUNT).map(async (c) => {
      try {
        return { ...c, data: await fetchByCity(`@${c.uid}`) }
      } catch {
        return null
      }
    }),
  )

  const usable = candidates.filter((c) => c?.data)
  if (usable.length === 0) return null

  usable.sort((a, b) => scoreStation(b) - scoreStation(a))
  return usable[0].data
}

/**
 * How far a feed's station sits from the point we asked about.
 *
 * WAQI's geo endpoint currently mis-resolves the whole of India — a request for
 * Bengaluru comes back with a Delhi station 1,700 km away, and Mumbai with one
 * 1,100 km away, both reported as `status: "ok"`. Europe resolves exactly. So a
 * successful response is not on its own evidence that the station is relevant.
 */
function stationDistanceKm(feed, here) {
  const geo = feed?.city?.geo
  if (!Array.isArray(geo) || geo.length !== 2) return null
  return haversineKm(here, { lat: geo[0], lon: geo[1] })
}

/** Beyond this, a station is not describing the air where the visitor is. */
const MAX_STATION_KM = 100

/** How many nearby stations to sample before choosing one. */
const CANDIDATE_COUNT = 4

/**
 * Higher is better. Having PM2.5 matters most — it is the pollutant that
 * usually drives India's AQI — then recency, then closeness.
 */
function scoreStation(candidate) {
  const d = candidate.data
  let score = 0

  if (Number.isFinite(d.iaqi?.pm25?.v)) score += 1000
  if (Number.isFinite(d.iaqi?.pm10?.v)) score += 250

  const iso = d.time?.iso ?? d.time?.s
  const ageDays = iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : 999
  if (Number.isFinite(ageDays)) {
    if (ageDays <= 1) score += 800
    else if (ageDays <= 7) score += 500
    else if (ageDays <= 30) score += 200
  }

  score -= candidate.km * 10
  return score
}

/** Where a WAQI reading came from, for the provenance line in the UI. */
export const SOURCE = {
  id: 'waqi',
  name: 'WAQI station',
  kind: 'station',
  note: 'A physical government monitoring station.',
  href: 'https://aqicn.org/',
}

/**
 * Normalise a WAQI feed payload into the shape the UI consumes, so components
 * never have to reach into the raw response.
 *
 * WAQI publishes on the US EPA scale, so `aqiFor.india` has to re-derive the
 * CPCB index by inverting the EPA breakpoints. Readings that come from
 * Open-Meteo skip that step — they carry real concentrations already.
 */
export function normalise(data, origin = null) {
  const usAqi = typeof data.aqi === 'number' ? data.aqi : Number.parseInt(data.aqi, 10)
  const india = toIndianAQI(data.iaqi ?? {})

  return {
    source: SOURCE,
    aqi: usAqi,
    aqiFor: { us: usAqi, india: india.aqi },
    dominantFor: { us: data.dominentpol ?? null, india: india.dominant },
    fullAqiFor: { us: usAqi, india: india.full },
    fullDominantFor: { us: data.dominentpol ?? null, india: india.fullDominant },
    gasExceedsFor: { us: false, india: india.gasExceeds },
    concentrations: india.sub,
    // CPCB needs three pollutants including a particulate before it publishes.
    indiaSufficient: india.sufficient,
    station: data.city?.name ?? 'Unknown station',
    url: data.city?.url ?? null,
    coords: data.city?.geo ?? null,
    // How far the station is from the visitor, when we know where they are.
    distanceKm: origin ? stationDistanceKm(data, origin) : null,
    updated: data.time?.iso ?? data.time?.s ?? null,
    dominant: data.dominentpol ?? null,
    pollutants: data.iaqi ?? {},
    attributions: data.attributions ?? [],
  }
}

/** The AQI on the requested scale, falling back to whichever exists. */
export function aqiOn(reading, scale) {
  if (!reading) return null
  return reading.aqiFor?.[scale] ?? reading.aqiFor?.us ?? reading.aqi ?? null
}
