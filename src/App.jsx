import { Suspense, lazy, useMemo, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AQIWidget from './components/AQIWidget'
import PlantRecommender from './components/PlantRecommender'
import Encyclopedia from './components/Encyclopedia'
import CO2Calculator from './components/CO2Calculator'
import Footer from './components/Footer'
import { useGeolocation } from './hooks/useGeolocation'
import { useAirQuality } from './hooks/useAirQuality'
import { DEFAULT_SCALE } from './lib/aqi'

/** Leaflet is ~40% of the bundle and lives below the fold, so it loads on demand. */
const ParksMap = lazy(() => import('./components/ParksMap'))

function MapFallback() {
  return (
    <section id="parks" className="scroll-mt-24 bg-ground-deep py-24 sm:py-32">
      <div className="shell">
        <div className="card h-[560px] animate-pulse" />
      </div>
    </section>
  )
}

export default function App() {
  const { coords, status: geoStatus, locate } = useGeolocation()
  const air = useAirQuality({ coords, geoStatus })

  // Which AQI scale the whole page speaks. India's CPCB National AQI by
  // default — the US EPA scale WAQI publishes on reports a different number
  // for the same air, so hero, widget and recommender must agree on one.
  const [scale, setScale] = useState(DEFAULT_SCALE)

  /**
   * The map needs a centre even when the browser refuses GPS. The WAQI station
   * coordinates are a good enough stand-in — they resolve to the same city.
   */
  const mapCenter = useMemo(() => {
    if (coords) return coords
    const geo = air.reading?.coords
    if (Array.isArray(geo) && geo.length === 2) return { lat: geo[0], lon: geo[1] }
    return null
  }, [coords, air.reading])

  return (
    // The reduced-motion rules in index.css only reach CSS animation; Framer
    // drives transforms from JS. `reducedMotion="user"` is what actually holds
    // the travel back for those visitors, leaving the opacity fade intact.
    <MotionConfig reducedMotion="user">
      <Navbar />

      <main>
        <Hero reading={air.reading} loading={air.loading} scale={scale} />

        <AQIWidget
          reading={air.reading}
          loading={air.loading}
          error={air.error}
          source={air.source}
          override={air.override}
          onSelectCity={air.selectCity}
          onClearCity={air.clearCity}
          onRefresh={air.refresh}
          geoStatus={geoStatus}
          onLocate={locate}
          scale={scale}
          onScaleChange={setScale}
        />

        <PlantRecommender reading={air.reading} scale={scale} />

        <Encyclopedia />

        <CO2Calculator />

        <Suspense fallback={<MapFallback />}>
          <ParksMap coords={mapCenter} geoStatus={geoStatus} onLocate={locate} />
        </Suspense>
      </main>

      <Footer />
    </MotionConfig>
  )
}
