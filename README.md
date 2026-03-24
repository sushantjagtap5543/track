# GeoSurePath GPS Tracking System

GeoSurePath is a premium GPS tracking solution for assets, vehicles, and personnel.

## Core Features
1. **Real-time Tracking**: Monitor assets with precision using modern maps.
2. **Simplified Registration**: 3-step automated onboarding for users, vehicles, and devices.
3. **Advanced Reporting**: Generate detailed route, trip, and stop reports.
4. **Geofencing**: Create virtual boundaries and receive instant notifications.
5. **Mobile Friendly**: Fully responsive design for tracking on the go.
6. **Multi-language Support**: Available in multiple languages for global use.
7. **Secure Administration**: Robust admin dashboard for managing users and devices.

## User Manual

### 1. Registration
1. Go to the registration page.
2. **User Details**: Enter your name, email, and contact number.
3. **Vehicle**: Provide your vehicle name and plate number.
4. **Device**: Enter the 15-digit IMEI of your tracker.
5. Click "Create Account".

### 2. Login
1. Use your registered email and password at the login page.
2. Default Admin (if applicable): `admin@geosurepath.com` / `admin123`

### 3. Adding More Devices
1. Log in and go to Settings > Devices.
2. Click the '+' button to add a new device identifier.

### 4. Viewing Reports
1. Select "Reports" from the menu.
2. Choose a report type (e.g., Triple, Route).
3. Select the device and time range.

### 5. Deployment Instructions
1. Build the frontend: `cd traccar-web && npm run build`
2. Deploy the JAR file and the `build` directory to your server.
3. Use Nginx as a reverse proxy (see `nginx.conf`).

## Tech Stack
- **Frontend**: React, Material UI, Vite
- **Backend**: Java / Traccar Core
- **Database**: H2 (Default) / PostgreSQL
- **Proxy**: Nginx
