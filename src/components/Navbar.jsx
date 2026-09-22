import { useEffect, useState } from 'react'
import { Leafmark, MenuIcon } from './icons'

const LINKS = [
  { label: 'Air', href: '#air' },
  { label: 'Plant match', href: '#recommend' },
  { label: 'Trees', href: '#encyclopedia' },
  { label: 'Offset', href: '#calculator' },
  { label: 'Green spaces', href: '#parks' },
]

/**
 * A floating pill rail. It never changes surface on scroll — the glass and the
 * hairline carry it over both the video and the sections below, so there is no
 * scroll listener here by design.
 */
export default function Navbar() {
  const [active, setActive] = useState(LINKS[0].label)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-60">
      <div
        className="shell flex items-center gap-5"
        style={{ minHeight: 'var(--nav-h)' }}
      >
        {/* Every element in the bar carries its own glass. The bar itself stays
            transparent and never changes surface, but because this page scrolls
            past the hero, content would otherwise pass visibly behind the
            wordmark and the actions. */}
        <a
          href="#top"
          onClick={() => setActive(LINKS[0].label)}
          className="inline-flex items-center gap-[7px] rounded-full border border-hairline bg-[rgba(14,20,16,0.5)] px-4 py-2 text-[15.5px] font-medium tracking-[0.01em] text-ink backdrop-blur-md backdrop-saturate-[1.2]"
        >
          <Leafmark />
          Vanachara
        </a>

        <nav className="rail mx-auto hidden lg:flex" aria-label="Sections">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setActive(link.label)}
              className={active === link.label ? 'is-active' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 rounded-full border border-hairline bg-[rgba(14,20,16,0.5)] p-1.5 pl-5 backdrop-blur-md backdrop-saturate-[1.2] lg:flex">
          <a
            href="#encyclopedia"
            className="pr-2 text-[13.5px] text-ink-soft transition-colors hover:text-ink"
          >
            Encyclopedia
          </a>
          <a href="#air" className="btn btn--pearl btn--sm">
            Check my air
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="ml-auto inline-flex rounded-full border border-hairline bg-[rgba(14,20,16,0.5)] p-2.5 text-ink backdrop-blur-md lg:hidden"
        >
          <MenuIcon open={open} />
        </button>
      </div>

      {open && (
        <div
          className="card card--lift mx-[var(--gutter)] flex flex-col rounded-[18px] px-[18px] pb-5 pt-3 lg:hidden"
          style={{ background: 'rgba(10,16,12,0.94)' }}
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => {
                setActive(link.label)
                setOpen(false)
              }}
              className="border-b border-white/8 px-1 py-[13px] text-[15.5px] text-ink-soft"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#encyclopedia"
            onClick={() => setOpen(false)}
            className="border-b border-white/8 px-1 py-[13px] text-[15.5px] text-ink-soft"
          >
            Encyclopedia
          </a>
          <a href="#air" onClick={() => setOpen(false)} className="btn btn--pearl mt-4">
            Check my air
          </a>
        </div>
      )}
    </header>
  )
}
