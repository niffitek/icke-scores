import type { Metadata, Viewport } from 'next'
import Link from 'next/link'

import { NiffiCredit } from '@/components/NiffiCredit'
import { Wordmark } from '@/components/Wordmark'

import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Icke-Cup', template: '%s · Icke-Cup' },
  description:
    'Spielplan, Live-Ergebnisse und Rangliste des Icke-Cup Volleyballturniers von IckeSports-Sportmarketing.',
  openGraph: {
    title: 'Icke-Cup',
    description: 'Spielplan, Live-Ergebnisse und Rangliste des Icke-Cup.',
    type: 'website',
    locale: 'de_DE',
  },
}

export const viewport: Viewport = { themeColor: '#da333c' }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white shadow sticky top-0 z-50">
          <nav className="container mx-auto px-4 py-4 flex justify-between items-center gap-2">
            <Link href="/" aria-label="Icke-Cup, zur Startseite" className="flex-shrink-0">
              {/* Smaller below 360px so the nav fits on the narrowest phones */}
              <Wordmark className="text-xl min-[360px]:text-2xl sm:text-3xl" />
            </Link>
            <ul className="flex space-x-2 sm:space-x-4">
              <li>
                <Link href="/" className="hover:text-[#da333c] text-sm sm:text-base whitespace-nowrap">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/scores" className="hover:text-[#da333c] text-sm sm:text-base whitespace-nowrap">
                  Rangliste
                </Link>
              </li>
              <li>
                <Link href="/games" className="hover:text-[#da333c] text-sm sm:text-base whitespace-nowrap">
                  Alle Spiele
                </Link>
              </li>
            </ul>
          </nav>
        </header>
        <main className="flex-1 container mx-auto px-4 py-3 min-h-0">{children}</main>
        <footer className="bg-white shadow py-2 px-5 text-center text-xs flex items-center justify-between">
          <div>&copy; {new Date().getFullYear()} IckeSports-Sportmarketing. All rights reserved.</div>
          <NiffiCredit />
        </footer>
      </body>
    </html>
  )
}
