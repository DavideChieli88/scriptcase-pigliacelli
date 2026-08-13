import type { AppContext } from '../../app/context';
import { createTopNav } from '../components/TopNav';
import { logger } from '../../core/logging/Logger';
import { isAnimeProviderId, isMovieProviderId } from '../../providers/failover';

function row(
  label: string,
  value: string,
  focusId: string,
  onActivate: () => void | Promise<void>,
): HTMLElement {
  const el = document.createElement('button');
  el.className = 'settings-row';
  el.dataset.focusId = focusId;
  el.innerHTML = `<span>${label}</span><span class="muted">${value}</span>`;
  el.addEventListener('click', () => void onActivate());
  return el;
}

export async function renderSettingsPage(ctx: AppContext, root: HTMLElement): Promise<void> {
  ctx.focus.clear();
  ctx.focus.setScope('settings');
  root.innerHTML = '';
  root.className = 'page settings-layout';

  root.appendChild(createTopNav('settings', ctx.focus, (name) => void ctx.router.navigate(name, {}, true)));

  const title = document.createElement('h1');
  title.className = 'details-title';
  title.textContent = 'Impostazioni';
  root.appendChild(title);

  const refresh = async () => {
    const settings = await ctx.persistence.settings.getOrCreate(ctx.config);
    const list = root.querySelectorAll('.settings-row');
    list.forEach((n) => n.remove());

    const providers = ctx.registry.list();
    const animeProviders = providers.filter((p) => isAnimeProviderId(p.id));
    const movieProviders = providers.filter((p) => isMovieProviderId(p.id));

    const preferredAnime =
      animeProviders.find((p) => p.id === settings.preferredProviderId)?.name ??
      settings.preferredProviderId;
    const preferredMovies =
      movieProviders.find((p) => p.id === settings.preferredMoviesProviderId)?.name ??
      settings.preferredMoviesProviderId;

    const items: HTMLElement[] = [];

    items.push(
      row('Provider preferito (Anime)', preferredAnime, 'set-provider', async () => {
        const enabled = animeProviders.filter((p) => p.enabled);
        const idx = enabled.findIndex((p) => p.id === settings.preferredProviderId);
        const next = enabled[(idx + 1) % Math.max(enabled.length, 1)];
        if (next) await ctx.persistence.settings.update({ preferredProviderId: next.id });
        await refresh();
      }),
    );

    items.push(
      row('Provider preferito (Film)', preferredMovies, 'set-movies-provider', async () => {
        const enabled = movieProviders.filter((p) => p.enabled);
        const idx = enabled.findIndex((p) => p.id === settings.preferredMoviesProviderId);
        const next = enabled[(idx + 1) % Math.max(enabled.length, 1)];
        if (next) await ctx.persistence.settings.update({ preferredMoviesProviderId: next.id });
        await refresh();
      }),
    );

    items.push(
      row('Autoplay prossimo episodio', settings.autoplayNext ? 'On' : 'Off', 'set-autoplay', async () => {
        await ctx.persistence.settings.update({ autoplayNext: !settings.autoplayNext });
        await refresh();
      }),
    );

    items.push(
      row(
        'Soglia completamento',
        `${Math.round(settings.completionThreshold * 100)}%`,
        'set-threshold',
        async () => {
          const next =
            settings.completionThreshold >= 0.95
              ? 0.8
              : Math.min(0.95, settings.completionThreshold + 0.05);
          await ctx.persistence.settings.update({ completionThreshold: next });
          ctx.progressTracker.setCompletionThreshold(next);
          await refresh();
        },
      ),
    );

    items.push(
      row('Modalità debug', settings.debugMode ? 'On' : 'Off', 'set-debug', async () => {
        const debugMode = !settings.debugMode;
        await ctx.persistence.settings.update({ debugMode });
        logger.setLevel(debugMode ? 'debug' : 'info');
        logger.setEnabled(true);
        await refresh();
      }),
    );

    items.push(
      row('Cronologia', settings.historyEnabled ? 'On' : 'Off', 'set-history', async () => {
        await ctx.persistence.settings.update({ historyEnabled: !settings.historyEnabled });
        await refresh();
      }),
    );

    items.push(
      row(
        'Proxy URL (opzionale)',
        settings.proxyBaseUrl || '(disattivo — solo diretto)',
        'set-proxy',
        async () => {
          const next = window.prompt(
            'Proxy LAN opzionale (fallback se il TV blocca CORS). Vuoto = solo diretto.\nEs. http://192.168.1.14:8787',
            settings.proxyBaseUrl,
          );
          if (next == null) {
            await refresh();
            return;
          }
          const trimmed = next.trim();
          await ctx.persistence.settings.update({ proxyBaseUrl: trimmed });
          ctx.http.setProxyBaseUrl(trimmed);
          await refresh();
        },
      ),
    );

    items.push(
      row('Pulisci cache catalogo', 'Esegui', 'set-cache', async () => {
        await ctx.persistence.cache.clear();
        await refresh();
      }),
    );

    items.push(
      row('Reset dati app', 'Esegui', 'set-reset', async () => {
        const ok = window.confirm('Cancellare cronologia, progresso, preferiti e cache?');
        if (!ok) return;
        await ctx.persistence.resetAll();
        await refresh();
      }),
    );

    for (const p of animeProviders) {
      items.push(
        row(
          `Anime · ${p.name}`,
          p.enabled ? 'Abilitato' : 'Disabilitato',
          `set-p-${p.id}`,
          async () => {
            p.enabled = !p.enabled;
            await ctx.persistence.providerState.setEnabled(p.id, p.enabled);
            await refresh();
          },
        ),
      );
    }

    for (const p of movieProviders) {
      items.push(
        row(
          `Film · ${p.name}`,
          p.enabled ? 'Abilitato' : 'Disabilitato',
          `set-p-${p.id}`,
          async () => {
            p.enabled = !p.enabled;
            await ctx.persistence.providerState.setEnabled(p.id, p.enabled);
            await refresh();
          },
        ),
      );
    }

    items.forEach((el, i) => {
      root.appendChild(el);
      const id = el.dataset.focusId!;
      ctx.focus.register({ id, el, group: 'settings', row: i, col: 0 });
    });

    ctx.focus.restoreOrFirst();
  };

  await refresh();
}
