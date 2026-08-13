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
    <div class="hero-media"></div>
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

  const media = el.querySelector('.hero-media') as HTMLElement | null;
  if (media && bg) {
    // One on-screen decode; probe first so layout paints without waiting on CSS url().
    const probe = new Image();
    probe.decoding = 'async';
    probe.onload = () => {
      media.style.backgroundImage = `url("${bg.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
      media.classList.add('is-ready');
    };
    probe.onerror = () => {
      media.classList.add('is-missing');
    };
    probe.src = bg;
  }

  return el;
}
