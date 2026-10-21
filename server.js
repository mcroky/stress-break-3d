import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const legacyFile = path.join(dataDir, 'users.json');
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const itemIds = ['foam', 'glove', 'bat', 'meteor'];

function sendJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
function safeProgress(record) {
  const owned = Array.isArray(record.owned) ? record.owned.filter(id => itemIds.includes(id)) : [];
  if (!owned.includes('foam')) owned.unshift('foam');
  return {
    points: Math.max(0, Number(record.points) || 0),
    total: Math.max(0, Number(record.total) || 0),
    hits: Math.max(0, Number(record.hits) || 0),
    owned,
    equipped: owned.includes(record.equipped) ? record.equipped : 'foam',
    modeHits: Object.fromEntries(['boss', 'paper', 'desk', 'laptop'].map(mode => [mode, Math.max(0, Number(record.modeHits?.[mode]) || 0)])),
    today: typeof record.today === 'string' ? record.today : '',
    todayPoints: Math.max(0, Number(record.todayPoints) || 0)
  };
}
function legacyRecords() {
  if (!fs.existsSync(legacyFile)) return [];
  try {
    const users = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
    return Object.values(users).map(safeProgress);
  } catch { return []; }
}

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { return sendJson(res, 400, { error: '잘못된 주소입니다.' }); }
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: '허용되지 않은 요청입니다.' });
  if (pathname === '/api/legacy-progress') return sendJson(res, 200, { records: legacyRecords() });
  if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: '없는 기능입니다.' });
  const file = path.resolve(publicDir, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(publicDir + path.sep)) return sendJson(res, 403, { error: '접근할 수 없습니다.' });
  fs.readFile(file, (error, content) => {
    if (error) return sendJson(res, 404, { error: '파일을 찾을 수 없습니다.' });
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
});
server.listen(port, '127.0.0.1', () => console.log(`스트레스 브레이크: http://localhost:${port}`));
