import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(() => ({
  server: {
    port: 3000,
  },
  build: {
    outDir: 'build',
  },
  plugins: [
    svgr(),
    react(),
    {
      name: 'mock-api',
      configureServer(server) {
        let loggedIn = false;
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/server') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ name: 'GeoSurePath', version: '6.12.2', attributes: { theme_color: '#3b82f6' } }));
            return;
          }
          if (req.url === '/api/session' && req.method === 'GET') {
            if (loggedIn) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ id: 1, name: 'Admin', email: 'admin@example.com', administrator: true, attributes: {} }));
            } else {
              res.statusCode = 401;
              res.end('Unauthorized');
            }
            return;
          }
          if (req.url.startsWith('/api/auth/login') && req.method === 'POST') {
            loggedIn = true;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ user: { id: 1, name: 'Admin', role: 'admin' }, accessToken: 'mock_token' }));
            return;
          }
          if (req.url.startsWith('/api/devices')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([
              { id: 1, name: 'AIS140-Unit-001', uniqueId: '12345', status: 'online', attributes: { ais140: true } },
              { id: 2, name: 'Truck-B22', uniqueId: '67890', status: 'offline', attributes: {} }
            ]));
            return;
          }
          if (req.url.startsWith('/api/positions')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([
              { id: 1, deviceId: 1, latitude: 18.5204, longitude: 73.8567, speed: 25, course: 90, fixTime: new Date().toISOString(), attributes: { ignition: true, batteryLevel: 85, ais140: true } },
              { id: 2, deviceId: 2, latitude: 18.5304, longitude: 73.8667, speed: 0, course: 0, fixTime: new Date().toISOString(), attributes: { ignition: false } }
            ]));
            return;
          }
          if (req.url.startsWith('/api/auth/register') && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }
          if (req.url.startsWith('/api/auth/forgot-password') && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }
          if (req.url.startsWith('/api/auth/reset-password') && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }
          if (req.url.startsWith('/manifest.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json');
            res.end(JSON.stringify({
              short_name: 'GeoSurePath',
              name: 'GeoSurePath Enterprise',
              theme_color: '#3b82f6',
              icons: [
                { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
                { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
              ]
            }));
            return;
          }
          next();
        });
      },
    },
    VitePWA({
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,woff,woff2,mp3}'],
      },
      manifest: {
        short_name: 'GeoSurePath',
        name: 'GeoSurePath Enterprise',
        theme_color: '#3b82f6',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js', dest: '' },
      ],
    }),
  ],
}));
