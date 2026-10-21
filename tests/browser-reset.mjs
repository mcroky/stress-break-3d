import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const browserPath = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'stress-break-browser-'));
const appPort = 31000 + crypto.randomInt(1000);
const debugPort = 32000 + crypto.randomInt(1000);
const server = spawn(process.execPath, ['server.js'], { cwd: path.resolve(import.meta.dirname, '..'), env: { ...process.env, PORT: String(appPort) }, stdio: 'ignore' });
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, `--remote-debugging-port=${debugPort}`, `http://127.0.0.1:${appPort}/`], { stdio: 'ignore' });
let socket;
let nextId = 0;
const pending = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(expression) {
  const id = ++nextId;
  const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
  const reply = await result;
  if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.text);
  return reply.result?.result?.value;
}
try {
  let tab;
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      tab = (await response.json()).find(item => item.type === 'page' && item.url.includes(`:${appPort}`));
      if (tab?.webSocketDebuggerUrl) break;
    } catch {}
    await sleep(100);
  }
  assert.ok(tab?.webSocketDebuggerUrl, 'Headless browser did not start');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message);
  };
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  for (let i = 0; i < 50 && !(await evaluate('Boolean(document.querySelector("#main-object"))')); i++) await sleep(100);
  for (const [mode, hits, finalStage] of [['boss', 18, 6], ['paper', 12, 4], ['desk', 16, 4], ['laptop', 20, 5]]) {
    await evaluate(`document.querySelector('[data-mode="${mode}"]').click()`);
    for (let i = 0; i < hits - 1; i++) {
      await evaluate('document.querySelector("#action-button").click()');
      await sleep(195);
    }
    assert.ok((await evaluate('Number(document.querySelector("#main-object").dataset.damage)')) < finalStage, `${mode}: final visual stage appeared early`);
    await evaluate('document.querySelector("#action-button").click()');
    const broken = await evaluate('({ wear: Number(document.querySelector("#main-object").dataset.wear), stage: Number(document.querySelector("#main-object").dataset.damage), hits: Number(document.querySelector("#stat-hits").textContent.replaceAll(",", "")) })');
    assert.equal(broken.wear, hits, `${mode}: full damage was not reached`);
    assert.equal(broken.stage, finalStage, `${mode}: final visual stage missing`);
    await sleep(195);
    await evaluate('document.querySelector("#action-button").click()');
    assert.equal(await evaluate('Number(document.querySelector("#stat-hits").textContent.replaceAll(",", ""))'), broken.hits, `${mode}: duplicate hit counted while resetting`);
    await sleep(1200);
    assert.equal(await evaluate('Number(document.querySelector("#main-object").dataset.wear)'), 0, `${mode}: target did not reset`);
  }
  console.log('Browser reset checks passed for all four targets.');
} finally {
  socket?.close();
  browser.kill();
  server.kill();
  await sleep(300);
  if (profile.startsWith(os.tmpdir() + path.sep)) fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
