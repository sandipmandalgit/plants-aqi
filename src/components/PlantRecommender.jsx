import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import LeafMotif from './ui/LeafMotif'
import Reveal, { Stagger } from './ui/Reveal'
import { VIEWPORT_TALL, riseCard } from './ui/motion'
import SectionHeading from './ui/SectionHeading'
import { Chevron } from './icons'
import { plantsForBand } from '../data/plants'
import { bandFor, bandsFor } from '../lib/aqi'
import { aqiOn } from '../lib/waqi'

function PlantCard({ plant, index, band }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.article
      layout
      variants={riseCard}
      exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.35 } }}
      className="card group flex flex-col overflow-hidden transition-[background-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:bg-glass-lift hover:shadow-[0_18px_44px_rgba(0,0,0,0.34)]"
    >
      <div
        className="relative h-32 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${plant.palette[0]}, ${plant.palette[1]})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        <LeafMotif
          shape={index % 3 === 0 ? 'fern' : index % 3 === 1 ? 'oval' : 'lance'}
          className="absolute -bottom-6 -right-4 size-36 text-white/20 transition-transform duration-700 group-hover:rotate-6 group-hover:scale-110"
        />
        <div className="absolute left-5 top-5 flex gap-1" aria-label={`Purifying strength ${plant.power} of 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`size-1 rounded-full ${i < plant.power ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
        <span
          className="absolute bottom-4 left-5 rounded-full border px-2.5 py-0.5 text-[10px] font-light uppercase tracking-[0.12em] text-white backdrop-blur-sm"
          style={{ backgroundColor: `${band.color}59`, borderColor: `${band.color}80` }}
        >
          {plant.perRoom} per room
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[16px] font-normal leading-snug text-ink">{plant.name}</h3>
        <p className="mt-0.5 text-[11.5px] font-light italic text-ink-faint">{plant.botanical}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {plant.removes.map((r) => (
            <span
              key={r}
              className="rounded-full border border-hairline bg-white/6 px-2.5 py-0.5 text-[11px] font-light text-ink-soft"
            >
              {r}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-4 text-[11.5px]">
          <div>
            <div className="font-light text-ink-faint">Light</div>
            <div className="mt-0.5 font-light text-ink-soft">{plant.light}</div>
          </div>
          <div>
            <div className="font-light text-ink-faint">Water</div>
            <div className="mt-0.5 font-light text-ink-soft">{plant.water}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="rounded-full border border-hairline bg-white/6 px-2.5 py-0.5 text-[11px] font-light capitalize text-ink-soft">
            {plant.care} care
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-[12px] font-light text-ink-soft transition-colors hover:text-ink"
          >
            {open ? 'Less' : 'Why this one'}
            <Chevron className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.p
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 14 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden text-[13px] font-light leading-relaxed text-ink-faint"
            >
              {plant.note}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  )
}

export default function PlantRecommender({ reading, scale }) {
  // Visitors can preview any band; the live reading just sets the starting point.
  const [manualBand, setManualBand] = useState(null)

  const bands = bandsFor(scale)
  const liveAqi = aqiOn(reading, scale)
  const liveBand = Number.isFinite(liveAqi) ? bandFor(liveAqi, scale) : null
  // A manual pick is held by key so it survives a scale change.
  const band = (manualBand && bands.find((b) => b.key === manualBand)) ?? liveBand ?? bands[1]
  const isLive = !manualBand && Boolean(liveBand)

  const plants = plantsForBand(band.key)
  const totalPots = plants.reduce((sum, p) => sum + p.perRoom, 0)

  return (
    <section id="recommend" className="relative scroll-mt-24 overflow-hidden bg-ground py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-1000"
        style={{ background: `radial-gradient(80% 55% at 15% 0%, ${band.color}1f 0%, transparent 65%)` }}
      />

      <div className="shell relative">
        <SectionHeading
          eyebrow="Plant match"
          lead={`Prescribed for ${band.label.toLowerCase()} air`}
          title="The plants that clean it."
        >
          {isLive ? (
            <>
              Your reading of <span className="text-ink">AQI {liveAqi}</span> calls for{' '}
              <span className="text-ink">{plants.length} species</span> — roughly {totalPots} pots to
              green a standard room. Heavier air, heavier lifters.
            </>
          ) : (
            <>
              Pick a band to see what it would take. Each step up the scale swaps in species with
              higher measured VOC-removal rates.
            </>
          )}
        </SectionHeading>

        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {liveBand && (
              <button
                type="button"
                onClick={() => setManualBand(null)}
                className={`btn btn--sm ${isLive ? 'btn--pearl' : 'btn--ink'}`}
              >
                <span className="relative flex size-1.5">
                  <span
                    className="absolute inline-flex size-full rounded-full"
                    style={{
                      backgroundColor: liveBand.color,
                      animation: 'pulse-ring 2.4s cubic-bezier(0.4,0,0.6,1) infinite',
                    }}
                  />
                  <span
                    className="relative inline-flex size-1.5 rounded-full"
                    style={{ backgroundColor: liveBand.color }}
                  />
                </span>
                My air
              </button>
            )}

            <div className="rail flex-wrap">
              {bands.map((b) => {
                const selected = manualBand === b.key
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setManualBand(b.key)}
                    className={selected ? 'is-active' : undefined}
                    style={selected ? { backgroundColor: `${b.color}3d`, color: '#fff' } : undefined}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: b.color }} />
                      {b.label.replace('Unhealthy for Sensitive Groups', 'Sensitive groups')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <div
            className="card mt-6 flex items-start gap-4 p-5 sm:p-6"
            style={{ borderColor: `${band.color}38` }}
          >
            <span
              className="mt-0.5 size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: band.color, boxShadow: `0 0 12px ${band.color}` }}
            />
            <div>
              <h3 className="text-[15px] font-medium text-ink">{band.advice}</h3>
              <p className="mt-1.5 text-[13px] font-light leading-relaxed text-ink-faint">
                Indoor plants are a supplement, not a substitute — pair them with ventilation timing
                and, above 150, mechanical filtration. Dust the leaves monthly so the stomata stay open.
              </p>
            </div>
          </div>
        </Reveal>

        <Stagger
          layout
          stagger={0.06}
          viewport={VIEWPORT_TALL}
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {plants.map((plant, i) => (
              <PlantCard key={plant.id} plant={plant} index={i} band={band} />
            ))}
          </AnimatePresence>
        </Stagger>
      </div>
    </section>
  )
}
