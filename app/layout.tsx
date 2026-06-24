import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import { BottomNav } from '@/components/BottomNav';
import { Player } from '@/components/Player';
import { AddToPlaylistModal } from '@/components/AddToPlaylistModal';
import { TrackMenuBottomSheet } from '@/components/TrackMenuBottomSheet';
import { PWARegister } from '@/components/PWARegister';
import { BackgroundProvider } from '@/components/BackgroundProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'ZUTIFY',
  description: 'Platform streaming musik modern',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZUTIFY',
  },
  icons: {
    icon: '/zutify.png',
    apple: '/zutify.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="icon" href="/zutify.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var origPush = history.pushState;
                history.pushState = function() {
                  try {
                    return origPush.apply(this, arguments);
                  } catch (e) {
                    console.warn('history.pushState blocked crash:', e);
                  }
                };
                var origReplace = history.replaceState;
                history.replaceState = function() {
                  try {
                    return origReplace.apply(this, arguments);
                  } catch (e) {
                    console.warn('history.replaceState blocked crash:', e);
                  }
                };
              })();
            `,
          }}
        />
      </head>
      <body className="text-white antialiased pb-24 min-h-screen selection:bg-red-500/30" suppressHydrationWarning>
        <ErrorBoundary>
          <BackgroundProvider />
          <PWARegister />
          {children}
          <Player />
          <BottomNav />
          <AddToPlaylistModal />
          <TrackMenuBottomSheet />
        </ErrorBoundary>
      </body>
    </html>
  );
}
