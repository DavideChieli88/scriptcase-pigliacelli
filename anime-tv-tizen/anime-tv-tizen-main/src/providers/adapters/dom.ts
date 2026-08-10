import { stripHtml } from '@/utils/sanitize';

/** Safe HTML → Document (never execute scripts). */
export function parseHtmlDocument(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

export function textOf(el: Element | null | undefined): string {
  if (!el) return '';
  return stripHtml(el.textContent || '').trim();
}

export function attrOf(el: Element | null | undefined, name: string): string {
  if (!el) return '';
  return (el.getAttribute(name) || '').trim();
}

/**
 * Join adapter `baseUrl` with a path/href.
 * Handles Vite same-origin proxies (`/__as/`) where `new URL(path, '/__as/')` would throw,
 * and preserves the proxy prefix when `path` is root-absolute (`/anime/...`).
 */
export function joinAdapterUrl(path: string, baseUrl: string): string {
  const trimmed = path.trim();
  if (!trimmed) return baseUrl;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const origin =
    typeof location !== 'undefined' && location?.origin
      ? location.origin
      : 'http://localhost';

  let absoluteBase: URL;
  try {
    absoluteBase = new URL(baseUrl, `${origin}/`);
  } catch {
    absoluteBase = new URL(origin);
  }

  if (trimmed.startsWith('//')) {
    return `${absoluteBase.protocol}${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    // Avoid `new URL('/x', 'http://host/__as/')` → `http://host/x` (drops proxy prefix).
    const prefix = absoluteBase.pathname.replace(/\/$/, '');
    return `${absoluteBase.origin}${prefix}${trimmed}`;
  }

  const baseHref = absoluteBase.href.endsWith('/') ? absoluteBase.href : `${absoluteBase.href}/`;
  return new URL(trimmed, baseHref).href;
}

/** Resolve possibly-relative URL against adapter baseUrl. */
export function absolutizeUrl(href: string | undefined, baseUrl: string): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (!trimmed) return undefined;
  try {
    return joinAdapterUrl(trimmed, baseUrl);
  } catch {
    return undefined;
  }
}

export function queryAll(doc: ParentNode, selector: string): Element[] {
  try {
    return Array.from(doc.querySelectorAll(selector));
  } catch {
    return [];
  }
}

export function queryOne(doc: ParentNode, selector: string): Element | null {
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}
