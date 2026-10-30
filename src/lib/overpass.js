/**
 * Green-space search over OpenStreetMap via the Overpass API.
 *
 * Shared by the `/api/parks` proxy and the browser's direct fallback, so both
 * send the same query and treat failures the same way.
 */

/**
 * Public Overpass instances. They are volunteer-run and go down or rate-limit
 * independently, so a single endpoint is not dependable.
 *
 * Every entry must be a GLOBAL instance that sends `Access-Control-Allow-Origin`
 * — the browser fallback cannot read a response without it. Do not add regional
 * extracts such as overpass.osm.ch (Switzerland only): they answer 200 with zero
 * elements, which reads as "no parks near you" rather than as a failure.
 * overpass.osm.jp is left out because its certificate has lapsed.
 */
export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

/**
 * How long a mirror gets before the next one is started alongside it. The slow
 * one keeps running — whichever answers first wins — so a busy-but-healthy
 * instance is not thrown away, and a dead one does not hold up the rest.
 */
const HEDGE_MS = 6000

/**
 * Hard cap per mirror. `[timeout:25]` in the query caps Overpass's *execution*
 * time; queue time on a busy instance stacks on top of it, so a limit near 25 s
 * would abort healthy requests just as they are about to return.
 */
const DEFAULT_TIMEOUT_MS = 60000

/** Statuses that mean "busy", as opposed to "broken". */
export const RETRYABLE = new Set([429, 502, 503, 504])

/**
 * `nwr` matches nodes, ways and relations in one statement. Expanding it into
 * nine separate statements makes the same search several times more expensive
 * and times Overpass out on dense cities.
 *
 * `landuse=grass` is deliberately excluded: in Indian cities it tags road
 * medians and verges, which swamps the result with places nobody can sit in.
 */
export function buildQuery(lat, lon, radius) {
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

const KEPT_TAGS = ['name', 'name:en', 'leisure', 'landuse', 'boundary', 'access', 'operator']

/** Drops everything the UI never reads, so cached answers stay small. */
export function slimElement(el) {
  const tags = {}
  for (const key of KEPT_TAGS) if (el.tags?.[key] != null) tags[key] = el.tags[key]
  return { type: el.type, id: el.id, lat: el.lat, lon: el.lon, center: el.center, tags }
}

/**
 * Runs a query against the mirrors, hedged: one starts, and each further mirror
 * starts when the previous one fails or has been quiet for `HEDGE_MS`. Resolves
 * with the first good element list; rejects only when every mirror has failed,
 * with `status` and `timedOut` describing the last failure.
 */
export function queryOverpass(query, { headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const controllers = []
    let next = 0
    let failed = 0
    let settled = false
    let hedgeTimer = null
    let lastStatus = null
    let lastError = null

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      clearTimeout(hedgeTimer)
      for (const c of controllers) c.abort()
      fn(value)
    }

    const launch = () => {
      if (settled || next >= OVERPASS_ENDPOINTS.length) return
      const endpoint = OVERPASS_ENDPOINTS[next++]
      const abort = new AbortController()
      controllers.push(abort)
      const killTimer = setTimeout(() => abort.abort(), timeoutMs)

      clearTimeout(hedgeTimer)
      hedgeTimer = setTimeout(launch, HEDGE_MS)

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
        body: `data=${encodeURIComponent(query)}`,
        signal: abort.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw Object.assign(new Error(`Overpass responded ${res.status}`), { status: res.status })
          const body = await res.json()
          // An execution timeout comes back as 200 with a remark and a partial
          // (often empty) list — that is a failure, not "no parks here".
          if (/runtime error/i.test(body.remark ?? '')) {
            throw Object.assign(new Error(body.remark), { status: 504 })
          }
          finish(resolve, body.elements ?? [])
        })
        .catch((err) => {
          if (settled) return
          lastError = err
          lastStatus = err.status ?? lastStatus
          failed += 1
          if (failed === OVERPASS_ENDPOINTS.length) {
            const error = new Error('Every Overpass mirror failed')
            error.status = lastStatus
            error.timedOut = lastError?.name === 'AbortError'
            finish(reject, error)
          } else {
            launch()
          }
        })
        .finally(() => clearTimeout(killTimer))
    }

    launch()
  })
}
