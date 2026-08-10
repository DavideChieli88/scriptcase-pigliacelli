import type { AppContext } from '../../app/context';
import { createTopNav } from '../components/TopNav';
import { createHero } from '../components/Hero';
import { createRail } from '../components/Rail';
import { createSkeletonRail } from '../components/Card';
import type { AnimeSummary, ContinueWatchingItem } from '../../domain/models';
import { isMovieProviderId } from '../../providers/failover';

export async function renderHomePage(ctx: AppContext, root: HTMLElement): Promise<void> {
  ctx.focus.clear();
  ctx.focus.setScope('home');
  root.innerHTML = '';
  root.className = 'page';

  const nav = createTopNav('home', ctx.focus, (name) => void ctx.router.navigate(name, {}, true));
  root.appendChild(nav);

  const skeletonHero = document.createElement('div');
  skeletonHero.className = 'skeleton skeleton-hero';
  root.appendChild(skeletonHero);
  root.appendChild(createSkeletonRail());
  root.appendChild(createSkeletonRail());

  const settings = await ctx.persistence.settings.getOrCreate(ctx.config);
  const feed = await ctx.services.home.getHomeFeed(settings.preferredProviderId);
  feed.continueWatching = feed.continueWatching.filter((c) => !isMovieProviderId(c.anime.providerId));
  feed.recent = feed.recent.filter((r) => !isMovieProviderId(r.providerId));
  if (feed.hero && isMovieProviderId(feed.hero.providerId)) {
    feed.hero = feed.sections[0]?.items[0] ?? feed.recent[0] ?? feed.continueWatching[0]?.anime;
  }

  root.innerHTML = '';
  ctx.focus.clear();
  root.appendChild(createTopNav('home', ctx.focus, (name) => void ctx.router.navigate(name, {}, true)));

  if (settings.debugMode) {
    const badge = document.createElement('div');
    badge.className = 'debug-badge';
    badge.textContent = 'DEBUG ON';
    root.appendChild(badge);
  }

  if (feed.errors.length) {
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.textContent = `Alcune sorgenti non disponibili: ${feed.errors.join(' · ')}`;
    root.appendChild(banner);
  }

  const openDetails = (anime: AnimeSummary) => {
    void ctx.services.library.openAnime(anime);
    void ctx.router.navigate('details', { providerId: anime.providerId, animeId: anime.id });
  };

  if (feed.hero) {
    const hero = createHero(feed.hero, { onPlayId: 'hero-play', onDetailsId: 'hero-details' });
    root.appendChild(hero);
    const playBtn = hero.querySelector('[data-action="play"]') as HTMLElement;
    const detailsBtn = hero.querySelector('[data-action="details"]') as HTMLElement;
    ctx.focus.register({ id: 'hero-play', el: playBtn, group: 'hero', row: 1, col: 0 });
    ctx.focus.register({ id: 'hero-details', el: detailsBtn, group: 'hero', row: 1, col: 1 });
    playBtn.addEventListener('click', () => openDetails(feed.hero!));
    detailsBtn.addEventListener('click', () => openDetails(feed.hero!));
  }

  if (feed.continueWatching.length) {
    const items: AnimeSummary[] = feed.continueWatching.map((c: ContinueWatchingItem) => ({
      ...c.anime,
      description: `Ep. ${c.episode.number} · ${Math.round(c.progress.percent * 100)}%`,
    }));
    const rail = createRail('Continua a guardare', items, 'cw', (anime) => {
      const match = feed.continueWatching.find(
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
      if (el) ctx.focus.register({ id, el, group: 'cw', row: 2, col: i });
    });
  }

  if (feed.recent.length) {
    const rail = createRail('Ultimi visualizzati', feed.recent, 'recent', openDetails);
    root.appendChild(rail.root);
    rail.focusIds.forEach((id, i) => {
      const el = rail.root.querySelector(`[data-focus-id="${id}"]`) as HTMLElement;
      if (el) ctx.focus.register({ id, el, group: 'recent', row: 3, col: i });
    });
  }

  let row = 4;
  for (const section of feed.sections) {
    const rail = createRail(section.title, section.items, section.id, openDetails);
    root.appendChild(rail.root);
    const currentRow = row;
    rail.focusIds.forEach((id, i) => {
      const el = rail.root.querySelector(`[data-focus-id="${id}"]`) as HTMLElement;
      if (el) ctx.focus.register({ id, el, group: section.id, row: currentRow, col: i });
    });
    row += 1;
  }

  ctx.focus.restoreOrFirst();
}
