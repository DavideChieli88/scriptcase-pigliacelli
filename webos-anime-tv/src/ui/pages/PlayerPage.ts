import type { AppContext } from '../../app/context';

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export async function renderPlayerPage(
  ctx: AppContext,
  root: HTMLElement,
  params: Record<string, string>,
): Promise<void> {
  await ctx.player.stop();
  ctx.focus.clear();
  ctx.focus.setScope(`player:${params.episodeId}`);
  root.innerHTML = '';
  root.className = 'page player-page';

  const video = document.createElement('video');
  video.className = 'player-video';
  video.controls = false;
  video.playsInline = true;
  root.appendChild(video);
  ctx.player.bind(video);

  const overlay = document.createElement('div');
  overlay.className = 'player-overlay is-visible';
  overlay.innerHTML = `
    <div class="hero-meta">Caricamento…</div>
    <h2 class="rail-title" style="margin:8px 0">Player</h2>
    <div class="player-progress" data-focus-id="player-progress" role="slider" aria-label="Avanzamento" tabindex="-1">
      <div class="player-progress-track">
        <div class="player-progress-fill"></div>
        <div class="player-progress-thumb"></div>
      </div>
      <div class="player-time"><span data-cur>0:00</span> / <span data-dur>0:00</span></div>
    </div>
    <div class="muted">Back esci · Enter play/pausa · ← → ±10s</div>
  `;
  root.appendChild(overlay);

  const progressEl = overlay.querySelector('.player-progress') as HTMLElement;
  const fillEl = overlay.querySelector('.player-progress-fill') as HTMLElement;
  const thumbEl = overlay.querySelector('.player-progress-thumb') as HTMLElement;
  const curEl = overlay.querySelector('[data-cur]') as HTMLElement;
  const durEl = overlay.querySelector('[data-dur]') as HTMLElement;

  const updateProgressUi = () => {
    const ratio = ctx.player.getProgressRatio();
    const pct = `${(ratio * 100).toFixed(2)}%`;
    fillEl.style.width = pct;
    thumbEl.style.left = pct;
    curEl.textContent = formatTime(ctx.player.getCurrentTime());
    durEl.textContent = formatTime(ctx.player.getDuration());
  };

  const nextBox = document.createElement('div');
  nextBox.className = 'next-episode';
  nextBox.hidden = true;
  nextBox.innerHTML = `<div class="rail-title" style="font-size:22px;margin:0 0 8px">Prossimo episodio</div>
    <button class="hero-cta primary" data-focus-id="next-ep">Riproduci</button>`;
  root.appendChild(nextBox);

  const provider = ctx.registry.get(params.providerId);
  if (!provider) {
    overlay.querySelector('.hero-meta')!.textContent = 'Provider non trovato';
    return;
  }

  const details = await provider.getAnimeDetails(params.animeId);
  const anime = details.data;
  if (anime) {
    await ctx.services.library.openAnime(anime);
  }
  const episode = anime?.episodes.find((e) => e.id === params.episodeId);
  const streams = await provider.getStreamSources(params.episodeId);

  if (!streams.ok || !streams.data?.length) {
    overlay.querySelector('.hero-meta')!.textContent =
      streams.error?.message ?? 'Stream non disponibile';
    const backBtn = document.createElement('button');
    backBtn.className = 'hero-cta';
    backBtn.textContent = 'Indietro';
    backBtn.dataset.focusId = 'player-back';
    overlay.appendChild(backBtn);
    ctx.focus.register({ id: 'player-back', el: backBtn, group: 'player', row: 0, col: 0 });
    backBtn.addEventListener('click', () => void ctx.router.back());
    ctx.focus.focus('player-back');
    return;
  }

  const progress = await ctx.persistence.progress.getForEpisode(params.providerId, params.episodeId);
  const resumeAt = progress && !progress.completed ? progress.currentTime : 0;

  overlay.querySelector('.hero-meta')!.textContent = anime?.title ?? params.animeId;
  overlay.querySelector('.rail-title')!.textContent = episode
    ? `Episodio ${episode.number}${episode.title ? ` — ${episode.title}` : ''}`
    : 'Riproduzione';

  try {
    await ctx.player.playFirstWorking(streams.data, {
      providerId: params.providerId,
      animeId: params.animeId,
      episodeId: params.episodeId,
      animeTitle: anime?.title,
      episodeNumber: episode?.number,
      coverUrl: anime?.coverUrl,
      resumeAt,
    });
    updateProgressUi();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Errore riproduzione';
    overlay.querySelector('.muted')!.textContent = message;
    overlay.classList.add('is-visible');
  }

  let hideTimer = window.setTimeout(() => overlay.classList.remove('is-visible'), 4000);
  const bumpOverlay = () => {
    overlay.classList.add('is-visible');
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => overlay.classList.remove('is-visible'), 4000);
  };

  video.addEventListener('timeupdate', () => {
    updateProgressUi();
  });
  video.addEventListener('loadedmetadata', updateProgressUi);
  video.addEventListener('mousemove', bumpOverlay);
  video.addEventListener('click', () => {
    ctx.player.togglePlayPause();
    bumpOverlay();
  });

  const seekFromEvent = (clientX: number) => {
    const track = overlay.querySelector('.player-progress-track') as HTMLElement;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    ctx.player.seekToRatio(ratio);
    updateProgressUi();
    bumpOverlay();
  };

  progressEl.addEventListener('click', (e) => {
    seekFromEvent(e.clientX);
  });

  const settings = await ctx.persistence.settings.getOrCreate(ctx.config);
  video.addEventListener('ended', () => {
    if (!settings.autoplayNext || !anime) return;
    const idx = anime.episodes.findIndex((e) => e.id === params.episodeId);
    const next = anime.episodes[idx + 1];
    if (!next) return;
    nextBox.hidden = false;
    nextBox.querySelector('.rail-title')!.textContent = `Prossimo: Ep. ${next.number}`;
    const btn = nextBox.querySelector('[data-focus-id="next-ep"]') as HTMLElement;
    ctx.focus.register({ id: 'next-ep', el: btn, group: 'next', row: 0, col: 0 });
    ctx.focus.focus('next-ep');
    btn.onclick = () => {
      void ctx.router.navigate(
        'player',
        { providerId: params.providerId, animeId: params.animeId, episodeId: next.id },
        true,
      );
    };
    if (settings.autoplayNext) {
      window.setTimeout(() => btn.click(), 4000);
    }
  });

  ctx.focus.register({ id: 'player-progress', el: progressEl, group: 'player', row: 0, col: 0 });
  ctx.focus.focus('player-progress', false);
}
