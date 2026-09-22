import { ExternalLink, Leafmark } from './icons'
import Reveal, { Stagger, StaggerItem } from './ui/Reveal'
import { slide } from './ui/motion'

const CREDITS = [
  { label: 'World Air Quality Index', href: 'https://aqicn.org/' },
  { label: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
  { label: 'Overpass API', href: 'https://overpass-api.de/' },
  { label: 'Leaflet', href: 'https://leafletjs.com/' },
]

const SECTIONS = [
  ['#air', 'Live air quality'],
  ['#recommend', 'Plant recommender'],
  ['#encyclopedia', 'Tree encyclopedia'],
  ['#calculator', 'CO₂ offset calculator'],
  ['#parks', 'Green spaces near you'],
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ground-deep pt-20">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 60% at 50% 120%, rgba(22,36,27,0.9) 0%, transparent 70%)' }}
      />

      <div className="shell relative pb-12">
        <Stagger stagger={0.1} className="grid gap-10 md:grid-cols-3">
          <StaggerItem>
            <span className="inline-flex items-center gap-[7px] text-[15.5px] font-medium tracking-[0.01em] text-ink">
              <Leafmark />
              Vanachara
            </span>
            <p className="mt-4 max-w-xs text-[13px] font-light leading-relaxed text-ink-faint">
              A small field guide to the air you breathe and the trees that clean it. Everything
              here runs in your browser — no accounts, no tracking.
            </p>
          </StaggerItem>

          <StaggerItem>
            <h3 className="text-[10px] font-light uppercase tracking-[0.2em] text-ink-faint">Sections</h3>
            <Stagger as="ul" stagger={0.05} delayChildren={0.12} className="mt-4 space-y-2.5">
              {SECTIONS.map(([href, label]) => (
                <StaggerItem as="li" variants={slide} key={href}>
                  <a href={href} className="text-[13.5px] font-light text-ink-soft transition-colors hover:text-ink">
                    {label}
                  </a>
                </StaggerItem>
              ))}
            </Stagger>
          </StaggerItem>

          <StaggerItem>
            <h3 className="text-[10px] font-light uppercase tracking-[0.2em] text-ink-faint">Built on</h3>
            <Stagger as="ul" stagger={0.05} delayChildren={0.18} className="mt-4 space-y-2.5">
              {CREDITS.map((c) => (
                <StaggerItem as="li" variants={slide} key={c.href}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13.5px] font-light text-ink-soft transition-colors hover:text-ink"
                  >
                    {c.label}
                    <ExternalLink />
                  </a>
                </StaggerItem>
              ))}
            </Stagger>
          </StaggerItem>
        </Stagger>

        <Reveal delay={0.1} y={16} className="mt-12 flex flex-col gap-3 border-t border-white/8 pt-6 text-[11.5px] font-light text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            Air quality readings are indicative. Emission factors are averages — a guide to scale,
            not a certified audit.
          </p>
          <a href="#top" className="text-ink-soft transition-colors hover:text-ink">
            Back to the canopy ↑
          </a>
        </Reveal>
      </div>
    </footer>
  )
}
