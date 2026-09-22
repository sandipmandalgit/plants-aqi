/**
 * Converting WAQI's readings onto India's National AQI.
 *
 * WAQI reports every pollutant as a US EPA sub-index, even when the underlying
 * measurement comes from CPCB. India's NAQI uses different breakpoints, different
 * averaging periods and different units, so a US sub-index cannot simply be
 * relabelled — the number itself changes.
 *
 * The route is therefore: EPA sub-index → pollutant concentration → CPCB
 * sub-index. Both scales are piecewise-linear over concentration, so the first
 * step is an exact inverse of the second.
 */

/**
 * EPA breakpoints as [concLow, concHigh, indexLow, indexHigh].
 *
 * Gas concentrations are in the units the EPA scale is defined in (ppm for CO
 * and O3, ppb for NO2 and SO2); particulates are µg/m³.
 *
 * PM2.5 follows the breakpoints EPA revised in May 2024 (Good tops out at
 * 9.0 µg/m³, not the older 12.0). If a future WAQI change reverts to the 2012
 * table, only this array needs editing.
 */
const EPA = {
  pm25: [
    [0, 9.0, 0, 50],
    [9.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 125.4, 151, 200],
    [125.5, 225.4, 201, 300],
    [225.5, 325.4, 301, 500],
  ],
  pm10: [
    [0, 54, 0, 50],
    [55, 154, 51, 100],
    [155, 254, 101, 150],
    [255, 354, 151, 200],
    [355, 424, 201, 300],
    [425, 604, 301, 500],
  ],
  o3: [
    // 8-hour ozone, ppm
    [0, 0.054, 0, 50],
    [0.055, 0.07, 51, 100],
    [0.071, 0.085, 101, 150],
    [0.086, 0.105, 151, 200],
    [0.106, 0.2, 201, 300],
  ],
  no2: [
    // ppb
    [0, 53, 0, 50],
    [54, 100, 51, 100],
    [101, 360, 101, 150],
    [361, 649, 151, 200],
    [650, 1249, 201, 300],
    [1250, 2049, 301, 500],
  ],
  so2: [
    // ppb
    [0, 35, 0, 50],
    [36, 75, 51, 100],
    [76, 185, 101, 150],
    [186, 304, 151, 200],
    [305, 604, 201, 300],
    [605, 1004, 301, 500],
  ],
  co: [
    // 8-hour CO, ppm
    [0, 4.4, 0, 50],
    [4.5, 9.4, 51, 100],
    [9.5, 12.4, 101, 150],
    [12.5, 15.4, 151, 200],
    [15.5, 30.4, 201, 300],
    [30.5, 50.4, 301, 500],
  ],
}

/**
 * CPCB breakpoints as [concLow, concHigh, indexLow, indexHigh].
 * Particulates and gases in µg/m³; CO in mg/m³. Averaging periods are 24 h,
 * except O3 and CO which are 8 h — the same windows WAQI aggregates over.
 */
const CPCB = {
  pm25: [
    [0, 30, 0, 50],
    [31, 60, 51, 100],
    [61, 90, 101, 200],
    [91, 120, 201, 300],
    [121, 250, 301, 400],
    [251, 500, 401, 500],
  ],
  pm10: [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 250, 101, 200],
    [251, 350, 201, 300],
    [351, 430, 301, 400],
    [431, 600, 401, 500],
  ],
  o3: [
    [0, 50, 0, 50],
    [51, 100, 51, 100],
    [101, 168, 101, 200],
    [169, 208, 201, 300],
    [209, 748, 301, 400],
    [749, 1000, 401, 500],
  ],
  no2: [
    [0, 40, 0, 50],
    [41, 80, 51, 100],
    [81, 180, 101, 200],
    [181, 280, 201, 300],
    [281, 400, 301, 400],
    [401, 600, 401, 500],
  ],
  so2: [
    [0, 40, 0, 50],
    [41, 80, 51, 100],
    [81, 380, 101, 200],
    [381, 800, 201, 300],
    [801, 1600, 301, 400],
    [1601, 2400, 401, 500],
  ],
  co: [
    [0, 1.0, 0, 50],
    [1.1, 2.0, 51, 100],
    [2.1, 10, 101, 200],
    [10.1, 17, 201, 300],
    [17.1, 34, 301, 400],
    [34.1, 50, 401, 500],
  ],
}

/**
 * EPA gas units → CPCB gas units, at 25 °C and 1 atm.
 * ppb × (molar mass / 24.45) = µg/m³; CO is ppm → mg/m³.
 */
const TO_CPCB_UNITS = {
  pm25: (v) => v,
  pm10: (v) => v,
  no2: (ppb) => ppb * 1.88,
  so2: (ppb) => ppb * 2.62,
  o3: (ppm) => ppm * 1000 * 1.96, // ppm → ppb → µg/m³
  co: (ppm) => ppm * 1.145, // ppm → mg/m³
}

function interpolate(value, [lo, hi, outLo, outHi]) {
  if (hi === lo) return outLo
  return outLo + ((value - lo) * (outHi - outLo)) / (hi - lo)
}

/** EPA sub-index back to the concentration that produced it, in EPA units. */
export function epaIndexToConcentration(pollutant, index) {
  const table = EPA[pollutant]
  if (!table || !Number.isFinite(index)) return null

  const row = table.find(([, , iLo, iHi]) => index >= iLo && index <= iHi) ?? table[table.length - 1]
  const [cLo, cHi, iLo, iHi] = row
  return interpolate(index, [iLo, iHi, cLo, cHi])
}

/** Concentration in CPCB units to a CPCB sub-index. */
export function cpcbIndexFor(pollutant, concentration) {
  const table = CPCB[pollutant]
  if (!table || !Number.isFinite(concentration)) return null

  if (concentration >= table[table.length - 1][1]) return 500
  const row = table.find(([cLo, cHi]) => concentration >= cLo && concentration <= cHi)
  if (!row) return null

  const [cLo, cHi, iLo, iHi] = row
  return Math.round(interpolate(concentration, [cLo, cHi, iLo, iHi]))
}

export const CPCB_POLLUTANTS = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co']

/** Display units for the concentrations we derive. */
export const CONCENTRATION_UNITS = {
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  o3: 'µg/m³',
  no2: 'µg/m³',
  so2: 'µg/m³',
  co: 'mg/m³',
}

/**
 * A WAQI `iaqi` block re-expressed on India's National AQI.
 *
 * CPCB defines the overall NAQI as the worst sub-index, and requires at least
 * three pollutants including one of PM2.5 or PM10 before publishing a value —
 * `sufficient` reports whether that bar was met.
 */
export function toIndianAQI(iaqi = {}) {
  const sub = {}

  for (const p of CPCB_POLLUTANTS) {
    const epaIndex = iaqi[p]?.v
    if (!Number.isFinite(epaIndex)) continue

    const epaConc = epaIndexToConcentration(p, epaIndex)
    if (epaConc == null) continue

    const conc = TO_CPCB_UNITS[p](epaConc)
    const index = cpcbIndexFor(p, conc)
    if (index == null) continue

    sub[p] = { index, concentration: conc, unit: CONCENTRATION_UNITS[p] }
  }

  const entries = Object.entries(sub)
  if (entries.length === 0) {
    return { aqi: null, dominant: null, full: null, fullDominant: null, sub, pmLed: false, sufficient: false }
  }

  const [worstKey, worst] = entries.reduce((a, b) => (b[1].index > a[1].index ? b : a))
  return headlineFrom(sub, entries, worstKey, worst)
}

/* ────────────────────────────────────────────────────────────────
   Concentration → index. The preferred path: when a provider gives
   real µg/m³ we compute both scales directly, with no inversion and
   no assumption about which EPA table the provider used.
   ──────────────────────────────────────────────────────────────── */

/**
 * µg/m³ → the units each scale's breakpoint table is defined in.
 * CO is the awkward one: CPCB wants mg/m³, EPA wants ppm.
 */
const FROM_UGM3 = {
  india: {
    pm25: (v) => v,
    pm10: (v) => v,
    no2: (v) => v,
    so2: (v) => v,
    o3: (v) => v,
    nh3: (v) => v,
    co: (v) => v / 1000, // µg/m³ → mg/m³
  },
  us: {
    pm25: (v) => v,
    pm10: (v) => v,
    no2: (v) => v / 1.88, // µg/m³ → ppb
    so2: (v) => v / 2.62, // µg/m³ → ppb
    o3: (v) => v / 1.96 / 1000, // µg/m³ → ppb → ppm
    co: (v) => v / 1145, // µg/m³ → ppm
  },
}

const TABLES = { india: CPCB, us: EPA }

/** One pollutant's sub-index on the given scale, from a µg/m³ concentration. */
export function indexFromConcentration(scale, pollutant, ugm3) {
  const convert = FROM_UGM3[scale]?.[pollutant]
  const table = TABLES[scale]?.[pollutant]
  if (!convert || !table || !Number.isFinite(ugm3)) return null

  const value = convert(ugm3)
  if (value >= table[table.length - 1][1]) return 500

  const row = table.find(([cLo, cHi]) => value >= cLo && value <= cHi)
  if (!row) return null

  const [cLo, cHi, iLo, iHi] = row
  return Math.round(interpolate(value, [cLo, cHi, iLo, iHi]))
}

/**
 * A full AQI from measured concentrations in µg/m³.
 *
 * Both CPCB and EPA define the overall index as the worst sub-index. CPCB also
 * requires at least three pollutants including a particulate before publishing,
 * which `sufficient` reports.
 */
export function aqiFromConcentrations(concentrations = {}, scale = 'india') {
  const sub = {}

  for (const p of CPCB_POLLUTANTS) {
    const ugm3 = concentrations[p]
    if (!Number.isFinite(ugm3)) continue

    const index = indexFromConcentration(scale, p, ugm3)
    if (index == null) continue

    const displayed = scale === 'india' && p === 'co' ? ugm3 / 1000 : ugm3
    sub[p] = {
      index,
      concentration: displayed,
      unit: scale === 'india' ? CONCENTRATION_UNITS[p] : p === 'co' ? 'mg/m³' : 'µg/m³',
    }
    if (scale !== 'india' && p === 'co') sub[p].concentration = ugm3 / 1000
  }

  const entries = Object.entries(sub)
  if (entries.length === 0) {
    return { aqi: null, dominant: null, full: null, fullDominant: null, sub, pmLed: false, sufficient: false }
  }

  const [worstKey, worst] = entries.reduce((a, b) => (b[1].index > a[1].index ? b : a))

  return headlineFrom(sub, entries, worstKey, worst)
}

/**
 * Build the reported figure from a set of sub-indices.
 *
 * The headline is **particulate-led**. CPCB's own method takes the worst of all
 * measured pollutants, but our gas figures come from a model rather than a
 * sensor, and CAMS over-predicts surface ozone across South Asia — it rated a
 * Ladakh village at 107 on ozone alone while its PM sub-index was 4. Letting
 * that set a health headline is not defensible, and it disagrees with every
 * Indian tracker, which report PM because that is what CPCB stations measure.
 *
 * Nothing is discarded: `full` carries the all-pollutant CPCB figure and every
 * gas keeps its sub-index in `sub`, so the breakdown still shows the ozone.
 */
function headlineFrom(sub, entries, worstKey, worst) {
  const pmKeys = ['pm25', 'pm10'].filter((k) => sub[k])
  const pmLed = pmKeys.length > 0

  // Without any particulate reading there is nothing to lead with, so fall back
  // to the strict worst-of-all figure rather than reporting nothing.
  const dominant = pmLed
    ? pmKeys.reduce((a, b) => (sub[b].index > sub[a].index ? b : a))
    : worstKey
  const headline = pmLed ? sub[dominant].index : worst.index

  return {
    aqi: headline,
    dominant,
    // The strict CPCB figure across every pollutant, for the disclosure line.
    full: worst.index,
    fullDominant: worstKey,
    // True when a gas would push the number above the particulate reading.
    gasExceeds: worst.index > headline,
    pmLed,
    sub,
    sufficient: entries.length >= 3 && pmLed,
  }
}
