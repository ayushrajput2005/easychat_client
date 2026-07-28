/**
 * sounds.js — Web Audio API sound synthesis.
 * No external files. Plays WhatsApp-style sounds programmatically.
 *
 * playNotificationSound() — incoming message / chat request (two-tone ding)
 * playSentSound()         — outgoing message sent (single soft tick)
 */

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  // Resume in case it was suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep({ frequency = 880, duration = 0.12, volume = 0.18, type = 'sine', delay = 0 }) {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ac.currentTime + delay);

  // Envelope: quick attack, smooth decay
  gain.gain.setValueAtTime(0, ac.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration);

  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

/**
 * Plays a WhatsApp-style notification sound:
 * two ascending tones — "ding dong"
 */
export function playNotificationSound() {
  try {
    beep({ frequency: 880, duration: 0.14, volume: 0.2, delay: 0 });
    beep({ frequency: 1100, duration: 0.18, volume: 0.18, delay: 0.16 });
  } catch (e) {
    // Silently fail if AudioContext not available
  }
}

/**
 * Plays a minimal in-chat received sound — like WhatsApp's subtle
 * single-note pop when a message arrives while you're reading the chat.
 * Very quiet (volume 0.07), barely noticeable.
 */
export function playMessageReceivedSound() {
  try {
    beep({ frequency: 750, duration: 0.07, volume: 0.07, type: 'sine', delay: 0 });
  } catch (e) {
    // Silently fail
  }
}

/**
 * Plays a soft tick for outgoing messages (like WhatsApp's sent tick).
 */
export function playSentSound() {
  try {
    beep({ frequency: 1200, duration: 0.06, volume: 0.1, type: 'sine', delay: 0 });
  } catch (e) {
    // Silently fail
  }
}
