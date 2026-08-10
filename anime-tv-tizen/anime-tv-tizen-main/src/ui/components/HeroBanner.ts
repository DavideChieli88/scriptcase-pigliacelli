import type { AnimeSummary, ContinueWatchingItem } from '@/domain/models';
import { el, setText } from '../mount';
import { focusEngine } from '@/navigation/FocusEngine';
import { APP_CONFIG } from '@/app/config';

export interface HeroOptions {
  anime: AnimeSummary | null;
  description?: string;
  continueItem?: ContinueWatchingItem | null;
  /** Primary CTA label, e.g. `Continua ep. 3` / `Guarda ep. 1`. */
  playLabel?: string;
  onPlay: () => void;
  onDetails: () => void;
}

export function createHeroBanner(options: HeroOptions): HTMLElement {
  const hero = el('section', 'hero');
  const backdrop = el('div', 'hero__backdrop');
  const content = el('div', 'hero__content');

  if (!options.anime) {
    const title = el('h1', 'hero__title');
    setText(title, 'Benvenuto');
    const desc = el('p', 'hero__desc');
    setText(desc, 'Scegli un titolo dalle righe qui sotto per iniziare.');
    content.appendChild(title);
    content.appendChild(desc);
    hero.appendChild(backdrop);
    hero.appendChild(content);
    return hero;
  }

  const anime = options.anime;
  const url = anime.backdropUrl || anime.posterUrl || APP_CONFIG.imageFallback;
  backdrop.style.backgroundImage = `url("${url}")`;

  const title = el('h1', 'hero__title');
  setText(title, anime.title);

  const meta = el('p', 'hero__meta');
  const parts = [
    anime.year ? String(anime.year) : null,
    anime.genres?.slice(0, 3).join(' · ') || null,
    anime.status === 'ongoing' ? 'In corso' : anime.status === 'completed' ? 'Completato' : null,
    options.continueItem
      ? `Ep. ${options.continueItem.episode.number} · ${Math.round(options.continueItem.progress.percent * 100)}%`
      : null,
  ].filter(Boolean);
  setText(meta, parts.join('  ·  '));

  const descText =
    options.description ||
    (options.continueItem
      ? `Continua da Episodio ${options.continueItem.episode.number}`
      : '');
  if (descText) {
    const desc = el('p', 'hero__desc');
    setText(desc, descText);
    content.appendChild(title);
    content.appendChild(meta);
    content.appendChild(desc);
  } else {
    content.appendChild(title);
    content.appendChild(meta);
  }

  const actions = el('div', 'hero__actions');
  const playBtn = el('button', 'btn btn--primary hero-cta');
  setText(
    playBtn,
    options.playLabel ||
      (options.continueItem
        ? `Continua ep. ${options.continueItem.episode.number}`
        : 'Guarda ep. 1'),
  );
  focusEngine.register(playBtn, {
    id: 'hero-play',
    row: 'hero',
    onEnter: options.onPlay,
  });
  playBtn.addEventListener('click', options.onPlay);

  const detailsBtn = el('button', 'btn btn--ghost hero-cta');
  setText(detailsBtn, 'Dettagli');
  focusEngine.register(detailsBtn, {
    id: 'hero-details',
    row: 'hero',
    onEnter: options.onDetails,
  });
  detailsBtn.addEventListener('click', options.onDetails);

  actions.appendChild(playBtn);
  actions.appendChild(detailsBtn);
  content.appendChild(actions);

  hero.appendChild(backdrop);
  hero.appendChild(content);
  return hero;
}
