/**
 * GeoSurePath Premium Notification Sound System
 *
 * Generates distinct, professional notification tones using the Web Audio API.
 * Each sound is carefully designed for its purpose:
 *
 *   - notification:  Gentle two-note chime for general events (geofence, ignition, etc.)
 *   - alert:         Urgent triple-pulse for alarms (SOS, overspeed, vibration, etc.)
 *   - warning:       Descending tone for warnings (low battery, power off, fault, etc.)
 *   - success:       Ascending major-third for positive events (device online, geofence enter)
 *   - info:          Single soft ping for informational events (status, maintenance, etc.)
 */

let audioContext = null;

const getAudioContext = () => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

// --- Browser Interaction Unlocker ---
// Modern browsers block audio until FIRST interaction. This listener resumes the context.
const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
    // Remove listener once unlocked
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
};

if (typeof window !== 'undefined') {
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
}

/**
 * Creates a gain envelope (attack-sustain-release).
 */
const createEnvelope = (ctx, gainNode, startTime, attack, sustain, release, peakGain = 0.3) => {
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attack);
  gainNode.gain.setValueAtTime(peakGain, startTime + attack + sustain);
  gainNode.gain.linearRampToValueAtTime(0, startTime + attack + sustain + release);
};

/**
 * Plays a single tone with optional harmonics.
 */
const playTone = (ctx, destination, freq, startTime, duration, type = 'sine', gain = 0.3) => {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  createEnvelope(ctx, gainNode, startTime, 0.01, duration * 0.6, duration * 0.39, gain);
  osc.connect(gainNode);
  gainNode.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
};

// ─── Sound Definitions ───

/**
 * 🔔 Notification — gentle two-note chime (C5 → E5)
 * For: deviceMoving, deviceStopped, deviceOnline, deviceOffline,
 *      geofenceEnter, geofenceExit, ignitionOn, ignitionOff, etc.
 */
export const playNotification = () => {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playTone(ctx, ctx.destination, 523.25, now, 0.15, 'sine', 0.25); // C5
  playTone(ctx, ctx.destination, 659.25, now + 0.16, 0.2, 'sine', 0.2); // E5
};

/**
 * 🚨 Alert — urgent triple-pulse (A5 x3, fast staccato)
 * For: alarm type events — SOS, overspeed, vibration, accident, tow, etc.
 */
export const playAlert = () => {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  for (let i = 0; i < 3; i += 1) {
    playTone(ctx, ctx.destination, 880, now + i * 0.15, 0.1, 'square', 0.18);
  }
  // Reinforcing sub-tone
  playTone(ctx, ctx.destination, 440, now, 0.45, 'sine', 0.08);
};

/**
 * ⚠️ Warning — descending two-note (E5 → C5)
 * For: lowBattery, lowPower, fault, powerOff, etc.
 */
export const playWarning = () => {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playTone(ctx, ctx.destination, 659.25, now, 0.18, 'triangle', 0.25); // E5
  playTone(ctx, ctx.destination, 523.25, now + 0.2, 0.25, 'triangle', 0.22); // C5
};

/**
 * ✅ Success — ascending major-third (C5 → E5 → G5)
 * For: deviceOnline, commandResult, maintenance, etc.
 */
export const playSuccess = () => {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playTone(ctx, ctx.destination, 523.25, now, 0.12, 'sine', 0.2); // C5
  playTone(ctx, ctx.destination, 659.25, now + 0.13, 0.12, 'sine', 0.2); // E5
  playTone(ctx, ctx.destination, 783.99, now + 0.26, 0.2, 'sine', 0.18); // G5
};

/**
 * ℹ️ Info — single soft ping (G5, sine with fast decay)
 * For: textMessage, driverChanged, media, etc.
 */
export const playInfo = () => {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playTone(ctx, ctx.destination, 783.99, now, 0.25, 'sine', 0.18); // G5
};

// ─── Event-to-Sound Mapping ───

const ALERT_EVENTS = new Set(['alarm']);

const WARNING_EVENTS = new Set(['deviceInactive', 'queuedCommandSent']);

const SUCCESS_EVENTS = new Set(['deviceOnline', 'geofenceEnter', 'commandResult', 'maintenance']);

const INFO_EVENTS = new Set(['textMessage', 'driverChanged', 'media']);

/**
 * Maps alarm sub-types to their sound.
 * Critical alarms → alert, degradation alarms → warning.
 */

const DEGRADATION_ALARMS = new Set([
  'lowBattery',
  'lowPower',
  'fault',
  'powerOff',
  'powerOn',
  'lowspeed',
  'idle',
  'highRpm',
  'temperature',
  'parking',
  'bonnet',
  'footBrake',
  'door',
  'lock',
  'unlock',
]);

/**
 * 🚨 Security Siren — Intense alternating high-frequency pulses
 * Specifically for Safe Parking breaches or SOS.
 */
export const playSecuritySiren = () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    for (let i = 0; i < 15; i += 1) {
      const freq = i % 2 === 0 ? 1200 : 1600;
      playTone(ctx, ctx.destination, freq, now + i * 0.1, 0.08, 'square', 0.15);
    }
};

/**
 * 🔔 Digital Chime — Fast premium double-ping (B5 → B6)
 */
export const playDigitalChime = () => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playTone(ctx, ctx.destination, 987.77, now, 0.05, 'sine', 0.3); // B5
    playTone(ctx, ctx.destination, 1975.53, now + 0.08, 0.05, 'sine', 0.2); // B6
};

/**
 * Determines which sound to play for a given event and plays it.
 * @param {object} event - The event object from the socket.
 */
export const playEventSound = (event) => {
  if (!event || !event.type) {
    playNotification();
    return;
  }

  const { type, attributes } = event;

  // 1. Critical Security Level
  const isSecurityBreach = type === 'geofenceExit' && attributes?.name?.startsWith('Safe Parking');
  const isSOS = type === 'alarm' && attributes?.alarm === 'sos';

  if (isSecurityBreach || isSOS) {
    playSecuritySiren();
    return;
  }

  // 2. Alarm level
  if (type === 'alarm') {
    const alarmType = attributes?.alarm;
    if (alarmType && DEGRADATION_ALARMS.has(alarmType)) {
      playWarning();
    } else {
      playAlert();
    }
    return;
  }

  // 3. Status level
  if (type === 'deviceOnline' || type === 'deviceOffline') {
    playDigitalChime();
    return;
  }

  if (ALERT_EVENTS.has(type)) {
    playAlert();
  } else if (WARNING_EVENTS.has(type)) {
    playWarning();
  } else if (SUCCESS_EVENTS.has(type)) {
    playSuccess();
  } else if (INFO_EVENTS.has(type)) {
    playInfo();
  } else {
    playNotification();
  }
};

/**
 * Plays the legacy alarm sound (fallback for when Web Audio API is unavailable).
 */
export const playLegacyAlarm = (alarmSrc) => {
  try {
    new Audio(alarmSrc).play();
  } catch {
    // Silently fail if audio playback is blocked
  }
};

export default {
  playNotification,
  playAlert,
  playWarning,
  playSuccess,
  playInfo,
  playEventSound,
  playLegacyAlarm,
};
