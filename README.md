# Vanachara — Breathe with the Forest

A React + Vite + Tailwind site about forests, plants and the air between them.
Everything runs client-side: no backend, no accounts, no tracking.

## Design language

Dark throughout, built on a small token set in `src/index.css`:

- **One typeface.** Jost, at 300/400/500. The headline is airy and never bold —
  the weight *is* the personality. There is no second display face.
- **Mossy glass.** Every panel is `.card` — `rgba(22,32,26,0.55)` behind a
  16px blur. The tint is deliberately *green*, not neutral grey, so panels
  belong to the forest rather than sitting on top of it.
- **Everything is a pill.** `.btn--pearl` (near-white with a blush cast) and
  `.btn--ink` (dark glass). The navbar's `.rail` — a floating track with an
  inner pill marking the active item — is reused for every segmented control.
- **One accent.** Blush `#f0b4c4`, reserved for the focus ring and the favicon.
  Everything else is ink, glass and the data's own colours.
- **One motion.** `bloom` — 14px up, 1s on `cubic-bezier(0.22,1,0.36,1)`,
  staggered title → CTA → cards. `Reveal` applies the same curve on scroll.

Semantic colour is exempt from the accent rule: AQI band colours, footprint
breakdown bars and the botanical card gradients carry meaning, so they keep
their own hues.

## The hero video

`public/hero.mp4` is committed with the project and served from our own hosting.
It is referenced only as the root-relative `/hero.mp4`; no external asset host
appears anywhere in the source. If you swap the footage, keep it dark and
low-contrast in the centre — the headline sits on top of it with only a scrim.

## Sections

| # | Section | What it does |
|---|---------|--------------|
| 1 | **Hero** | Full-viewport looping forest-floor video under a two-stop scrim, a centred headline with a lighter lead-in line, and a foot row of glass cards — note · caption · live-AQI stat · species count. |
| 2 | **Live AQI** | Auto-detects location via the Geolocation API. Hourly readings from Open-Meteo for the exact coordinates, scored on **India's CPCB National AQI** (US EPA via a toggle), with a pollutant breakdown showing the µg/m³ behind each sub-index, weather chips, and a WAQI station search for any other city. |
| 3 | **Plant recommender** | Maps the current AQI band to air-purifying species — cleaner air surfaces easy greenery, worse air surfaces the heavy VOC removers. Any band can be previewed manually. |
| 4 | **Encyclopedia** | 18 native and naturalised Indian trees, searchable by name, local name, botanical name, family, region or tag, with a detail sheet per species. |
| 5 | **CO₂ calculator** | Six inputs → annual footprint → the number of trees, saplings and square metres it would take to offset it, plus a comparison against Indian, world and Paris-target averages. |
| 6 | **Nearby parks** | Leaflet over OpenStreetMap data on Esri's keyless Dark Gray basemap, with parks, gardens, groves and reserves pulled live from the Overpass API at a 2/5/10 km radius. |

## Getting started

```bash
npm install
cp .env.example .env     # then paste your WAQI token in
npm run dev
```

### The WAQI token (optional)

The air-quality reading needs **no key at all** — Open-Meteo is keyless. A WAQI
token only improves the *city/station search*. Grab a free one at
<https://aqicn.org/data-platform/token/> and put it in **`.env`** — not in
`.env.example`:

```bash
cp .env.example .env     # then edit .env
```

```
VITE_WAQI_TOKEN=your_token_here
```

Two things catch people out:

1. **Vite only reads `.env`.** `.env.example` is a committed template and is
   never loaded, so a token pasted there has no effect. `.env` is gitignored,
   which is exactly why the real key belongs in it.
2. **Vite reads env files at startup.** Restart the dev server after editing
   `.env` — hot reload will not pick up a new token.

Without it the search falls back to WAQI's shared `demo` token, which resolves
only one fixed sample station. The main reading is unaffected either way.

## Scripts

```bash
npm run dev       # dev server
npm run build     # production build
npm run preview   # serve the build
npm run lint      # oxlint
```

## Project layout

```
public/
  hero.mp4          Hero loop — committed, served locally, never hotlinked
  favicon.svg       Blush leafmark on a dark green swatch
src/
  index.css         Tokens, reset, .shell/.sr-only, .btn + pearl/ink, .card, .rail
  components/       Section components, icons.jsx, + ui/ primitives
  hooks/            useGeolocation, useAirQuality, useNearbyParks
  lib/              aqi.js (scales), openMeteo.js (primary source), waqi.js (search),
                    pollutants.js (CPCB/EPA breakpoints), geo.js, carbon.js
  data/             plants.js (air purifiers), trees.js (encyclopedia)
```

## Where the numbers come from

**Open-Meteo is the primary source.** It is free, keyless, CORS-open, and current
to the hour. Crucially it returns raw **µg/m³**, so the CPCB index is computed
directly from concentrations rather than reverse-engineered out of a US
sub-index — the EPA-table assumption that used to sit in the middle of the
calculation is gone.

It is CAMS model output, not a ground station. The UI says so on every reading:
*"Open-Meteo (CAMS) — Modelled from the Copernicus atmosphere service, not a
ground station."*

**Why not WAQI?** It is still wired in for the city/station picker, but it cannot
carry an India-focused site right now. Every station attributed to CPCB has been
frozen since **23 June 2026** — Bengaluru, Mumbai, Chennai, Kolkata, Ahmedabad,
Lucknow, Jaipur, Patna and Chandigarh all return that identical timestamp, while
Delhi stays current only because it is fed by DPCC, a separate stream. WAQI's
CPCB connector stopped running and has not restarted.

WAQI's `/feed/geo:` endpoint is also unreliable in India: it returns a *Delhi*
station for Bengaluru coordinates 1,727 km away, reported as `status: "ok"`.
`fetchNearest()` distance-checks every geo answer for that reason.

### Validating the maths

The computed US AQI was checked against Open-Meteo's own `us_aqi` field across
six Indian cities: **Mumbai, Chennai and Kolkata matched exactly**, Bengaluru was
1 out and Kanpur 4. Delhi differed by 26 because that convenience field appears
to use instantaneous values, where both EPA and CPCB define 24-hour means — the
implementation here follows the specification.

### Why the headline is particulate-led

CPCB's method takes the worst sub-index across every measured pollutant. This app
deliberately leads with the **particulates** instead, because the gas figures come
from a model rather than a sensor and CAMS over-predicts surface ozone across
South Asia. Measured across six locations, ozone set the headline in five —
including a Ladakh village whose PM sub-index was **4** while ozone alone rated it
**107 "Moderate"**. A pristine Himalayan valley is not moderately polluted.

The model's particulates, by contrast, validate well: against a published reading
for Baharampur (PM2.5 18, PM10 21 µg/m³ → AQI 63 US) this app returns **63 on the
US scale**, an exact match, and 26 on CPCB.

Nothing is hidden. Every gas keeps its own sub-index in the breakdown, and when a
gas would exceed the particulate figure the widget says so and prints the strict
all-pollutant CPCB number alongside. The gauge is labelled `CPCB AQI · PM` and the
provenance line reads *particulate-led*, so the method is never implied to be the
unmodified CPCB formula.

### Averaging windows

Each authority defines its breakpoints against a specific window, so
`src/lib/openMeteo.js` summarises the hourly series twice, once per scale:

| Pollutant | CPCB | US EPA |
|---|---|---|
| PM2.5, PM10 | 24 h mean | 24 h mean |
| NO₂, SO₂ | 24 h mean | **1 h max** |
| O₃, CO | 8 h max | 8 h max |

## The AQI scale

**India's CPCB National AQI is the default.** This matters more than it sounds:
CPCB's scale is not the US EPA scale relabelled — the breakpoints differ, so the
same air produces a *different number* on each.

| | US EPA | India CPCB |
|---|---|---|
| PM2.5 "Good" tops out at | 9.0 µg/m³ | 30 µg/m³ |
| Band 3 covers | 101–150 | 101–200 |
| Band names | Good · Moderate · Unhealthy for Sensitive Groups · Unhealthy · Very Unhealthy · Hazardous | Good · Satisfactory · Moderate · Poor · Very Poor · Severe |

A real reading from Bengaluru measured **53 (Moderate)** on the US scale and
**29 (Good)** on CPCB — same air, same station, both correct on their own scale.

Open-Meteo supplies real µg/m³, so `aqiFromConcentrations()` applies each scale's
breakpoints directly. Only the WAQI *station-search* path still has to invert the
EPA breakpoints back to a concentration first (`toIndianAQI()`), converting gas
units (ppb/ppm → µg/m³ at 25 °C, 1 atm) along the way. The derived concentration is
shown next to each pollutant so the conversion can be checked rather than taken
on trust. The `EPA.pm25` table follows EPA’s May 2024 revision; if WAQI ever reverts
to the 2012 table, that one array is the only thing to change.

The toggle in the air-quality section switches the whole page — hero, gauge,
legend and plant recommender all read from one scale so they cannot disagree.

## Notes on the data

- **AQI bands** for both scales live in `src/lib/aqi.js`, keyed by severity rank
  so the plant recommender works unchanged whichever scale is active. CPCB band
  colours are CPCB's own.
- **Station choice is scored, not just nearest.** Some CPCB stations report no
  PM2.5 at all, and others stopped updating months ago — a station 3 km away with
  no PM2.5 is worse than one 4 km away that has it. `scoreStation()` in
  `src/lib/waqi.js` weights PM2.5 availability, then recency, then distance.
- **Carbon factors** in `src/lib/carbon.js` are Indian-grid averages — the CEA grid
  factor (~0.71 kg CO₂/kWh), IPCC road-transport factors and typical per-capita
  dietary footprints. Good enough to show the scale of the problem; not an audit.
- **Sequestration rates** per tree are approximate and only reached at maturity.
  The calculator reports a separate sapling count assuming a 70% survival rate.
- **WAQI's `/feed/geo:` endpoint** — the precise "nearest station to these
  coordinates" lookup — currently answers `status: "nope" / "can not connect"`
  for the whole India–Bangladesh region, while the same stations resolve
  perfectly by name. `fetchNearest()` in `src/lib/waqi.js` therefore falls back
  to reverse-geocoding the coordinate through Nominatim, searching WAQI for that
  city, and picking the genuinely nearest station by great-circle distance.
- **Indian station data runs weeks behind** on WAQI at the moment. Any reading
  older than 24 h is labelled "Stale · last reported …" rather than presented as
  live — a stale number shown as current is worse than no number.
- **Overpass** is a free, volunteer-run service. The hook tries three mirrors in
  turn with a 60 s timeout each. That timeout is deliberately generous: the
  `[timeout:25]` inside the query caps Overpass's *execution* time, and queue
  time on a busy instance stacks on top — a request measured at 29.7 s here
  would have been aborted by a 25 s client timeout. The query deliberately
  excludes `landuse=grass`, which in Indian cities mostly tags road medians and
  verges.

## Accessibility & performance

- Every animation is gated behind `prefers-reduced-motion`; the hero video
  pauses on the first frame rather than looping.
- Leaflet is lazy-loaded, keeping it out of the initial bundle (~125 kB gzipped
  initial, ~49 kB for the map chunk when it is needed).
- Icons are inline SVG and card artwork is generated — no external image hosts.
- `index.html` deliberately has **no** `<link rel="preload" as="video">`:
  `as="video"` is not a valid preload destination, so browsers ignore it and log
  a console warning. The `<video>` carries `preload="auto"`, which does work.

## Credits

Air quality data from [Open-Meteo](https://open-meteo.com/) (CAMS), CC BY 4.0,
with station search from the [World Air Quality Index](https://aqicn.org/) project.
Place data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors,
queried via the [Overpass API](https://overpass-api.de/) and rendered with
[Leaflet](https://leafletjs.com/) on Esri's Dark Gray Canvas basemap.

CARTO's dark basemap was used until it began stamping "API KEY REQUIRED" across
every tile while still returning HTTP 200 — worth knowing if you ever switch back.
