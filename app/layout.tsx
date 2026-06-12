import './globals.css';
import type { Metadata, Viewport } from 'next';
import Providers from './providers';

const SITE = 'https://mundial.yachaydeep.com';
const DESC = 'Predice los marcadores del Mundial 2026 y compite con tus amigos. ¡Demuestra quién sabe más de fútbol!';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Polla Mundialista 2026',
  description: DESC,
  applicationName: 'Polla Mundialista 2026',
  openGraph: {
    type: 'website',
    locale: 'es_EC',
    url: SITE,
    siteName: 'Polla Mundialista 2026',
    title: 'Polla Mundialista 2026',
    description: DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Polla Mundialista 2026',
    description: DESC,
  },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0a7d3c' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
