import type { AnimeSummary } from '../../domain/models';
import { escapeHtml } from '../../core/utils';

export function createHero(
  anime: AnimeSummary,
  options: { onPlayId: string; onDetailsId: string },
): HTMLElement {
  const el = document.createElement('section');
  el.className = 'hero';
  const bg = anime.backdropUrl || anime.coverUrl || '';

  el.innerHTML = `
    <div class="hero-media" style="${bg ? `background-image:url('${escapeHtml(bg)}')` : ''}"></div>
    <div class="hero-scrim"></div>
    <div class="hero-content">
      <h1 class="hero-title">${escapeHtml(anime.title)}</h1>
      <div class="hero-meta">
        ${anime.year ? escapeHtml(String(anime.year)) : ''}
        ${anime.genres?.length ? ` · ${escapeHtml(anime.genres.slice(0, 3).join(', '))}` : ''}
        ${anime.status && anime.status !== 'unknown' ? ` · ${escapeHtml(anime.status)}` : ''}
      </div>
      <p class="hero-desc">${escapeHtml(anime.description ?? 'Scopri questo titolo in evidenza.')}</p>
      <div class="hero-actions">
        <button class="hero-cta primary" data-focus-id="${options.onPlayId}" data-action="play">Riproduci</button>
        <button class="hero-cta" data-focus-id="${options.onDetailsId}" data-action="details">Dettagli</button>
      </div>
    </div>
  `;
  return el;
}
