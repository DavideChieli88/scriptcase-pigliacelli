import type { AppContext } from '../../app/context';
import { createTopNav } from '../components/TopNav';
import { createCard } from '../components/Card';
import type { AnimeSummary } from '../../domain/models';

export async function renderHistoryPage(ctx: AppContext, root: HTMLElement): Promise<void> {
  ctx.focus.clear();
  ctx.focus.setScope('history');
  root.innerHTML = '';
  root.className = 'page grid-page';

  root.appendChild(createTopNav('history', ctx.focus, (name) => void ctx.router.navigate(name, {}, true)));

  const title = document.createElement('h1');
  title.className = 'details-title';
  title.textContent = 'Cronologia';
  root.appendChild(title);

  // Backfill covers from provider before rendering.
  await ctx.services.library.enrichHistoryCovers(40);

  const rows = await ctx.persistence.history.listRecent(60);
  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Cronologia vuota';
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
      lastOpenedAt: row.openedAt,
    };
    const focusId = `hist-${index}`;
    const card = createCard(anime, focusId);
    card.addEventListener('click', () => {
      void ctx.router.navigate('details', { providerId: anime.providerId, animeId: anime.id });
    });
    grid.appendChild(card);
    ctx.focus.register({ id: focusId, el: card, group: 'history', row: Math.floor(index / 6), col: index % 6 });
  });

  ctx.focus.restoreOrFirst();
}
