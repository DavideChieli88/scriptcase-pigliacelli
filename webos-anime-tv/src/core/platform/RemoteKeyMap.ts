import type { RemoteKey } from './types';

/** Maps common LG remote / browser key codes to semantic RemoteKey. */
export const RemoteKeyMap: Record<string, RemoteKey> = {
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Enter: 'Enter',
  ' ': 'Enter',
  Escape: 'Back',
  Backspace: 'Back',
  BrowserBack: 'Back',
  // LG webOS common keyCodes (stringified)
  '461': 'Back', // VK_BACK
  '415': 'Play',
  '19': 'Pause',
  '413': 'Stop',
  '417': 'PlayPause',
  '403': 'Red',
  '404': 'Green',
  '405': 'Yellow',
  '406': 'Blue',
};

export function mapRemoteKey(event: KeyboardEvent): RemoteKey {
  const byKey = RemoteKeyMap[event.key];
  if (byKey) return byKey;
  const byCode = RemoteKeyMap[String(event.keyCode)];
  if (byCode) return byCode;
  return 'Unknown';
}
