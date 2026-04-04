import React, { createContext, useContext, useState, useCallback } from 'react';

const AIContext = createContext();

export const useAI = () => useContext(AIContext);

const OPENROUTER_API_KEY = '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';

export const AIProvider = ({ children }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const user = useSelector((state) => state.session.user);
  const currentPlan = user?.attributes?.plan || 'basic';

  const getFleetAnalysis = useCallback(async (devices, positions) => {
    if (currentPlan !== 'enterprise' && !user.administrator) {
      setError('AI Insights are exclusive to the Enterprise Plan. Please upgrade to unlock.');
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const deviceSummary = devices.map(d => ({
        name: d.name,
        status: d.status,
        lastUpdate: d.lastUpdate,
        speed: positions[d.id]?.speed || 0,
        battery: positions[d.id]?.attributes.batteryLevel || 'N/A',
        ais140: d.attributes.ais140 ? 'Yes' : 'No'
      }));

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://geosurepath.com',
          'X-Title': 'GeoSurePath Fleet AI'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [
            {
              role: 'system',
              content: 'You are an advanced Fleet Intelligence AI for GeoSurePath. Analyze the provided device data and provide 3-4 concise, actionable insights regarding fleet health, behavior, and maintenance. Focus on AIS140 compliance and zero-lag operational efficiency.'
            },
            {
              role: 'user',
              content: `Analyze this fleet state: ${JSON.stringify(deviceSummary.slice(0, 50))}`
            }
          ]
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('AI Service Unreachable');
      
      const data = await response.json();
      setInsights(data.choices[0].message.content);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('AI Analysis Failed:', err);
      
      // Advanced Local Heuristics Failover
      const stats = {
        total: devices.length,
        offline: devices.filter(d => d.status === 'offline').length,
        moving: devices.filter(d => positions[d.id]?.speed > 0).length,
        lowBattery: devices.filter(d => {
          const battery = positions[d.id]?.attributes.batteryLevel;
          return typeof battery === 'number' && battery < 20;
        }).length,
        nonCompliant: devices.filter(d => !d.attributes.ais140).length
      };

      const localInsights = [
        `Local Analytics: ${stats.offline}/${stats.total} devices are currently offline.`,
        stats.moving > 0 ? `${stats.moving} devices are currently in motion.` : 'No active movement detected.',
        stats.lowBattery > 0 ? `Warning: ${stats.lowBattery} devices report low battery (<20%).` : 'All online batteries within safe range.',
        stats.nonCompliant > 0 ? `Compliance Alert: ${stats.nonCompliant} devices are not yet AIS140 certified.` : 'All monitored devices are AIS140 compliant.'
      ];

      setError('AI service temporarily unavailable. Displaying local diagnostics.');
      setInsights(localInsights.join('\n'));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AIContext.Provider value={{ insights, loading, error, getFleetAnalysis }}>
      {children}
    </AIContext.Provider>
  );
};
