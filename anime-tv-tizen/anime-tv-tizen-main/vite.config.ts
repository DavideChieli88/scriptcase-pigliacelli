import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import type { ProxyOptions } from 'vite';

/** Inject Referer for saturncdn playlist (browser cannot set Referer on fetch). */
function saturncdnProxy(): ProxyOptions {
  return {
    target: 'https://play.saturncdn.net',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/__sc/, ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        const embedRef = req.headers['x-embed-referer'];
        if (typeof embedRef === 'string' && embedRef) {
          proxyReq.setHeader('Referer', embedRef);
          proxyReq.setHeader('Origin', 'https://play.saturncdn.net');
        } else {
          proxyReq.setHeader('Referer', 'https://play.saturncdn.net/');
          proxyReq.setHeader('Origin', 'https://play.saturncdn.net');
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'chrome85',
    outDir: 'dist',
    sourcemap: true,
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/__as': {
        target: 'https://www.animesaturn.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/__as/, ''),
      },
      '/__sc': saturncdnProxy(),
    },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/__as': {
        target: 'https://www.animesaturn.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/__as/, ''),
      },
      '/__sc': saturncdnProxy(),
    },
  },
});
