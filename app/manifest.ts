import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SpeedRead',
    short_name: 'SpeedRead',
    description: 'Read faster, retain more. A distraction-free speed reading app using RSVP technology.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1A1A1A',
    theme_color: '#F7931A',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
