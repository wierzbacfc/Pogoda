import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pogoda PWA',
  description: 'Przejrzysta i nowoczesna prognoza pogody',
  manifest: 'manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pogoda',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className="dark">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png" />
      </head>
      <body className="bg-zinc-950 text-zinc-50 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
