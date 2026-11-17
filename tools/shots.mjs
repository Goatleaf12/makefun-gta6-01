// Solmar Bay — screenshot maker, written fresh in this session.
// Serves game/ on a local port, opens each staged shot in headless
// Chromium (Playwright, explicit executablePath: the 1.65.1 runner looks
// for chromium-1255 but this machine's cache holds chromium-1254),
// waits for the world to settle, and saves a 1280x800 JPEG per shot.
// Usage: node tools/shots.mjs [port] — writes screenshots/1-cover.jpg etc.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..'); // tools/ sits one level below the repo root
const gameDir = join(repo, 'game');
const shotsDir = join(repo, 'screenshots');
const port = Number(process.argv[2] || 8123);
const chromePath = `${process.env.HOME}/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome`;

const SHOTS = [
  { name: '1-cover.jpg', query: '?shot=cover&seed=1', settleMs: 600 },
  { name: '2-street.jpg', query: '?shot=street&seed=1', settleMs: 3500 },
  { name: '3-drive.jpg', query: '?shot=drive&seed=1', settleMs: 3500 },
  { name: '4-menu.jpg', query: '?shot=menu&seed=1', settleMs: 2500 },
];

mkdirSync(shotsDir, { recursive: true });

// Serve game/ with the repo's own static server (node serve.ts).
const server = spawn('node', ['serve.ts', '--port', String(port)], {
  cwd: repo,
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverReady = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('server did not start in 10s')), 10000);
  server.stdout.on('data', (chunk) => {
    if (String(chunk).includes(String(port))) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));
});

async function takeShots() {
  await serverReady;
  const browser = await chromium.launch({ executablePath: chromePath });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[page error]', msg.text());
  });
  page.on('pageerror', (err) => console.log('[page exception]', String(err)));
  for (const shot of SHOTS) {
    const url = `http://localhost:${port}/${shot.query}`;
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    // Wait until the game world exists, then let it run: cars roll,
    // police close in, the beacon pulses.
    await page.waitForFunction(() => window.__solmar !== undefined, null, { timeout: 15000 });
    await page.waitForTimeout(shot.settleMs ?? 3500);
    const state = await page.evaluate(() => {
      const w = window.__solmar;
      return w ? { state: w.state, wanted: w.police.wanted, money: w.money, mission: w.missions.current ? w.missions.current.id : null } : null;
    });
    console.log(shot.name, '->', JSON.stringify(state));
    await page.screenshot({ path: join(shotsDir, shot.name), type: 'jpeg', quality: 82 });
    // The gate caps each screenshot at 256 KiB: say the size out loud
    // now, while it is still cheap to fix, instead of at submit time.
    const bytes = statSync(join(shotsDir, shot.name)).size;
    console.log('saved', shot.name, `${(bytes / 1024).toFixed(1)} KiB${bytes > 262144 ? ' — OVER THE 256 KiB CAP' : ''}`);
  }
  await browser.close();
}

try {
  await takeShots();
} finally {
  server.kill();
}
console.log('done');
