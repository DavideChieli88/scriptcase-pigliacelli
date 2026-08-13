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

const SEEK_STEPS = [-60, -30, -10, -5, 5, 10, 30, 60] as const;
const NEXT_COUNTDOWN_SEC = 8;

function seekLabel(delta: number): string {
  return delta < 0 ? `${delta}s` : `+${delta}s`;
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
    <div class="player-seek-row" role="group" aria-label="Salta nel tempo"></div>
    <div class="player-episode-row" role="group" aria-label="Episodi"></div>
    <div class="muted">Back esci · Enter play/pausa · ← → tra i tasti o ±10s</div>
  `;
  root.appendChild(overlay);

  const progressEl = overlay.querySelector('.player-progress') as HTMLElement;
  const fillEl = overlay.querySelector('.player-progress-fill') as HTMLElement;
  const thumbEl = overlay.querySelector('.player-progress-thumb') as HTMLElement;
  const curEl = overlay.querySelector('[data-cur]') as HTMLElement;
  const durEl = overlay.querySelector('[data-dur]') as HTMLElement;
  const seekRow = overlay.querySelector('.player-seek-row') as HTMLElement;
  const episodeRow = overlay.querySelector('.player-episode-row') as HTMLElement;

  const updateProgressUi = () => {
    const ratio = ctx.player.getProgressRatio();
    const pct = `${(ratio * 100).toFixed(2)}%`;
    fillEl.style.width = pct;
    thumbEl.style.left = pct;
    curEl.textContent = formatTime(ctx.player.getCurrentTime());
    durEl.textContent = formatTime(ctx.player.getDuration());
  };

  let hideTimer = 0;
  const bumpOverlay = () => {
    overlay.classList.add('is-visible');
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => overlay.classList.remove('is-visible'), 4500);
  };

  SEEK_STEPS.forEach((delta, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'player-seek-btn';
    btn.textContent = seekLabel(delta);
    btn.dataset.focusId = `seek-${delta}`;
    btn.addEventListener('click', () => {
      ctx.player.seekBy(delta);
      updateProgressUi();
      bumpOverlay();
    });
    seekRow.appendChild(btn);
    ctx.focus.register({
      id: `seek-${delta}`,
      el: btn,
      group: 'seek',
      row: 1,
      col: i,
    });
  });

  const nextBox = document.createElement('div');
  nextBox.className = 'next-episode';
  nextBox.hidden = true;
  nextBox.innerHTML = `
    <div class="next-episode__kicker">Fine episodio</div>
    <div class="rail-title next-episode__title" style="font-size:22px;margin:6px 0 10px">Prossimo episodio</div>
    <div class="next-episode__countdown muted" data-next-count></div>
    <div class="next-episode__actions">
      <button type="button" class="hero-cta primary" data-focus-id="next-play">Riproduci ora</button>
      <button type="button" class="hero-cta" data-focus-id="next-cancel">Annulla</button>
    </div>
  `;
  root.appendChild(nextBox);

  let nextTimer: number | undefined;
  let nextTick: number | undefined;
  const clearNextPrompt = () => {
    if (nextTimer != null) window.clearTimeout(nextTimer);
    if (nextTick != null) window.clearInterval(nextTick);
    nextTimer = undefined;
    nextTick = undefined;
    nextBox.hidden = true;
    ctx.focus.graph.unregister('next-play');
    ctx.focus.graph.unregister('next-cancel');
  };

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

  const epIdx = anime?.episodes.findIndex((e) => e.id === params.episodeId) ?? -1;
  const prevEp = epIdx > 0 ? anime!.episodes[epIdx - 1] : undefined;
  const nextEp = epIdx >= 0 && anime ? anime.episodes[epIdx + 1] : undefined;

  const goToEpisode = (episodeId: string) => {
    clearNextPrompt();
    void ctx.router.navigate(
      'player',
      { providerId: params.providerId, animeId: params.animeId, episodeId },
      true,
    );
  };

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'player-seek-btn player-ep-btn';
  prevBtn.textContent = prevEp ? `← Ep. ${prevEp.number}` : '← Precedente';
  prevBtn.disabled = !prevEp;
  prevBtn.dataset.focusId = 'ep-prev';
  if (prevEp) {
    prevBtn.addEventListener('click', () => goToEpisode(prevEp.id));
    ctx.focus.register({ id: 'ep-prev', el: prevBtn, group: 'episode', row: 2, col: 0 });
  }
  episodeRow.appendChild(prevBtn);

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'player-seek-btn player-ep-btn';
  nextBtn.textContent = nextEp ? `Ep. ${nextEp.number} →` : 'Successivo →';
  nextBtn.disabled = !nextEp;
  nextBtn.dataset.focusId = 'ep-next';
  if (nextEp) {
    nextBtn.addEventListener('click', () => goToEpisode(nextEp.id));
    ctx.focus.register({ id: 'ep-next', el: nextBtn, group: 'episode', row: 2, col: 1 });
  }
  episodeRow.appendChild(nextBtn);

  if (!prevEp && !nextEp) {
    episodeRow.hidden = true;
  }

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

  hideTimer = window.setTimeout(() => overlay.classList.remove('is-visible'), 4500);

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

  const goNext = (episodeId: string) => {
    goToEpisode(episodeId);
  };

  const showNextPrompt = (next: { id: string; number: number; title?: string }) => {
    clearNextPrompt();
    nextBox.hidden = false;
    overlay.classList.remove('is-visible');

    const titleEl = nextBox.querySelector('.next-episode__title') as HTMLElement;
    const countEl = nextBox.querySelector('[data-next-count]') as HTMLElement;
    const playBtn = nextBox.querySelector('[data-focus-id="next-play"]') as HTMLButtonElement;
    const cancelBtn = nextBox.querySelector('[data-focus-id="next-cancel"]') as HTMLButtonElement;

    titleEl.textContent = next.title
      ? `Ep. ${next.number} — ${next.title}`
      : `Episodio ${next.number}`;

    ctx.focus.register({ id: 'next-play', el: playBtn, group: 'next', row: 0, col: 0 });
    ctx.focus.register({ id: 'next-cancel', el: cancelBtn, group: 'next', row: 0, col: 1 });
    ctx.focus.focus('next-play');

    playBtn.onclick = () => goNext(next.id);
    cancelBtn.onclick = () => {
      clearNextPrompt();
      ctx.focus.focus('player-progress', false);
      bumpOverlay();
    };

    if (!settings.autoplayNext) {
      countEl.textContent = 'Autoplay disattivato — premi Riproduci ora';
      return;
    }

    let left = NEXT_COUNTDOWN_SEC;
    countEl.textContent = `Avvio automatico tra ${left}s…`;
    nextTick = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        countEl.textContent = 'Avvio…';
        return;
      }
      countEl.textContent = `Avvio automatico tra ${left}s…`;
    }, 1000);
    nextTimer = window.setTimeout(() => goNext(next.id), NEXT_COUNTDOWN_SEC * 1000);
  };

  video.addEventListener('ended', () => {
    if (!anime) return;
    const idx = anime.episodes.findIndex((e) => e.id === params.episodeId);
    const next = anime.episodes[idx + 1];
    if (!next) return;
    showNextPrompt(next);
  });

  ctx.focus.register({ id: 'player-progress', el: progressEl, group: 'player', row: 0, col: 0 });
  ctx.focus.focus('player-progress', false);
}
