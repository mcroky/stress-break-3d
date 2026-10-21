import { AudioEngine } from './audio.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const modes = {
  boss: { title: '상사 인형 때리기', description: '마음속 말을 담아 펀치! 가상 인형이니까 걱정 없이.', rate: 10, impact: 'POW!', color: '#d9ff76', animation: 'hit' },
  paper: { title: '서류 찢기', description: '끝없는 결재 서류를 시원하게 찢어버려요.', rate: 8, impact: 'RIP!', color: '#ffb3cc', animation: 'rip' },
  desk: { title: '책상 엎기', description: '어질러진 물건과 함께 답답함도 날려요.', rate: 12, impact: 'FLIP!', color: '#c7adff', animation: 'flip' },
  laptop: { title: '노트북 부수기', description: '끝나지 않는 업무는 오늘만큼은 강제 종료!', rate: 14, impact: 'CRASH!', color: '#8ceddb', animation: 'smash' }
};
const extraItems = [
  ['레몬 팡팡 망치', '🍋', 'foam'], ['구름 펀치', '☁️', 'glove'], ['캔디 스틱', '🍭', 'bat'],
  ['별가루 해머', '⭐', 'meteor'], ['딸기 쿠션 망치', '🍓', 'foam'], ['번개 글러브', '⚡', 'glove'],
  ['네온 배트', '🌈', 'bat'], ['달빛 해머', '🌙', 'meteor'], ['젤리 망치', '🍬', 'foam'],
  ['로켓 펀치', '🚀', 'glove'], ['소다 배트', '🥤', 'bat'], ['코멧 해머', '💫', 'meteor'],
  ['도넛 망치', '🍩', 'foam'], ['용암 글러브', '🌋', 'glove'], ['홀로그램 배트', '🔮', 'bat'],
  ['오로라 해머', '🌌', 'meteor'], ['솜사탕 망치', '🍬', 'foam'], ['태풍 글러브', '🌪️', 'glove'],
  ['디스코 배트', '🪩', 'bat'], ['태양 해머', '☀️', 'meteor'], ['복숭아 망치', '🍑', 'foam'],
  ['슈퍼노바 펀치', '✨', 'glove'], ['사파이어 배트', '💎', 'bat'], ['은하수 해머', '🌠', 'meteor'],
  ['마카롱 망치', '🧁', 'foam'], ['플라즈마 글러브', '🔥', 'glove'], ['루비 배트', '❤️', 'bat'],
  ['블랙홀 해머', '🕳️', 'meteor'], ['버블 망치', '🫧', 'foam'], ['크리스털 펀치', '🧊', 'glove'],
  ['황금 배트', '🏆', 'bat'], ['천둥 해머', '🌩️', 'meteor'], ['판다 쿠션 망치', '🐼', 'foam'],
  ['드래곤 글러브', '🐉', 'glove'], ['프리즘 배트', '🔷', 'bat'], ['피닉스 해머', '🪶', 'meteor'],
  ['행운 망치', '🍀', 'foam'], ['챔피언 펀치', '🏅', 'glove'], ['왕관 배트', '👑', 'bat'],
  ['우주왕 해머', '🪐', 'meteor'], ['드림 망치', '💭', 'foam'], ['무지개 폭풍 글러브', '🌈', 'glove'],
  ['전설의 배트', '🏏', 'bat'], ['별빛 폭발 해머', '💥', 'meteor'], ['초월 쿠션 망치', '🎇', 'foam'],
  ['궁극의 스트레스 브레이커', '🌟', 'meteor']
];
const shop = {
  foam: { name: '폭신 망치', icon: '🔨', style: 'foam', hue: 0, price: 0, bonus: 0 },
  glove: { name: '파워 글러브', icon: '🥊', style: 'glove', hue: 0, price: 180, bonus: 2 },
  bat: { name: '무지개 배트', icon: '🏏', style: 'bat', hue: 0, price: 480, bonus: 5 },
  meteor: { name: '메테오 해머', icon: '☄️', style: 'meteor', hue: 0, price: 950, bonus: 10 },
  ...Object.fromEntries(extraItems.map(([name, icon, style], index) => [
    `item${index + 5}`,
    { name, icon, style, hue: (index * 47 + 35) % 360, price: 1150 + index * 170 + index * index * 35, bonus: 12 + Math.floor(index * 1.6) }
  ]))
};
const changelog = [
  { version: '1.4.1', date: '2026.10.21', changes: ['상단에 로키 스튜디오로 돌아가기 버튼 추가'] },
  { version: '1.4.0', date: '2026.10.21', changes: ['상점 아이템을 50종으로 확대', '상위 아이템일수록 가격과 액션 포인트 보너스 증가', '새 아이템의 색상별 타격 연출과 효과음 추가'] },
  { version: '1.3.0', date: '2026.10.21', changes: ['빠른 아케이드 비트 배경음 추가', '장면과 장착 도구에 맞는 효과음 추가', '배경음과 효과음을 각각 켜고 끄는 설정 추가'] },
  { version: '1.2.0', date: '2026.10.21', changes: ['로그인 없이 바로 플레이', '포인트·아이템·기록을 브라우저에 자동 저장', '이전 계정 기록 선택 가져오기'] },
  { version: '1.1.0', date: '2026.10.21', changes: ['인형 얼굴의 멍 누적', '서류가 찢어진 조각으로 남는 연출', '장착 아이템의 타격 모션', '책상과 노트북의 손상 단계'] },
  { version: '1.0.0', date: '2026.10.21', changes: ['네 가지 3D 스트레스 해소 장면', '콤보와 포인트', '아이템 상점'] }
];
const storageKey = 'stress-break-progress-v1';
const audio = new AudioEngine();
function freshProgress() { return { points: 0, total: 0, hits: 0, owned: ['foam'], equipped: 'foam', modeHits: { boss: 0, paper: 0, desk: 0, laptop: 0 }, today: '', todayPoints: 0 }; }
function normalizeProgress(value) {
  const base = freshProgress();
  if (!value || typeof value !== 'object') return base;
  const owned = Array.isArray(value.owned) ? value.owned.filter(id => id in shop) : [];
  if (!owned.includes('foam')) owned.unshift('foam');
  const amount = number => Number.isFinite(Number(number)) ? Math.max(0, Math.floor(Number(number))) : 0;
  return { points: amount(value.points), total: amount(value.total), hits: amount(value.hits), owned, equipped: owned.includes(value.equipped) ? value.equipped : 'foam', modeHits: Object.fromEntries(Object.keys(modes).map(id => [id, amount(value.modeHits?.[id])])), today: typeof value.today === 'string' ? value.today : '', todayPoints: amount(value.todayPoints) };
}
function loadProgress() {
  try { return normalizeProgress(JSON.parse(localStorage.getItem(storageKey))); }
  catch { return freshProgress(); }
}
function saveProgress() {
  try { localStorage.setItem(storageKey, JSON.stringify(user)); }
  catch { toast('브라우저 저장소를 사용할 수 없습니다.'); }
}
const maxDamage = { boss: 6, paper: 4, desk: 4, laptop: 5 };
const damageNames = { boss: '멍', paper: '찢김', desk: '흩어진 물건', laptop: '균열' };
const sceneDamage = { boss: 0, paper: 0, desk: 0, laptop: 0 };
let user = loadProgress();
let legacyRecords = [];
let mode = 'boss';
let panel = null;
let rotateX = -7;
let rotateY = -19;
let dragging = null;
let lastAction = 0;
let combo = 0;
let toastTimer;
let particles = [];
const canvas = $('#particle-canvas');
const ctx = canvas.getContext('2d');

function format(number) { return Number(number || 0).toLocaleString('ko-KR'); }
function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.add('hidden'), 2400);
}
function box(extra = '') { return `<div class="box3d ${extra}"><div class="face front"></div><div class="face back"></div><div class="face left"></div><div class="face right"></div><div class="face top"></div><div class="face bottom"></div></div>`; }
const scenes = {
  boss: `<div class="object dummy" id="main-object"><div class="object dummy-hair"></div><div class="object dummy-head"><i class="bruise bruise-left"></i><i class="bruise bruise-right"></i><i class="bruise bruise-cheek"></i><i class="bruise bruise-forehead"></i></div><div class="object dummy-face"><span>•</span><span>•</span></div><div class="object dummy-neck"></div>${box('dummy-torso')}<div class="object dummy-shirt"></div><div class="object dummy-tie"></div><div class="object dummy-arm left"><div class="dummy-hand"></div></div><div class="object dummy-arm right"><div class="dummy-hand"></div></div><div class="object dummy-leg left"><div class="dummy-shoe"></div></div><div class="object dummy-leg right"><div class="dummy-shoe"></div></div><div class="dummy-nameplate">BOSS DUMMY<span>100% VIRTUAL</span></div></div>`,
  paper: `<div class="object paper-stack" id="main-object"><div class="paper-sheet"><div class="paper-lines"></div><div class="paper-stamp">DONE!</div></div><div class="paper-tear-line"></div><div class="paper-piece piece-a">CONFIDENTIAL</div><div class="paper-piece piece-b"></div><div class="paper-piece piece-c"></div><div class="paper-piece piece-d">DONE!</div><div class="paper-piece piece-e"></div><div class="paper-piece piece-f"></div>${Array.from({ length: 14 }, (_, i) => `<i class="paper-debris" style="--x:${(i % 7) * 29 - 87}px;--y:${Math.floor(i / 7) * 31 + (i % 3) * 8}px;--r:${i * 43 - 110}deg"></i>`).join('')}</div>`,
  desk: `<div class="object desk-assembly" id="main-object">${box('desk-top')}${box('desk-leg one')}${box('desk-leg two')}${box('desk-leg three')}${box('desk-leg four')}<div class="object desk-mug"></div>${box('desk-book')}<div class="object desk-pencil"></div>${box('desk-screen')}</div>`,
  laptop: `<div class="object laptop-assembly" id="main-object">${box('laptop-base')}${box('laptop-display')}<div class="laptop-crack crack-one"></div><div class="laptop-crack crack-two"></div><div class="laptop-crack crack-three"></div></div>`
};
function applyDamage() {
  const object = $('#main-object');
  if (object) object.dataset.damage = String(sceneDamage[mode]);
  $('#damage-label').textContent = `${damageNames[mode]} ${sceneDamage[mode]} / ${maxDamage[mode]}`;
  $('#reset-button').textContent = mode === 'paper' ? '새 서류 ↺' : mode === 'boss' ? '새 인형 ↺' : mode === 'desk' ? '책상 정리 ↺' : '새 노트북 ↺';
}
function renderScene() {
  $('#scene-content').innerHTML = scenes[mode];
  $('#mode-title').textContent = modes[mode].title;
  $('#mode-description').textContent = modes[mode].description;
  $('#mode-rate').textContent = `+${modes[mode].rate + (shop[user?.equipped]?.bonus || 0)} PT / HIT`;
  $$('.scene-link').forEach(link => link.classList.toggle('active', link.dataset.mode === mode));
  $('#combo-display').textContent = '';
  rotateX = -7;
  rotateY = -19;
  updateRotation();
  applyDamage();
}
function updateRotation() { $('#orbit-scene').style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`; }
function renderUser() {
  $('#header-points').textContent = format(user.points);
  $('#stat-points').textContent = format(user.points);
  $('#stat-total').textContent = format(user.total);
  $('#stat-hits').textContent = format(user.hits);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  $('#stat-today').textContent = format(user.today === today ? user.todayPoints : 0);
  $('#tool-icon').textContent = shop[user.equipped]?.icon || '🔨';
  $('#tool-name').textContent = shop[user.equipped]?.name || '폭신 망치';
  $('#mode-rate').textContent = `+${modes[mode].rate + (shop[user.equipped]?.bonus || 0)} PT / HIT`;
  if (panel === 'shop') renderShop();
}
function renderAudioControls() {
  for (const [id, enabled, label] of [['music-toggle', audio.musicEnabled, '배경음'], ['effects-toggle', audio.effectsEnabled, '효과음']]) {
    const button = $(`#${id}`);
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', `${label} ${enabled ? '켜짐' : '꺼짐'}`);
  }
}
function openPanel(name) {
  panel = name;
  $('#panel-modal').classList.remove('hidden');
  $('#panel-title').textContent = name === 'shop' ? '아이템 상점' : name === 'import' ? '기존 기록 가져오기' : '업데이트 내역';
  if (name === 'shop') renderShop(); else if (name === 'import') renderImport(); else renderHistory();
}
function closePanel() { panel = null; $('#panel-modal').classList.add('hidden'); }
function renderShop() {
  $('#panel-content').innerHTML = `<div class="shop-wallet"><span>내 보유 포인트</span><b>✦ ${format(user.points)} PT</b></div><div class="shop-progress">아이템 ${Object.keys(shop).length}종 · 보유 ${user.owned.length}종</div><div class="shop-list">${Object.entries(shop).map(([id, item], index) => {
    const owned = user.owned.includes(id);
    const equipped = user.equipped === id;
    const label = equipped ? '장착 중' : owned ? '장착하기' : `${format(item.price)} PT`;
    return `<div class="shop-item"><div class="shop-symbol">${item.icon}</div><div class="shop-details"><strong><span class="shop-rank">#${index + 1}</span> ${item.name}</strong><small>${item.bonus ? `액션마다 +${item.bonus} 포인트` : '기본 아이템 · 편안한 타격감'}</small></div><button data-item="${id}" data-task="${owned ? 'equip' : 'buy'}" ${equipped || (!owned && user.points < item.price) ? 'disabled' : ''}>${label}</button></div>`;
  }).join('')}</div>`;
}
function renderHistory() {
  $('#panel-content').innerHTML = changelog.map(entry => `<div class="history-entry"><div class="history-version">v${entry.version}<span>${entry.date}</span></div><ul>${entry.changes.map(change => `<li>${change}</li>`).join('')}</ul></div>`).join('');
}
function renderImport() {
  $('#panel-content').innerHTML = `<p class="import-intro">이전에 저장된 기록 ${legacyRecords.length}개를 찾았습니다. 가져올 기록 하나를 선택하면 현재 브라우저의 포인트와 아이템을 그 기록으로 바꿉니다.</p>${legacyRecords.map((record, index) => `<div class="import-item"><div><strong>기존 기록 ${index + 1}</strong><small>보유 ${format(record.points)} PT · 누적 ${format(record.total)} PT · 액션 ${format(record.hits)}회</small></div><button data-import="${index}">가져오기</button></div>`).join('')}`;
}
function resizeCanvas() {
  const bounds = $('#arena').getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
function burst(x, y) {
  const width = $('#arena').clientWidth;
  const height = $('#arena').clientHeight;
  x ??= width / 2;
  y ??= height * .42;
  const palette = [modes[mode].color, '#ffffff', '#ffd681', '#bca9ff'];
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1.5, life: 28 + Math.random() * 14, size: 3 + Math.random() * 5, color: palette[i % palette.length], angle: Math.random() * 6 });
  }
  if (mode === 'paper') {
    for (let i = 0; i < 8; i++) {
      const shred = document.createElement('div');
      shred.className = 'paper-shred';
      shred.style.left = `${x + (Math.random() - .5) * 80}px`;
      shred.style.top = `${y + (Math.random() - .5) * 60}px`;
      shred.style.setProperty('--dx', `${(Math.random() - .5) * 260}px`);
      shred.style.setProperty('--dy', `${100 + Math.random() * 120}px`);
      shred.style.setProperty('--rot', `${(Math.random() - .5) * 550}deg`);
      $('#arena').append(shred);
      setTimeout(() => shred.remove(), 750);
    }
  }
}
function animateParticles() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy; p.vy += .18; p.vx *= .985; p.life--; p.angle += .1;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.globalAlpha = Math.min(1, p.life / 16); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5); ctx.restore();
  }
  requestAnimationFrame(animateParticles);
}
function playWeapon(tool) {
  const swing = $('#weapon-swing');
  swing.className = `weapon-swing tool-${mode === 'paper' ? 'tear' : mode === 'desk' ? 'push' : shop[tool].style}`;
  swing.style.setProperty('--tool-hue', `${shop[tool].hue}deg`);
  void swing.offsetWidth;
  swing.classList.add('swing');
}
function hitEffect(x, y, combo, tool) {
  const object = $('#main-object');
  const animation = modes[mode].animation;
  object.classList.remove(animation);
  void object.offsetWidth;
  object.classList.add(animation);
  const impact = $('#impact-text');
  impact.textContent = modes[mode].impact;
  impact.style.color = modes[mode].color;
  impact.classList.remove('show');
  void impact.offsetWidth;
  impact.classList.add('show');
  $('#combo-display').textContent = combo > 1 ? `${combo} COMBO ⚡` : '';
  playWeapon(tool);
  burst(x, y);
}
function action(x, y) {
  const now = Date.now();
  if (now - lastAction < 185) return;
  combo = now - lastAction < 2200 ? Math.min(combo + 1, 20) : 1;
  lastAction = now;
  const actionMode = mode;
  const tool = user.equipped;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (user.today !== today) { user.today = today; user.todayPoints = 0; }
  const earned = modes[actionMode].rate + shop[tool].bonus + Math.floor(combo / 5) * 2;
  user.points += earned;
  user.total += earned;
  user.todayPoints += earned;
  user.hits++;
  user.modeHits[actionMode]++;
  saveProgress();
  renderUser();
  sceneDamage[actionMode] = sceneDamage[actionMode] >= maxDamage[actionMode] ? 1 : sceneDamage[actionMode] + 1;
  applyDamage();
  hitEffect(x, y, combo, tool);
  try { audio.playAction(actionMode, shop[tool].style, combo); } catch (error) { console.warn('Sound unavailable:', error); }
}

$$('.scene-link').forEach(button => button.addEventListener('click', () => { mode = button.dataset.mode; renderScene(); }));
$('#music-toggle').addEventListener('click', () => { audio.setMusic(!audio.musicEnabled); renderAudioControls(); });
$('#effects-toggle').addEventListener('click', () => { audio.setEffects(!audio.effectsEnabled); renderAudioControls(); });
document.addEventListener('pointerdown', () => { try { audio.start(); } catch (error) { console.warn('Sound unavailable:', error); } }, { once: true });
$$('[data-panel]').forEach(button => button.addEventListener('click', () => openPanel(button.dataset.panel)));
$('#panel-close').addEventListener('click', closePanel);
$('#panel-modal').addEventListener('click', event => { if (event.target.id === 'panel-modal') closePanel(); });
$('#panel-content').addEventListener('click', event => {
  const importButton = event.target.closest('button[data-import]');
  if (importButton) {
    const record = legacyRecords[Number(importButton.dataset.import)];
    if (!record) return;
    if (user.hits > 0 && !window.confirm('현재 브라우저의 진행 상황을 기존 기록으로 바꿀까요?')) return;
    user = normalizeProgress(record);
    saveProgress();
    renderUser();
    renderScene();
    closePanel();
    toast('기존 기록을 이 브라우저로 가져왔어요!');
    return;
  }
  const button = event.target.closest('button[data-item]');
  if (!button || button.disabled) return;
  const item = button.dataset.item;
  if (!(item in shop)) return;
  if (button.dataset.task === 'buy') {
    if (user.owned.includes(item) || user.points < shop[item].price) return;
    user.points -= shop[item].price;
    user.owned.push(item);
  } else if (!user.owned.includes(item)) return;
  user.equipped = item;
  saveProgress();
  renderUser();
  toast(button.dataset.task === 'buy' ? '아이템을 구매하고 장착했어요!' : '아이템을 장착했어요!');
});
$('#profile-button').addEventListener('click', () => $('#profile-menu').classList.toggle('hidden'));
$('#import-button').addEventListener('click', () => { $('#profile-menu').classList.add('hidden'); openPanel('import'); });
$('#action-button').addEventListener('click', () => action());
$('#reset-button').addEventListener('click', () => { sceneDamage[mode] = 0; renderScene(); });
$('#arena').addEventListener('pointerdown', event => { dragging = { x: event.clientX, y: event.clientY, moved: false }; $('#arena').setPointerCapture(event.pointerId); });
$('#arena').addEventListener('pointermove', event => {
  if (!dragging) return;
  const dx = event.clientX - dragging.x;
  const dy = event.clientY - dragging.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragging.moved = true;
  if (dragging.moved) { rotateY = Math.max(-65, Math.min(65, rotateY + dx * .35)); rotateX = Math.max(-28, Math.min(25, rotateX - dy * .25)); updateRotation(); }
  dragging.x = event.clientX; dragging.y = event.clientY;
});
$('#arena').addEventListener('pointerup', event => {
  if (dragging && !dragging.moved) { const rect = $('#arena').getBoundingClientRect(); action(event.clientX - rect.left, event.clientY - rect.top); }
  dragging = null;
});
$('#arena').addEventListener('pointercancel', () => { dragging = null; });
$('#arena').addEventListener('keydown', event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); action(); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
window.addEventListener('resize', resizeCanvas);

function init() {
  let hadLocalSave = false;
  try { hadLocalSave = localStorage.getItem(storageKey) !== null; } catch {}
  resizeCanvas();
  animateParticles();
  renderScene();
  renderUser();
  renderAudioControls();
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
  fetch('/api/legacy-progress').then(response => response.json()).then(data => {
    legacyRecords = Array.isArray(data.records) ? data.records.map(normalizeProgress) : [];
    $('#import-button').classList.toggle('hidden', legacyRecords.length === 0);
    if (!hadLocalSave && legacyRecords.length === 1) {
      user = legacyRecords[0];
      saveProgress();
      renderUser();
      toast('이전 기록을 이 브라우저로 가져왔어요!');
    } else if (!hadLocalSave && legacyRecords.length > 1) {
      openPanel('import');
    }
  }).catch(() => {});
}
init();
window.addEventListener('storage', event => { if (event.key === storageKey) { user = loadProgress(); renderUser(); renderScene(); } });
