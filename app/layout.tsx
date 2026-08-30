import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://soma-massilia.vercel.app'),
  title: 'SOMA//MASSILIA — La Chair sous Licence',
  description:
    'Vertical Slice 0.1.0 jouable : action-RPG cyberpunk original à Néo-Massilia en 2197.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'SOMA//MASSILIA — La Chair sous Licence',
    description: 'Votre corps est un abonnement. Votre identité, une clause révocable.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOMA//MASSILIA — La Chair sous Licence',
    description: 'Vertical Slice 0.1.0 jouable à Néo-Massilia.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#090b10',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
