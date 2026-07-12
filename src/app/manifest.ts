import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TBC OutOfZion · Finance Requisitions',
    short_name: 'TBC Finance',
    description: 'Church finance requisition workflow for TBC OutOfZion',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F5F7F5',
    theme_color: '#064E2F',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
