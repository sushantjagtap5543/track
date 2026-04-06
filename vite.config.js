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
          if (req.url.startsWith('/api/notifications/types')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([
              { type: 'geofenceEnter', name: 'Geofence Enter' },
              { type: 'geofenceExit', name: 'Geofence Exit' },
              { type: 'alarm', name: 'Alarm' }
            ]));
            return;
          }
          if (req.url.startsWith('/api/reports/events')) {
            res.setHeader('Content-Type', 'application/json');
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const deviceIds = urlObj.searchParams.getAll('deviceId').map(Number);
            const now = new Date().toISOString();
            let events = [
              { id: 1, deviceId: 1, type: 'geofenceEnter', geofenceId: 1, serverTime: now, attributes: { } },
              { id: 2, deviceId: 10, type: 'alarm', serverTime: now, attributes: { alarm: 'overspeed' } },
              { id: 3, deviceId: 2, type: 'alarm', serverTime: now, attributes: { alarm: 'vibration' } },
              { id: 4, deviceId: 3, type: 'deviceOnline', serverTime: now, attributes: { } },
              { id: 5, deviceId: 1, type: 'ignitionOn', serverTime: now, attributes: { } },
            ];
            if (deviceIds.length > 0) {
              events = events.filter(e => deviceIds.includes(e.deviceId));
            }
            res.end(JSON.stringify(events));
            return;
          }
          if (req.url.startsWith('/api/reports/route')) {
            res.setHeader('Content-Type', 'application/json');
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const deviceIds = urlObj.searchParams.getAll('deviceId').map(Number);
            const now = Date.now();
            let route = [];
            deviceIds.forEach(dId => {
              for(let i=0; i<15; i++) {
                 route.push({ id: 100+i+(dId*1000), deviceId: dId, latitude: 18.52 + (i*0.002), longitude: 73.85 + (i*0.001), speed: 30 + (i*5), course: 90, fixTime: new Date(now - (15-i)*60000).toISOString(), attributes: { ignition: true } });
              }
            });
            res.end(JSON.stringify(route));
            return;
          }
          if (req.url.startsWith('/api/reports/summary')) {
            res.setHeader('Content-Type', 'application/json');
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const deviceIds = urlObj.searchParams.getAll('deviceId').map(Number);
            let summary = [];
            deviceIds.forEach(dId => {
               summary.push({ deviceId: dId, distance: 45000, averageSpeed: 45, maxSpeed: 85, spentFuel: 12.5, engineHours: 36000000 });
            });
            res.end(JSON.stringify(summary));
            return;
          }
          if (req.url.startsWith('/api/reports/trips')) {
             res.setHeader('Content-Type', 'application/json');
             const urlObj = new URL(req.url, `http://${req.headers.host}`);
             const deviceIds = urlObj.searchParams.getAll('deviceId').map(Number);
             const now = Date.now();
             let trips = [];
             deviceIds.forEach(dId => {
                trips.push({ deviceId: dId, startPositionId: 1, endPositionId: 2, startTime: new Date(now - 3600000).toISOString(), endTime: new Date().toISOString(), startAddress: 'Warehouse A', endAddress: 'Main Office', distance: 15400, averageSpeed: 42, maxSpeed: 75, duration: 3600000 });
             });
             res.end(JSON.stringify(trips));
             return;
          }
          if (req.url.startsWith('/api/reports/stops')) {
             res.setHeader('Content-Type', 'application/json');
             const urlObj = new URL(req.url, `http://${req.headers.host}`);
             const deviceIds = urlObj.searchParams.getAll('deviceId').map(Number);
             const now = Date.now();
             let stops = [];
             deviceIds.forEach(dId => {
                stops.push({ deviceId: dId, positionId: 2, startTime: new Date(now - 7200000).toISOString(), endTime: new Date(now - 3600000).toISOString(), address: 'Highway Diner', duration: 3600000, engineHours: 0, distance: 45000, startOdometer: 10000, endOdometer: 55000 });
             });
             res.end(JSON.stringify(stops));
             return;
          }
          if (req.url.startsWith('/api/events')) {
            res.setHeader('Content-Type', 'application/json');
            const now = new Date().toISOString();
            res.end(JSON.stringify([
              { id: 1, deviceId: 1, type: 'geofenceEnter', geofenceId: 1, serverTime: now, attributes: { } },
              { id: 2, deviceId: 10, type: 'alarm', serverTime: now, attributes: { alarm: 'overspeed' } },
              { id: 3, deviceId: 5, type: 'alarm', serverTime: now, attributes: { alarm: 'vibration' } }
            ]));
            return;
          }
          if (req.url.startsWith('/api/geofences')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([
              { id: 1, name: 'Main Office', area: 'CIRCLE (18.5204 73.8567, 500)', attributes: { color: '#3b82f6' } },
              { id: 2, name: 'Warehouse A', area: 'POLYGON ((73.86 18.53, 73.87 18.53, 73.87 18.54, 73.86 18.54, 73.86 18.53))', attributes: { color: '#ef4444' } }
            ]));
            return;
          }
          if (req.url.startsWith('/api/commands/send')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Command sent to gateway.' }));
            return;
          }
          if (req.url.startsWith('/api/commands/types')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([
              { type: 'engineStop' },
              { type: 'engineResume' }
            ]));
            return;
          }
          if (req.url.startsWith('/api/commands')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([])); // returning empty for saved commands
            return;
          }
          if (req.url.startsWith('/api/devices')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([
              { id: 1, name: 'AIS140-Unit-001', uniqueId: '1001', status: 'online', category: 'scorpio', attributes: { ais140: true } },
              { id: 2, name: 'Bolero-Express', uniqueId: '1002', status: 'online', category: 'bolero', attributes: { ignition: true } },
              { id: 3, name: 'Harrier-Patrol', uniqueId: '1003', status: 'online', category: 'harrier', attributes: { } },
              { id: 4, name: 'Truck-A12', uniqueId: '1004', status: 'offline', category: 'truck', attributes: { } },
              { id: 5, name: 'Scorpio-Z', uniqueId: '1005', status: 'online', category: 'scorpio', attributes: { alarm: 'vibration' } },
              { id: 6, name: 'Rickshaw-Local', uniqueId: '1006', status: 'online', category: 'rickshaw', attributes: { } },
              { id: 7, name: 'Bus-City-01', uniqueId: '1007', status: 'online', category: 'bus', attributes: { } },
              { id: 8, name: 'Mahindra-Thar', uniqueId: '1008', status: 'online', category: 'scorpio', attributes: { ignition: true } },
              { id: 9, name: 'Cargo-Canter', uniqueId: '1009', status: 'offline', category: 'truck', attributes: { maintenance: true } },
              { id: 10, name: 'Elite-Courier', uniqueId: '1010', status: 'online', category: 'scorpio', attributes: { alarm: 'overspeed' } }
            ]));
            return;
          }
          if (req.url.startsWith('/api/positions')) {
            res.setHeader('Content-Type', 'application/json');
            const now = new Date().toISOString();
            if (!global.simTick) global.simTick = 0;
            global.simTick += 0.005;
            res.end(JSON.stringify([
              { id: 1, deviceId: 1, latitude: 18.5204 + global.simTick, longitude: 73.8567 + global.simTick, speed: 45 + (global.simTick*10), course: 90, fixTime: now, attributes: { ignition: true, batteryLevel: 85, ais140: true } },
              { id: 2, deviceId: 2, latitude: 18.5304, longitude: 73.8667, speed: 0, course: 0, fixTime: now, attributes: { ignition: true, alarm: 'lowPower' } },
              { id: 3, deviceId: 3, latitude: 18.5404 - global.simTick, longitude: 73.8767, speed: 65, course: 180, fixTime: now, attributes: { ignition: true } },
              { id: 4, deviceId: 4, latitude: 18.5504, longitude: 73.8867 + global.simTick, speed: 10, course: 0, fixTime: now, attributes: { ignition: false } },
              { id: 5, deviceId: 5, latitude: 18.5604, longitude: 73.8967, speed: 20, course: 270, fixTime: now, attributes: { ignition: true, alarm: 'vibration' } },
              { id: 6, deviceId: 6, latitude: 18.5704, longitude: 73.9067, speed: 15, course: 45, fixTime: now, attributes: { ignition: true } },
              { id: 7, deviceId: 7, latitude: 18.5804, longitude: 73.9167, speed: 0, course: 0, fixTime: now, attributes: { ignition: false, batteryLevel: 95 } },
              { id: 8, deviceId: 8, latitude: 18.5904 + global.simTick, longitude: 73.9267, speed: 30, course: 120, fixTime: now, attributes: { ignition: true } },
              { id: 9, deviceId: 9, latitude: 18.6004, longitude: 73.9367, speed: 0, course: 0, fixTime: now, attributes: { ignition: false } },
              { id: 10, deviceId: 10, latitude: 18.6104, longitude: 73.9467, speed: 85, course: 350, fixTime: now, attributes: { ignition: true, alarm: 'overspeed' } }
            ]));
            return;
          }
          if (req.url.startsWith('/api/users')) {
            res.setHeader('Content-Type', 'application/json');
            if (req.method === 'GET' && req.url === '/api/users') {
              res.end(JSON.stringify([{ id: 1, name: 'Admin', email: 'admin@example.com', administrator: true, attributes: {} }]));
            } else if (req.method === 'PUT' || req.method === 'POST') {
              res.end(JSON.stringify({ id: 1, name: 'Admin', email: 'admin@example.com', administrator: true, attributes: {} }));
            } else {
              res.end(JSON.stringify({ success: true }));
            }
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
          if (req.url.startsWith('/api/calendars')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([{ id: 1, name: 'Standard Business Days', attributes: {} }]));
            return;
          }
          if (req.url === '/api/reports') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([
              { id: 1, type: 'events', description: 'Daily Event Log', calendarId: 1 },
              { id: 2, type: 'trips', description: 'Weekly Trips Summary', calendarId: 1 }
            ]));
            return;
          }
          if (req.url.startsWith('/api/statistics')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([
              { id: 1, captureTime: new Date().toISOString(), activeUsers: 14, activeDevices: 320, requests: 5120, messagesReceived: 10500, messagesStored: 10500, mailSent: 45, smsSent: 12, geocoderRequests: 800, geolocationRequests: 150 }
            ]));
            return;
          }
          if (req.url.startsWith('/api/audit')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([
              { id: 1, actionTime: new Date().toISOString(), address: '10.158.32.26', userId: 1, actionType: 'LOGIN', objectType: 'user', objectId: 1 },
              { id: 2, actionTime: new Date().toISOString(), address: '127.0.0.1', userId: 1, actionType: 'UPDATE', objectType: 'device', objectId: 10 }
            ]));
            return;
          }
          if (req.url.startsWith('/api/')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
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
