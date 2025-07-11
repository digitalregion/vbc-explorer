import Link from 'next/link';
import {
  HomeIcon,
  CubeTransparentIcon,
  CurrencyDollarIcon,
  UsersIcon,
  GlobeAltIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  return (
    <header className='bg-gray-900 border-b border-gray-800'>
      <nav className='container mx-auto px-2 flex items-center justify-between h-14'>
        <Link href='/' className='text-xl font-bold nav-link text-gray-100 hover:text-blue-400 transition-colors'>
          VirBiCoin Explorer
        </Link>
        <ul className='flex items-center space-x-4'>
          <li>
            <Link href='/' className='nav-link text-gray-200 flex items-center gap-1'>
              <HomeIcon className='w-5 h-5' />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href='/richlist' className='nav-link text-gray-200 flex items-center gap-1'>
              <UsersIcon className='w-5 h-5' />
              <span>Richlist</span>
            </Link>
          </li>
          <li>
            <Link href='/tokens' className='nav-link text-gray-200 flex items-center gap-1'>
              <CubeTransparentIcon className='w-5 h-5' />
              <span>Tokens</span>
            </Link>
          </li>
          <li>
            <Link href='/nft' className='nav-link text-gray-200 flex items-center gap-1'>
              <PhotoIcon className='w-5 h-5' />
              <span>NFTs</span>
            </Link>
          </li>
          <li>
            <Link href='/transactions' className='nav-link text-gray-200 flex items-center gap-1'>
              <CurrencyDollarIcon className='w-5 h-5' />
              <span>Transactions</span>
            </Link>
          </li>
          <li>
            <a href='https://stats.digitalregion.jp/' rel='noopener noreferrer' target='_blank' className='nav-link text-gray-200 flex items-center gap-1'>
              <GlobeAltIcon className='w-5 h-5' />
              <span>Network</span>
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
