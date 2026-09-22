import { useCallback, useEffect, useRef, useState } from 'react'
import { haversineKm } from '../lib/geo'

/**
 * Public Overpass instances, tried in order. They are volunteer-run and go down
 * or rate-limit independently, so a single endpoint is not dependable.
 *
 * Every entry must be a GLOBAL instance that sends `Access-Control-Allow-Origin`
 * — a browser cannot read a response without it. Do not add regional extracts
 * such as overpass.osm.ch (Switzerland only): they answer 200 with zero
 * elements, which reads as "no parks near you" rather than as a failure.
 */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

/**
 * How long to wait on one mirror before moving to the next.
 *
 * The `[timeout:25]` in the query caps Overpass's *execution* time; queue time
 * on a busy instance stacks on top of it. A client timeout near 25 s therefore
 * aborts perfectly healthy requests just as they are about to return.
 */
const ENDPOINT_TIMEOUT_MS = 60000

/** Turns whatever the last mirror did into something a person can act on. */
function describeFailure(err, status) {
  if (status === 429) return 'OpenStreetMap is rate-limiting this network. Wait a minute and retry.'
  if (status === 504 || status === 503) return 'The OpenStreetMap query service is overloaded right now.'
  if (err?.name === 'AbortError') return 'OpenStreetMap took too long to answer.'
  return 'Could not reach OpenStreetMap.'
}

/** Pin colours are pitched bright — they sit on a dark basemap. */
const GREEN_KINDS = {
  park: { label: 'Park', color: '#7fc97f' },
  garden: { label: 'Garden', color: '#a3c948' },
  nature_reserve: { label: 'Nature reserve', color: '#4fb3a5' },
  forest: { label: 'Forest', color: '#3f9e63' },
  village_green: { label: 'Village green', color: '#c2d97a' },
  national_park: { label: 'National park', color: '#4fb3a5' },
}

const FALLBACK_KIND = { label: 'Green space', color: '#8fbf7f' }

/**
 * `nwr` matches nodes, ways and relations in one statement. Expanding it into
 * nine separate statements makes the same search several times more expensive
 * and times Overpass out on dense cities.
 *
 * `landuse=grass` is deliberately excluded: in Indian cities it tags road
 * medians and verges, which swamps the result with places nobody can sit in.
 */
function buildQuery(lat, lon, radius) {
  const around = `(around:${radius},${lat},${lon})`

  return [
    '[out:json][timeout:25];',
    '(',
    `  nwr["leisure"~"^(park|garden|nature_reserve)$"]${around};`,
    `  nwr["landuse"~"^(forest|village_green)$"]${around};`,
    `  nwr["boundary"="national_park"]${around};`,
    ');',
    'out center 80;',
  ].join('\n')
}

/**
 * Results for a given place and radius, kept for the session.
 *
 * Overpass is a shared free service with a two-query-per-IP limit. Toggling
 * 2 km → 5 km → 2 km should not spend three of those.
 */
const cache = new Map()

/** Statuses worth waiting out rather than giving up on. */
const RETRYABLE = new Set([429, 502, 503, 504])

function toPark(el, origin) {
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (lat == null || lon == null) return null

  const tags = el.tags ?? {}
  const kindKey = tags.leisure || tags.landuse || (tags.boundary === 'national_park' ? 'national_park' : null)
  const kind = GREEN_KINDS[kindKey] ?? FALLBACK_KIND

  return {
    id: `${el.type}/${el.id}`,
    name: tags.name || tags['name:en'] || `Unnamed ${kind.label.toLowerCase()}`,
    unnamed: !tags.name && !tags['name:en'],
    lat,
    lon,
    kind: kind.label,
    color: kind.color,
    access: tags.access ?? null,
    operator: tags.operator ?? null,
    distance: haversineKm(origin, { lat, lon }),
  }
}

/**
 * Green spaces around a coordinate, via the Overpass API over OpenStreetMap
 * data. Overpass is a shared free service, so this deliberately fires one
 * request per location change and falls back to a mirror on failure.
 */
export function useNearbyParks(origin, { radius = 5000, enabled = true } = {}) {
  const [parks, setParks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const requestId = useRef(0)
  const lastQuery = useRef(null)

  const load = useCallback(
    async (center, r, { force = false } = {}) => {
      if (!center) return

      // Overpass allows only two concurrent queries per IP. React's StrictMode
      // mounts effects twice in development, which would fire this search twice
      // for the same place — the pair then queues against each other and both
      // time out. Skip a repeat of the query we already ran.
      const key = `${center.lat.toFixed(4)},${center.lon.toFixed(4)}@${r}`
      if (!force && lastQuery.current === key) return
      lastQuery.current = key

      if (!force && cache.has(key)) {
        setParks(cache.get(key))
        setError(null)
        setLoading(false)
        return
      }

      const id = ++requestId.current
      setLoading(true)
      setError(null)

      const query = buildQuery(center.lat, center.lon, r)
      let lastError = null
      let lastStatus = null

      for (const endpoint of OVERPASS_ENDPOINTS) {
        // A stalled mirror must not hold up the fallback to the next one.
        const abort = new AbortController()
        const timer = setTimeout(() => abort.abort(), ENDPOINT_TIMEOUT_MS)

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
            signal: abort.signal,
          })
          lastStatus = res.status
          if (!res.ok) throw new Error(`Overpass responded ${res.status}`)

          const body = await res.json()
          if (id !== requestId.current) return

          const found = (body.elements ?? [])
            .map((el) => toPark(el, center))
            .filter(Boolean)
            // A park mapped as both a node and a way arrives twice; same name at
            // effectively the same point (~11 m) means it is one place.
            .filter(
              (p, i, all) =>
                all.findIndex(
                  (q) =>
                    q.name === p.name &&
                    Math.abs(q.lat - p.lat) < 1e-4 &&
                    Math.abs(q.lon - p.lon) < 1e-4,
                ) === i,
            )
            .sort((a, b) => a.distance - b.distance)
            // Overpass already caps at 80; this keeps the sidebar list scannable.
            .slice(0, 50)

          cache.set(key, found)
          setParks(found)
          setLoading(false)
          return
        } catch (err) {
          lastError = err
        } finally {
          clearTimeout(timer)
        }

        // A busy Overpass usually clears within seconds; a short pause before
        // the next endpoint beats failing the whole search outright.
        if (RETRYABLE.has(lastStatus)) {
          await new Promise((resolve) => setTimeout(resolve, 2500))
        }
      }

      if (id !== requestId.current) return
      // Nothing was cached, so a retry of the same key must be allowed.
      lastQuery.current = null
      setParks([])
      setError(describeFailure(lastError, lastStatus))
      setLoading(false)
    },
    [],
  )

  useEffect(() => {
    if (enabled && origin) load(origin, radius)
  }, [enabled, origin, radius, load])

  const refresh = useCallback(() => load(origin, radius, { force: true }), [load, origin, radius])

  return { parks, loading, error, refresh }
}
