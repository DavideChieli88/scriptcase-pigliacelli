import type { ContentProvider, ProviderCapabilities, ProviderContext } from '../types';
import { errResult } from '../types';

const CAPABILITIES: ProviderCapabilities = {
  home: false,
  search: false,
  details: false,
  episodes: false,
  stream: false,
  offlineCache: false,
};

/** Stub for v2 — AnimeUnity provider. */
export class AnimeUnityProvider implements ContentProvider {
  readonly id = 'animeunity';
  readonly name = 'AnimeUnity';
  readonly baseUrl = 'https://www.animeunity.so';
  enabled: boolean;
  readonly capabilities = CAPABILITIES;

  constructor(_ctx: ProviderContext, enabled = false) {
    this.enabled = enabled;
  }

  async getHome() {
    return errResult(this.id, 'UNSUPPORTED', 'AnimeUnity non implementato (v2)', false);
  }

  async search() {
    return errResult(this.id, 'UNSUPPORTED', 'AnimeUnity non implementato (v2)', false);
  }

  async getAnimeDetails() {
    return errResult(this.id, 'UNSUPPORTED', 'AnimeUnity non implementato (v2)', false);
  }

  async getEpisodes() {
    return errResult(this.id, 'UNSUPPORTED', 'AnimeUnity non implementato (v2)', false);
  }

  async getStreamSources() {
    return errResult(this.id, 'UNSUPPORTED', 'AnimeUnity non implementato (v2)', false);
  }
}
