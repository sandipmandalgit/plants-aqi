/** Inline SVG only — currentColor throughout, no icon library. */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/** The Vanachara brand mark — an open leaf outline. */
export function Leafmark({ size = 19, ...rest }) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true" {...rest}>
      <path d="M5 19c0-6.6 4.6-11 12.5-11 0 7.7-4.6 11-8.5 11-1.7 0-2.7-.3-4 0Z" />
      <path d="M15.8 9.6C11 11.9 7.4 15 5.4 19.6" />
    </svg>
  )
}

export function MenuIcon({ open = false, size = 20, ...rest }) {
  return (
    <svg {...base} strokeWidth={1.7} width={size} height={size} aria-hidden="true" {...rest}>
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3.5 8h17M3.5 16h17" />}
    </svg>
  )
}

export function ArrowRight({ size = 16, ...rest }) {
  return (
    <svg {...base} strokeWidth={1.8} width={size} height={size} aria-hidden="true" {...rest}>
      <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />
    </svg>
  )
}

export function Pin({ size = 16, ...rest }) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true" {...rest}>
      <path d="M20 10.5c0 6-8 11.5-8 11.5S4 16.5 4 10.5a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10.4" r="2.6" />
    </svg>
  )
}

export function Search({ size = 16, ...rest }) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true" {...rest}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}

export function Refresh({ size = 16, ...rest }) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true" {...rest}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" />
    </svg>
  )
}

export function Close({ size = 16, ...rest }) {
  return (
    <svg {...base} strokeWidth={1.8} width={size} height={size} aria-hidden="true" {...rest}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function Chevron({ size = 14, ...rest }) {
  return (
    <svg {...base} strokeWidth={1.9} width={size} height={size} aria-hidden="true" {...rest}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function Alert({ size = 22, ...rest }) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true" {...rest}>
      <path d="M12 8.5v5m0 3.2h.01" />
      <path d="M10.3 3.9 2.4 17.4a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  )
}

export function ExternalLink({ size = 12, ...rest }) {
  return (
    <svg {...base} strokeWidth={1.8} width={size} height={size} aria-hidden="true" {...rest}>
      <path d="M7 17 17 7m0 0H9m8 0v8" />
    </svg>
  )
}
