import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stress-break-test-'));
const port = 30000 + crypto.randomInt(10000);
const base = `http://127.0.0.1:${port}`;
fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify({
  old_one: { username: 'old_one', passwordHash: 'secret-hash', salt: 'secret-salt', points: 120, total: 250, hits: 15, owned: ['foam', 'glove'], equipped: 'glove', modeHits: { boss: 15 }, today: '', todayPoints: 0 },
  old_two: { username: 'old_two', passwordHash: 'another-secret', points: 33, total: 80, hits: 8, owned: ['foam'], equipped: 'foam', modeHits: { paper: 8 } }
}));
const server = spawn(process.execPath, ['server.js'], { cwd: path.resolve(import.meta.dirname, '..'), env: { ...process.env, PORT: String(port), DATA_DIR: dataDir }, stdio: 'ignore' });
try {
  for (let i = 0; i < 50; i++) {
    try { await fetch(base); break; } catch { await new Promise(resolve => setTimeout(resolve, 50)); }
  }
  const page = await fetch(base);
  assert.equal(page.status, 200);
  const markup = await page.text();
  assert.match(markup, /로컬 기록/);
  assert.match(markup, /music-toggle/);
  assert.match(markup, /effects-toggle/);
  const script = await fetch(`${base}/app.js`);
  assert.equal(script.status, 200);
  assert.match(await script.text(), /localStorage/);
  const audio = await fetch(`${base}/audio.js`);
  assert.equal(audio.status, 200);
  assert.match(await audio.text(), /class AudioEngine/);
  const legacy = await fetch(`${base}/api/legacy-progress`);
  assert.equal(legacy.status, 200);
  const body = await legacy.json();
  assert.equal(body.records.length, 2);
  assert.equal(body.records[0].points, 120);
  assert.equal(body.records[0].equipped, 'glove');
  assert.equal(body.records[1].points, 33);
  assert.ok(!JSON.stringify(body).includes('secret'));
  assert.ok(!JSON.stringify(body).includes('old_one'));
  assert.equal((await fetch(`${base}/api/action`, { method: 'POST' })).status, 405);
  console.log('Integration checks passed: static game, local storage code, audio, legacy import, no account API.');
} finally {
  server.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
