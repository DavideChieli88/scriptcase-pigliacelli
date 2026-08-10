/** Samsung Tizen remote / keyboard key mapping (Tizen 6.5 / Chromium M85). */

export type RemoteAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'enter'
  | 'longPress'
  | 'back'
  | 'play'
  | 'pause'
  | 'playPause'
  | 'stop'
  | 'rewind'
  | 'fastForward'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'info'
  | 'unknown';

/** Common keyCodes used by Samsung remotes and desktop keyboards. */
const KEY_MAP: Record<number, RemoteAction> = {
  // Arrows
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  // Enter / Select
  13: 'enter',
  // Back / Escape
  8: 'back', // some remotes
  27: 'back',
  10009: 'back', // Samsung Tizen Back
  461: 'back', // LG-style, keep for emulators
  // Media
  415: 'play',
  19: 'pause',
  413: 'stop',
  412: 'rewind',
  417: 'fastForward',
  10252: 'playPause', // Samsung Play/Pause toggle
  // Color keys
  403: 'red',
  404: 'green',
  405: 'yellow',
  406: 'blue',
  // Info
  457: 'info',
};

export function mapKeyCode(keyCode: number): RemoteAction {
  return KEY_MAP[keyCode] ?? 'unknown';
}

export function isDirectional(action: RemoteAction): boolean {
  return action === 'up' || action === 'down' || action === 'left' || action === 'right';
}
