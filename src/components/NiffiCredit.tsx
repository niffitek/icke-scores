import { ExternalLink } from 'lucide-react'

import { display } from '@/components/Wordmark'

// The niffi.dev wordmark (comet landing on the ı), on its own night-coloured pill.
export const NiffiCredit = () => (
  <a
    href="https://niffi.dev"
    target="_blank"
    rel="noopener"
    className="inline-flex items-center gap-2 rounded-md bg-[#16121F] px-3 py-1.5 text-[#F6F4FA] hover:bg-[#231D33]"
    aria-label="Made with love by Niffi, opens niffi.dev in a new tab"
  >
    <span>Made with ✨ by</span>
    <span
      className={`${display.className} inline-flex items-baseline text-lg leading-none tracking-[-0.04em]`}
      style={{ fontVariantLigatures: 'none' }}
    >
      ni<span className="tracking-[-0.06em]">ff</span>
      <span className="relative ml-[0.03em]">
        ı
        <svg
          viewBox="0 0 64 32"
          aria-hidden="true"
          className="absolute w-[1.2em] h-[0.6em] left-[calc(50%-1.04em)] top-[-0.17em] overflow-visible"
        >
          <defs>
            <linearGradient id="niffiTail" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#C4A7F0" />
              <stop offset="0.5" stopColor="#F4B183" stopOpacity="0.6" />
              <stop offset="1" stopColor="#F4B183" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="56.8,19.3 51.2,28.7 14,0" fill="url(#niffiTail)" />
          <circle cx="54" cy="24" r="5.5" fill="#C4A7F0" stroke="#16121F" strokeWidth="3" paintOrder="stroke" />
        </svg>
      </span>
    </span>
    <ExternalLink size={12} aria-hidden="true" />
  </a>
)
