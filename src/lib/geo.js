/** Shared geo helpers. */

/** Great-circle distance in km between two {lat, lon} points. */
export function haversineKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Coordinates to a place name, via OpenStreetMap's Nominatim.
 *
 * `zoom=10` asks for city-level granularity rather than a street address.
 * Returns the most specific usable name, or null if nothing resolves.
 */
export async function reverseGeocodeCity(lat, lon) {
  return (await reverseGeocodePlace(lat, lon))?.city ?? null
}

/**
 * Coordinates to `{ city, label }` — the city on its own for API lookups, and a
 * "Place, Region" label for display.
 */
export async function reverseGeocodePlace(lat, lon) {
  const url =
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2' +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10`

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null

    const body = await res.json()
    const a = body.address ?? {}
    const city =
      a.city || a.town || a.village || a.municipality || a.county || a.state_district || a.state
    if (!city) return null

    const region = a.state && a.state !== city ? a.state : a.country
    return { city, label: region ? `${city}, ${region}` : city }
  } catch {
    return null
  }
}

/**
 * Rough coordinates from the visitor's IP, for when geolocation is refused.
 *
 * WAQI's own `/feed/here/` used to serve this role but it now answers
 * "can not connect" for India, so this goes direct. Both services below send
 * `Access-Control-Allow-Origin: *`, which a browser needs and several
 * otherwise-good IP services (ipapi.co among them) do not.
 *
 * IP geolocation is coarse — the same request resolved to three different
 * cities across three providers — so the caller labels it as approximate.
 */
const IP_SERVICES = [
  { url: 'https://ipwho.is/', pick: (b) => ({ lat: b.latitude, lon: b.longitude, city: b.city }) },
  {
    url: 'https://get.geojs.io/v1/ip/geo.json',
    pick: (b) => ({ lat: Number(b.latitude), lon: Number(b.longitude), city: b.city }),
  },
]

export async function locateByIp({ signal } = {}) {
  for (const service of IP_SERVICES) {
    try {
      const res = await fetch(service.url, { signal })
      if (!res.ok) continue

      const picked = service.pick(await res.json())
      if (Number.isFinite(picked.lat) && Number.isFinite(picked.lon)) return picked
    } catch {
      // Try the next provider.
    }
  }
  return null
}
