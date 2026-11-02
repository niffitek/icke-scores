import { Bricolage_Grotesque } from 'next/font/google'

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: '800' })

const SEAMS =
  'M32 32 C 44 28, 44 10, 30 4.2 M32 32 C 29.5 44.4, 45.1 53.4, 57.1 44.2 M32 32 C 22.5 23.6, 6.9 32.6, 8.9 47.6'

// The niffi.dev comet with a volleyball as its head, landing on the i of "icke".
// Keep in sync with the card on niffi.dev.
export const Wordmark = ({ className = '' }: { className?: string }) => (
  <span
    className={`${display.className} inline-flex items-baseline leading-none tracking-[-0.04em] pl-[0.9em] ${className}`}
    style={{ fontVariantLigatures: 'none' }}
  >
    <span className="relative text-[#da333c]">
      ı
      <svg
        viewBox="0 0 64 32"
        aria-hidden="true"
        className="absolute w-[1.3em] h-[0.65em] left-[calc(50%-1.12em)] top-[-0.3em] overflow-visible"
      >
        <defs>
          <linearGradient id="ickeTail" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#149567" />
            <stop offset="0.5" stopColor="#149567" stopOpacity="0.6" />
            <stop offset="1" stopColor="#149567" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="58.5,17 49.5,30.5 8,0" fill="url(#ickeTail)" />
        <g transform="translate(54 24) scale(0.3393) translate(-32 -32)">
          <circle cx="32" cy="32" r="28" fill="#fff" />
          <path
            d="M32 32 C 44 28, 44 10, 30 4.2 A 28 28 0 0 1 57.1 44.2 C 45.1 53.4, 29.5 44.4, 32 32 Z"
            fill="#da333c"
          />
          <path
            d="M32 32 C 22.5 23.6, 6.9 32.6, 8.9 47.6 A 28 28 0 0 1 30 4.2 C 44 10, 44 28, 32 32 Z"
            fill="#149567"
          />
          <path d={SEAMS} fill="none" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="28" fill="none" stroke="#1c1917" strokeWidth="4" />
        </g>
      </svg>
    </span>
    <span className="text-[#da333c]">cke</span>
    <span className="text-[#149567] ml-[0.22em]">cup</span>
  </span>
)
