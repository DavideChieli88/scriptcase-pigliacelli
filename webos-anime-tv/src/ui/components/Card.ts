import type { AnimeSummary } from '../../domain/models';
import { escapeHtml } from '../../core/utils';

export function createCard(anime: AnimeSummary, focusId: string): HTMLElement {
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.focusId = focusId;
  el.tabIndex = -1;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', anime.title);

  const poster = anime.coverUrl
    ? `<img class="card-poster" src="${escapeHtml(anime.coverUrl)}" alt="" loading="lazy" />`
    : `<div class="card-poster placeholder">Nessuna cover</div>`;

  el.innerHTML = `
    ${poster}
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(anime.title)}</h3>
      <div class="card-meta">${anime.year ? escapeHtml(String(anime.year)) : ''}${
        anime.genres?.length ? ` · ${escapeHtml(anime.genres.slice(0, 2).join(', '))}` : ''
      }</div>
    </div>
  `;

  const img = el.querySelector('img.card-poster');
  img?.addEventListener('error', () => {
    img.replaceWith(Object.assign(document.createElement('div'), {
      className: 'card-poster placeholder',
      textContent: 'Nessuna cover',
    }));
  });

  return el;
}

export function createSkeletonRail(count = 6): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'rail';
  wrap.innerHTML = `<div class="rail-title skeleton" style="width:240px;height:28px;margin-bottom:16px"></div>`;
  const track = document.createElement('div');
  track.className = 'rail-track';
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton skeleton-card';
    track.appendChild(sk);
  }
  wrap.appendChild(track);
  return wrap;
}
