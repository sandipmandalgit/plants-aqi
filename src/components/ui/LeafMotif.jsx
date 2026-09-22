/**
 * Botanical silhouettes used as card artwork, so the encyclopedia and the
 * recommender stay entirely self-contained — no image hosts, no broken links.
 */
const SHAPES = {
  heart: 'M50 90C50 90 18 66 18 42a32 32 0 0 1 64 0c0 24-32 48-32 48Z',
  broad: 'M50 92C24 84 14 60 20 32c22-6 46 4 58 24 8 14 4 30-28 36Z',
  oval: 'M50 92C30 82 22 62 28 40s28-32 40-28c6 22 4 48-8 62-3 4-7 12-10 18Z',
  lance: 'M50 94C40 74 34 46 44 20c2-6 8-14 10-14s10 12 12 20c8 26 0 52-16 68Z',
  compound:
    'M50 96V16M50 30c-12-8-22-8-30-4 4 10 14 16 30 12Zm0 0c12-8 22-8 30-4-4 10-14 16-30 12Zm0 20c-12-8-22-8-30-4 4 10 14 16 30 12Zm0 0c12-8 22-8 30-4-4 10-14 16-30 12Zm0 20c-12-8-22-8-30-4 4 10 14 16 30 12Zm0 0c12-8 22-8 30-4-4 10-14 16-30 12Z',
  fern: 'M50 96V14M50 26c-10-6-20-8-28-6 3 9 13 14 28 10Zm0 0c10-6 20-8 28-6-3 9-13 14-28 10Zm0 16c-10-6-20-8-28-6 3 9 13 14 28 10Zm0 0c10-6 20-8 28-6-3 9-13 14-28 10Zm0 16c-10-6-20-8-28-6 3 9 13 14 28 10Zm0 0c10-6 20-8 28-6-3 9-13 14-28 10Zm0 16c-8-5-16-6-22-5 3 8 10 12 22 8Zm0 0c8-5 16-6 22-5-3 8-10 12-22 8Z',
  trifoliate:
    'M50 96V56M50 56c-16-2-26-14-26-28 16-4 28 6 26 28Zm0 0c16-2 26-14 26-28-16-4-28 6-26 28Zm0 0c-4-16 2-30 14-38 8 12 6 30-14 38Z',
  palm: 'M50 96V44M50 44C36 30 20 26 8 30c8 16 24 22 42 14Zm0 0c14-14 30-18 42-14-8 16-24 22-42 14Zm0 0c-6-18-2-34 6-42 10 10 12 28-6 42Zm0 0c8-16 22-26 34-26-2 16-16 28-34 26Zm0 0C36 34 22 44 14 56c14 4 30-2 36-12Z',
}

export default function LeafMotif({ shape = 'oval', className = '', stroke = false }) {
  const d = SHAPES[shape] ?? SHAPES.oval
  const strokeOnly = stroke || shape === 'compound' || shape === 'fern' || shape === 'trifoliate' || shape === 'palm'

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d={d}
        fill={strokeOnly ? 'none' : 'currentColor'}
        stroke="currentColor"
        strokeWidth={strokeOnly ? 3 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!strokeOnly && (
        <path
          d="M50 92C52 68 56 46 66 28"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}
