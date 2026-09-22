import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchByCity, normalise } from '../lib/waqi'
import { fetchAirQuality } from '../lib/openMeteo'
import { locateByIp, reverseGeocodePlace } from '../lib/geo'

/**
 * Resolves the reading for the visitor's location.
 *
 * Open-Meteo is the primary source. WAQI's Indian feed has been frozen since
 * 23 June 2026 — every CPCB-attributed station returns that same timestamp —
 * so it cannot carry a site aimed at India. Open-Meteo is current to the hour
 * and returns real µg/m³, which also lets the CPCB index be computed directly
 * rather than reverse-engineered from a US sub-index.
 *
 * WAQI is still used for the city/station picker, so a visitor who wants a
 * specific government station can still have one.
 *
 * Order of attempts:
 *   1. Whatever station the visitor picked (WAQI), which overrides everything.
 *   2. Open-Meteo at the browser's coordinates.
 *   3. A coarse IP lookup for the coordinate, then Open-Meteo there.
 */
export function useAirQuality({ coords, geoStatus }) {
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null) // 'gps' | 'ip' | 'manual'
  const [override, setOverride] = useState(null)

  // Guards against a slow earlier request overwriting a newer one.
  const requestId = useRef(0)
  // StrictMode mounts effects twice in development, and the coordinate path
  // calls Nominatim, whose usage policy caps callers at one request a second.
  const lastKey = useRef(null)

  const run = useCallback(async (loader, nextSource, key, { force = false } = {}) => {
    if (key && !force && lastKey.current === key) return
    lastKey.current = key

    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await loader()
      if (id !== requestId.current) return
      setReading(result)
      setSource(nextSource)
    } catch (err) {
      if (id !== requestId.current) return
      lastKey.current = null // allow a retry of the same target
      setError(err.message || 'Could not reach the air quality network.')
      setReading(null)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  /** Open-Meteo at a coordinate, labelled with the place it belongs to. */
  const loadModelled = useCallback(async (lat, lon) => {
    const [result, place] = await Promise.all([
      fetchAirQuality(lat, lon),
      reverseGeocodePlace(lat, lon),
    ])
    return { ...result, station: place?.label ?? 'Your location', distanceKm: 0 }
  }, [])

  /**
   * No browser coordinates: place the visitor by IP, then read Open-Meteo
   * there. Only the location is approximate — the reading itself is as exact
   * as any other, for wherever the IP happens to land.
   */
  const loadFromIp = useCallback(async () => {
    const located = await locateByIp()
    if (!located) {
      throw new Error(
        'Could not work out where you are. Allow location access, or search for your city.',
      )
    }

    const result = await loadModelled(located.lat, located.lon)
    return {
      ...result,
      station: located.city ? `${located.city} (approximate)` : result.station,
      distanceKm: null,
    }
  }, [loadModelled])

  useEffect(() => {
    if (override) {
      run(() => fetchByCity(override).then((d) => normalise(d)), 'manual', `city:${override}`)
      return
    }
    if (geoStatus === 'locating' || geoStatus === 'idle') return

    if (coords) {
      run(
        () => loadModelled(coords.lat, coords.lon),
        'gps',
        `geo:${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}`,
      )
    } else {
      run(loadFromIp, 'ip', 'here')
    }
  }, [coords, geoStatus, override, run, loadModelled, loadFromIp])

  const selectCity = useCallback((city) => setOverride(city), [])
  const clearCity = useCallback(() => setOverride(null), [])

  const refresh = useCallback(() => {
    const forced = { force: true }
    if (override) {
      run(() => fetchByCity(override).then((d) => normalise(d)), 'manual', `city:${override}`, forced)
    } else if (coords) {
      run(
        () => loadModelled(coords.lat, coords.lon),
        'gps',
        `geo:${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}`,
        forced,
      )
    } else {
      run(loadFromIp, 'ip', 'here', forced)
    }
  }, [coords, override, run, loadModelled, loadFromIp])

  return { reading, loading, error, source, selectCity, clearCity, refresh, override }
}
