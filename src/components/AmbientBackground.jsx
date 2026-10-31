import { useEffect, useRef } from 'react'

/** How far the light closes on the cursor each frame — lower trails more. */
const FOLLOW = 0.09

/**
 * The drifting glows behind every section (styled as `.ambient` in index.css),
 * plus a light that trails the cursor on devices that have one.
 *
 * The cursor light is moved with a transform written straight to the element
 * from a rAF loop, never through React state: a re-render per mouse move would
 * be wasted work for something only the compositor needs to know about. The
 * loop stops itself once the light has caught up.
 */
export default function AmbientBackground() {
  const lightRef = useRef(null)

  useEffect(() => {
    const light = lightRef.current
    if (!light || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    // Reduced motion still gets the light — it moves only when the visitor
    // does — but without the trailing ease.
    const follow = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : FOLLOW

    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let x = targetX
    let y = targetY
    let frame = 0

    const tick = () => {
      x += (targetX - x) * follow
      y += (targetY - y) * follow
      light.style.transform = `translate3d(${x}px, ${y}px, 0)`
      frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.5 ? requestAnimationFrame(tick) : 0
    }

    const onMove = (e) => {
      targetX = e.clientX
      targetY = e.clientY
      light.style.opacity = '1'
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const onLeave = () => {
      light.style.opacity = '0'
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div className="ambient" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <div ref={lightRef} className="ambient__light" />
    </div>
  )
}
