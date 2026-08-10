import type { AnimeDetails, Episode, WatchProgress } from '@/domain/models';
import { el, clear, setText } from '../mount';
import { createTopBar } from '../components/TopBar';
import { createErrorState } from '../components/ErrorState';
import { createDetailsSkeleton } from '../components/Skeleton';
import { catalogService } from '@/services/CatalogService';
import { progressTracker } from '@/services/ProgressTracker';
import { imageLoader } from '@/services/ImageLoader';
import { watchlistRepo } from '@/persistence/repositories/WatchlistRepo';
import { focusEngine } from '@/navigation/FocusEngine';
import { router } from '@/router/AppRouter';
import { APP_CONFIG } from '@/app/config';
import { now } from '@/utils/time';
import { uiStore } from '@/state/stores/uiStore';

export class DetailsPage {
  readonly root: HTMLElement;
  private content: HTMLElement;
  private animeId: string | null = null;
  private details: AnimeDetails | null = null;
  private progressMap = new Map<string, WatchProgress>();

  constructor() {
    this.root = el('section', 'page page--details', { id: 'page-details' });
    this.content = el('div');
    this.root.appendChild(this.content);
  }

  async show(params?: Record<string, string>): Promise<void> {
    this.root.classList.add('is-active');
    focusEngine.setRoot(this.root);
    focusEngine.setScope('details');
    this.animeId = params?.animeId || null;
    await this.load();
  }

  hide(): void {
    this.root.classList.remove('is-active');
  }

  private async load(): Promise<void> {
    clear(this.content);
    this.content.appendChild(createTopBar());
    this.content.appendChild(createDetailsSkeleton());

    if (!this.animeId) {
      clear(this.content);
      this.content.appendChild(createErrorState('Errore', 'Anime non specificato.'));
      return;
    }

    const result = await catalogService.getDetails(this.animeId);
    if (!result.ok) {
      clear(this.content);
      this.content.appendChild(createTopBar());
      this.content.appendChild(
        createErrorState('Impossibile caricare', result.error.message, () => void this.load()),
      );
      focusEngine.focusDefault('error-retry');
      return;
    }

    this.details = result.data;
    const list = await progressTracker.getAnimeProgress(this.details.id);
    this.progressMap = new Map(list.map((p) => [p.episodeId, p]));
    await progressTracker.recordHistory(this.details);
    // Last-seen order may change — soft-refresh home rails, don't nuke the feed cache.
    uiStore.markHomeDirty('local');

    clear(this.content);
    this.content.appendChild(createTopBar());
    this.renderDetails(this.details);
    focusEngine.focusDefault('details-play');
  }

  private renderDetails(details: AnimeDetails): void {
    const layout = el('div', 'details-page');

    const cover = el('img', 'details-cover', { alt: details.title }) as HTMLImageElement;
    imageLoader.observe(cover, details.posterUrl || APP_CONFIG.imageFallback);

    const info = el('div');
    const title = el('h1', 'details-title');
    setText(title, details.title);

    const meta = el('p', 'details-meta');
    setText(
      meta,
      [
        details.year,
        details.genres?.join(' · '),
        details.status === 'ongoing'
          ? 'In corso'
          : details.status === 'completed'
            ? 'Completato'
            : null,
        details.episodeCount ? `${details.episodeCount} episodi` : null,
      ]
        .filter(Boolean)
        .join('  ·  '),
    );

    const desc = el('p', 'details-desc');
    setText(desc, details.description || 'Nessuna descrizione disponibile.');

    const actions = el('div', 'details-actions');
    const playBtn = el('button', 'btn btn--primary');
    this.updatePlayButton(playBtn, details);
    const play = () => {
      const action = progressTracker.resolvePlayAction(
        details.episodes,
        Array.from(this.progressMap.values()),
      );
      if (action) {
        router.push('player', { animeId: details.id, episodeId: action.episode.id });
      }
    };
    focusEngine.register(playBtn, {
      id: 'details-play',
      row: 'details-actions',
      onEnter: play,
    });
    playBtn.addEventListener('click', play);

    const watchlistBtn = el('button', 'btn btn--ghost');
    void this.setupWatchlistButton(watchlistBtn, details);

    actions.appendChild(playBtn);
    actions.appendChild(watchlistBtn);

    const epTitle = el('h2', 'rail__title');
    setText(epTitle, 'Episodi');
    const list = el('div', 'episode-list');

    // Light virtualization: render first 40, rest on demand via "Mostra altri"
    const pageSize = 40;
    let shown = 0;
    const renderMore = () => {
      const slice = details.episodes.slice(shown, shown + pageSize);
      for (const ep of slice) {
        list.appendChild(this.createEpisodeRow(details, ep, shown));
        shown++;
      }
      if (shown < details.episodes.length) {
        const more = el('button', 'btn btn--ghost episode-row');
        setText(more, `Mostra altri (${details.episodes.length - shown})`);
        focusEngine.register(more, {
          id: `ep-more-${shown}`,
          row: 'episodes',
          onEnter: () => {
            list.removeChild(more);
            renderMore();
          },
        });
        more.addEventListener('click', () => {
          list.removeChild(more);
          renderMore();
        });
        list.appendChild(more);
      }
    };
    renderMore();

    info.appendChild(title);
    info.appendChild(meta);
    info.appendChild(desc);
    info.appendChild(actions);
    info.appendChild(epTitle);
    info.appendChild(list);

    layout.appendChild(cover);
    layout.appendChild(info);
    this.content.appendChild(layout);
  }

  private createEpisodeRow(details: AnimeDetails, ep: Episode, index: number): HTMLElement {
    const row = el('div', 'episode-row');
    const left = el('div', 'episode-row__left');
    const num = el('span');
    setText(num, `Ep. ${ep.number}`);
    const name = el('span');
    setText(name, ep.title || '');
    left.appendChild(num);
    left.appendChild(name);

    const right = el('div');
    const toggle = el('button', 'btn');
    toggle.style.cssText =
      'min-width:auto;min-height:48px;padding:0 16px;margin-left:16px;font-size:18px;';
    right.appendChild(toggle);
    this.renderEpisodeProgress(right, toggle, ep);

    row.appendChild(left);
    row.appendChild(right);

    focusEngine.register(row, {
      id: `ep-${index}`,
      row: 'episodes',
      onEnter: () => {
        router.push('player', { animeId: details.id, episodeId: ep.id });
      },
    });

    row.addEventListener('click', () => {
      router.push('player', { animeId: details.id, episodeId: ep.id });
    });

    focusEngine.register(toggle, {
      id: `ep-toggle-${index}`,
      row: 'episodes',
      onEnter: () => void this.toggleWatched(details, ep, right, toggle),
    });
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      void this.toggleWatched(details, ep, right, toggle);
    });

    return row;
  }

  private renderEpisodeProgress(
    right: HTMLElement,
    toggle: HTMLButtonElement,
    ep: Episode,
  ): void {
    const existingBadge = right.querySelector('.episode-row__badge');
    if (existingBadge) existingBadge.remove();

    const progress = this.progressMap.get(ep.id);
    if (progress?.completed) {
      const badge = el('span', 'episode-row__badge');
      setText(badge, 'Visto');
      right.insertBefore(badge, toggle);
    } else if (progress && progress.percent > 0.02) {
      const badge = el('span', 'episode-row__badge');
      setText(badge, `${Math.round(progress.percent * 100)}%`);
      right.insertBefore(badge, toggle);
    }
    setText(toggle, progress?.completed ? 'Non visto' : 'Segna visto');
  }

  private updatePlayButton(playBtn: HTMLElement, details: AnimeDetails): void {
    const action = progressTracker.resolvePlayAction(
      details.episodes,
      Array.from(this.progressMap.values()),
    );
    setText(playBtn, action?.label || 'Guarda');
  }

  private async toggleWatched(
    details: AnimeDetails,
    ep: Episode,
    right: HTMLElement,
    toggle: HTMLButtonElement,
  ): Promise<void> {
    const completed = !this.progressMap.get(ep.id)?.completed;
    await progressTracker.markEpisode(details, ep, completed);

    const existing = this.progressMap.get(ep.id);
    this.progressMap.set(ep.id, {
      animeId: details.id,
      episodeId: ep.id,
      providerId: details.providerId,
      currentTime: completed ? existing?.duration || existing?.currentTime || 0 : 0,
      duration: existing?.duration || 0,
      percent: completed ? 1 : 0,
      completed,
      updatedAt: now(),
    });

    this.renderEpisodeProgress(right, toggle, ep);

    const playBtn = this.content.querySelector(
      '.details-actions .btn--primary',
    ) as HTMLElement | null;
    if (playBtn) this.updatePlayButton(playBtn, details);
  }

  private async setupWatchlistButton(btn: HTMLButtonElement, details: AnimeDetails): Promise<void> {
    const inList = await watchlistRepo.has(details.id);
    setText(btn, inList ? 'Nella watchlist' : 'Aggiungi alla watchlist');
    focusEngine.register(btn, {
      id: 'details-watchlist',
      row: 'details-actions',
      onEnter: () => void this.toggleWatchlist(details, btn),
    });
    btn.addEventListener('click', () => void this.toggleWatchlist(details, btn));
  }

  private async toggleWatchlist(details: AnimeDetails, btn: HTMLButtonElement): Promise<void> {
    const inList = await watchlistRepo.has(details.id);
    if (inList) {
      await watchlistRepo.remove(details.id);
      setText(btn, 'Aggiungi alla watchlist');
    } else {
      await watchlistRepo.add({
        animeId: details.id,
        providerId: details.providerId,
        title: details.title,
        posterUrl: details.posterUrl,
        year: details.year,
        genres: details.genres,
        addedAt: now(),
      });
      setText(btn, 'Nella watchlist');
    }
  }
}
