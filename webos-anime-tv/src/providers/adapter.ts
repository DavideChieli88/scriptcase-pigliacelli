import type { ContentProvider, ProviderContext } from './types';

/** Thin wrapper to inject shared context into provider factories. */
export type ProviderFactory = (ctx: ProviderContext, enabled: boolean) => ContentProvider;

export class ProviderAdapter {
  constructor(private factory: ProviderFactory) {}

  create(ctx: ProviderContext, enabled: boolean): ContentProvider {
    return this.factory(ctx, enabled);
  }
}
