import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import './globals.css';
import type { ReactNode } from 'react';
import { SiGithub, SiX, SiBitcoin, SiDiscord, SiTelegram } from 'react-icons/si';

const inter = Inter({ subsets: ["latin"] });

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
          {children}
        </div>
        <footer className='bg-gray-900 border-t border-gray-800'>
          <div className='container mx-auto px-2 py-2 flex items-center justify-center text-gray-400'>
            <div className='space-x-2 text-sm flex items-center'>
              <span>&copy; 2024-{new Date().getFullYear()} Digitalregion, Inc.</span>
              <span>|</span>
              <a href='https://github.com/virbicoin/vbc-explorer' target='_blank' rel='noopener noreferrer' className='hover:text-gray-100 transition-colors inline-flex items-center gap-1 align-middle'>
                <SiGithub className='w-4 h-4' />
                <span className='align-middle' style={{ verticalAlign: 'middle' }}>vbc-explorer</span>
              </a>
              <span>|</span>
              <a href='https://x.com/VirBiCoin' target='_blank' rel='noopener noreferrer' className='hover:text-gray-100 transition-colors'>
                <SiX className='w-4 h-4' />
              </a>
              <span>|</span>
              <a href='https://bitcointalk.org/index.php?topic=5546988.0' target='_blank' rel='noopener noreferrer' className='hover:text-gray-100 transition-colors'>
                <SiBitcoin className='w-4 h-4' />
              </a>
              <span>|</span>
              <a href='https://discord.digitalregion.jp' target='_blank' rel='noopener noreferrer' className='hover:text-gray-100 transition-colors'>
                <SiDiscord className='w-4 h-4' />
              </a>
              <span>|</span>
              <a href='https://t.me/' target='_blank' rel='noopener noreferrer' className='hover:text-gray-100 transition-colors'>
                <SiTelegram className='w-4 h-4' />
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
