import { useEffect, useRef, useState } from 'react'

/**
 * True once the element has come within `rootMargin` of the viewport, and it
 * stays true afterwards.
 *
 * Used to hold back expensive work until a visitor actually approaches a
 * section. Overpass allows two concurrent queries per IP, so firing the parks
 * search on every page load — including for visitors who never scroll that far
 * — is what exhausts the limit and makes the map look broken.
 */
export function useInView({ rootMargin = '400px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return

    // Without IntersectionObserver, do the work rather than never doing it.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return [ref, inView]
}
