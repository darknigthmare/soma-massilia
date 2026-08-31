import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://soma-massilia.vercel.app'),
  title: 'SOMA//MASSILIA — La Chair sous Licence',
  description:
    'SOMA//MASSILIA : action-RPG cyberpunk original à Néo-Massilia en 2197. La Dette de Chair, trois corps et Station Zéro.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'SOMA//MASSILIA — La Chair sous Licence',
    description:
      'Votre corps est un abonnement. Votre identité, une clause révocable.',
    images: ['/art/neo-massilia-port.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOMA//MASSILIA — La Chair sous Licence',
    description:
      'La Dette de Chair : campagne cyberpunk originale à Néo-Massilia.',
    images: ['/art/neo-massilia-port.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#090b10',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
