import { useCallback, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { EASE, VIEWPORT, rise } from './motion'

/**
 * The scroll-triggered form of the hero's `bloom` keyframe — the same easing,
 * a little more travel, so everything below the fold enters the way the hero
 * did. `blur` is reserved for type, where the settle reads as a focus pull.
 */
export default function Reveal({
  children,
  as = 'div',
  className = '',
  delay = 0,
  duration = 0.9,
  y = 24,
  x = 0,
  scale,
  blur = 0,
  viewport = VIEWPORT,
  ...rest
}) {
  const MotionTag = motion[as] ?? motion.div

  const hidden = { opacity: 0, y, x }
  const shown = { opacity: 1, y: 0, x: 0 }
  if (scale != null) {
    hidden.scale = scale
    shown.scale = 1
  }
  if (blur) {
    hidden.filter = `blur(${blur}px)`
    shown.filter = 'blur(0px)'
  }

  return (
    <MotionTag
      className={className}
      initial={hidden}
      whileInView={shown}
      viewport={viewport}
      transition={{ duration, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

/**
 * A container whose children cascade instead of arriving together. Children
 * must carry `variants` — `rise` and friends from ./motion, or a grid's own —
 * so the parent's `visible` state propagates down on a delay.
 *
 * Children mounted later (a filter change swapping a grid's contents) inherit
 * `visible` immediately and animate without the stagger, which is what you
 * want: the cascade belongs to the arrival, not to every re-sort.
 *
 * That inheritance only works through `animate`. Framer Motion does not pass a
 * parent's `whileInView` state to children mounted after it fired, so with
 * `whileInView` those children stay at `hidden` — invisible but taking up
 * space. The viewport is therefore watched here and fed in as `animate`.
 */
export function Stagger({
  children,
  as = 'div',
  className = '',
  stagger = 0.07,
  delayChildren = 0.04,
  viewport = VIEWPORT,
  /**
   * `view` waits for the scroll. `mount` is for content that arrives from the
   * network after the reader is already looking at the panel — a viewport
   * trigger there would have fired against an empty container.
   */
  trigger = 'view',
  ref: forwardedRef,
  ...rest
}) {
  const MotionTag = motion[as] ?? motion.div
  const localRef = useRef(null)
  const inView = useInView(localRef, {
    once: viewport.once ?? true,
    amount: viewport.amount,
    margin: viewport.margin,
  })
  const shown = trigger === 'mount' || inView

  // Callers such as the CO2 calculator need the element too.
  const setRef = useCallback(
    (node) => {
      localRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    },
    [forwardedRef],
  )

  return (
    <MotionTag
      ref={setRef}
      className={className}
      initial="hidden"
      animate={shown ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren } },
      }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

export function StaggerItem({ children, as = 'div', className = '', variants = rise, ...rest }) {
  const MotionTag = motion[as] ?? motion.div

  return (
    <MotionTag className={className} variants={variants} {...rest}>
      {children}
    </MotionTag>
  )
}
