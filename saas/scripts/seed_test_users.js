const { PrismaClient } = require('@prisma/client');
const _bcrypt = require('bcrypt');
const dns = require('dns').promises;

// Testing accounts configuration
const ADMIN_CREDENTIALS = {
    name: 'Test Admin',
    email: 'admin@geosurepath.com',
    password: 'AdminTestPassword123!',
    role: 'ADMIN'
};

const CLIENT_CREDENTIALS = {
    name: 'Test Client',
    email: 'client@geosurepath.com',
    password: 'ClientTestPassword123!',
    role: 'CLIENT'
};

/**
 * Detects the best base URL for API calls.
 * Priority: 
 * 1. BASE_URL environment variable
 * 2. Public IP 3.108.114.12
 * 3. localhost:3001 (SaaS API inner port)
 * 4. localhost:80 (Nginx port)
 */
async function getBaseUrl() {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    
    // Try public IP from README
    const PUBLIC_IP = 'http://3.108.114.12';
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1000);
        await fetch(`${PUBLIC_IP}/api/health`, { signal: controller.signal });
        clearTimeout(timeout);
        return PUBLIC_IP;
    } catch (_e) {
        console.log(`Note: Public IP ${PUBLIC_IP} not reachable, falling back to localhost.`);
    }

    // Try localhost:3001 (SaaS API directly)
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 500);
        await fetch('http://localhost:3001/api/health', { signal: controller.signal });
        clearTimeout(timeout);
        return 'http://localhost:3001';
    } catch (_e) {
        // Silently fail if public IP or localhost:3001 are not reachable
    }

    return 'http://localhost'; // Default to Nginx
}

/**
 * Checks if 'db' hostname is resolvable (inside Docker network).
 */
async function isInsideDocker() {
    try {
        await dns.lookup('db');
        return true;
    } catch (_e) {
        return false;
    }
}

async function registerUser(baseUrl, credentials) {
    console.log(`Registering user: ${credentials.email} via ${baseUrl}...`);
    try {
        const response = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: credentials.name,
                email: credentials.email,
                password: credentials.password,
                vehicleName: `${credentials.name}'s Vehicle`,
                vehicleType: 'car',
                vehiclePlate: 'TEST-123',
                deviceImei: `IMETEST${Math.floor(Math.random() * 1000000)}`
            })
        });

        const data = await response.json();
        if (!response.ok) {
            if (data.error && (data.error.toLowerCase().includes('already') || data.error.toLowerCase().includes('duplicate'))) {
                console.log(`User ${credentials.email} already exists.`);
                return { success: true, email: credentials.email };
            }
            console.error(`Error: ${data.error || 'Unknown error'}`);
            return { success: false, error: data.error };
        }
        console.log(`Successfully registered ${credentials.email}`);
        return { success: true, email: credentials.email };
    } catch (error) {
        console.error(`Connection failed to ${baseUrl}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function promoteToAdmin(prisma, email) {
    console.log(`Promoting ${email} to ADMIN in database...`);
    try {
        await prisma.user.update({
            where: { email: email.toLowerCase() },
            data: { role: 'ADMIN' }
        });
        
        // Promote in Traccar Core DB
        await prisma.$executeRawUnsafe(`UPDATE public.tc_users SET administrator = true WHERE email = $1`, email.toLowerCase());

        console.log(`Successfully promoted ${email} to ADMIN in both SaaS and Core.`);
        return true;
    } catch (error) {
        console.error(`Database Error: ${error.message}`);
        if (error.message.includes('Can\'t reach database server')) {
            console.warn('TIP: If running outside Docker, ensure port 5432 is exposed and reached via localhost.');
        }
        return false;
    }
}

async function main() {
    console.log('--- Seeding Testing Accounts ---');
    
    // 1. Setup Prisma
    // If DATABASE_URL is not set, we try to construct it.
    if (!process.env.DATABASE_URL) {
        const docker = await isInsideDocker();
        const host = docker ? 'db' : 'localhost';
        process.env.DATABASE_URL = `postgresql://geosurepath:9f4a8b7c2e1d0f5e7a9b3c4d6e8f@${host}:5432/geosurepath?schema=saas`;
        console.log(`Using Database Host: ${host}`);
    }

    const prisma = new PrismaClient();
    const baseUrl = await getBaseUrl();

    try {
        // 2. Register Accounts
        const adminRes = await registerUser(baseUrl, ADMIN_CREDENTIALS);
        const _clientRes = await registerUser(baseUrl, CLIENT_CREDENTIALS);

        // 3. Promote Admin
        if (adminRes.success) {
            await promoteToAdmin(prisma, ADMIN_CREDENTIALS.email);
        }

        console.log('\n--- Final Account Status ---');
        console.log(`ADMIN: ${ADMIN_CREDENTIALS.email} / ${ADMIN_CREDENTIALS.password}`);
        console.log(`CLIENT: ${CLIENT_CREDENTIALS.email} / ${CLIENT_CREDENTIALS.password}`);
        
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);