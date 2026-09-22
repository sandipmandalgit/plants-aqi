import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from './icons'
import { searchStations } from '../lib/waqi'
import { bandFor } from '../lib/aqi'

/** Debounced WAQI station search — lets a visitor look up any city by name. */
export default function CitySearch({ onSelect, onClear, active }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      const found = await searchStations(query)
      setResults(found.slice(0, 8))
      setSearching(false)
      setOpen(true)
    }, 350)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onClickAway = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  const pick = (station) => {
    onSelect(`@${station.uid}`)
    setQuery(station.station.name)
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative w-full sm:max-w-sm">
      <div className="flex items-center gap-2.5 rounded-full border border-hairline bg-glass px-5 py-2.5 backdrop-blur-md transition-colors focus-within:border-white/28">
        <Search className="shrink-0 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search a city or station…"
          aria-label="Search for a city or monitoring station"
          className="w-full bg-transparent text-[13.5px] font-light text-ink outline-none placeholder:text-ink-faint"
        />
        {searching && (
          <span className="size-3 shrink-0 animate-spin rounded-full border border-white/20 border-t-white/70" />
        )}
        {active && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
              onClear()
            }}
            className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-light text-ink-soft transition-colors hover:text-ink"
          >
            Reset
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="card card--lift absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-[18px] p-1.5"
          >
            {results.map((station) => {
              const band = bandFor(station.aqi)
              return (
                <li key={station.uid}>
                  <button
                    type="button"
                    onClick={() => pick(station)}
                    className="flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-left transition-colors hover:bg-white/8"
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-medium"
                      style={{ backgroundColor: `${band.color}26`, color: band.color }}
                    >
                      {Number.isFinite(Number(station.aqi)) ? station.aqi : '—'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-light text-ink">
                        {station.station.name}
                      </span>
                      <span className="block text-[11.5px] font-light text-ink-faint">{band.label}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
