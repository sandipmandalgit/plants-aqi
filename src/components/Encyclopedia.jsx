import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import LeafMotif from './ui/LeafMotif'
import Reveal, { Stagger, StaggerItem } from './ui/Reveal'
import { VIEWPORT_TALL, chipIn, riseCard } from './ui/motion'
import SectionHeading from './ui/SectionHeading'
import { ArrowRight, Close, Search } from './icons'
import { TREES, TREE_TAGS } from '../data/trees'

function matches(tree, query) {
  if (!query) return true
  const q = query.toLowerCase()
  return [tree.name, tree.local, tree.botanical, tree.family, tree.note, ...tree.regions, ...tree.tags]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

function TreeCard({ tree, onOpen }) {
  return (
    <motion.button
      type="button"
      layout
      onClick={() => onOpen(tree)}
      variants={riseCard}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.32 } }}
      className="card group flex flex-col overflow-hidden text-left transition-[background-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:bg-glass-lift hover:shadow-[0_18px_44px_rgba(0,0,0,0.34)]"
    >
      <div
        className="relative h-36 overflow-hidden"
        style={{ background: `linear-gradient(150deg, ${tree.palette[0]}, ${tree.palette[1]})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <LeafMotif
          shape={tree.leaf}
          className="absolute -bottom-4 right-2 size-40 text-white/20 transition-all duration-700 group-hover:-rotate-6 group-hover:scale-110"
        />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-[17px] font-normal leading-tight text-white">{tree.name}</h3>
          <p className="mt-0.5 text-[11px] font-light italic text-white/65">{tree.botanical}</p>
        </div>
        <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/35 px-2.5 py-0.5 text-[10px] font-light text-white backdrop-blur-sm">
          {tree.co2} kg CO₂/yr
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[12.5px] font-light text-ink-faint">{tree.local}</p>

        <dl className="mt-3 grid grid-cols-2 gap-3 text-[11.5px]">
          <div>
            <dt className="font-light text-ink-faint">Height</dt>
            <dd className="mt-0.5 font-light text-ink-soft">{tree.height}</dd>
          </div>
          <div>
            <dt className="font-light text-ink-faint">Lives</dt>
            <dd className="mt-0.5 font-light text-ink-soft">{tree.lifespan}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {tree.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-hairline bg-white/6 px-2.5 py-0.5 text-[11px] font-light capitalize text-ink-soft"
            >
              {tag}
            </span>
          ))}
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-light text-ink-soft transition-colors group-hover:text-ink">
          Read the profile
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </motion.button>
  )
}

function TreeDialog({ tree, onClose }) {
  // Escape closes, and the page behind stops scrolling while the sheet is up.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-70 grid place-items-end overflow-y-auto bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${tree.name} profile`}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl overflow-hidden rounded-t-[20px] border border-hairline bg-ground shadow-2xl sm:rounded-[20px]"
      >
        <div
          className="relative h-44 overflow-hidden sm:h-52"
          style={{ background: `linear-gradient(150deg, ${tree.palette[0]}, ${tree.palette[1]})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
          <LeafMotif shape={tree.leaf} className="absolute -bottom-8 right-4 size-52 text-white/20" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55"
          >
            <Close />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-6">
            <h3 className="text-[30px] font-light leading-tight text-white">{tree.name}</h3>
            <p className="mt-1 text-[13px] font-light italic text-white/70">
              {tree.botanical} · {tree.family}
            </p>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6 sm:p-8">
          <p className="text-[15px] font-light leading-relaxed text-ink-soft">{tree.note}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['Local names', tree.local],
              ['Height', tree.height],
              ['Lifespan', tree.lifespan],
              ['Habit', tree.habit],
              ['Flowering', tree.flowering],
              ['CO₂ / year', `${tree.co2} kg`],
            ].map(([label, value]) => (
              <div key={label} className="card p-4">
                <dt className="text-[10px] font-light uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
                <dd className="mt-1.5 text-[13px] font-light leading-snug text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {[
            ['Where it grows', tree.regions],
            ['Known for', tree.tags],
          ].map(([heading, items]) => (
            <div key={heading} className="mt-6">
              <h4 className="text-[10px] font-light uppercase tracking-[0.14em] text-ink-faint">{heading}</h4>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-hairline bg-white/6 px-3 py-1 text-[12px] font-light capitalize text-ink-soft"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Encyclopedia() {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState(null)
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(
    () => TREES.filter((t) => matches(t, query) && (!tag || t.tags.includes(tag))),
    [query, tag],
  )

  return (
    <section id="encyclopedia" className="relative scroll-mt-24 bg-ground-deep py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(70% 45% at 80% 0%, rgba(22,36,27,0.85) 0%, transparent 70%)' }}
      />

      <div className="shell relative">
        <SectionHeading eyebrow="Encyclopedia" lead="Eighteen natives" title="The trees that built this land.">
          The sacreds, the medicinals and the naturalised avenue giants — searchable by name,
          region, family or what they are good for.
        </SectionHeading>

        <Reveal delay={0.1}>
          <div className="mt-9 flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-full border border-hairline bg-glass px-6 py-3.5 backdrop-blur-md transition-colors focus-within:border-white/28">
              <Search size={18} className="shrink-0 text-ink-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try “neem”, “Western Ghats”, “Fabaceae” or “sacred”…"
                aria-label="Search the tree encyclopedia"
                className="w-full bg-transparent text-[15px] font-light text-ink outline-none placeholder:text-ink-faint"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="grid size-6 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-white/10 hover:text-ink"
                >
                  <Close size={13} />
                </button>
              )}
            </div>

            <Stagger stagger={0.028} className="flex flex-wrap gap-1.5">
              <StaggerItem
                as="button"
                variants={chipIn}
                type="button"
                onClick={() => setTag(null)}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-light capitalize transition-colors ${
                  tag === null
                    ? 'border-white/30 bg-white/16 text-ink'
                    : 'border-hairline bg-white/5 text-ink-soft hover:bg-white/10 hover:text-ink'
                }`}
              >
                All {TREES.length}
              </StaggerItem>
              {TREE_TAGS.map((t) => (
                <StaggerItem
                  as="button"
                  variants={chipIn}
                  key={t}
                  type="button"
                  onClick={() => setTag((cur) => (cur === t ? null : t))}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-light capitalize transition-colors ${
                    tag === t
                      ? 'border-white/30 bg-white/16 text-ink'
                      : 'border-hairline bg-white/5 text-ink-soft hover:bg-white/10 hover:text-ink'
                  }`}
                >
                  {t}
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>

        <Reveal as="p" delay={0.16} y={12} duration={0.6} className="mt-6 text-[12.5px] font-light text-ink-faint" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'tree' : 'trees'}
          {tag && ` tagged “${tag}”`}
          {query && ` matching “${query}”`}
        </Reveal>

        <Stagger
          layout
          stagger={0.045}
          viewport={VIEWPORT_TALL}
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((tree) => (
              <TreeCard key={tree.id} tree={tree} onOpen={setSelected} />
            ))}
          </AnimatePresence>
        </Stagger>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="card mt-8 py-16 text-center"
          >
            <LeafMotif shape="lance" className="mx-auto size-12 text-white/15" />
            <h3 className="mt-4 text-xl font-light text-ink">Nothing in the canopy</h3>
            <p className="mx-auto mt-2 max-w-sm text-[13px] font-light text-ink-faint">
              No tree matches that search. Try a broader term, or clear the filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setTag(null)
              }}
              className="btn btn--pearl btn--sm mt-6"
            >
              Clear filters
            </button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {selected && <TreeDialog tree={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  )
}
