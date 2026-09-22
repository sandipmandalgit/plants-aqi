import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from './icons'
import { bandFor } from '../lib/aqi'
import { aqiOn } from '../lib/waqi'

/** Served from our own hosting — the file lives in public/, committed with the project. */
const HERO_VIDEO_URL = '/hero.mp4'

export default function Hero({ reading, loading, scale }) {
  const videoRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const play = video.play()
    if (play?.catch) play.catch(() => {})

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.pause()
      setReady(true)
    }
  }, [])

  const aqi = aqiOn(reading, scale)
  const band = Number.isFinite(aqi) ? bandFor(aqi, scale) : null

  return (
    <section
      id="top"
      className="relative isolate flex flex-col overflow-hidden"
      style={{
        '--scale': 1,
        '--ui-scale': 1,
        minHeight: '100svh',
        paddingTop: 'var(--nav-h)',
        paddingBottom: 'clamp(20px, 3vh, 34px)',
        background:
          'radial-gradient(120% 90% at 50% 40%, var(--color-ground) 0%, var(--color-ground-deep) 100%)',
      }}
    >
      <div className="absolute inset-0 -z-10">
        <video
          ref={videoRef}
          className={`size-full object-cover transition-opacity duration-[1200ms] ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionTimingFunction: 'var(--ease-out)' }}
          src={HERO_VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onCanPlay={() => setReady(true)}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(92% 68% at 50% 52%, rgba(6,12,8,0) 42%, rgba(5,10,7,0.58) 100%),' +
              'linear-gradient(180deg, rgba(5,10,7,0.66) 0%, rgba(5,10,7,0.12) 22%, rgba(5,10,7,0) 50%, rgba(5,10,7,0.72) 100%)',
          }}
        />
      </div>

      <div className="shell flex flex-1 flex-col">
        {/* Centre block — centred in the space between the nav and the foot row. */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1
            className="animate-bloom font-normal text-ink"
            style={{
              fontSize: 'calc(clamp(1.9rem, 4.3vw, 3.5rem) * var(--scale))',
              lineHeight: 1.16,
              letterSpacing: '-0.005em',
              textShadow: '0 2px 26px rgba(4,10,6,0.6)',
            }}
          >
            <span className="block text-[0.76em] font-light text-white/90">Discover the forest</span>
            Made for the air you breathe.
          </h1>

          <a
            href="#air"
            className="btn btn--pearl animate-bloom"
            style={{
              marginTop: 'calc(clamp(22px, 3.4vh, 36px) * var(--scale))',
              padding: 'calc(12px * var(--ui-scale)) calc(28px * var(--ui-scale))',
              fontSize: 'calc(14px * var(--ui-scale))',
              animationDelay: '0.1s',
            }}
          >
            Check the air around you
            <ArrowRight />
          </a>
        </div>

        {/* Foot row: note card · caption · stat cards */}
        <div
          className="flex flex-col items-stretch gap-[clamp(14px,2.4vw,30px)] text-center md:flex-row md:items-end md:justify-between md:text-left"
          style={{ paddingTop: 'clamp(18px, 3vh, 32px)' }}
        >
          <div
            className="card animate-bloom md:max-w-[320px]"
            style={{
              padding: 'calc(15px * var(--ui-scale)) calc(18px * var(--ui-scale))',
              animationDelay: '0.3s',
            }}
          >
            <h2
              className="font-medium tracking-[0.005em]"
              style={{ fontSize: 'calc(14.5px * var(--ui-scale))' }}
            >
              Green that does the work
            </h2>
            <p
              className="mt-1.5 font-light leading-[1.55] text-ink-faint"
              style={{ fontSize: 'calc(11.5px * var(--ui-scale))' }}
            >
              From the air quality outside your window to the native trees that clean it — see
              what to plant, and how much of it you would need.
            </p>
          </div>

          <p
            className="order-first pb-1.5 font-light text-ink-soft sm:order-none"
            style={{
              fontSize: 'calc(12.5px * var(--ui-scale))',
              textShadow: '0 1px 14px rgba(4,10,6,0.7)',
            }}
          >
            The forest breathes in what we breathe out.
          </p>

          <div className="flex justify-center gap-[clamp(10px,1.4vw,16px)]">
            <LiveStat aqi={aqi} reading={reading} loading={loading} band={band} />
            <Stat figure="18" label="Species" foot="Native trees profiled" />
          </div>
        </div>
      </div>
    </section>
  )
}

function statStyle() {
  return {
    padding: 'calc(15px * var(--ui-scale)) calc(18px * var(--ui-scale))',
    minWidth: 'calc(112px * var(--ui-scale))',
    animationDelay: '0.3s',
  }
}

function Stat({ figure, label, foot }) {
  return (
    <div className="card animate-bloom flex flex-1 flex-col text-left md:flex-none" style={statStyle()}>
      <strong
        className="font-medium leading-[1.1]"
        style={{ fontSize: 'calc(23px * var(--ui-scale))' }}
      >
        {figure}
      </strong>
      <span className="font-light text-ink-faint" style={{ fontSize: 'calc(12px * var(--ui-scale))' }}>
        {label}
      </span>
      <span
        className="font-light text-ink-soft"
        style={{ marginTop: 'calc(14px * var(--ui-scale))', fontSize: 'calc(11px * var(--ui-scale))' }}
      >
        {foot}
      </span>
    </div>
  )
}

/** The live reading, wearing the same stat-card chrome as its neighbour. */
function LiveStat({ aqi, reading, loading, band }) {
  if (loading || !reading || !band || !Number.isFinite(aqi)) {
    return (
      <div className="card animate-bloom flex flex-1 flex-col text-left md:flex-none" style={statStyle()}>
        <strong className="font-medium leading-[1.1] text-ink-faint" style={{ fontSize: 'calc(23px * var(--ui-scale))' }}>
          —
        </strong>
        <span className="font-light text-ink-faint" style={{ fontSize: 'calc(12px * var(--ui-scale))' }}>
          Air quality
        </span>
        <span
          className="font-light text-ink-soft"
          style={{ marginTop: 'calc(14px * var(--ui-scale))', fontSize: 'calc(11px * var(--ui-scale))' }}
        >
          {loading ? 'Reading the air…' : 'Awaiting a station'}
        </span>
      </div>
    )
  }

  return (
    <a
      href="#air"
      className="card animate-bloom flex flex-1 flex-col text-left transition-colors hover:bg-glass-lift md:flex-none"
      style={statStyle()}
    >
      <strong
        className="flex items-center gap-2 font-medium leading-[1.1]"
        style={{ fontSize: 'calc(23px * var(--ui-scale))' }}
      >
        <span className="relative flex size-2">
          <span
            className="absolute inline-flex size-full rounded-full"
            style={{ backgroundColor: band.color, animation: 'pulse-ring 2.4s cubic-bezier(0.4,0,0.6,1) infinite' }}
          />
          <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: band.color }} />
        </span>
        {aqi}
      </strong>
      <span className="font-light text-ink-faint" style={{ fontSize: 'calc(12px * var(--ui-scale))' }}>
        {band.label.replace('Unhealthy for Sensitive Groups', 'Sensitive groups')}
      </span>
      <span
        className="truncate font-light text-ink-soft"
        style={{ marginTop: 'calc(14px * var(--ui-scale))', fontSize: 'calc(11px * var(--ui-scale))', maxWidth: '13rem' }}
      >
        {reading.station}
      </span>
    </a>
  )
}
