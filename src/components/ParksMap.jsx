import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Reveal, { Stagger, StaggerItem } from './ui/Reveal'
import { slide } from './ui/motion'
import SectionHeading from './ui/SectionHeading'
import { Pin, Refresh } from './icons'
import { useNearbyParks } from '../hooks/useNearbyParks'
import { useInView } from '../hooks/useInView'

const RADII = [
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
]

/**
 * Leaflet's default marker images break under bundlers, so every pin here is a
 * divIcon built from inline SVG — no asset resolution, and it matches the theme.
 */
function pinIcon(color) {
  return L.divIcon({
    className: 'vanachara-pin',
    html: `<svg viewBox="0 0 24 32" width="24" height="32" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20c0-6.6-5.4-12-12-12z" fill="${color}" fill-opacity="0.92"/>
        <circle cx="12" cy="12" r="4.6" fill="#050a07"/>
      </svg>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -28],
  })
}

/** Keeps the Leaflet viewport in step with the origin the app resolved. */
function Recenter({ center, radius }) {
  const map = useMap()

  useEffect(() => {
    if (!center) return
    const zoom = radius <= 2000 ? 14 : radius <= 5000 ? 13 : 12
    map.flyTo([center.lat, center.lon], zoom, { duration: 1.1 })
  }, [center, radius, map])

  return null
}

/** Pans to a park when its list entry is clicked. */
function FocusPark({ park }) {
  const map = useMap()

  useEffect(() => {
    if (park) map.flyTo([park.lat, park.lon], 15, { duration: 0.9 })
  }, [park, map])

  return null
}

export default function ParksMap({ coords, geoStatus, onLocate }) {
  const [radius, setRadius] = useState(5000)
  const [focused, setFocused] = useState(null)

  // Freeze the identity so the Overpass hook only re-queries on a real move,
  // not every time the parent hands us a fresh object with the same numbers.
  const { lat, lon } = coords ?? {}
  const origin = useMemo(
    () => (lat != null && lon != null ? { lat: Number(lat), lon: Number(lon) } : null),
    [lat, lon],
  )

  // Overpass permits two queries per IP at a time. Holding the search until the
  // section is actually approaching the viewport means a visitor who never
  // scrolls this far never spends one.
  const [sectionRef, inView] = useInView({ rootMargin: '500px' })
  const { parks, loading, error, refresh } = useNearbyParks(origin, { radius, enabled: inView })

  return (
    <section
      id="parks"
      ref={sectionRef}
      className="relative scroll-mt-24 bg-ground-deep py-24 sm:py-32"
    >
      <div className="shell relative">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow="Green spaces" lead="Drawn live from OpenStreetMap" title="The nearest lungs to your door.">
            Parks, gardens, groves and reserves within reach. Pick a radius and see what is
            actually around you.
          </SectionHeading>

          <Reveal delay={0.1}>
            <div className="rail">
              {RADII.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRadius(r.value)}
                  aria-pressed={radius === r.value}
                  className={radius === r.value ? 'is-active' : undefined}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        {!origin ? (
          <Reveal delay={0.1}>
            <div className="card mt-10 px-6 py-20 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full border border-hairline bg-white/6 text-ink-soft">
                <Pin size={26} />
              </div>
              <h3 className="mt-5 text-[26px] font-light text-ink">We need a location to search around</h3>
              <p className="mx-auto mt-2.5 max-w-md text-[13.5px] font-light leading-relaxed text-ink-faint">
                {geoStatus === 'denied'
                  ? 'Location access was declined. Allow it in your browser and try again — nothing is stored or sent anywhere but OpenStreetMap.'
                  : 'Allow location access and we will pull every park, garden and grove around you.'}
              </p>
              <button type="button" onClick={onLocate} className="btn btn--pearl mt-6">
                {geoStatus === 'locating' ? 'Locating…' : 'Find green spaces near me'}
              </button>
            </div>
          </Reveal>
        ) : (
          <Reveal delay={0.1}>
            <div className="mt-10 grid gap-5 lg:grid-cols-5">
              <div className="card relative h-[480px] overflow-hidden lg:col-span-3 lg:h-[620px]">
                <MapContainer
                  center={[origin.lat, origin.lon]}
                  zoom={13}
                  scrollWheelZoom={false}
                  // Esri's Dark Gray Canvas is published to zoom 16; letting the
                  // controls go past that would leave the viewport blank.
                  maxZoom={16}
                  minZoom={9}
                  className="size-full"
                >
                  {/* Esri's Dark Gray Canvas: a dark basemap that needs no key.
                      CARTO's equivalent now stamps "API KEY REQUIRED" across every
                      tile while still answering 200, and OSM's own tile servers
                      refuse traffic that looks like an app rather than a browser.
                      Base and labels are separate layers in this style. */}
                  <TileLayer
                    attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> &middot; Places from &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={16}
                  />
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={16}
                  />

                  <Recenter center={origin} radius={radius} />
                  <FocusPark park={focused} />

                  <CircleMarker
                    center={[origin.lat, origin.lon]}
                    radius={8}
                    pathOptions={{ color: '#f0b4c4', weight: 3, fillColor: '#050a07', fillOpacity: 1 }}
                  >
                    <Popup>You are here</Popup>
                  </CircleMarker>

                  {parks.map((park) => (
                    <Marker key={park.id} position={[park.lat, park.lon]} icon={pinIcon(park.color)}>
                      <Popup>
                        <strong className="block text-[13px] font-medium">{park.name}</strong>
                        <span className="text-[11.5px] opacity-60">
                          {park.kind} · {park.distance.toFixed(1)} km away
                        </span>
                        {park.operator && (
                          <span className="mt-1 block text-[11.5px] opacity-50">{park.operator}</span>
                        )}
                        <a
                          href={`https://www.openstreetmap.org/${park.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 block text-[11.5px] underline underline-offset-2 opacity-80"
                        >
                          View on OpenStreetMap →
                        </a>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                {loading && (
                  <div className="pointer-events-none absolute left-1/2 top-4 z-500 -translate-x-1/2 rounded-full border border-hairline bg-black/70 px-4 py-2 text-[12px] font-light text-ink backdrop-blur-md">
                    Searching OpenStreetMap…
                  </div>
                )}
              </div>

              <div className="card flex flex-col lg:col-span-2">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
                  <div>
                    {/* "0 green spaces" while a search is still running reads as a
                        definitive empty answer rather than as work in progress. */}
                    <h3 className="text-[17px] font-light text-ink">
                      {loading && parks.length === 0
                        ? 'Searching…'
                        : `${parks.length} green ${parks.length === 1 ? 'space' : 'spaces'}`}
                    </h3>
                    <p className="text-[11.5px] font-light text-ink-faint">
                      {loading && parks.length === 0
                        ? 'OpenStreetMap can take up to a minute'
                        : `within ${RADII.find((r) => r.value === radius)?.label} of you`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refresh}
                    disabled={loading}
                    aria-label="Refresh results"
                    className="grid size-9 place-items-center rounded-full border border-hairline bg-white/6 text-ink-soft transition-colors hover:bg-white/12 hover:text-ink disabled:opacity-40"
                  >
                    <Refresh className={loading ? 'animate-spin' : undefined} />
                  </button>
                </div>

                <div className="max-h-[420px] flex-1 overflow-y-auto p-2 lg:max-h-[540px]">
                  {error && (
                    <div className="m-3 rounded-[var(--radius)] border border-hairline bg-white/6 px-4 py-3">
                      <p className="text-[12.5px] font-light text-ink-soft">{error}</p>
                      <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        className="btn btn--ink btn--sm mt-3 w-full"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {!loading && !error && parks.length === 0 && (
                    <p className="m-3 rounded-[var(--radius)] border border-hairline bg-white/6 px-4 py-3 text-[12.5px] font-light text-ink-soft">
                      No mapped green spaces in this radius. Try widening it — or add the ones you
                      know to OpenStreetMap.
                    </p>
                  )}

                  {loading && parks.length === 0 && (
                    <ul className="space-y-1 p-2" aria-hidden="true">
                      {Array.from({ length: 6 }, (_, i) => (
                        <li
                          key={i}
                          className="h-12 animate-pulse rounded-full bg-white/5"
                          style={{ animationDelay: `${i * 90}ms` }}
                        />
                      ))}
                    </ul>
                  )}

                  <Stagger as="ul" trigger="mount" stagger={0.035} className="space-y-0.5">
                    {parks.map((park) => (
                      <StaggerItem as="li" variants={slide} key={park.id}>
                        <button
                          type="button"
                          onClick={() => setFocused(park)}
                          className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left transition-colors ${
                            focused?.id === park.id ? 'bg-white/12' : 'hover:bg-white/6'
                          }`}
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: park.color }}
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-[13.5px] font-light ${
                                park.unnamed ? 'italic text-ink-faint' : 'text-ink'
                              }`}
                            >
                              {park.name}
                            </span>
                            <span className="block text-[11px] font-light text-ink-faint">{park.kind}</span>
                          </span>
                          <span className="shrink-0 text-[12px] font-light tabular-nums text-ink-soft">
                            {park.distance < 1
                              ? `${Math.round(park.distance * 1000)} m`
                              : `${park.distance.toFixed(1)} km`}
                          </span>
                        </button>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>

                <p className="border-t border-white/8 px-6 py-3 text-[10.5px] font-light leading-relaxed text-ink-faint">
                  Data © OpenStreetMap contributors, queried via the Overpass API.
                </p>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
