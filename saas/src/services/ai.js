// saas/src/services/ai.js
const { OPENROUTER_API_KEY } = process.env;

/**
 * 🤖 GeoSurePath AI Client (OpenRouter)
 * Standardizes AI requests across the platform.
 */
async function callAI(prompt, model = 'mistralai/mistral-7b-instruct:free') {
  if (!OPENROUTER_API_KEY) {
    console.error('❌ AI Client: OPENROUTER_API_KEY is missing in .env');
    return null;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://geosurepath.com', // Required by OpenRouter for ranking
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AI Client: OpenRouter API error [${response.status}]:`, errorText);
      return null;
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim();
    }
    
    return null;
  } catch (error) {
    console.error('❌ AI Client: Connection Failed', error.message);
    return null;
  }
}

module.exports = { callAI };
