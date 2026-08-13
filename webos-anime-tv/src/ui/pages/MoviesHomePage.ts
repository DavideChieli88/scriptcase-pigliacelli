import type { AppContext } from '../../app/context';
import { createTopNav } from '../components/TopNav';
import { createHero } from '../components/Hero';
import { createRail } from '../components/Rail';
import { createCard, createSkeletonRail } from '../components/Card';
import type { AnimeSummary, ContinueWatchingItem } from '../../domain/models';
import { isMovieProviderId } from '../../providers/failover';
import { AltadefinizioneProvider } from '../../providers/altadefinizione/AltadefinizioneProvider';
import { lazyPoster } from '../../core/media/LazyPoster';

export async function renderMoviesHomePage(ctx: AppContext, root: HTMLElement): Promise<void> {
  ctx.focus.clear();
  ctx.focus.setScope('movies');
  root.innerHTML = '';
  root.className = 'page page--movies';

  root.appendChild(createTopNav('movies', ctx.focus, (name) => void ctx.router.navigate(name, {}, true)));

  root.appendChild(Object.assign(document.createElement('div'), { className: 'skeleton skeleton-hero' }));
  root.appendChild(createSkeletonRail());
  root.appendChild(createSkeletonRail());

  const settings = await ctx.persistence.settings.getOrCreate(ctx.config);
  const preferred =
    settings.preferredMoviesProviderId || ctx.config.defaultMoviesProviderId || 'altadefinizione';
  const feed = await ctx.services.home.getHomeFeed(preferred);
  const continueWatching = feed.continueWatching.filter((c) => isMovieProviderId(c.anime.providerId));
  const recent = feed.recent.filter((r) => isMovieProviderId(r.providerId));

  root.innerHTML = '';
  ctx.focus.clear();
  root.appendChild(createTopNav('movies', ctx.focus, (name) => void ctx.router.navigate(name, {}, true)));

  const usedProviderId = feed.usedProviderId || preferred;
  const usedName = usedProviderId
    ? ctx.registry.get(usedProviderId)?.name ?? usedProviderId
    : 'Altadefinizione';

  const moviesProvider = ctx.registry.get(usedProviderId);
  const adProvider =
    moviesProvider instanceof AltadefinizioneProvider ? moviesProvider : undefined;

  const masthead = document.createElement('div');
  masthead.className = 'movies-masthead';
  masthead.innerHTML = `
    <div class="movies-kicker">Cinema</div>
    <h1 class="movies-headline">Film in streaming</h1>
    <p class="movies-sub">Catalogo ${usedName} · carica a blocchi (archivio completo disponibile sotto)</p>
  `;
  root.appendChild(masthead);

  if (feed.errors.length) {
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.textContent = `Sorgente film: ${feed.errors.join(' · ')}`;
    root.appendChild(banner);
  }

  const openDetails = (item: AnimeSummary) => {
    void ctx.services.library.openAnime(item);
    void ctx.router.navigate('details', { providerId: item.providerId, animeId: item.id });
  };

  if (feed.hero && isMovieProviderId(feed.hero.providerId)) {
    const hero = createHero(feed.hero, {
      onPlayId: 'movies-hero-play',
      onDetailsId: 'movies-hero-details',
    });
    hero.classList.add('movies-hero');
    root.appendChild(hero);
    const playBtn = hero.querySelector('[data-action="play"]') as HTMLElement;
    const detailsBtn = hero.querySelector('[data-action="details"]') as HTMLElement;
    ctx.focus.register({ id: 'movies-hero-play', el: playBtn, group: 'hero', row: 1, col: 0 });
    ctx.focus.register({ id: 'movies-hero-details', el: detailsBtn, group: 'hero', row: 1, col: 1 });
    playBtn.addEventListener('click', () => openDetails(feed.hero!));
    detailsBtn.addEventListener('click', () => openDetails(feed.hero!));
  }

  if (continueWatching.length) {
    const items: AnimeSummary[] = continueWatching.map((c: ContinueWatchingItem) => ({
      ...c.anime,
      description: `${Math.round(c.progress.percent * 100)}%`,
    }));
    const rail = createRail('Continua a guardare', items, 'movies-cw', (anime) => {
      const match = continueWatching.find(
        (c) => c.anime.id === anime.id && c.anime.providerId === anime.providerId,
      );
      if (match) {
        void ctx.router.navigate('player', {
          providerId: match.anime.providerId,
          animeId: match.anime.id,
          episodeId: match.episode.id,
        });
      } else openDetails(anime);
    });
    root.appendChild(rail.root);
    rail.focusIds.forEach((id, i) => {
      const el = rail.root.querySelector(`[data-focus-id="${id}"]`) as HTMLElement;
      if (el) ctx.focus.register({ id, el, group: 'movies-cw', row: 2, col: i });
    });
  }

  if (recent.length) {
    const rail = createRail('Visti di recente', recent, 'movies-recent', openDetails);
    root.appendChild(rail.root);
    rail.focusIds.forEach((id, i) => {
      const el = rail.root.querySelector(`[data-focus-id="${id}"]`) as HTMLElement;
      if (el) ctx.focus.register({ id, el, group: 'movies-recent', row: 3, col: i });
    });
  }

  let row = 4;
  let catalogTrack: HTMLElement | null = null;
  let catalogCol = 0;
  let catalogFocusRow = row;

  for (const section of feed.sections) {
    const rail = createRail(
      section.title.replace(/\s*·\s*Altadefinizione$/i, ''),
      section.items,
      section.id,
      openDetails,
    );
    if (section.id === 'ad-catalog') {
      rail.root.setAttribute('data-catalog-rail', '1');
      catalogTrack = rail.root.querySelector('.rail-track');
      catalogCol = section.items.length;
      catalogFocusRow = row;
    }
    root.appendChild(rail.root);
    const currentRow = row;
    rail.focusIds.forEach((id, i) => {
      const el = rail.root.querySelector(`[data-focus-id="${id}"]`) as HTMLElement;
      if (el) ctx.focus.register({ id, el, group: section.id, row: currentRow, col: i });
    });
    row += 1;
  }

  if (adProvider) {
    if (!catalogTrack) {
      const rail = createRail('Catalogo film', [], 'ad-catalog', openDetails);
      rail.root.setAttribute('data-catalog-rail', '1');
      catalogTrack = rail.root.querySelector('.rail-track');
      catalogTrack?.querySelector('.empty-state')?.remove();
      catalogFocusRow = row;
      root.appendChild(rail.root);
      row += 1;
    }

    const footer = document.createElement('div');
    footer.className = 'movies-catalog-more';

    const status = document.createElement('p');
    status.className = 'movies-catalog-status';
    footer.appendChild(status);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn movies-catalog-btn';
    btn.textContent = 'Carica altri film';
    btn.setAttribute('data-focus-id', 'movies-load-more');
    footer.appendChild(btn);
    root.appendChild(footer);

    ctx.focus.register({
      id: 'movies-load-more',
      el: btn,
      group: 'movies-load-more',
      row,
      col: 0,
    });

    const refreshStatus = (opts?: { loading?: boolean }) => {
      const loaded = adProvider.getCatalogLoadedCount();
      const more = adProvider.hasMoreCatalog();
      const next = adProvider.getCatalogNextPage();
      const max = adProvider.getCatalogMaxPage();
      if (opts?.loading) {
        status.textContent = `Caricamento… · ${loaded} titoli già in lista`;
        return;
      }
      if (!more) {
        status.textContent =
          max != null
            ? `Catalogo completo · ${loaded} titoli (fino a pagina ${max})`
            : `Catalogo completo · ${loaded} titoli`;
        btn.hidden = true;
        return;
      }
      const pageHint =
        max != null ? ` · pagina ${next} di ${max}` : ` · prossima pagina ${next}`;
      status.textContent = `${loaded} titoli caricati · ~200 per volta${pageHint}`;
      btn.hidden = false;
      btn.disabled = false;
    };

    refreshStatus();

    btn.addEventListener('click', () => {
      void (async () => {
        if (btn.disabled) return;
        btn.disabled = true;
        refreshStatus({ loading: true });
        const result = await adProvider.loadMoreCatalog();
        if (!result.ok || !result.data) {
          status.textContent = result.error?.message || 'Caricamento fallito';
          btn.disabled = false;
          return;
        }

        if (catalogTrack && result.data.items.length) {
          for (const item of result.data.items) {
            const focusId = `ad-catalog-${catalogCol}`;
            const card = createCard(item, focusId);
            card.addEventListener('click', () => openDetails(item));
            catalogTrack.appendChild(card);
            ctx.focus.register({
              id: focusId,
              el: card,
              group: 'ad-catalog',
              row: catalogFocusRow,
              col: catalogCol,
            });
            catalogCol += 1;
          }
          lazyPoster.hydrate(catalogTrack);
        }

        refreshStatus();
        if (!result.data.hasMore) btn.hidden = true;
        else btn.disabled = false;
      })();
    });
  }

  ctx.focus.restoreOrFirst();
}
