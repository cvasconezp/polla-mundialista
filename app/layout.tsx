import './globals.css';
import type { Metadata, Viewport } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Polla Mundialista 2026',
  description: 'Predice los partidos del Mundial y compite con tus amigos.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0a7d3c' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
