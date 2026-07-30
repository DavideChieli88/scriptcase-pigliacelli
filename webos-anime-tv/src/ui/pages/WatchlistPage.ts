import type { AppContext } from '../../app/context';
import { createTopNav } from '../components/TopNav';
import { createCard } from '../components/Card';
import type { AnimeSummary } from '../../domain/models';

export async function renderWatchlistPage(ctx: AppContext, root: HTMLElement): Promise<void> {
  ctx.focus.clear();
  ctx.focus.setScope('watchlist');
  root.innerHTML = '';
  root.className = 'page grid-page';

  root.appendChild(createTopNav('watchlist', ctx.focus, (name) => void ctx.router.navigate(name, {}, true)));

  const title = document.createElement('h1');
  title.className = 'details-title';
  title.textContent = 'Preferiti';
  root.appendChild(title);

  const rows = await ctx.persistence.watchlist.list();
  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Nessun preferito salvato';
    root.appendChild(empty);
    ctx.focus.restoreOrFirst();
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'results-grid';
  root.appendChild(grid);

  rows.forEach((row, index) => {
    const anime: AnimeSummary = {
      id: row.animeId,
      providerId: row.providerId,
      title: row.title,
      coverUrl: row.coverUrl,
      year: row.year,
      genres: row.genres,
      isFavorite: true,
    };
    const focusId = `wl-${index}`;
    const card = createCard(anime, focusId);
    card.addEventListener('click', () => {
      void ctx.router.navigate('details', { providerId: anime.providerId, animeId: anime.id });
    });
    grid.appendChild(card);
    ctx.focus.register({ id: focusId, el: card, group: 'watchlist', row: Math.floor(index / 6), col: index % 6 });
  });

  ctx.focus.restoreOrFirst();
}
