/**
 * GeoSurePath Smart Command Utility
 * 
 * Maps device protocols to their optimal "Engine Stop" and "Engine Resume" commands.
 * This ensures high reliability without manual configuration for common hardware.
 */

const PROTOCOL_MAP = {
  'gt06': { stop: { type: 'engineStop' }, resume: { type: 'engineResume' } },
  'h02': { stop: { type: 'engineStop' }, resume: { type: 'engineResume' } },
  'teltonika': { 
    stop: { type: 'custom', attributes: { data: 'setdigout 1' } }, 
    resume: { type: 'custom', attributes: { data: 'setdigout 0' } } 
  },
  'coban': { 
    stop: { type: 'custom', attributes: { data: 'stop123456' } }, 
    resume: { type: 'custom', attributes: { data: 'resume123456' } } 
  },
  'meiligao': { stop: { type: 'engineStop' }, resume: { type: 'engineResume' } },
  'tkgps': { stop: { type: 'engineStop' }, resume: { type: 'engineResume' } },
  'watch': { stop: { type: 'engineStop' }, resume: { type: 'engineResume' } },
};

/**
 * Gets the best ignition command for a device based on its protocol.
 * @param {object} device - The device object from the store.
 * @param {boolean} stop - True for Engine Stop, False for Engine Resume.
 * @returns {object} The command object or a default engineStop.
 */
export const getSmartIgnitionCommand = (device, stop = true) => {
  if (!device) return { type: stop ? 'engineStop' : 'engineResume' };
  
  const protocol = device.protocol?.toLowerCase();
  const preset = PROTOCOL_MAP[protocol];
  
  if (preset) {
    return { ... (stop ? preset.stop : preset.resume), deviceId: device.id };
  }
  
  // Default fallback
  return { type: stop ? 'engineStop' : 'engineResume', deviceId: device.id };
};

export default {
  getSmartIgnitionCommand,
};
