import Link from 'next/link';
import {
  HomeIcon,
  CubeTransparentIcon,
  CubeIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

export default function Header() {
  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <nav className="container mx-auto px-2 flex items-center justify-between h-14">
        <Link href='/' className='text-xl font-bold nav-link text-gray-100 hover:text-blue-400 transition-colors'>
          VirBiCoin Explorer
        </Link>
        <ul className='flex items-center space-x-2 md:space-x-4'>
          <li>
            <Link href='/' className='nav-link text-gray-200 flex items-center gap-1'>
              <HomeIcon className='w-5 h-5' />
              <span className='hidden sm:inline'>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href='/blocks' className='nav-link text-gray-200 flex items-center gap-1'>
              <CubeIcon className='w-5 h-5' />
              <span className='hidden sm:inline'>Blocks</span>
            </Link>
          </li>
          <li>
            <Link href='/transactions' className='nav-link text-gray-200 flex items-center gap-1'>
              <ArrowPathIcon className='w-5 h-5' />
              <span className='hidden sm:inline'>Transactions</span>
            </Link>
          </li>
          <li>
            <Link href='/richlist' className='nav-link text-gray-200 flex items-center gap-1'>
              <TrophyIcon className='w-5 h-5' />
              <span className='hidden sm:inline'>Richlist</span>
            </Link>
          </li>
          <li>
            <Link href='/tokens' className='nav-link text-gray-200 flex items-center gap-1'>
              <CubeTransparentIcon className='w-5 h-5' />
              <span className='hidden sm:inline'>Tokens</span>
            </Link>
          </li>
          <li>
            <Link href='/contract/verify' className='nav-link text-gray-200 flex items-center gap-1'>
              <CodeBracketIcon className='w-5 h-5' />
              <span className='hidden sm:inline'>Verify</span>
            </Link>
          </li>
          <li>
            <Link href='https://pool.digitalregion.jp/' rel='noopener noreferrer' target='_blank' className='nav-link text-gray-200 flex items-center gap-1'>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 21l6-6" />
                <path d="M3 8a7 7 0 0 1 9.9 0l3.1 3.1a2 2 0 0 1 0 2.8l-1.4 1.4a2 2 0 0 1-2.8 0L8.7 13.1" />
                <path d="M14 6l4-4" />
              </svg>
              <span className='hidden sm:inline'>Mining Pool</span>
            </Link>
          </li>
          <li>
            <a href='https://stats.digitalregion.jp/' rel='noopener noreferrer' target='_blank' className='nav-link text-gray-200 flex items-center gap-1'>
              <GlobeAltIcon className='w-5 h-5' />
              <span className='hidden sm:inline'>Network</span>
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
};
