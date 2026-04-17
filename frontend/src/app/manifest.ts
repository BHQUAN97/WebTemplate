import type { MetadataRoute } from 'next';
import { brand } from '@/lib/config/brand';

/**
 * PWA Web App Manifest — dung Next.js App Router Metadata File API.
 * File nay tu dong serve tai `/manifest.webmanifest`.
 * Tham khao: https://developer.mozilla.org/docs/Web/Manifest
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#0a0a0a',
    lang: 'vi',
    categories: ['business', 'shopping'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
