import type { NextConfig } from 'next';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 本番環境でのメモリ最適化
  experimental: {
    // メモリ使用量を削減
    optimizePackageImports: ['react', 'react-dom'],
  },
  
  // 外部パッケージ設定（experimental から移動）
  serverExternalPackages: ['mongoose', 'web3'],
  
  // 軽量化設定
  compiler: {
    // 未使用コードの削除
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // バンドルサイズ最適化
  bundlePagesRouterDependencies: true,
  
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    PORT: process.env.PORT,
    WEB3_PROVIDER_URL: process.env.WEB3_PROVIDER_URL,
  },
  webpack: (config, { isServer }) => {
    // lightningcssのネイティブモジュールエラーを回避
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    
    // lightningcssのネイティブモジュールを完全に無視
    config.externals = config.externals || [];
    config.externals.push({
      'lightningcss': 'lightningcss',
    });
    
    // lightningcssのネイティブモジュールを空のオブジェクトに置き換え
    config.resolve.alias = {
      ...config.resolve.alias,
      'lightningcss': false,
    };
    
    // lightningcssのネイティブモジュールを無視するプラグインを追加
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /lightningcss\.linux-x64-gnu\.node$/,
      })
    );
    
    // lightningcssのネイティブモジュールを無視するプラグインを追加
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /lightningcss/,
      })
    );
    
    return config;
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sugar.digitalregion.jp',
        pathname: '/image/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: '*.ipfs.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/ipfs/**',
      }
    ],
  },
  /* config options here */
};

export default nextConfig;
