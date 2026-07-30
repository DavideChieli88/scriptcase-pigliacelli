import type { AppContext } from '../../app/context';
import { createTopNav } from '../components/TopNav';
import { logger } from '../../core/logging/Logger';

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
    const preferredLabel =
      providers.find((p) => p.id === settings.preferredProviderId)?.name ?? settings.preferredProviderId;

    const items: HTMLElement[] = [];

    items.push(
      row('Provider preferito (Home/Cerca)', preferredLabel, 'set-provider', async () => {
        const enabled = providers.filter((p) => p.enabled);
        const idx = enabled.findIndex((p) => p.id === settings.preferredProviderId);
        const next = enabled[(idx + 1) % Math.max(enabled.length, 1)];
        if (next) await ctx.persistence.settings.update({ preferredProviderId: next.id });
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
          const next = settings.completionThreshold >= 0.95 ? 0.8 : Math.min(0.95, settings.completionThreshold + 0.05);
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
      row('Proxy URL (AnimeSaturn)', settings.proxyBaseUrl, 'set-proxy', async () => {
        const next = window.prompt(
          'Proxy base URL per AnimeSaturn (AnimeUnity non lo usa). Es. http://192.168.1.8:8787',
          settings.proxyBaseUrl,
        );
        if (next != null && next.trim()) {
          await ctx.persistence.settings.update({ proxyBaseUrl: next.trim() });
          ctx.http.setProxyBaseUrl(next.trim());
        }
        await refresh();
      }),
    );

    items.push(
      row('Pulisci cache', 'Esegui', 'set-cache', async () => {
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

    for (const p of providers) {
      items.push(
        row(`Provider ${p.name}`, p.enabled ? 'Abilitato' : 'Disabilitato', `set-p-${p.id}`, async () => {
          p.enabled = !p.enabled;
          await ctx.persistence.providerState.setEnabled(p.id, p.enabled);
          await refresh();
        }),
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
