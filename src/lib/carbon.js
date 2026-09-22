/**
 * Carbon footprint model.
 *
 * Emission factors are approximations tuned for an Indian household. Sources in
 * spirit: CEA's grid emission factor (~0.71 kg CO₂/kWh for the Indian grid),
 * IPCC road-transport factors, and typical per-capita dietary footprints.
 * They are good enough to make the scale of the problem legible — not an audit.
 */

export const FACTORS = {
  /** kg CO₂ per km driven, by vehicle. */
  vehicle: {
    none: 0,
    twoWheeler: 0.045,
    hatchback: 0.13,
    sedan: 0.17,
    suv: 0.24,
    electric: 0.06, // charged on a coal-heavy grid, so not zero
  },
  /** kg CO₂ per kWh — Indian grid average. */
  electricity: 0.71,
  /** kg CO₂ per 14.2 kg domestic LPG cylinder. */
  lpgCylinder: 42.5,
  /** kg CO₂ per hour of flying, per passenger, short-haul economy. */
  flightHour: 90,
  /** kg CO₂ per year, diet only. */
  diet: {
    vegan: 900,
    vegetarian: 1200,
    eggetarian: 1400,
    occasionalMeat: 1900,
    dailyMeat: 2500,
  },
  /** kg CO₂ per year for everything else: goods, services, waste, water. */
  lifestyle: {
    minimal: 500,
    average: 1100,
    high: 2200,
  },
}

export const DIET_LABELS = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  eggetarian: 'Eggetarian',
  occasionalMeat: 'Meat weekly',
  dailyMeat: 'Meat daily',
}

export const VEHICLE_LABELS = {
  none: 'No vehicle',
  twoWheeler: 'Two-wheeler',
  hatchback: 'Hatchback',
  sedan: 'Sedan',
  suv: 'SUV',
  electric: 'Electric car',
}

export const LIFESTYLE_LABELS = {
  minimal: 'Minimal — I buy little, repair things',
  average: 'Average — typical urban household',
  high: 'High — frequent shopping and gadgets',
}

/** Indian per-capita average, for the comparison bar (tonnes CO₂e / year). */
export const INDIA_AVG_TONNES = 2.0
export const WORLD_AVG_TONNES = 4.7
export const PARIS_TARGET_TONNES = 2.3

/**
 * Turn the form inputs into a per-category breakdown in kg CO₂ per year.
 * Every input is annual except electricity (monthly) and LPG (per year).
 */
export function calculateFootprint(input) {
  const travel = (Number(input.kmPerWeek) || 0) * 52 * FACTORS.vehicle[input.vehicle]
  const electricity = (Number(input.kwhPerMonth) || 0) * 12 * FACTORS.electricity
  const cooking = (Number(input.cylindersPerYear) || 0) * FACTORS.lpgCylinder
  const flights = (Number(input.flightHoursPerYear) || 0) * FACTORS.flightHour
  const diet = FACTORS.diet[input.diet]
  const lifestyle = FACTORS.lifestyle[input.lifestyle]

  const breakdown = [
    { key: 'travel', label: 'Road travel', value: travel, color: '#7c543c' },
    { key: 'electricity', label: 'Electricity', value: electricity, color: '#e8730c' },
    { key: 'cooking', label: 'Cooking gas', value: cooking, color: '#d4b106' },
    { key: 'flights', label: 'Flights', value: flights, color: '#8b3fa8' },
    { key: 'diet', label: 'Food', value: diet, color: '#418746' },
    { key: 'lifestyle', label: 'Goods & services', value: lifestyle, color: '#64a465' },
  ]

  const total = breakdown.reduce((sum, b) => sum + b.value, 0)

  return {
    total,
    tonnes: total / 1000,
    breakdown: breakdown
      .map((b) => ({ ...b, share: total > 0 ? (b.value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value),
  }
}

/**
 * Trees needed to offset a footprint.
 *
 * `kgPerTree` is the annual sequestration of one *mature* tree. Trees only reach
 * that rate after roughly a decade, so `saplings` reports the planting count
 * that gets there once grown, assuming a realistic survival rate.
 */
export function treesNeeded(totalKg, kgPerTree, { survivalRate = 0.7 } = {}) {
  const mature = Math.ceil(totalKg / kgPerTree)
  return {
    mature,
    saplings: Math.ceil(mature / survivalRate),
    /** A mature tree canopy needs roughly 25 m² of ground. */
    landSqm: Math.ceil(mature * 25),
  }
}
