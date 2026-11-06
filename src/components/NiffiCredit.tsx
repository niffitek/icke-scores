import { NiffiLogo } from '@niffi/brand/react'
import { ExternalLink } from 'lucide-react'

// The niffi.dev wordmark on its own night-coloured pill.
export const NiffiCredit = () => (
  <a
    href="https://niffi.dev"
    target="_blank"
    rel="noopener"
    className="inline-flex items-center gap-2 rounded-md bg-[#16121F] px-3 py-1.5 text-[#F6F4FA] hover:bg-[#231D33]"
    aria-label="Made with love by Niffi, opens niffi.dev in a new tab"
  >
    <span>Made with ✨ by</span>
    <NiffiLogo className="text-lg" />
    <ExternalLink size={12} aria-hidden="true" />
  </a>
)
