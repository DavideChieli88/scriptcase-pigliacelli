#!/usr/bin/env node
/**
 * Deploy to webOS TV: ensure CORS proxy is up, then package + install + launch.
 * Also injects the current LAN IP into the build (VITE_PROXY_BASE_URL).
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROXY_PORT = Number(process.env.PORT || 8787);

function lanIPv4() {
  const preferred = [];
  const other = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (!addrs) continue;
    if (/tailscale|vethernet|loopback|docker|wsl/i.test(name)) continue;
    for (const a of addrs) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (a.address.startsWith('100.')) continue; // Tailscale CGNAT
      const entry = { name, address: a.address };
      if (/wi-?fi|wlan|ethernet|eth/i.test(name)) preferred.push(entry);
      else other.push(entry);
    }
  }
  return (preferred[0] || other[0])?.address || null;
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });
}

async function ensureProxy() {
  if (await portOpen(PROXY_PORT)) {
    console.log(`[deploy] proxy already listening on :${PROXY_PORT}`);
    return;
  }
  console.log(`[deploy] starting proxy on :${PROXY_PORT}`);
  const child = spawn(process.execPath, ['tools/cors-proxy/server.mjs'], {
    cwd: root,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, PORT: String(PROXY_PORT) },
  });
  child.unref();

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (await portOpen(PROXY_PORT)) {
      console.log(`[deploy] proxy ready`);
      return;
    }
  }
  console.warn(`[deploy] warning: proxy did not open :${PROXY_PORT} in time (continuing)`);
}

function runNpm(args, env = {}) {
  return new Promise((resolve, reject) => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npm, args, {
      cwd: root,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...env },
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(' ')} exited with ${code}`));
    });
  });
}

const ip = lanIPv4();
const proxyBase = ip ? `http://${ip}:${PROXY_PORT}` : `http://127.0.0.1:${PROXY_PORT}`;
console.log(`[deploy] LAN proxy URL → ${proxyBase}`);
if (!ip) {
  console.warn('[deploy] could not detect LAN IP — set proxy manually in TV Settings');
}

await ensureProxy();
await runNpm(['run', 'package:webos'], { VITE_PROXY_BASE_URL: proxyBase });
await runNpm(['run', 'install:webos']);
console.log(`[deploy] done. TV Settings proxy should be: ${proxyBase}`);
console.log('[deploy] (proxy keeps running in background)');
