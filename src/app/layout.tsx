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
        <script
          id="pwa-sw-register"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  var swPath = (window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/') + 'sw.js';
                  // In case pathname points to an html file
                  if (swPath.indexOf('.html') !== -1) {
                    swPath = swPath.substring(0, swPath.lastIndexOf('/') + 1) + 'sw.js';
                  }

                  var refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (!refreshing) {
                      refreshing = true;
                      window.location.reload();
                    }
                  });

                  function showUpdateToast(waitingWorker) {
                    if (document.getElementById('sw-update-toast')) return;
                    var t = document.createElement('div');
                    t.id = 'sw-update-toast';
                    t.style.cssText = 'position:fixed;bottom:90px;left:16px;right:16px;z-index:9999;background:rgba(24,24,27,0.92);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.2);border-radius:18px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 20px 30px -5px rgba(0,0,0,0.6);';
                    t.innerHTML = '<div style="display:flex;align-items:center;gap:10px;"><div style="width:10px;height:10px;border-radius:50%;background:#38bdf8;box-shadow:0 0 10px #38bdf8;"></div><span style="color:#f4f4f5;font-size:13px;font-weight:600;">Dostępna nowa wersja!</span></div><button id="pwa-update-btn" style="background:#3b82f6;color:#ffffff;border:none;border-radius:12px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(59,130,246,0.4);">Aktualizuj</button>';
                    document.body.appendChild(t);

                    document.getElementById('pwa-update-btn').addEventListener('click', function() {
                      if (waitingWorker) {
                        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                      } else if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                      } else {
                        window.location.reload();
                      }
                    });
                  }

                  navigator.serviceWorker.register(swPath).then(function(reg) {
                    // Check for updates on page load if a waiting worker already exists
                    if (reg.waiting && navigator.serviceWorker.controller) {
                      showUpdateToast(reg.waiting);
                    }

                    reg.addEventListener('updatefound', function() {
                      var newWorker = reg.installing;
                      if (!newWorker) return;
                      newWorker.addEventListener('statechange', function() {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          showUpdateToast(newWorker);
                        }
                      });
                    });

                    // Auto check for update when app regains focus or visibility
                    document.addEventListener('visibilitychange', function() {
                      if (document.visibilityState === 'visible') {
                        reg.update().catch(function() {});
                      }
                    });

                    // Periodic update check every 30 minutes
                    setInterval(function() {
                      reg.update().catch(function() {});
                    }, 30 * 60 * 1000);
                  }).catch(function(err) {
                    console.log('SW registration error:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
