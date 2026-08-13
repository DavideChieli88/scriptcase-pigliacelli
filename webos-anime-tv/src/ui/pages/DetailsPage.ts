import type { AppContext } from '../../app/context';
import { createTopNav } from '../components/TopNav';
import { escapeHtml } from '../../core/utils';
import { bindLazyPoster } from '../../core/media/LazyPoster';

export async function renderDetailsPage(
  ctx: AppContext,
  root: HTMLElement,
  params: Record<string, string>,
): Promise<void> {
  ctx.focus.clear();
  ctx.focus.setScope(`details:${params.providerId}:${params.animeId}`);
  root.innerHTML = '';
  root.className = 'page';

  root.appendChild(
    createTopNav(
      params.providerId?.startsWith('altadefinizione') ? 'movies' : 'home',
      ctx.focus,
      (name) => void ctx.router.navigate(name, {}, true),
    ),
  );

  const provider = ctx.registry.get(params.providerId);
  if (!provider) {
    root.innerHTML += `<div class="error-banner">Provider non trovato</div>`;
    return;
  }

  const loading = document.createElement('div');
  loading.className = 'skeleton skeleton-hero';
  root.appendChild(loading);

  const result = await provider.getAnimeDetails(params.animeId);
  loading.remove();

  if (!result.ok || !result.data) {
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.textContent = result.error?.message ?? 'Dettagli non disponibili';
    root.appendChild(banner);
    ctx.focus.restoreOrFirst();
    return;
  }

  const anime = result.data;
  await ctx.services.library.openAnime(anime);
  const fav = await ctx.services.library.isFavorite(anime.providerId, anime.id);

  const layout = document.createElement('div');
  layout.className = 'details-layout';
  if (anime.coverUrl) {
    const cover = document.createElement('img');
    cover.className = 'details-cover';
    cover.alt = '';
    bindLazyPoster(cover, anime.coverUrl, { eager: true });
    layout.appendChild(cover);
  } else {
    layout.appendChild(Object.assign(document.createElement('div'), { className: 'details-cover' }));
  }
  const info = document.createElement('div');
  info.innerHTML = `
    <h1 class="details-title">${escapeHtml(anime.title)}</h1>
    <div class="hero-meta">
      ${anime.year ? escapeHtml(String(anime.year)) : ''}
      ${anime.genres?.length ? ` · ${escapeHtml(anime.genres.join(', '))}` : ''}
      ${anime.status && anime.status !== 'unknown' ? ` · ${escapeHtml(anime.status)}` : ''}
      ${anime.studio ? ` · ${escapeHtml(anime.studio)}` : ''}
    </div>
    <p class="hero-desc">${escapeHtml(anime.description ?? 'Nessuna descrizione disponibile.')}</p>
    <div class="hero-actions" style="margin: 24px 0;"></div>
    <h2 class="rail-title">${params.providerId?.startsWith('altadefinizione') ? 'Riproduzione' : 'Episodi'}</h2>
    <div class="episode-list"></div>
  `;
  layout.appendChild(info);
  root.appendChild(layout);

  const actions = layout.querySelector('.hero-actions')!;
  const playBtn = document.createElement('button');
  playBtn.className = 'action-btn hero-cta primary';
  playBtn.textContent = 'Riproduci';
  playBtn.dataset.focusId = 'details-play';
  actions.appendChild(playBtn);
  ctx.focus.register({ id: 'details-play', el: playBtn, group: 'actions', row: 1, col: 0 });

  const favBtn = document.createElement('button');
  favBtn.className = 'action-btn hero-cta';
  favBtn.textContent = fav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti';
  favBtn.dataset.focusId = 'details-fav';
  actions.appendChild(favBtn);
  ctx.focus.register({ id: 'details-fav', el: favBtn, group: 'actions', row: 1, col: 1 });

  favBtn.addEventListener('click', async () => {
    const nowFav = await ctx.services.library.toggleFavorite(anime);
    favBtn.textContent = nowFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti';
  });

  const list = layout.querySelector('.episode-list')!;
  const episodes = anime.episodes ?? [];

  playBtn.addEventListener('click', () => {
    const first = episodes[0];
    if (!first) return;
    void ctx.router.navigate('player', {
      providerId: anime.providerId,
      animeId: anime.id,
      episodeId: first.id,
    });
  });

  for (const [index, ep] of episodes.entries()) {
    const progress = await ctx.persistence.progress.getForEpisode(anime.providerId, ep.id);
    const row = document.createElement('button');
    row.className = 'episode-item';
    row.dataset.focusId = `ep-${index}`;
    row.innerHTML = `
      <span>Ep. ${ep.number}${ep.title ? ` — ${escapeHtml(ep.title)}` : ''}</span>
      <span class="muted">${
        progress?.completed || ep.watched ? 'Visto' : progress ? `${Math.round(progress.percent * 100)}%` : ''
      }</span>
    `;
    row.addEventListener('click', () => {
      void ctx.router.navigate('player', {
        providerId: anime.providerId,
        animeId: anime.id,
        episodeId: ep.id,
      });
    });
    row.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      const watched = !(progress?.completed || ep.watched);
      await ctx.persistence.progress.markEpisodeWatched(anime.providerId, ep.id, anime.id, watched);
      void renderDetailsPage(ctx, root, params);
    });
    list.appendChild(row);
    ctx.focus.register({ id: `ep-${index}`, el: row, group: 'episodes', row: 2 + index, col: 0 });
  }

  if (!episodes.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Nessun episodio trovato';
    list.appendChild(empty);
  }

  ctx.focus.restoreOrFirst();
}
