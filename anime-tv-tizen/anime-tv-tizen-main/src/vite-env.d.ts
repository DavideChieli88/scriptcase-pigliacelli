/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG?: string;
  readonly VITE_DEFAULT_PROVIDER?: string;
  readonly VITE_ENABLE_EXTERNAL_ADAPTERS?: string;
  readonly VITE_ADAPTER_ALPHA_ENABLED?: string;
  readonly VITE_ADAPTER_BETA_ENABLED?: string;
  readonly VITE_ADAPTER_ANIMESATURN_ENABLED?: string;
  readonly VITE_ADAPTER_ANIMEUNITY_ENABLED?: string;
  readonly VITE_ADAPTER_ALPHA_BASE_URL?: string;
  readonly VITE_ADAPTER_BETA_BASE_URL?: string;
  readonly VITE_ADAPTER_ANIMESATURN_BASE_URL?: string;
  readonly VITE_ADAPTER_ANIMEUNITY_BASE_URL?: string;
  /** Optional LAN proxy base for saturncdn, e.g. http://192.168.1.10:8787 */
  readonly VITE_SATURNCDN_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
