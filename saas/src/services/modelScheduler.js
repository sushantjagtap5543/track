// saas/src/services/modelScheduler.js
require('dotenv').config();
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { fetchFreeModels } = require('./fetchFreeModels');

// Schedule cron (default every Sunday at 02:00 AM)
const CRON_SCHEDULE = process.env.FREE_MODEL_FETCH_CRON || '0 2 * * 0';

// Run at startup
fetchFreeModels();

// Schedule weekly fetch
cron.schedule(CRON_SCHEDULE, () => {
  console.log('🗓️ Running weekly free model fetch...');
  fetchFreeModels();
});

function getRandomFreeModel() {
  const filePath = path.resolve(__dirname, '../../data/free_models.json');
  if (!fs.existsSync(filePath)) {
    console.warn('⚠️ free_models.json not found, falling back to openrouter/free');
    return 'openrouter/free';
  }
  try {
    const models = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(models) || models.length === 0) {
      console.warn('⚠️ No free models available, falling back to openrouter/free');
      return 'openrouter/free';
    }
    const idx = Math.floor(Math.random() * models.length);
    return models[idx];
  } catch (err) {
    console.error('Error reading free models list:', err);
    return 'openrouter/free';
  }
}

module.exports = { getRandomFreeModel, fetchFreeModels };
