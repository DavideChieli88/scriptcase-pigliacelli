import type { AnimeSummary, ContinueWatchingItem } from '@/domain/models';
import { el, clear, setText } from '../mount';
import { createTopBar } from '../components/TopBar';
import { createHeroBanner } from '../components/HeroBanner';
import {
  createContentRail,
  createContinueRail,
  destroyRail,
  updateContinueRail,
  updateRail,
} from '../components/ContentRail';
import { createHomeSkeleton } from '../components/Skeleton';
import { createErrorState } from '../components/ErrorState';
import { openContextMenu } from '../components/ContextMenu';
import { catalogService } from '@/services/CatalogService';
import { progressTracker } from '@/services/ProgressTracker';
import { focusEngine } from '@/navigation/FocusEngine';
import { focusMemory } from '@/navigation/FocusMemory';
import { router } from '@/router/AppRouter';
import { uiStore } from '@/state/stores/uiStore';
import { logger } from '@/utils/logger';

export class HomePage {
  readonly root: HTMLElement;
  private content: HTMLElement;
  private loading = false;
  private loadedOnce = false;
  private continueItems: ContinueWatchingItem[] = [];
  private lastSeenItems: AnimeSummary[] = [];
  /** Provider featured title used when Continua a guardare is empty. */
  private providerFeatured: AnimeSummary | null = null;

  constructor() {
    this.root = el('section', 'page page--home', { id: 'page-home' });
    this.content = el('div', 'home-content');
    this.root.appendChild(this.content);
  }

  async show(): Promise<void> {
    this.root.classList.add('is-active');
    focusEngine.setRoot(this.root);
    focusEngine.setScope('home');

    const dirty = uiStore.get().homeDirty;
    if (!this.loadedOnce || dirty === 'full') {
      await this.load();
      return;
    }

    if (dirty === 'local') {
      await this.refreshLocalRails();
    }

    this.restoreFocus(
      focusMemory.recall('home') || uiStore.get().lastFocusHomeId || 'hero-play',
    );
  }

  hide(): void {
    // App hides every page on route change — only persist when home was active,
    // otherwise we'd overwrite the card id with e.g. details-play.
    if (this.root.classList.contains('is-active')) {
      const id = focusEngine.getCurrentId();
      if (id) {
        focusMemory.remember('home', id);
        uiStore.setLastFocusHome(id);
      }
    }
    this.root.classList.remove('is-active');
  }

  private teardownRails(): void {
    this.content.querySelectorAll<HTMLElement>('.rail').forEach((rail) => destroyRail(rail));
  }

  /**
   * Progress/history changed: refresh Continua / Ultimi / hero without tearing down
   * provider rails or showing the home skeleton (keeps the feed cache usable).
   */
  private async refreshLocalRails(): Promise<void> {
    try {
      const home = await catalogService.getHome();
      this.continueItems = [...home.continueWatching];
      this.lastSeenItems = [...home.lastSeen];
      this.providerFeatured = home.featured;
      this.syncContinueRail();
      this.syncLastSeenRail();
      await this.replaceHero();
      uiStore.clearHomeDirty();
    } catch (err) {
      logger.error('HomePage', 'local refresh failed — falling back to full load', err);
      await this.load();
    }
  }

  private async load(preferredFocusId?: string): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.teardownRails();
    clear(this.content);
    this.content.appendChild(createTopBar());
    this.content.appendChild(createHomeSkeleton());

    try {
      const home = await catalogService.getHome();
      clear(this.content);
      this.content.appendChild(createTopBar());

      this.continueItems = [...home.continueWatching];
      this.lastSeenItems = [...home.lastSeen];
      this.providerFeatured = home.featured;

      const hasLocal =
        this.continueItems.length > 0 ||
        this.lastSeenItems.length > 0 ||
        home.popular.length > 0 ||
        Boolean(home.featured);

      if (home.error && !hasLocal) {
        const changeSource =
          home.alternatives.length > 0
            ? {
                label: 'Cambia sorgente',
                action: () => void this.switchProvider(home.providerId),
              }
            : undefined;
        this.content.appendChild(
          createErrorState(
            'Sorgente non disponibile',
            home.error,
            () => void this.load(),
            changeSource,
          ),
        );
        focusEngine.focusDefault('error-retry');
        return;
      }

      if (home.fromCache && home.error) {
        const banner = el('div', 'cache-banner');
        banner.style.cssText =
          'padding:12px 80px;color:var(--color-accent);font-size:var(--text-sm);display:flex;gap:24px;align-items:center;';
        const msg = el('span');
        setText(msg, home.error);
        banner.appendChild(msg);
        if (home.alternatives.length > 0) {
          const switchBtn = el('button', 'btn btn--ghost');
          switchBtn.style.cssText = 'min-height:48px;min-width:auto;padding:0 20px;font-size:20px;';
          setText(switchBtn, 'Cambia sorgente');
          focusEngine.register(switchBtn, {
            id: 'cache-switch-provider',
            row: 'cache-banner',
            onEnter: () => void this.switchProvider(home.providerId),
          });
          switchBtn.addEventListener('click', () => void this.switchProvider(home.providerId));
          banner.appendChild(switchBtn);
        }
        this.content.appendChild(banner);
      }

      this.content.appendChild(await this.buildHero());

      const rails = el('div', 'home-rails');

      if (this.continueItems.length) {
        rails.appendChild(this.buildContinueRail());
      }
      if (this.lastSeenItems.length) {
        rails.appendChild(this.buildLastSeenRail());
      }
      if (home.recentlyAdded.length) {
        rails.appendChild(
          createContentRail({
            id: 'recent',
            title: 'Aggiunti di recente',
            items: home.recentlyAdded,
            onSelect: (a) => this.openDetails(a),
          }),
        );
      }
      if (home.popular.length) {
        rails.appendChild(
          createContentRail({
            id: 'popular',
            title: 'Popolari',
            items: home.popular,
            onSelect: (a) => this.openDetails(a),
          }),
        );
      }

      this.content.appendChild(rails);
      this.loadedOnce = true;
      uiStore.clearHomeDirty();

      const remembered =
        preferredFocusId ||
        uiStore.get().lastFocusHomeId ||
        focusMemory.recall('home') ||
        'hero-play';
      this.restoreFocus(remembered);
    } catch (err) {
      logger.error('HomePage', 'load failed', err);
      clear(this.content);
      this.content.appendChild(createTopBar());
      this.content.appendChild(
        createErrorState('Errore', 'Impossibile caricare la home.', () => void this.load()),
      );
      focusEngine.focusDefault('error-retry');
    } finally {
      this.loading = false;
    }
  }

  private async buildHero(): Promise<HTMLElement> {
    const continueItem = this.continueItems[0] || null;
    const featured = continueItem?.anime || this.providerFeatured;
    const featuredDetails = continueItem?.anime;
    const description =
      featuredDetails && 'description' in featuredDetails
        ? (featuredDetails as { description?: string }).description
        : undefined;

    let playLabel = 'Guarda ep. 1';
    let playEpisodeId: string | null = continueItem?.episode.id ?? null;

    if (continueItem) {
      playLabel = `Continua ep. ${continueItem.episode.number}`;
    } else if (featured) {
      const details = await catalogService.getDetails(featured.id, featured.providerId);
      if (details.ok && details.data.episodes.length) {
        const progress = await progressTracker.getAnimeProgress(details.data.id);
        const action = progressTracker.resolvePlayAction(details.data.episodes, progress);
        if (action) {
          playLabel = action.label;
          playEpisodeId = action.episode.id;
        }
      }
    }

    return createHeroBanner({
      anime: featured,
      description,
      continueItem,
      playLabel,
      onPlay: () => {
        if (featured && playEpisodeId) {
          router.push('player', {
            animeId: featured.id,
            episodeId: playEpisodeId,
          });
          return;
        }
        if (featured) router.push('details', { animeId: featured.id });
      },
      onDetails: () => {
        const anime = this.continueItems[0]?.anime || this.providerFeatured;
        if (anime) router.push('details', { animeId: anime.id });
      },
    });
  }

  private async replaceHero(): Promise<void> {
    const next = await this.buildHero();
    const old = this.content.querySelector('.hero');
    if (old) old.replaceWith(next);
    else this.content.insertBefore(next, this.content.querySelector('.home-rails'));
  }

  private railsHost(): HTMLElement | null {
    return this.content.querySelector('.home-rails');
  }

  private findRail(id: string): HTMLElement | null {
    return this.content.querySelector<HTMLElement>(`.rail[data-rail-id="${id}"]`);
  }

  private buildContinueRail(): HTMLElement {
    return createContinueRail(this.continueRailOptions());
  }

  private buildLastSeenRail(): HTMLElement {
    return createContentRail(this.lastSeenRailOptions());
  }

  private continueRailOptions() {
    return {
      id: 'continue' as const,
      title: 'Continua a guardare',
      items: this.continueItems,
      onSelect: (cw: ContinueWatchingItem) => {
        router.push('player', {
          animeId: cw.anime.id,
          episodeId: cw.episode.id,
        });
      },
      onLongPress: (cw: ContinueWatchingItem, index: number) =>
        this.openRemoveMenu('continue', cw.anime.title, index),
    };
  }

  private lastSeenRailOptions() {
    return {
      id: 'last-seen' as const,
      title: 'Ultimi visualizzati',
      items: this.lastSeenItems,
      onSelect: (a: AnimeSummary) => router.push('details', { animeId: a.id }),
      onLongPress: (a: AnimeSummary, index: number) =>
        this.openRemoveMenu('last-seen', a.title, index),
    };
  }

  private openRemoveMenu(
    railId: 'continue' | 'last-seen',
    title: string,
    index: number,
  ): void {
    const focusId = `${railId}-${index}`;

    openContextMenu({
      host: this.root,
      title,
      subtitle:
        railId === 'continue'
          ? 'Rimuove il titolo da Continua a guardare'
          : 'Rimuove il titolo da Ultimi visualizzati',
      previousRoot: this.root,
      previousScope: 'home',
      previousFocusId: focusId,
      actions: [
        {
          id: 'remove',
          label: 'Rimuovi dalla lista',
          danger: true,
          onSelect: () => {
            void this.removeFromRail(railId, index);
          },
        },
      ],
    });
  }

  private async removeFromRail(
    railId: 'continue' | 'last-seen',
    index: number,
  ): Promise<void> {
    if (railId === 'continue') {
      const item = this.continueItems[index];
      if (!item) return;
      await progressTracker.removeContinue(item.episode.id);
      this.continueItems.splice(index, 1);
      this.syncContinueRail();
      await this.replaceHero();
    } else {
      const item = this.lastSeenItems[index];
      if (!item) return;
      await progressTracker.removeFromHistory(item.id);
      this.lastSeenItems.splice(index, 1);
      this.syncLastSeenRail();
    }

    // Local UI already matches IndexedDB; avoid a full home refetch on next show().
    uiStore.clearHomeDirty();

    const nextFocus = this.focusAfterRemove(railId, index);
    uiStore.setLastFocusHome(nextFocus);
    focusMemory.remember('home', nextFocus);
    focusEngine.setRoot(this.root);
    focusEngine.setScope('home');
    this.restoreFocus(nextFocus);
  }

  /** Mount virtualized card if needed, then focus. */
  private restoreFocus(focusId: string): void {
    const match = /^(.+)-(\d+)$/.exec(focusId);
    if (match) {
      const rail = this.findRail(match[1]);
      type RailHost = HTMLElement & {
        __prepareRailFocus?: (index: number) => HTMLElement | null;
      };
      (rail as RailHost | null)?.__prepareRailFocus?.(Number(match[2]));
    }
    focusEngine.focusDefault(focusId);
  }

  private syncContinueRail(): void {
    const host = this.railsHost();
    const existing = this.findRail('continue');
    if (!this.continueItems.length) {
      if (existing) {
        destroyRail(existing);
        existing.remove();
      }
      return;
    }
    if (existing) {
      updateContinueRail(existing, this.continueRailOptions());
      return;
    }
    if (host) {
      const rail = this.buildContinueRail();
      const first = host.firstChild;
      if (first) host.insertBefore(rail, first);
      else host.appendChild(rail);
    }
  }

  private syncLastSeenRail(): void {
    const host = this.railsHost();
    const existing = this.findRail('last-seen');
    if (!this.lastSeenItems.length) {
      if (existing) {
        destroyRail(existing);
        existing.remove();
      }
      return;
    }
    if (existing) {
      updateRail(existing, this.lastSeenRailOptions());
      return;
    }
    if (host) {
      const rail = this.buildLastSeenRail();
      const continueRail = this.findRail('continue');
      if (continueRail?.nextSibling) {
        host.insertBefore(rail, continueRail.nextSibling);
      } else if (continueRail) {
        host.appendChild(rail);
      } else {
        host.insertBefore(rail, host.firstChild);
      }
    }
  }

  private focusAfterRemove(railId: 'continue' | 'last-seen', index: number): string {
    const remaining =
      railId === 'continue' ? this.continueItems.length : this.lastSeenItems.length;
    if (remaining <= 0) {
      if (railId === 'continue' && this.lastSeenItems.length > 0) return 'last-seen-0';
      if (railId === 'last-seen' && this.continueItems.length > 0) return 'continue-0';
      return 'hero-play';
    }
    const nextIndex = Math.min(index, remaining - 1);
    return `${railId}-${nextIndex}`;
  }

  private openDetails(anime: AnimeSummary): void {
    router.push('details', { animeId: anime.id });
  }

  private async switchProvider(currentId: string): Promise<void> {
    const next = await catalogService.switchToNextProvider(currentId);
    if (!next) return;
    this.loadedOnce = false;
    uiStore.markHomeDirty('full');
    await this.load();
  }
}
