import { useCallback, useEffect, useRef, useState } from 'react'
import { haversineKm } from '../lib/geo'
import { buildQuery, queryOverpass } from '../lib/overpass'

/** Turns whatever the last mirror did into something a person can act on. */
function describeFailure(err) {
  if (err?.status === 429) return 'OpenStreetMap is rate-limiting this network. Wait a minute and retry.'
  if (err?.status === 504 || err?.status === 503 || err?.status === 502)
    return 'The OpenStreetMap query service is overloaded right now. Try again in a few minutes.'
  if (err?.timedOut) return 'OpenStreetMap took too long to answer.'
  return 'Could not reach OpenStreetMap.'
}

/**
 * Asks our own `/api/parks`, which is CDN-cached. Returns null — meaning "go to
 * Overpass directly" — only when there is no proxy to ask (a static host or
 * `vite preview`). When the proxy answers that Overpass is down, retrying the
 * same mirrors from the browser would only double the wait, so that throws.
 */
async function fetchViaProxy(center, radius) {
  const url = `/api/parks?lat=${center.lat.toFixed(3)}&lon=${center.lon.toFixed(3)}&radius=${radius}`
  let res
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(70000) })
  } catch (err) {
    if (err?.name === 'TimeoutError') throw Object.assign(err, { timedOut: true })
    return null
  }
  if (!res.headers.get('content-type')?.includes('application/json')) return null

  const body = await res.json()
  if (res.ok) return body.elements ?? []
  throw Object.assign(new Error(body.error ?? `Proxy responded ${res.status}`), {
    status: body.status ?? res.status,
    timedOut: !!body.timedOut,
  })
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
 * Results for a given place and radius, kept for the session.
 *
 * Overpass is a shared free service with a two-query-per-IP limit. Toggling
 * 2 km → 5 km → 2 km should not spend three of those.
 */
const cache = new Map()

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
 * data — through the cached `/api/parks` proxy when there is one, otherwise
 * straight to the mirrors. One search per location change.
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

      try {
        const elements =
          (await fetchViaProxy(center, r)) ?? (await queryOverpass(buildQuery(center.lat, center.lon, r)))
        if (id !== requestId.current) return

        const found = elements
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
      } catch (err) {
        if (id !== requestId.current) return
        // Nothing was cached, so a retry of the same key must be allowed.
        lastQuery.current = null
        setParks([])
        setError(describeFailure(err))
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (enabled && origin) load(origin, radius)
  }, [enabled, origin, radius, load])

  const refresh = useCallback(() => load(origin, radius, { force: true }), [load, origin, radius])

  return { parks, loading, error, refresh }
}
