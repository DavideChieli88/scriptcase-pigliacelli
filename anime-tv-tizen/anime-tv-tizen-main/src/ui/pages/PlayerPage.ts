import type { AnimeDetails, Episode, StreamSource } from '@/domain/models';
import { el, clear, setText } from '../mount';
import { createErrorState } from '../components/ErrorState';
import { catalogService } from '@/services/CatalogService';
import { playerService } from '@/services/PlayerService';
import { progressTracker } from '@/services/ProgressTracker';
import { settingsService } from '@/services/SettingsService';
import { focusEngine } from '@/navigation/FocusEngine';
import { router } from '@/router/AppRouter';
import { AppEvents, eventBus } from '@/state/EventBus';
import { uiStore } from '@/state/stores/uiStore';
import { logger } from '@/utils/logger';
import { debugLog } from '@/utils/debugLog';
import { APP_CONFIG } from '@/app/config';
import type { RemoteAction } from '@/navigation/KeyMap';

export class PlayerPage {
  readonly root: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly errorHost: HTMLElement;
  private video: HTMLVideoElement;
  private embed: HTMLIFrameElement;
  private overlay: HTMLElement;
  private titleEl: HTMLElement;
  private barFill: HTMLElement;
  private timeEl: HTMLElement;
  private toggleBtn: HTMLButtonElement;
  private nextEpisodeBtn: HTMLButtonElement;
  private nextPrompt: HTMLElement;
  private nextMeta: HTMLElement;
  private nextCountdown: HTMLElement;
  private details: AnimeDetails | null = null;
  private episode: Episode | null = null;
  private overlayTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private countdownLeft = 0;
  private unsubTime: (() => void) | null = null;
  private unsubState: (() => void) | null = null;
  private unsubNext: (() => void) | null = null;
  private embedMode = false;
  private currentSource: StreamSource | null = null;
  private debugOverlay: HTMLElement | null = null;
  private debugRefreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.root = el('section', 'page page--player', { id: 'page-player' });
    this.stage = el('div', 'player-stage');
    this.errorHost = el('div', 'player-error-host');
    this.errorHost.style.cssText =
      'position:absolute;inset:0;z-index:30;display:none;background:#000;';

    this.video = el('video', 'player-video') as HTMLVideoElement;
    this.video.setAttribute('playsinline', 'true');
    this.video.setAttribute('webkit-playsinline', 'true');

    this.embed = el('iframe', 'player-embed') as HTMLIFrameElement;
    this.embed.setAttribute('allowfullscreen', 'true');
    this.embed.setAttribute(
      'allow',
      'autoplay; fullscreen; picture-in-picture; encrypted-media',
    );

    this.overlay = el('div', 'player-overlay');
    this.titleEl = el('div', 'player-title');
    const bar = el('div', 'player-bar');
    this.barFill = el('div', 'player-bar__fill');
    bar.appendChild(this.barFill);
    this.timeEl = el('div', 'player-meta');

    const controls = el('div', 'player-controls');
    const controlsMain = el('div', 'player-controls__main');

    this.toggleBtn = el('button', 'btn btn--ghost btn--icon player-control') as HTMLButtonElement;
    this.toggleBtn.setAttribute('aria-label', 'Play');
    this.setToggleIcon(false);
    focusEngine.register(this.toggleBtn, {
      id: 'player-toggle',
      row: 'player-controls',
      onEnter: () => {
        this.bumpOverlay();
        if (!this.embedMode) playerService.togglePlayPause();
      },
    });
    this.toggleBtn.addEventListener('click', () => {
      if (!this.embedMode) playerService.togglePlayPause();
    });

    const back10Btn = this.createSeekButton('player-back-10', '-10s', -10, iconSkipBack());
    const skip10Btn = this.createSeekButton('player-skip-10', '+10s', 10, iconSkipForward());
    const skip90Btn = this.createSeekButton('player-skip-90', '+90s', 90, iconSkipForward());
    const skip1mBtn = this.createSeekButton('player-skip-1m', '+1m', 60, iconSkipForward());

    controlsMain.appendChild(back10Btn);
    controlsMain.appendChild(this.toggleBtn);
    controlsMain.appendChild(skip10Btn);
    controlsMain.appendChild(skip90Btn);
    controlsMain.appendChild(skip1mBtn);

    this.nextEpisodeBtn = el(
      'button',
      'btn btn--ghost btn--icon player-control',
    ) as HTMLButtonElement;
    this.nextEpisodeBtn.setAttribute('aria-label', 'Episodio successivo');
    this.nextEpisodeBtn.appendChild(iconNextEpisode());
    const nextCaption = el('span', 'player-control__label');
    setText(nextCaption, 'Succ.');
    this.nextEpisodeBtn.appendChild(nextCaption);
    this.nextEpisodeBtn.style.display = 'none';
    focusEngine.register(this.nextEpisodeBtn, {
      id: 'player-next-episode',
      row: 'player-controls',
      onEnter: () => {
        this.bumpOverlay();
        void this.playNext();
      },
    });
    this.nextEpisodeBtn.addEventListener('click', () => void this.playNext());

    controls.appendChild(controlsMain);
    controls.appendChild(this.nextEpisodeBtn);

    this.overlay.appendChild(this.titleEl);
    this.overlay.appendChild(bar);
    this.overlay.appendChild(this.timeEl);
    this.overlay.appendChild(controls);

    this.nextPrompt = el('div', 'next-episode');
    const nextLabel = el('div', 'next-episode__label');
    setText(nextLabel, 'Prossimo episodio');
    this.nextMeta = el('div', 'next-episode__meta');
    this.nextCountdown = el('div', 'next-episode__countdown');

    const nextActions = el('div', 'next-episode__actions');
    const nextBtn = el('button', 'btn btn--primary');
    setText(nextBtn, 'Riproduci');
    focusEngine.register(nextBtn, {
      id: 'player-next',
      row: 'player-next',
      onEnter: () => void this.playNext(),
    });
    nextBtn.addEventListener('click', () => void this.playNext());

    const cancelBtn = el('button', 'btn btn--ghost');
    setText(cancelBtn, 'Annulla');
    focusEngine.register(cancelBtn, {
      id: 'player-next-cancel',
      row: 'player-next',
      onEnter: () => this.dismissNextPrompt(),
    });
    cancelBtn.addEventListener('click', () => this.dismissNextPrompt());

    nextActions.appendChild(nextBtn);
    nextActions.appendChild(cancelBtn);
    this.nextPrompt.appendChild(nextLabel);
    this.nextPrompt.appendChild(this.nextMeta);
    this.nextPrompt.appendChild(this.nextCountdown);
    this.nextPrompt.appendChild(nextActions);

    this.stage.appendChild(this.video);
    this.stage.appendChild(this.embed);
    this.stage.appendChild(this.overlay);
    this.stage.appendChild(this.nextPrompt);
    this.root.appendChild(this.stage);
    this.root.appendChild(this.errorHost);

    // Debug overlay — built once, shown/hidden on demand (Info key)
    this.debugOverlay = this.buildDebugOverlay();
    this.root.appendChild(this.debugOverlay);
  }

  async show(params?: Record<string, string>): Promise<void> {
    this.root.classList.add('is-active');
    this.hideError();
    focusEngine.setRoot(this.root);
    focusEngine.setScope('player');
    if (settingsService.get().debugMode) {
      this.showDebugOverlay();
    }

    this.unsubTime = eventBus.on(
      AppEvents.PLAYER_TIME,
      (times: { current: string; duration: string; percent: number }) => {
        this.barFill.style.width = `${Math.round(times.percent * 100)}%`;
        setText(this.timeEl, `${times.current} / ${times.duration}`);
      },
    );

    this.unsubState = eventBus.on(AppEvents.PLAYER_STATE, (state: string) => {
      this.setToggleIcon(state === 'playing');
      if (state === 'ended') {
        uiStore.markHomeDirty('local');
        // Fallback when threshold is 100% or percent never quite reached it.
        if (!this.nextPrompt.classList.contains('is-visible')) {
          this.showNextPrompt();
        }
      } else if (state === 'error') {
        this.showError('Errore di riproduzione');
      }
      this.refreshDebugOverlay();
    });

    this.unsubNext = eventBus.on(AppEvents.PLAYER_NEXT_PROMPT, () => {
      this.showNextPrompt();
    });

    const animeId = params?.animeId;
    const episodeId = params?.episodeId;
    if (!animeId || !episodeId) {
      this.showError('Parametri player mancanti');
      return;
    }

    await this.start(animeId, episodeId);
    this.refreshDebugOverlay();
  }

  async hide(): Promise<void> {
    this.root.classList.remove('is-active');
    this.hideNextPrompt();
    this.hideError();
    this.hideDebugOverlay();
    this.clearEmbed();
    this.unsubTime?.();
    this.unsubState?.();
    this.unsubNext?.();
    this.unsubTime = this.unsubState = this.unsubNext = null;
    this.currentSource = null;
    await playerService.destroy();
    playerService.detach();
    uiStore.markHomeDirty('local');
  }

  /** Media keys + debug overlay (Info / Green) when debugMode is on. */
  handleRemote(action: RemoteAction): boolean {
    if (settingsService.get().debugMode && (action === 'info' || action === 'green')) {
      this.toggleDebugOverlay();
      return true;
    }

    if (this.debugOverlay?.classList.contains('is-visible') && action === 'back') {
      this.hideDebugOverlay();
      return true;
    }

    if (this.nextPrompt.classList.contains('is-visible') && action === 'back') {
      this.dismissNextPrompt();
      return true;
    }

    if (
      action === 'up' ||
      action === 'down' ||
      action === 'left' ||
      action === 'right' ||
      action === 'enter'
    ) {
      this.bumpOverlay();
    }

    if (
      action === 'play' ||
      action === 'pause' ||
      action === 'playPause' ||
      action === 'rewind' ||
      action === 'fastForward'
    ) {
      return this.handleMedia(action);
    }
    return false;
  }

  handleMedia(action: 'play' | 'pause' | 'playPause' | 'rewind' | 'fastForward'): boolean {
    this.bumpOverlay();
    if (this.embedMode) return true;
    if (action === 'play') {
      void playerService.play();
      return true;
    }
    if (action === 'pause') {
      playerService.pause();
      return true;
    }
    if (action === 'playPause') {
      playerService.togglePlayPause();
      return true;
    }
    if (action === 'rewind') {
      playerService.seek(-10);
      return true;
    }
    if (action === 'fastForward') {
      playerService.seek(10);
      return true;
    }
    return false;
  }

  private async start(animeId: string, episodeId: string): Promise<void> {
    this.hideError();
    this.hideNextPrompt();
    this.clearEmbed();
    const detailsResult = await catalogService.getDetails(animeId);
    if (!detailsResult.ok) {
      this.showError(detailsResult.error.message);
      return;
    }
    this.details = detailsResult.data;
    this.episode = this.details.episodes.find((e) => e.id === episodeId) || null;
    if (!this.episode) {
      this.showError('Episodio non trovato');
      return;
    }

    setText(
      this.titleEl,
      `${this.details.title} — Ep. ${this.episode.number}${
        this.episode.title ? `: ${this.episode.title}` : ''
      }`,
    );
    this.updateNextEpisodeButton();

    const sources = await catalogService.getStreamSources(animeId, episodeId);
    if (!sources.ok || !sources.data.length) {
      this.showError(sources.ok ? 'Nessuna sorgente stream' : sources.error.message);
      return;
    }

    const source = sources.data[0];
    this.currentSource = source;
    logger.info('PlayerPage', 'Stream source resolved', {
      type: source.type,
      url: source.url.slice(0, 120),
      label: source.label,
    });
    if (source.type === 'other') {
      await this.loadEmbed(source.url);
      return;
    }

    const saved = await progressTracker.load(episodeId);
    try {
      playerService.attach(this.video);
      await playerService.load(
        {
          anime: this.details,
          episode: this.episode,
          source,
        },
        saved && !saved.completed ? saved.currentTime : 0,
      );
      this.bumpOverlay();
      focusEngine.focusDefault('player-toggle');
    } catch (err) {
      logger.error('PlayerPage', 'load failed', err);
      this.showError('Impossibile avviare la riproduzione');
    }
  }

  private async loadEmbed(url: string): Promise<void> {
    if (!this.details || !this.episode) return;
    this.embedMode = true;
    this.video.style.display = 'none';
    this.embed.style.display = 'block';
    this.embed.src = url;
    setText(this.timeEl, 'Modalità embed (spesso bloccata su TV — prova altro provider)');
    this.barFill.style.width = '0%';
    await progressTracker.recordHistory(this.details, this.episode);
    progressTracker.record(this.details, this.episode, 1, 100);
    await progressTracker.flush();
    this.bumpOverlay();
    focusEngine.focusDefault('player-toggle');
    logger.info('PlayerPage', 'Embed stream loaded', { url: url.slice(0, 80) });
  }

  private clearEmbed(): void {
    this.embedMode = false;
    this.embed.removeAttribute('src');
    this.embed.style.display = 'none';
    this.video.style.display = 'block';
  }

  private getNextEpisode(): Episode | null {
    if (!this.details || !this.episode) return null;
    const idx = this.details.episodes.findIndex((e) => e.id === this.episode!.id);
    if (idx < 0 || idx >= this.details.episodes.length - 1) return null;
    return this.details.episodes[idx + 1];
  }

  private updateNextEpisodeButton(): void {
    const hasNext = !!this.getNextEpisode();
    this.nextEpisodeBtn.style.display = hasNext ? '' : 'none';
    if (!hasNext && focusEngine.getCurrentId() === 'player-next-episode') {
      focusEngine.focusDefault('player-toggle');
    }
  }

  private async playNext(): Promise<void> {
    if (!this.details) return;
    const next = this.getNextEpisode();
    if (!next) {
      this.hideNextPrompt();
      router.back();
      return;
    }
    this.hideNextPrompt();
    router.replace('player', { animeId: this.details.id, episodeId: next.id });
    await this.start(this.details.id, next.id);
  }

  private showNextPrompt(): void {
    const next = this.getNextEpisode();
    if (!next) {
      if (playerService.getState() === 'ended') router.back();
      return;
    }

    setText(
      this.nextMeta,
      `Ep. ${next.number}${next.title ? ` — ${next.title}` : ''}`,
    );

    this.nextPrompt.classList.add('is-visible');
    focusEngine.focusById('player-next');
    this.clearCountdown();

    const autoplay = settingsService.get().autoplayNext;
    if (autoplay) {
      this.countdownLeft = APP_CONFIG.nextEpisodeCountdownSec;
      this.updateCountdownLabel();
      this.countdownTimer = setInterval(() => {
        this.countdownLeft -= 1;
        if (this.countdownLeft <= 0) {
          this.clearCountdown();
          void this.playNext();
          return;
        }
        this.updateCountdownLabel();
      }, 1000);
    } else {
      setText(this.nextCountdown, 'Autoplay disattivato');
    }
  }

  private updateCountdownLabel(): void {
    setText(
      this.nextCountdown,
      `Riproduzione tra ${this.countdownLeft}s — Annulla per fermare`,
    );
  }

  private dismissNextPrompt(): void {
    this.clearCountdown();
    this.hideNextPrompt();
    focusEngine.focusDefault('player-toggle');
  }

  private hideNextPrompt(): void {
    this.clearCountdown();
    this.nextPrompt.classList.remove('is-visible');
  }

  private clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.countdownLeft = 0;
    setText(this.nextCountdown, '');
  }

  private bumpOverlay(): void {
    this.overlay.classList.add('is-visible');
    if (this.overlayTimer) clearTimeout(this.overlayTimer);
    this.overlayTimer = setTimeout(() => {
      this.overlay.classList.remove('is-visible');
      // Always return focus to play/pause so the next Enter pauses instead of seeking.
      if (!this.nextPrompt.classList.contains('is-visible')) {
        focusEngine.focusDefault('player-toggle');
      }
    }, 4000);
  }

  private createSeekButton(
    id: string,
    label: string,
    deltaSeconds: number,
    icon: SVGSVGElement,
  ): HTMLButtonElement {
    const btn = el('button', 'btn btn--ghost btn--icon player-control') as HTMLButtonElement;
    btn.setAttribute('aria-label', label);
    btn.appendChild(icon);
    const caption = el('span', 'player-control__label');
    setText(caption, label);
    btn.appendChild(caption);
    const seek = () => {
      this.bumpOverlay();
      if (!this.embedMode) playerService.seek(deltaSeconds);
    };
    focusEngine.register(btn, {
      id,
      row: 'player-controls',
      onEnter: seek,
    });
    btn.addEventListener('click', seek);
    return btn;
  }

  private setToggleIcon(playing: boolean): void {
    clear(this.toggleBtn);
    this.toggleBtn.appendChild(playing ? iconPause() : iconPlay());
    this.toggleBtn.setAttribute('aria-label', playing ? 'Pausa' : 'Play');
  }

  private showError(message: string): void {
    clear(this.errorHost);
    this.errorHost.style.display = 'block';
    this.errorHost.appendChild(
      createErrorState('Errore player', message, () => router.back(), {
        label: 'Indietro',
        action: () => router.back(),
      }),
    );
    focusEngine.setRoot(this.errorHost);
    focusEngine.focusDefault('error-retry');
  }

  private hideError(): void {
    clear(this.errorHost);
    this.errorHost.style.display = 'none';
  }

  // ── Debug overlay ──────────────────────────────────────────────

  private buildDebugOverlay(): HTMLElement {
    const panel = el('div', 'player-debug');
    panel.setAttribute('aria-hidden', 'true');
    return panel;
  }

  private toggleDebugOverlay(): void {
    if (this.debugOverlay?.classList.contains('is-visible')) {
      this.hideDebugOverlay();
    } else {
      this.showDebugOverlay();
    }
  }

  private showDebugOverlay(): void {
    if (!this.debugOverlay) return;
    this.refreshDebugOverlay();
    this.debugOverlay.classList.add('is-visible');
    if (this.debugRefreshTimer) return;
    this.debugRefreshTimer = setInterval(() => this.refreshDebugOverlay(), 1000);
  }

  private hideDebugOverlay(): void {
    if (!this.debugOverlay) return;
    this.debugOverlay.classList.remove('is-visible');
    if (this.debugRefreshTimer) {
      clearInterval(this.debugRefreshTimer);
      this.debugRefreshTimer = null;
    }
  }

  private refreshDebugOverlay(): void {
    if (!this.debugOverlay) return;
    const v = this.video;
    const src = this.currentSource;
    const settings = settingsService.get();

    const videoError = v.error
      ? `${v.error.code} — ${v.error.message}`
      : null;

    const networkState: Record<number, string> = {
      0: 'EMPTY', 1: 'IDLE', 2: 'LOADING', 3: 'NO_SOURCE',
    };
    const readyState: Record<number, string> = {
      0: 'HAVE_NOTHING', 1: 'HAVE_METADATA', 2: 'HAVE_CURRENT_DATA',
      3: 'HAVE_FUTURE_DATA', 4: 'HAVE_ENOUGH_DATA',
    };

    const lines: string[] = [
      '── Player Debug  (Info / I per chiudere) ──',
      '',
      `Provider:    ${settings.preferredProviderId}`,
      `Mode:        ${this.embedMode ? 'EMBED (iframe)' : 'NATIVE video'}`,
      `State:       ${playerService.getState()}`,
      `tizen.dl:    ${typeof window !== 'undefined' && window.tizen?.download ? 'yes' : 'no'}`,
      `streamProxy: ${settings.streamProxyEnabled ? settings.streamProxyUrl || '(vuoto)' : 'off'}`,
      '',
      `Source type: ${src?.type ?? '—'}`,
      `Source url:  ${src ? truncateUrl(src.url, 80) : '—'}`,
      `Source lbl:  ${src?.label ?? '—'}`,
      '',
      `video.src:   ${truncateUrl(v.src || '—', 80)}`,
      `networkState:${networkState[v.networkState] ?? v.networkState}`,
      `readyState:  ${readyState[v.readyState] ?? v.readyState}`,
      `paused:      ${v.paused}`,
      `currentTime: ${v.currentTime.toFixed(1)}s`,
      `duration:    ${Number.isFinite(v.duration) ? v.duration.toFixed(1) + 's' : '—'}`,
      `error:       ${videoError ?? 'none'}`,
      '',
      '── Recent logs ──',
      ...debugLog.list(20).reverse().map((e) => {
        const t = new Date(e.at).toISOString().slice(11, 19);
        const data = e.data !== undefined
          ? ' ' + JSON.stringify(e.data).slice(0, 80)
          : '';
        return `${t} [${e.channel}/${e.level[0].toUpperCase()}] ${e.message}${data}`;
      }),
    ];

    this.debugOverlay.textContent = lines.join('\n');
  }
}

function truncateUrl(url: string, n: number): string {
  return url.length > n ? url.slice(0, n) + '…' : url;
}

function svgEl(tag: string, attrs: Record<string, string> = {}): SVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function iconSvg(...children: SVGElement[]): SVGSVGElement {
  const svg = svgEl('svg', {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    class: 'player-control__icon',
    fill: 'currentColor',
  }) as SVGSVGElement;
  for (const child of children) svg.appendChild(child);
  return svg;
}

function iconPlay(): SVGSVGElement {
  return iconSvg(svgEl('path', { d: 'M8 5v14l11-7z' }));
}

function iconPause(): SVGSVGElement {
  return iconSvg(
    svgEl('path', { d: 'M6 5h4v14H6z' }),
    svgEl('path', { d: 'M14 5h4v14h-4z' }),
  );
}

function iconSkipBack(): SVGSVGElement {
  return iconSvg(
    svgEl('path', { d: 'M19 5.5v13L10.5 12 19 5.5z' }),
    svgEl('path', { d: 'M11 5.5v13L2.5 12 11 5.5z' }),
  );
}

function iconSkipForward(): SVGSVGElement {
  return iconSvg(
    svgEl('path', { d: 'M5 5.5v13l8.5-6.5L5 5.5z' }),
    svgEl('path', { d: 'M13 5.5v13l8.5-6.5L13 5.5z' }),
  );
}

function iconNextEpisode(): SVGSVGElement {
  return iconSvg(
    svgEl('path', { d: 'M6 5.5v13l8.5-6.5L6 5.5z' }),
    svgEl('path', { d: 'M16 5h2v14h-2z' }),
  );
}
