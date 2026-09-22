import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Reveal, { Stagger, StaggerItem } from './ui/Reveal'
import { useInView } from '../hooks/useInView'
import SectionHeading from './ui/SectionHeading'
import { TREES } from '../data/trees'
import {
  DIET_LABELS,
  INDIA_AVG_TONNES,
  LIFESTYLE_LABELS,
  PARIS_TARGET_TONNES,
  VEHICLE_LABELS,
  WORLD_AVG_TONNES,
  calculateFootprint,
  treesNeeded,
} from '../lib/carbon'

const DEFAULTS = {
  vehicle: 'hatchback',
  kmPerWeek: 150,
  kwhPerMonth: 250,
  cylindersPerYear: 8,
  flightHoursPerYear: 4,
  diet: 'vegetarian',
  lifestyle: 'average',
}

function Slider({ label, hint, value, onChange, min, max, step = 1, suffix }) {
  const percent = ((value - min) / (max - min)) * 100

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-[13.5px] font-light text-ink-soft">{label}</label>
        <span className="text-[17px] font-light tabular-nums text-ink">
          {value}
          <span className="ml-1 text-[11.5px] text-ink-faint">{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none
          [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.5)]
          [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-115
          [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:bg-white"
        style={{
          background: `linear-gradient(to right, rgba(255,255,255,0.85) ${percent}%, rgba(255,255,255,0.12) ${percent}%)`,
        }}
      />
      {hint && <p className="mt-1.5 text-[11.5px] font-light text-ink-faint">{hint}</p>}
    </div>
  )
}

function Choice({ label, options, value, onChange }) {
  return (
    <div>
      <span className="text-[13.5px] font-light text-ink-soft">{label}</span>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {Object.entries(options).map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={value === key}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-light transition-colors ${
              value === key
                ? 'border-white/30 bg-white/16 text-ink'
                : 'border-hairline bg-white/5 text-ink-soft hover:bg-white/10 hover:text-ink'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CO2Calculator() {
  const [input, setInput] = useState(DEFAULTS)
  const [speciesId, setSpeciesId] = useState('banyan')

  const set = (key) => (value) => setInput((prev) => ({ ...prev, [key]: value }))

  // The bars hold at zero until their panel is actually on screen, so the
  // growth reads as a reveal instead of finishing offscreen at page load.
  const [breakdownRef, breakdownSeen] = useInView({ rootMargin: '-80px' })
  const [compareRef, compareSeen] = useInView({ rootMargin: '-80px' })

  const result = useMemo(() => calculateFootprint(input), [input])
  const species = TREES.find((t) => t.id === speciesId) ?? TREES[0]
  const trees = useMemo(() => treesNeeded(result.total, species.co2), [result.total, species.co2])

  const comparisons = [
    { label: 'You', tonnes: result.tonnes, highlight: true },
    { label: 'India average', tonnes: INDIA_AVG_TONNES },
    { label: 'World average', tonnes: WORLD_AVG_TONNES },
    { label: '2030 Paris target', tonnes: PARIS_TARGET_TONNES, target: true },
  ]
  const scaleMax = Math.max(...comparisons.map((c) => c.tonnes), 1) * 1.12

  const verdict =
    result.tonnes <= PARIS_TARGET_TONNES
      ? { text: 'Already inside the 2030 target', color: '#00a65a' }
      : result.tonnes <= INDIA_AVG_TONNES * 1.5
        ? { text: 'Close to the Indian average', color: '#d4b106' }
        : { text: 'Above the sustainable range', color: '#e8730c' }

  return (
    <section id="calculator" className="relative scroll-mt-24 bg-ground py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(75% 50% at 25% 100%, rgba(5,10,7,0.9) 0%, transparent 70%)' }}
      />

      <div className="shell relative">
        <SectionHeading eyebrow="CO₂ offset" lead="Six inputs, one number" title="How many trees does your year cost?">
          Then the planting it would take to cancel it. Everything recalculates as you move a slider.
        </SectionHeading>

        <div className="mt-12 grid gap-5 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <div className="card space-y-7 p-6 sm:p-8">
              <Choice label="What do you drive?" options={VEHICLE_LABELS} value={input.vehicle} onChange={set('vehicle')} />

              {input.vehicle !== 'none' && (
                <Slider
                  label="Distance driven"
                  suffix="km / week"
                  min={0}
                  max={800}
                  step={10}
                  value={input.kmPerWeek}
                  onChange={set('kmPerWeek')}
                  hint="Commute both ways, plus errands and weekend trips."
                />
              )}

              <Slider
                label="Household electricity"
                suffix="kWh / month"
                min={0}
                max={1200}
                step={10}
                value={input.kwhPerMonth}
                onChange={set('kwhPerMonth')}
                hint="The units figure printed on your last bill."
              />

              <Slider
                label="LPG cylinders"
                suffix="per year"
                min={0}
                max={24}
                value={input.cylindersPerYear}
                onChange={set('cylindersPerYear')}
                hint="A 14.2 kg domestic cylinder. Typical household: 6–10 a year."
              />

              <Slider
                label="Time in the air"
                suffix="flight hours / yr"
                min={0}
                max={80}
                value={input.flightHoursPerYear}
                onChange={set('flightHoursPerYear')}
                hint="Delhi–Mumbai is about 2 hours each way."
              />

              <Choice label="How do you eat?" options={DIET_LABELS} value={input.diet} onChange={set('diet')} />
              <Choice label="Everything else" options={LIFESTYLE_LABELS} value={input.lifestyle} onChange={set('lifestyle')} />

              <button type="button" onClick={() => setInput(DEFAULTS)} className="btn btn--ink btn--sm w-full">
                Reset to a typical household
              </button>
            </div>
          </Reveal>

          <div className="flex flex-col gap-5 lg:col-span-7">
            <Reveal delay={0.1}>
              <div className="card card--lift relative overflow-hidden p-7 sm:p-9">
                <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/5 blur-3xl" />

                <div className="relative flex flex-wrap items-end justify-between gap-6">
                  <div>
                    <p className="text-[10px] font-light uppercase tracking-[0.2em] text-ink-faint">
                      Your annual footprint
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <motion.span
                        key={Math.round(result.tonnes * 10)}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="text-[64px] font-light leading-none tracking-tight text-ink"
                      >
                        {result.tonnes.toFixed(2)}
                      </motion.span>
                      <span className="text-[16px] font-light text-ink-faint">t CO₂e</span>
                    </div>
                    <span
                      className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-light"
                      style={{
                        borderColor: `${verdict.color}4d`,
                        backgroundColor: `${verdict.color}1a`,
                        color: verdict.color,
                      }}
                    >
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: verdict.color }} />
                      {verdict.text}
                    </span>
                  </div>

                  <div className="rounded-[var(--radius)] border border-hairline bg-white/6 px-6 py-5 text-center backdrop-blur-md">
                    <motion.div
                      key={trees.mature}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="text-[44px] font-light leading-none text-ink"
                    >
                      {trees.mature}
                    </motion.div>
                    <div className="mt-2 text-[11px] font-light leading-snug text-ink-faint">
                      mature {species.name.toLowerCase()}
                      <br />
                      trees to break even
                    </div>
                  </div>
                </div>

                <div className="relative mt-7 flex flex-wrap gap-1.5 border-t border-white/8 pt-6">
                  {Array.from({ length: Math.min(trees.mature, 80) }, (_, i) => (
                    <motion.svg
                      key={i}
                      viewBox="0 0 24 24"
                      className="size-3.5 text-white/55"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.007, 0.55) }}
                      aria-hidden="true"
                    >
                      <path d="M12 2 5 13h4l-3 6h12l-3-6h4L12 2Z" fill="currentColor" />
                      <rect x="11" y="18" width="2" height="4" fill="currentColor" opacity="0.6" />
                    </motion.svg>
                  ))}
                  {trees.mature > 80 && (
                    <span className="self-center pl-2 text-[11px] font-light text-ink-faint">
                      +{trees.mature - 80} more
                    </span>
                  )}
                </div>

                <dl className="relative mt-6 grid grid-cols-3 gap-4 border-t border-white/8 pt-6">
                  {[
                    ['Saplings to plant', trees.saplings, 'at a 70% survival rate'],
                    ['Land required', trees.landSqm.toLocaleString('en-IN'), 'm² of canopy'],
                    ['Per day', (result.total / 365).toFixed(1), 'kg CO₂e'],
                  ].map(([label, value, foot]) => (
                    <div key={label}>
                      <dt className="text-[10px] font-light uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
                      <dd className="mt-1.5 text-[22px] font-light leading-none text-ink">{value}</dd>
                      <dd className="mt-1 text-[10.5px] font-light text-ink-faint">{foot}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="card p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[15px] font-medium text-ink">Offset with which species?</h3>
                  <span className="text-[11.5px] font-light text-ink-faint">
                    {species.co2} kg CO₂ per tree per year
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[...TREES]
                    .sort((a, b) => b.co2 - a.co2)
                    .slice(0, 9)
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSpeciesId(t.id)}
                        aria-pressed={speciesId === t.id}
                        className={`rounded-full border px-3 py-1.5 text-[12px] font-light transition-colors ${
                          speciesId === t.id
                            ? 'border-white/30 bg-white/16 text-ink'
                            : 'border-hairline bg-white/5 text-ink-soft hover:bg-white/10 hover:text-ink'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                </div>
              </div>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2">
              <Reveal delay={0.2}>
                <div className="card h-full p-6">
                  <h3 className="text-[15px] font-medium text-ink">Where it comes from</h3>
                  <Stagger as="ul" ref={breakdownRef} stagger={0.07} className="mt-4 space-y-3">
                    {result.breakdown.map((b) => (
                      <StaggerItem as="li" key={b.key}>
                        <div className="flex items-baseline justify-between text-[11.5px] font-light">
                          <span className="text-ink-soft">{b.label}</span>
                          <span className="tabular-nums text-ink-faint">
                            {(b.value / 1000).toFixed(2)} t · {Math.round(b.share)}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: b.color }}
                            initial={{ width: 0 }}
                            animate={{ width: breakdownSeen ? `${b.share}%` : 0 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
              </Reveal>

              <Reveal delay={0.26}>
                <div className="card h-full p-6">
                  <h3 className="text-[15px] font-medium text-ink">How you compare</h3>
                  <Stagger as="ul" ref={compareRef} stagger={0.07} className="mt-4 space-y-4">
                    {comparisons.map((c) => (
                      <StaggerItem as="li" key={c.label}>
                        <div className="flex items-baseline justify-between text-[11.5px] font-light">
                          <span className={c.highlight ? 'text-ink' : 'text-ink-soft'}>{c.label}</span>
                          <span className="tabular-nums text-ink-faint">{c.tonnes.toFixed(1)} t</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: c.highlight ? '#ffffff' : c.target ? '#a3c948' : 'rgba(255,255,255,0.3)',
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: compareSeen ? `${(c.tonnes / scaleMax) * 100}%` : 0 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                  <p className="mt-4 text-[11px] font-light leading-relaxed text-ink-faint">
                    Factors are Indian-grid averages — a guide to scale, not a certified audit.
                    Cutting emissions always beats offsetting them.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
