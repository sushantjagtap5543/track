const http = require('http');

/**
 * traccar Single Vehicle Continuous Simulator
 * IMEI: IMEI_TEST_777
 * Remote Server: 3.108.114.12
 */

const REMOTE_HOST = "3.108.114.12";
const PORT = 5055;
const IMEI = "IMEI_TEST_777";

// Simulation Parameters for Pune, India
let baseLat = 18.5204;
let baseLon = 73.8567;
let heading = 0;

function simulateStep() {
    // Movement Logic
    heading += (Math.random() - 0.5) * 0.1; // Slight turn
    const step = 0.0001; // Tiny step
    baseLat += Math.sin(heading) * Math.random() * step;
    baseLon += Math.cos(heading) * Math.random() * step;
    
    const speed = 40 + Math.random() * 10;
    const now = Date.now();
    
    // OsmAnd Protocol Format
    const path = `/?id=${IMEI}&lat=${baseLat}&lon=${baseLon}&speed=${speed}&bearing=${(heading * 180 / Math.PI).toFixed(1)}&timestamp=${now}`;
    
    console.log(`📡 PUSH: Lat ${baseLat.toFixed(6)}, Lon ${baseLon.toFixed(6)} [ALT=${speed.toFixed(1)}km/h]`);
    
    const req = http.request({
        host: REMOTE_HOST,
        port: PORT,
        path: path,
        method: 'GET'
    }, (res) => {
        let body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => {
            console.log(`✅ Server ACK (${res.statusCode}) [${body.trim() || 'OK'}]`);
        });
    });

    req.on('error', (e) => {
        console.error(`❌ Network Error: ${e.message}`);
    });

    req.end();
}

console.log("🚀 Starting traccar Real-time Continuous Simulation...");
console.log(`📍 Device: IMEI_TEST_777 (TRACER_001)`);
console.log(`🌐 Target: http://${REMOTE_HOST}:${PORT}`);

// Every 5 seconds
setInterval(simulateStep, 5000);
simulateStep(); 
