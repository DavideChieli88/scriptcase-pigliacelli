import type { AnimeSummary } from '../../domain/models';
import { escapeHtml } from '../../core/utils';
import { bindLazyPoster } from '../../core/media/LazyPoster';

export function createCard(anime: AnimeSummary, focusId: string): HTMLElement {
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.focusId = focusId;
  el.tabIndex = -1;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', anime.title);

  if (anime.coverUrl) {
    const img = document.createElement('img');
    img.className = 'card-poster';
    img.alt = '';
    bindLazyPoster(img, anime.coverUrl);
    el.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'card-poster placeholder';
    ph.textContent = 'Nessuna cover';
    el.appendChild(ph);
  }

  const body = document.createElement('div');
  body.className = 'card-body';
  body.innerHTML = `
    <h3 class="card-title">${escapeHtml(anime.title)}</h3>
    <div class="card-meta">${anime.year ? escapeHtml(String(anime.year)) : ''}${
      anime.genres?.length ? ` · ${escapeHtml(anime.genres.slice(0, 2).join(', '))}` : ''
    }</div>
  `;
  el.appendChild(body);

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
