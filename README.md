# 🛰️ GeoSurePath SaaS - Enterprise GPS Tracking Ecosystem

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/Version-1.2.5--Stable-green.svg)]()
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

**GeoSurePath** is a high-performance, enterprise-grade SaaS infrastructure designed for global vehicle tracking. Built for massive scale, it wraps the industry-leading **Traccar** core in a modern, secure SaaS layer with advanced billing, AI-driven guardianship, and real-time safety controls.

---

## 🏗️ Architecture & Capacity
GeoSurePath uses a modular, high-availability architecture designed for zero-latency operations.

```mermaid
graph TD
    A[Public Traffic - HTTPS] --> B[Nginx Edge]
    B --> C[SaaS API - Node.js/Prisma]
    B --> D[GeoSurePath Engine - Java 21]
    B --> E[Frontend - React 19]
    C --> F[(PostgreSQL 15 - Primary)]
    D --> F
    C --> G[(Redis 7 - Queue/Cache)]
    G --> H[BullMQ - Background Tasks]
    D --> I[GPS Devices - 2000+ Protocols]
```

### System Capacity:
- **Device Scaling**: Support for **thousands of concurrent GPS connections**.
- **Data Retention**: **180-day hot storage** for positions, with automated **Google Drive cold-archiving**.
- **Protocol Range**: 5001-5150 default range for industrial sensors.

---

## 🎛️ Admin Command Center (Manual)
The Admin dashboard provides global oversight and control over the entire fleet ecosystem.

### 👤 User & Fleet Management
- **Bulk Operations**: Create, delete, or update status for hundreds of users simultaneously.
- **Device Syncing**: Force synchronization between the SaaS layer and the Tracking Engine.
- **Impersonation Mode**: Securely log in as any user to troubleshoot issues or verify configurations.
- **Session Control**: View active user sessions and revoke access instantly (MFA reset support).

### 💰 Billing & Revenue
- **Advanced Analytics**: Real-time revenue reports, payment success rates, and debt tracking.
- **Razorpay Suite**: Manage gateway configurations, verify payments, and process refunds.
- **Manual Settlements**: Settle cash payments or adjust subscription expiry dates manually for offline transactions (Bulk Settle support).

### 🛡️ AIS 140 Government Compliance
- **RTO Approval**: Dedicated workflow for approving hardware devices for government tracking standards.
- **Inventory Tracking**: Manage AIS 140 certified device inventory and certificate numbers.
- **Data Forwarding**: Configure real-time forwarding to state/national government endpoints.

---

## 📱 Client Protection Portal (Manual)
The Client interface is designed for high-fidelity asset protection and real-time response.

### 🌍 Real-Time Dashboard
- **Universal Proxy**: High-speed, secure relay to the Traccar tracking engine for sub-second position updates.
- **Hardware Integration**: Support for engine immobilization (cut-off/resume) with safety logic.
- **Ignition Pulse**: Live monitoring of engine status (On/Off) synchronized with telemetry.

### 🔒 Safety Ecosystem
- **Safe Parking (Engine Lock)**: 1-click 15m radius geofence. Triggers immediate alerts if the vehicle moves.
- **AI-Guardian Alerts**: Context-aware security tones for tampering, geofence exit, and overspeeding.
- **Remote Immobilization**: Command-based engine control via secure API gateway.

### 🔔 Notifications & Self-Service
- **Auditory UI**: Custom web audio alerts with 5 distinct context-aware tones.
- **Push & SMS**: Integrated FCM (Firebase) for mobile push and WhatsApp/SMS alert delivery.
- **Self-Billing**: Manage subscriptions, download invoices, and upgrade plans via Razorpay.

---

## 🔌 Hardware Integration & Wiring Guide
To enable advanced features, follow this standard wiring map for industrial GPS trackers (Teltonika, Coban, Concox).

### 🎨 Standard Wire Color Mapping
| Wire Color | Function | Connection Point |
| :--- | :--- | :--- |
| **🔴 Red** | Power (+) | Vehicle Battery (12V/24V) |
| **⚫ Black** | Ground (-) | Vehicle Chassis (Common Ground) |
| **🟠 Orange** | Ignition (ACC) | Ignition Switch / Key Position |
| **🟡 Yellow** | Digital Output | Fuel Pump Relay (85 pin) |
| **🟢 Green** | Analog Input 1 | Fuel Level Sensor / Temperature Probe |
| **⚪ White** | Digital Input 1 | Door / Panic Button |

### 🛠️ Feature Attachment Logic
- **Remote Engine Lock**: Connect the **Yellow** wire to Pin 85 of a 4-pin Relay. Wire the Relay in-series with the vehicle's Fuel Pump or Starter motor.
- **Safe Parking / Ignition**: The **Orange** wire must be connected to a switched 12V source (ACC) for the AI-Guardian to detect engine pulses.
- **Fuel Monitoring**: Connect the **Green** wire to the signal line of a capacitive fuel sensor. Calibrate the voltage in the dashboard under *Sensors*.
- **Panic/SOS Alert**: Connect a momentary push-button between the **White** wire and **Ground**.

---

## 💾 System Maintenance (AI-Guardian)
- **Database Optimization**: AI-Guardian manages indices and record retention (180 days).
- **Automated Backups**: 7-day rolling SQL dumps and Google Drive position archiving.
- **Health Checks**: Integrated Docker health probes via `pg_isready` and `redis-cli`.

---

## 🚀 Rapid Deployment
1. **One-Click Installation**:
   ```bash
   wget -qO- https://raw.githubusercontent.com/sushantjagtap5543/track/main/install.sh | bash
   ```
2. **Manual Launch**:
   ```bash
   git clone https://github.com/sushantjagtap5543/track.git
   cd track
   docker compose up -d --build
   ```

---

## 🛡️ Best Practices
- **Security**: Nginx level rate-limiting on `/api/auth/` and JWT-secured transit.
- **Efficiency**: Optimized TCP/UDP port mapping for industrial sensors.

---

## 📄 License
This platform is licensed under the Apache License 2.0. Copyright (c) 2026 GeoSurePath.
