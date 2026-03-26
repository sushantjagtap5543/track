const axios = require('axios');

async function simulateFleet() {
    console.log("🚀 Starting GeoSurePath Fleet Simulation (250 Units)...");
    
    // Core Location: Pune, India
    const baseLat = 18.5204;
    const baseLon = 73.8567;
    
    // Generate 250 IMEIs (Matches seed_stress_test.js)
    const imeis = [];
    for (let i = 1; i <= 100; i++) {
        for (let j = 1; j <= 2 + (i % 2 === 0 ? 0 : 1); j++) {
            imeis.push(`8654${String(i).padStart(3, '0')}${String(j).padStart(3, '0')}`);
        }
    }

    console.log(`📡 Simulating ${imeis.length} Active Units...`);

    const TRACCAR_OSM_URL = "http://geosurepath:5055"; // Internal docker networking
    const SIM_DURATION_SEC = 3600; // 1 Hour
    const TICK_INTERVAL = 30; // Every 30 seconds

    let elapsed = 0;
    while (elapsed < SIM_DURATION_SEC) {
        console.log(`⏱️ Tick [${elapsed}s]: Syncing Telemetry for Fleet...`);
        
        for (const imei of imeis) {
            // Jitter for movement
            const jitterLat = (Math.random() - 0.5) * 0.01;
            const jitterLon = (Math.random() - 0.5) * 0.01;
            
            const lat = baseLat + jitterLat;
            const lon = baseLon + jitterLon;
            const speed = 20 + Math.random() * 40;
            const ignition = Math.random() > 0.2 ? "true" : "false";

            const url = `${TRACCAR_OSM_URL}/?id=${imei}&lat=${lat}&lon=${lon}&speed=${speed}&ignition=${ignition}&hdop=1.2`;
            
            try {
                // Async send (No wait for better performance in mass simulation)
                axios.get(url).catch(() => {});
            } catch (err) {
                // Silently skip if network tick fails
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, TICK_INTERVAL * 1000));
        elapsed += TICK_INTERVAL;
    }

    console.log("✅ Sovereign Fleet Simulation Terminated.");
    process.exit(0);
}

simulateFleet();
