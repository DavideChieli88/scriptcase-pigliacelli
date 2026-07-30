export type RemoteKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Enter'
  | 'Back'
  | 'Play'
  | 'Pause'
  | 'PlayPause'
  | 'Stop'
  | 'Red'
  | 'Green'
  | 'Yellow'
  | 'Blue'
  | 'Unknown';

export interface DeviceCapabilities {
  platform: 'webos' | 'browser';
  hasIndexedDB: boolean;
  hasVideo: boolean;
  supportsHlsNatively: boolean;
  remote: boolean;
  screenWidth: number;
  screenHeight: number;
}

export interface AppLifecycleAdapter {
  onLaunch(handler: () => void): () => void;
  onRelaunch(handler: () => void): () => void;
  onClose(handler: () => void): () => void;
}

export interface PlatformAdapter {
  readonly id: string;
  detect(): DeviceCapabilities;
  mapKey(event: KeyboardEvent): RemoteKey;
  lifecycle: AppLifecycleAdapter;
  exitApp(): void;
}
