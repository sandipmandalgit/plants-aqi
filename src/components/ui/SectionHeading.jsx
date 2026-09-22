import { Stagger, StaggerItem } from './Reveal'
import { eyebrowIn, rise, titleIn } from './motion'

/**
 * Mirrors the hero headline: a light lead-in line above a slightly larger
 * regular-weight line. Never bold — the weight is the personality here.
 */
export default function SectionHeading({ eyebrow, lead, title, children, align = 'left' }) {
  const alignment = align === 'center' ? 'text-center mx-auto items-center' : 'text-left'

  return (
    <Stagger stagger={0.09} className={`flex max-w-2xl flex-col ${alignment}`}>
      {eyebrow && (
        <StaggerItem
          as="span"
          variants={eyebrowIn}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-hairline bg-glass px-3 py-1 text-[11px] font-light uppercase tracking-[0.18em] text-ink-soft backdrop-blur-md"
        >
          <span className="size-1 rounded-full bg-blush/70" />
          {eyebrow}
        </StaggerItem>
      )}

      <StaggerItem
        as="h2"
        variants={titleIn}
        className="mt-4 font-normal text-ink"
        style={{
          fontSize: 'clamp(1.6rem, 3.2vw, 2.5rem)',
          lineHeight: 1.16,
          letterSpacing: '-0.005em',
        }}
      >
        {lead && <span className="block text-[0.76em] font-light text-white/90">{lead}</span>}
        {title}
      </StaggerItem>

      {children && (
        <StaggerItem
          as="p"
          variants={rise}
          className="mt-4 max-w-xl text-[15px] font-light leading-relaxed text-ink-faint"
        >
          {children}
        </StaggerItem>
      )}
    </Stagger>
  )
}
