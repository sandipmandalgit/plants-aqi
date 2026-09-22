/**
 * The page's shared motion vocabulary. Kept apart from the components that use
 * it so those files export components only, and Fast Refresh keeps working.
 */

/** The hero's `bloom` easing, shared by everything that enters below the fold. */
export const EASE = [0.22, 1, 0.36, 1]

/**
 * Fire once, slightly after the element's top edge clears the fold, so a
 * reveal reads as a response to the scroll rather than something that already
 * happened offscreen.
 */
export const VIEWPORT = { once: true, amount: 0.2, margin: '0px 0px -60px 0px' }

/** A looser viewport for tall panels and grids, which never reach `amount: 0.2`. */
export const VIEWPORT_TALL = { once: true, amount: 0.08, margin: '0px 0px -40px 0px' }

/** The step a `Stagger` child takes. Also usable directly as `variants`. */
export const rise = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
}

/** Card-grid step: the same rise with a touch of scale, so tiles settle. */
export const riseCard = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: EASE } },
}

/** A short horizontal step, for list rows and legends. */
export const slide = {
  hidden: { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
}

/** Section headings: the eyebrow arrives from the side... */
export const eyebrowIn = {
  hidden: { opacity: 0, y: 10, x: -8 },
  visible: { opacity: 1, y: 0, x: 0, transition: { duration: 0.6, ease: EASE } },
}

/** ...and the type settles out of a soft blur, like a focus pull. */
export const titleIn = {
  hidden: { opacity: 0, y: 26, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.95, ease: EASE } },
}

/** Chips are small, so they pop rather than travel. */
export const chipIn = {
  hidden: { opacity: 0, y: 8, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } },
}
