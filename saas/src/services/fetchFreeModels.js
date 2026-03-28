// saas/src/services/fetchFreeModels.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch'); // Node 18+ has fetch

const FREE_MODELS_URL = process.env.FREE_MODEL_SOURCE_URL || 'https://openrouter.ai/api/v1/models?free=true';
const OUTPUT_PATH = path.resolve(__dirname, '../../data/free_models.json');

async function fetchFreeModels() {
  try {
    const res = await fetch(FREE_MODELS_URL);
    if (!res.ok) {
      console.error(`Failed to fetch free models: ${res.status}`);
      return;
    }
    const data = await res.json();
    // Expect data.models array with objects containing id and free flag
    const models = (data.models || []).filter(m => m.free).map(m => m.id);
    if (!fs.existsSync(path.dirname(OUTPUT_PATH))) {
      fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(models, null, 2));
    console.log(`Fetched ${models.length} free models and saved to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('Error fetching free models:', err);
  }
}

if (require.main === module) {
  fetchFreeModels();
}

module.exports = { fetchFreeModels };
