import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from './components/Header'
import Footer from './components/Footer'
import type { ReactNode } from 'react'
import type { Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "VirBiCoin Explorer",
  description: "Explore the VirBiCoin blockchain with real-time transaction data, block information, address tracking, and comprehensive token analytics. A modern, user-friendly blockchain explorer for the VirBiCoin ecosystem.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body className={`${inter.className} bg-gray-900 text-gray-200 min-h-screen flex flex-col`}>
        <div className='flex-grow'>
          <Header />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
