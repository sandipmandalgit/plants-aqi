/**
 * Server-side proxy for the World Air Quality Index API.
 *
 * The token lives in WAQI_TOKEN (no VITE_ prefix), so it never reaches the
 * browser bundle. Only two read-only calls are forwarded:
 *
 *   /api/waqi?feed=delhi      → /feed/delhi/   (city, "india/delhi/x" or "@2556")
 *   /api/waqi?search=mumbai   → /search/?keyword=mumbai
 *
 * Successful answers carry `s-maxage`, so Vercel's CDN serves repeats of the
 * same URL without invoking this function or touching WAQI at all.
 */

const BASE = 'https://api.waqi.info'
const MAX_PARAM = 100

/**
 * Per-IP cap. Function instances are short-lived and not shared, so this is a
 * best-effort brake on one client hammering a warm instance, not a guarantee.
 * The CDN cache above does most of the protecting.
 */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 40
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

export async function GET(request) {
  const params = new URL(request.url).searchParams
  const feed = params.get('feed')?.trim()
  const search = params.get('search')?.trim()

  let path
  let cache
  if (feed && feed.length <= MAX_PARAM) {
    // `/`, the uid `@` and the `geo:lat;lon` separators are structural in WAQI
    // paths, so they survive encoding.
    const safe = encodeURIComponent(feed).replace(/%(2F|40|3A|3B)/g, (m) => decodeURIComponent(m))
    path = `/feed/${safe}/`
    cache = 'public, s-maxage=600, stale-while-revalidate=1800'
  } else if (search && search.length <= MAX_PARAM) {
    path = `/search/?keyword=${encodeURIComponent(search)}`
    cache = 'public, s-maxage=86400, stale-while-revalidate=86400'
  } else {
    return json({ status: 'error', data: 'Expected ?feed= or ?search=' }, 400)
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) {
    return json({ status: 'error', data: 'Too many requests — try again in a minute.' }, 429)
  }

  const token = process.env.WAQI_TOKEN || 'demo'
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const body = await res.json()
    // Only cache real answers; WAQI reports most failures as 200 + status "error".
    return json(body, res.ok ? 200 : 502, res.ok && body.status === 'ok' ? cache : 'no-store')
  } catch {
    return json({ status: 'error', data: 'Could not reach the air quality network.' }, 502)
  }
}
