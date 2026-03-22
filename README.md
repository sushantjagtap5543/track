# GeoSurePath SaaS - GPS Tracking Platform

GeoSurePath is a professional, high-performance SaaS platform for GPS tracking, built on top of the powerful [Traccar](https://www.traccar.org) core. It features a modern user interface, advanced vehicle management, and a robust backend for asset tracking.

## 🏗 Architecture

The platform follows a microservices-inspired architecture managed via Docker Compose:

*   **Nginx**: High-performance reverse proxy and entry point with rate limiting.
*   **SaaS API (Node.js)**: Custom logic for authentication, billing, vehicle management, and account levels.
*   **Traccar Core (Java)**: The industry-standard GPS tracking engine supporting 2000+ device models.
*   **PostgreSQL**: Unified database for both SaaS and Traccar data.
*   **Redis**: High-speed cache and queue management for background tasks.

---

## 🚀 Installation & Deployment

### Prerequisites
*   Ubuntu 22.04+ (Recommended)
*   Docker & Docker Compose (v2+)
*   Min 2GB RAM

### Quick Start (Automated)

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/sushantjagtap5543/track.git
    cd track
    ```

2.  **Configure Environment**:
    Create a `.env` file in the root and `saas/` directory. 
    > [!IMPORTANT]
    > You MUST set a strong `DB_PASSWORD` before proceeding.

3.  **Run Installer**:
    ```bash
    chmod +x install.sh
    ./install.sh
    ```

### Manual Deployment

If you prefer to run steps manually:

1.  **Start Services**:
    ```bash
    docker compose up -d --build
    ```

2.  **Initialize Database Schema**:
    ```bash
    docker exec geosurepath_saas_api npx prisma db push
    ```

---

## ⚙️ Configuration

### Environment Variables (.env)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DB_PASSWORD` | PostgreSQL password | *MUST BE CHANGED* |
| `DB_USER` | Database user | `geosurepath` |
| `JWT_SECRET` | Secret key for SaaS tokens | `your_secret_here` |
| `TRACCAR_ADMIN_EMAIL` | Admin account for Traccar API | `admin@example.com` |
| `TRACCAR_ADMIN_PASSWORD` | Admin password for Traccar API | `admin` |

### Third-Party Integrations

Most feature-specific settings reside in `saas/.env`.

| Variable | Description |
| :--- | :--- |
| `RAZORPAY_KEY_ID` | Razorpay public key for payments |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key |
| `SMTP_HOST` | Outgoing mail server (for alerts/recovery) |
| `SMTP_USER` | Email username |
| `SMTP_PASS` | Email password |

### Ports & Networking

The application uses standard ports for GPS protocols and a single port for the web interface.

*   **HTTP/HTTPS**: `80` (Nginx)
*   **GPS Protocols**: `5001-5150` (TCP/UDP)
*   **Internal Communication**:
    *   SaaS API: `3001`
    *   Traccar Web: `8082`
    *   PostgreSQL: `5432`
    *   Redis: `6379`

---

## 🛠 Troubleshooting & Management

### Restarting Services
```bash
docker compose restart
```

### Viewing Logs
```bash
docker compose logs -f [service_name]  # e.g., saas-api, traccar
```

### Force-Enable Registration
If the "Registration disabled" error persists after a fresh install:
```bash
docker exec -it geosurepath_db psql -U geosurepath -d geosurepath -c "UPDATE tc_servers SET registration = true;"
```

---

## 🔒 Security
*   All APIs behind Nginx with rate limiting.
*   Database not exposed to the public internet.
*   Secure password hashing with Bcrypt.
*   JWT-based stateless authentication.

## 📄 License
GeoSurePath is licensed under the Apache License, Version 2.0.
