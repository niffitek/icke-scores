import type { Metadata } from "next";
import "./globals.css";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Icke-Cup",
  description: "Created by IckeSports-Sportmarketing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white shadow">
          <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="text-2xl font-bold">
              <span className="text-[#da333c]">Icke</span>
              <span className="text-[#149567]">Cup</span>
            </div>
            <ul className="flex space-x-4">
              <li>
                <Link href="/" className="hover:text-[#da333c]">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/scores" className="hover:text-[#da333c]">
                  Scores
                </Link>
              </li>
              <li>
                <Link href="/games" className="hover:text-[#da333c]">
                  All Games
                </Link>
              </li>
            </ul>
          </nav>
        </header>
        <main className="flex-1 container mx-auto px-4 py-3 min-h-0">
          {children}
        </main>
        <footer className="bg-white shadow p-2 text-center text-xs">
          &copy; 2025 IckeSports-Sportmarketing. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
