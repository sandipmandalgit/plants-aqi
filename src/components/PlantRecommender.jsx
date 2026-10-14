import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Reveal, { Stagger } from './ui/Reveal'
import { VIEWPORT_TALL, riseCard } from './ui/motion'
import SectionHeading from './ui/SectionHeading'
import { Chevron } from './icons'
import { plantsForBand } from '../data/plants'
import { bandFor, bandsFor } from '../lib/aqi'
import { aqiOn } from '../lib/waqi'

function PlantCard({ plant, band }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.article
      layout
      variants={riseCard}
      exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.35 } }}
      className="card group flex w-full flex-col overflow-hidden sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)] transition-[background-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:bg-glass-lift hover:shadow-[0_18px_44px_rgba(0,0,0,0.34)]"
    >
      <div
        className="relative h-44 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${plant.palette[0]}, ${plant.palette[1]})` }}
      >
        <img
          src={plant.photo.src}
          alt={`${plant.name} (${plant.botanical})`}
          width={800}
          height={500}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/30" />
        <div className="absolute left-5 top-5 flex gap-1" aria-label={`Lab-test purifying rating ${plant.power} of 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`size-1.5 rounded-full ${i < plant.power ? 'bg-white' : 'bg-white/35'}`} />
          ))}
        </div>
        <span
          className="absolute bottom-4 left-5 rounded-full border px-2.5 py-0.5 text-[10px] font-light uppercase tracking-[0.12em] text-white backdrop-blur-sm"
          style={{ backgroundColor: `${band.color}59`, borderColor: `${band.color}80` }}
        >
          {plant.perRoom} per room
        </span>
        {/* CC licences require attribution; the link carries author and licence. */}
        <a
          href={plant.photo.url}
          target="_blank"
          rel="noreferrer"
          title={`Photo: ${plant.photo.author}, ${plant.photo.license}, via Wikimedia Commons`}
          className="absolute bottom-3 right-3 max-w-[55%] truncate rounded-full bg-black/40 px-2 py-0.5 text-[9.5px] font-light text-white/75 backdrop-blur-sm transition-colors hover:text-white"
        >
          © {plant.photo.author} · {plant.photo.license}
        </a>
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

        {/* Pinned to the bottom so the rows line up across cards with different tag counts. */}
        <div className="mt-auto pt-4">
          <div className="grid grid-cols-2 gap-3 border-t border-white/8 pt-4 text-[11.5px]">
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
              className="-my-3 -mr-2 inline-flex items-center gap-1 px-2 py-3 text-[12px] font-light text-ink-soft transition-colors hover:text-ink"
            >
              {open ? 'Less' : 'Why this one'}
              <Chevron className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>
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
    <section id="recommend" className="relative scroll-mt-24 overflow-hidden bg-ground py-10 sm:py-12">
      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-1000"
        style={{ background: `radial-gradient(80% 55% at 15% 0%, ${band.color}1f 0%, transparent 65%)` }}
      />

      <div className="shell relative">
        <SectionHeading
          eyebrow="Plant match"
          lead={`Suggested for ${band.label.toLowerCase()} air`}
          title="Plants that suit your air."
        >
          {isLive ? (
            <>
              For your reading of <span className="text-ink">AQI {liveAqi}</span>, here are{' '}
              <span className="text-ink">{plants.length} species</span> worth growing — about{' '}
              {totalPots} pots would green a standard room.
            </>
          ) : (
            <>
              Pick a band to see the suggestions. Each step up the scale favours species that scored
              higher for VOC removal in lab tests.
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
                At real-home scale, plants make only a small difference to indoor air — research
                finds ventilation does far more. Enjoy them as a healthy extra, and above AQI 150 use
                an air purifier.
              </p>
            </div>
          </div>
        </Reveal>

        <Stagger
          layout
          stagger={0.06}
          viewport={VIEWPORT_TALL}
          className="mt-8 flex flex-wrap justify-center gap-4"
        >
          <AnimatePresence mode="popLayout">
            {plants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} band={band} />
            ))}
          </AnimatePresence>
        </Stagger>
      </div>
    </section>
  )
}
