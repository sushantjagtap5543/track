const http = require('http');

async function simulate() {
    console.log("🚀 Starting Zero-Dependency Fleet Simulation (250 Units)...");
    
    const baseLat = 18.5204;
    const baseLon = 73.8567;
    
    const imeis = [];
    for (let i = 1; i <= 100; i++) {
        const vehicleCount = 2 + (i % 2);
        for (let j = 1; j <= vehicleCount; j++) {
            imeis.push(`8654${String(i).padStart(3, '0')}${String(j).padStart(3, '0')}`);
        }
    }

    console.log(`📡 Broadcast Active for ${imeis.length} Units...`);

    const TRACCAR_HOST = "traccar";
    const TRACCAR_PORT = 5055;
    const TICK_INTERVAL = 15; // Every 15 seconds for HIGHER density

    while (true) {
        console.log(`⏱️ Pulse: Syncing ${imeis.length} units...`);
        
        for (const imei of imeis) {
            const jitterLat = (Math.random() - 0.5) * 0.005;
            const jitterLon = (Math.random() - 0.5) * 0.005;
            const lat = baseLat + jitterLat;
            const lon = baseLon + jitterLon;
            const speed = 10 + Math.random() * 50;
            const ignition = Math.random() > 0.15 ? "true" : "false";

            const path = `/?id=${imei}&lat=${lat}&lon=${lon}&speed=${speed}&ignition=${ignition}&hdop=1.2&timestamp=${Date.now()}`;
            
            const options = { host: TRACCAR_HOST, port: TRACCAR_PORT, path, method: 'GET' };
            const req = http.request(options);
            req.on('error', () => {}); // Silently ignore drops
            req.end();
        }
        
        await new Promise(resolve => setTimeout(resolve, TICK_INTERVAL * 1000));
    }
}

simulate().catch(console.error);
