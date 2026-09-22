import { useMemo } from 'react'
import { motion } from 'framer-motion'
import CitySearch from './CitySearch'
import Reveal, { Stagger, StaggerItem } from './ui/Reveal'
import { slide } from './ui/motion'
import SectionHeading from './ui/SectionHeading'
import { Alert, Pin, Refresh } from './icons'
import { IS_DEMO_TOKEN, aqiOn } from '../lib/waqi'
import {
  POLLUTANT_LABELS,
  POLLUTANT_UNITS,
  PRIMARY_POLLUTANTS,
  SCALES,
  bandFor,
  bandsFor,
  gaugePercent,
} from '../lib/aqi'

const GAUGE_RADIUS = 88
const GAUGE_CIRCUMFERENCE = Math.PI * GAUGE_RADIUS // semicircle

function relativeTime(iso) {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null

  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

/**
 * Hours since a reading was published. Some national networks fall behind by
 * weeks, and a stale number presented as live is worse than no number.
 */
function hoursOld(iso) {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  return (Date.now() - then) / 3600000
}

const STALE_AFTER_HOURS = 24

/** CO is reported in mg/m³ and sits below 1 in clean air, so it needs a decimal. */
function formatConcentration({ concentration, unit }) {
  const decimals = unit === 'mg/m³' ? 1 : 0
  return `${concentration.toFixed(decimals)} ${unit}`
}

function Gauge({ aqi, band, bands, scaleName }) {
  const percent = gaugePercent(aqi)
  const dash = (percent / 100) * GAUGE_CIRCUMFERENCE

  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 200 120" className="w-full" role="img" aria-label={`Air quality index ${aqi}, ${band.label}`}>
        <defs>
          <linearGradient id="aqi-track" x1="0" y1="0" x2="1" y2="0">
            {bands.map((b, i) => (
              <stop key={b.key} offset={`${(i / (bands.length - 1)) * 100}%`} stopColor={b.color} />
            ))}
          </linearGradient>
        </defs>

        <path
          d={`M ${100 - GAUGE_RADIUS} 106 A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${100 + GAUGE_RADIUS} 106`}
          fill="none"
          stroke="url(#aqi-track)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.3"
        />

        <motion.path
          d={`M ${100 - GAUGE_RADIUS} 106 A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${100 + GAUGE_RADIUS} 106`}
          fill="none"
          stroke={band.color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          initial={{ strokeDashoffset: GAUGE_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: GAUGE_CIRCUMFERENCE - dash }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 12px ${band.color}66)` }}
        />
      </svg>

      <div className="absolute inset-x-0 bottom-1 text-center">
        <motion.div
          key={aqi}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-[56px] font-light leading-none tracking-tight"
          style={{ color: band.color }}
        >
          {Number.isFinite(Number(aqi)) ? aqi : '—'}
        </motion.div>
        <div className="mt-1.5 text-[10px] font-light uppercase tracking-[0.2em] text-ink-faint">{scaleName}</div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse p-8">
      <div className="mx-auto h-28 w-56 rounded-full bg-white/8" />
      <div className="mx-auto mt-6 h-5 w-40 rounded-full bg-white/8" />
      <div className="mx-auto mt-3 h-4 w-64 rounded-full bg-white/6" />
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-white/6" />
        ))}
      </div>
    </div>
  )
}

export default function AQIWidget({
  reading,
  loading,
  error,
  source,
  override,
  onSelectCity,
  onClearCity,
  onRefresh,
  geoStatus,
  onLocate,
  scale,
  onScaleChange,
}) {
  const bands = bandsFor(scale)
  const aqi = aqiOn(reading, scale)
  const band = useMemo(
    () => (Number.isFinite(aqi) ? bandFor(aqi, scale) : null),
    [aqi, scale],
  )

  const chips = useMemo(() => {
    if (!reading) return []
    // Concentrations are the common currency: Open-Meteo measures them, and the
    // WAQI path derives them. WAQI's own `iaqi` block only exists on that path.
    const derived = reading.concentrationsFor?.[scale] ?? reading.concentrations ?? {}
    const dominant = reading.dominantFor?.[scale] ?? reading.dominant

    return PRIMARY_POLLUTANTS.filter((k) => derived[k] || reading.pollutants?.[k]?.v != null).map(
      (k) => {
        const onScale = derived[k]
        return {
          key: k,
          label: POLLUTANT_LABELS[k] ?? k.toUpperCase(),
          value: onScale ? onScale.index : reading.pollutants[k].v,
          concentration: onScale ? formatConcentration(onScale) : null,
          dominant: dominant === k,
        }
      },
    )
  }, [reading, scale])

  const weather = useMemo(() => {
    if (!reading) return []
    const units = { t: '°C', h: '%', w: 'm/s' }

    if (reading.weather) {
      return ['t', 'h', 'w']
        .filter((k) => Number.isFinite(reading.weather[k]))
        .map((k) => ({
          key: k,
          label: POLLUTANT_LABELS[k],
          value: Math.round(reading.weather[k]),
          unit: units[k],
        }))
    }

    return ['t', 'h', 'w']
      .filter((k) => reading.pollutants?.[k]?.v != null)
      .map((k) => ({
        key: k,
        label: POLLUTANT_LABELS[k],
        value: Math.round(reading.pollutants[k].v),
        unit: POLLUTANT_UNITS[k] ?? '',
      }))
  }, [reading])

  const isModelled = reading?.source?.kind === 'model'
  const sourceLabel = {
    gps: isModelled ? 'Modelled for your exact coordinates' : 'Nearest station to your device',
    ip: 'Estimated from your connection',
    manual: 'Station you selected',
  }[source]

  return (
    <section id="air" className="relative scroll-mt-24 bg-ground-deep py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(90% 60% at 50% 0%, rgba(22,36,27,0.9) 0%, transparent 70%)' }}
      />

      <div className="shell relative">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow="Live reading" lead="Right now, where you are" title="The air you are breathing.">
            Hourly readings for where you are, scored on India's CPCB National AQI.
            Search any city to read a government monitoring station instead.
          </SectionHeading>

          <Reveal delay={0.1} className="flex w-full flex-col items-start gap-3 md:w-auto md:items-end">
            <div className="rail" role="group" aria-label="AQI scale">
              {Object.values(SCALES).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => onScaleChange(sc.id)}
                  aria-pressed={scale === sc.id}
                  title={sc.name}
                  className={scale === sc.id ? 'is-active' : undefined}
                >
                  {sc.short}
                </button>
              ))}
            </div>
            <CitySearch onSelect={onSelectCity} onClear={onClearCity} active={Boolean(override)} />
          </Reveal>
        </div>

        {IS_DEMO_TOKEN && (
          <Reveal delay={0.05}>
            <p className="card mt-8 px-5 py-4 text-[13px] font-light leading-relaxed text-ink-soft">
              <strong className="font-medium text-ink">
                The city search is running on WAQI's shared demo token.
              </strong>{' '}
              The reading below is unaffected — it comes from Open-Meteo — but station search will
              only resolve one fixed sample station until you add your own free token as{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">VITE_WAQI_TOKEN</code>{' '}
              in <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">.env</code>. It
              takes about a minute at{' '}
              <a
                href="https://aqicn.org/data-platform/token/"
                target="_blank"
                rel="noreferrer"
                className="text-ink underline underline-offset-2"
              >
                aqicn.org
              </a>
              .
            </p>
          </Reveal>
        )}

        <div className="mt-12 grid gap-5 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            {loading && !reading ? (
              <SkeletonCard />
            ) : error && !reading ? (
              <div className="card p-8 text-center sm:p-10">
                <div className="mx-auto grid size-12 place-items-center rounded-full border border-hairline bg-white/6 text-blush">
                  <Alert />
                </div>
                <h3 className="mt-5 text-xl font-normal text-ink">Couldn't fetch a reading</h3>
                <p className="mx-auto mt-2 max-w-sm text-[13px] font-light text-ink-faint">{error}</p>
                <button type="button" onClick={onRefresh} className="btn btn--pearl mt-6">
                  Try again
                </button>
              </div>
            ) : reading && band ? (
              <div
                className="card relative overflow-hidden p-8 transition-colors duration-700 sm:p-10"
                style={{ borderColor: `${band.color}3d` }}
              >
                <div
                  className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full blur-3xl"
                  style={{ backgroundColor: `${band.color}26` }}
                />

                <div className="relative">
                  <Gauge aqi={aqi} band={band} bands={bands} scaleName={SCALES[scale]?.short === 'India' ? 'CPCB AQI' : 'US AQI'} />

                  <div className="mt-6 text-center">
                    <motion.h3
                      key={band.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="text-2xl font-normal sm:text-[28px]"
                      style={{ color: band.color }}
                    >
                      {band.label}
                    </motion.h3>
                    <p className="mx-auto mt-2 max-w-md text-[13.5px] font-light leading-relaxed text-ink-faint">
                      {band.blurb}
                    </p>
                    <p className="mt-3 text-[11px] font-light leading-relaxed text-ink-faint">
                      {SCALES[scale]?.name} · {SCALES[scale]?.authority} · particulate-led
                      {reading.source && (
                        <>
                          <br />
                          Data:{' '}
                          <a
                            href={reading.source.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ink-soft underline underline-offset-2"
                          >
                            {reading.source.name}
                          </a>{' '}
                          — {reading.source.note}
                        </>
                      )}
                      {scale === 'india' && reading.indiaSufficient === false && (
                        <span className="ml-1 text-blush">
                          — derived from fewer than the three pollutants CPCB requires
                        </span>
                      )}
                    </p>
                  </div>

                  <div
                    className="mt-6 rounded-[var(--radius)] border px-5 py-4 text-center text-[13.5px] font-light"
                    style={{ backgroundColor: `${band.color}14`, borderColor: `${band.color}33`, color: 'var(--color-ink)' }}
                  >
                    {band.advice}
                  </div>

                  {reading.gasExceedsFor?.[scale] && reading.fullAqiFor?.[scale] != null && (
                    <p className="mt-4 rounded-[var(--radius)] border border-hairline bg-white/5 px-4 py-3 text-[12px] font-light leading-relaxed text-ink-faint">
                      This figure is led by particulates, which is what Indian trackers report and
                      what CPCB stations mostly measure.{' '}
                      <span className="text-ink-soft">
                        Counting modelled{' '}
                        {POLLUTANT_LABELS[reading.fullDominantFor?.[scale]] ?? 'gases'} too, the
                        strict CPCB figure would be{' '}
                        <span className="text-ink">{reading.fullAqiFor[scale]}</span>.
                      </span>{' '}
                      Every gas keeps its own sub-index in the breakdown.
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] font-light text-ink-faint">
                    <span className="inline-flex items-center gap-1.5">
                      <Pin size={14} />
                      <span className="max-w-[18rem] truncate">{reading.station}</span>
                      {!isModelled && Number.isFinite(reading.distanceKm) && (
                        <span className="text-ink-faint">
                          ·{' '}
                          {reading.distanceKm < 1
                            ? `${Math.round(reading.distanceKm * 1000)} m away`
                            : `${reading.distanceKm.toFixed(1)} km away`}
                        </span>
                      )}
                    </span>
                    {reading.updated &&
                      (hoursOld(reading.updated) > STALE_AFTER_HOURS ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5"
                          style={{ borderColor: '#e8730c66', color: '#e8a06c' }}
                          title="This station has not reported recently — the value may not reflect current conditions."
                        >
                          <span className="size-1.5 rounded-full bg-[#e8730c]" />
                          Stale · last reported {relativeTime(reading.updated)}
                        </span>
                      ) : (
                        <span>Updated {relativeTime(reading.updated)}</span>
                      ))}
                    <button
                      type="button"
                      onClick={onRefresh}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/6 px-3 py-1 text-ink-soft transition-colors hover:bg-white/12 hover:text-ink disabled:opacity-40"
                    >
                      <Refresh size={13} className={loading ? 'animate-spin' : undefined} />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </Reveal>

          <div className="flex flex-col gap-5 lg:col-span-2">
            <Reveal delay={0.1}>
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[15px] font-medium text-ink">Location</h4>
                  <span className="rounded-full border border-hairline bg-white/6 px-2.5 py-1 text-[10px] font-light uppercase tracking-[0.15em] text-ink-soft">
                    {geoStatus === 'granted' ? 'GPS' : geoStatus === 'locating' ? 'Locating' : 'Approximate'}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-light leading-relaxed text-ink-faint">
                  {sourceLabel ?? 'Working out where you are…'}
                </p>
                {(geoStatus === 'denied' || geoStatus === 'error' || geoStatus === 'unsupported') && (
                  <button type="button" onClick={onLocate} className="btn btn--ink btn--sm mt-4 w-full">
                    Use my precise location
                  </button>
                )}
              </div>
            </Reveal>

            {chips.length > 0 && (
              <Reveal delay={0.16}>
                <div className="card p-6">
                  <h4 className="text-[15px] font-medium text-ink">Pollutant breakdown</h4>
                  <p className="mt-1 text-[11.5px] font-light text-ink-faint">
                    {scale === 'india'
                      ? 'CPCB sub-indices, with the concentration each is derived from.'
                      : 'US EPA sub-indices, on the same scale as the headline value.'}
                  </p>

                  <Stagger as="ul" stagger={0.06} className="mt-4 space-y-2.5">
                    {chips.map((chip) => {
                      const chipBand = bandFor(chip.value, scale)
                      return (
                        <StaggerItem as="li" variants={slide} key={chip.key} className="flex items-center gap-3">
                          <span className="w-24 shrink-0 text-[13px] font-light text-ink-soft">
                            {chip.label}
                            {chip.dominant && <span className="ml-1 align-super text-[9px] text-blush">▲</span>}
                            {chip.concentration && (
                              <span className="block text-[10px] text-ink-faint">{chip.concentration}</span>
                            )}
                          </span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                            <motion.span
                              className="block h-full rounded-full"
                              style={{ backgroundColor: chipBand.color }}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${gaugePercent(chip.value)}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </span>
                          <span className="w-10 shrink-0 text-right text-[13px] font-normal tabular-nums text-ink">
                            {Math.round(chip.value)}
                          </span>
                        </StaggerItem>
                      )
                    })}
                  </Stagger>

                  {(reading?.dominantFor?.[scale] ?? reading?.dominant) && (
                    <p className="mt-4 text-[11.5px] font-light text-ink-faint">
                      ▲ {POLLUTANT_LABELS[reading.dominantFor?.[scale] ?? reading.dominant] ?? reading.dominant} is the dominant pollutant.
                    </p>
                  )}
                </div>
              </Reveal>
            )}

            {weather.length > 0 && (
              <Reveal delay={0.22}>
                <Stagger stagger={0.07} className="grid grid-cols-3 gap-3">
                  {weather.map((w) => (
                    <StaggerItem key={w.key} className="card px-3 py-4 text-center">
                      <div className="text-xl font-light text-ink">
                        {w.value}
                        <span className="text-[13px] text-ink-faint">{w.unit}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] font-light uppercase tracking-[0.14em] text-ink-faint">
                        {w.label}
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </Reveal>
            )}
          </div>
        </div>

        <Reveal delay={0.1}>
          <div className="card mt-6 overflow-hidden">
            <Stagger stagger={0.05} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              {bands.map((b, i) => {
                const isCurrent = band?.key === b.key
                const lower = i === 0 ? 0 : bands[i - 1].max + 1
                return (
                  <StaggerItem
                    variants={slide}
                    key={b.key}
                    className="border-b border-r border-white/6 px-4 py-3.5 transition-colors last:border-r-0"
                    style={isCurrent ? { backgroundColor: `${b.color}1f` } : undefined}
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="text-[12px] font-normal text-ink">
                        {b.max === Infinity ? `${lower}+` : `${lower}–${b.max}`}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] font-light leading-tight text-ink-faint">
                      {b.label}
                    </span>
                  </StaggerItem>
                )
              })}
            </Stagger>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
