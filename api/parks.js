/**
 * Server-side, CDN-cached front for the Overpass green-space search.
 *
 *   /api/parks?lat=22.573&lon=88.364&radius=5000
 *
 * Overpass is a free, volunteer-run service that is often overloaded. Parks do
 * not move, so good answers are cached by Vercel's CDN for a day and served
 * stale for a week while refreshing — most visitors never touch Overpass, and an
 * area that has been searched before keeps working through an outage.
 *
 * Coordinates are rounded to 3 decimals (~110 m) by the client so neighbours
 * share a cache entry; anything finer is rejected rather than silently
 * fragmenting the cache.
 */

import { buildQuery, queryOverpass, RETRYABLE, slimElement } from '../src/lib/overpass.js'

const RADII = new Set([2000, 5000, 10000])

/**
 * Overpass's usage policy asks clients to identify themselves. Requests from
 * Node's default agent are refused outright by some instances.
 */
const USER_AGENT = 'Vanachara/1.0 (+https://github.com/sandipmandalgit/plants-aqi)'

/** Best-effort per-IP brake, as in api/waqi.js; the CDN cache does the real work. */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
const hits = new Map()

function rateLimited(ip) {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 })
    if (hits.size > 5000) hits.clear() // keep memory bounded
    return false
  }
  entry.count += 1
  return entry.count > MAX_PER_WINDOW
}

function json(body, status, cache = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cache },
  })
}

/** A coordinate with at most 3 decimals, inside `limit`. */
function parseCoord(raw, limit) {
  if (!raw || !/^-?\d{1,3}(\.\d{1,3})?$/.test(raw)) return null
  const n = Number(raw)
  return Math.abs(n) <= limit ? n : null
}

export async function GET(request) {
  const params = new URL(request.url).searchParams
  const lat = parseCoord(params.get('lat'), 90)
  const lon = parseCoord(params.get('lon'), 180)
  const radius = Number(params.get('radius'))

  if (lat == null || lon == null || !RADII.has(radius)) {
    return json({ error: 'Expected ?lat=&lon= (≤3 decimals) and radius of 2000, 5000 or 10000' }, 400)
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) return json({ error: 'Too many requests', status: 429 }, 429)

  try {
    const elements = await queryOverpass(buildQuery(lat, lon, radius), {
      headers: { 'User-Agent': USER_AGENT },
      timeoutMs: 50000,
    })
    return json(
      { elements: elements.map(slimElement) },
      200,
      'public, s-maxage=86400, stale-while-revalidate=604800',
    )
  } catch (err) {
    const status = RETRYABLE.has(err.status) ? err.status : 502
    return json({ error: 'Overpass unavailable', status: err.status ?? null, timedOut: !!err.timedOut }, status)
  }
}
