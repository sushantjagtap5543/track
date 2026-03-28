// saas/src/services/ai.js
const { OPENROUTER_API_KEY } = process.env;
const { getRandomFreeModel } = require('./modelScheduler');

/**
 * 🤖 GeoSurePath AI Client (OpenRouter)
 * Standardizes AI requests across the platform.
 * Includes built-in retry logic and request timeouts.
 */
async function callAI(prompt, model = null, retries = 3) {
  // Determine model: use provided, fallback to random free model if none or 'auto'
  if (!model || model === 'auto') {
    model = getRandomFreeModel();
  }

  if (!OPENROUTER_API_KEY) {
    console.error('❌ AI Client: OPENROUTER_API_KEY is missing in .env');
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://geosurepath.com', 
          'X-Title': 'GeoSurePath AI Guardian',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are GeoSurePath AI-Guardian, an intelligent fleet supervisor and server monitor. Analyze metrics and provide concise, executive summaries and actionable advice.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ AI Client: OpenRouter API error [${response.status}] (Attempt ${attempt}/${retries}):`, errorText);
        
        // --- 🤖 AUTO-FALLBACK TO FREE MODELS ---
        // If credits are depleted (402), unauthorized (403), or model not found (404),
        // switch to openrouter/free automatically.
        if ((response.status === 402 || response.status === 403 || response.status === 404) && model !== 'openrouter/free') {
          console.warn(`🚨 Model ${model} failed [${response.status}]. Falling back to openrouter/free...`);
          return callAI(prompt, 'openrouter/free', retries);
        }

        // If it's a rate limit (429) or server error (5xx), wait and retry
        if (response.status === 429 || response.status >= 500) {
          if (attempt < retries) {
            const delay = attempt * 2000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        return null;
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content.trim();
      }
      
      return null;
    } catch (error) {
      clearTimeout(timeout);
      const isTimeout = error.name === 'AbortError';
      console.error(`❌ AI Client: Connection ${isTimeout ? 'Timed Out' : 'Failed'} (Attempt ${attempt}/${retries}):`, error.message);
      
      if (attempt < retries) {
        const delay = attempt * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return null;
    }
  }
}

module.exports = { callAI };
