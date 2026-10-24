// Assembly guide engine.
// Reads guide.json (written with the Guide Builder + make_guide.py) and renders the
// whole page: hero, kit, cut list, print queue with 3D previews, laser-cut boards and
// the scroll-driven, video-synced build. <main data-guide="path/to/folder/">.
// Animations use anime.js v4 when it loads; everything still works without it.

const ANIME_URL = 'https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.esm.min.js';
const MODEL_VIEWER_URL = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

// one quiet accent for every chapter (set in assembly-guide.css)
const CH_COLORS = ['var(--ag-accent)'];

const root = document.querySelector('[data-guide]');
const base = root.dataset.guide.replace(/\/?$/, '/');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let anime = null;
let guide, steps = [], chapters = [], chIndex = {};
let partUse = {};            // part key -> {qty, infill, steps:[i], chapter}
let current = -1;
let autoAdvance = false;
let repeat = (() => { try { return localStorage.getItem('assembly-guide:repeat') === 'on'; } catch (e) { return false; } })();   // off unless the visitor turned it on
let atEnd = false;           // repeat off: the step played once and is resting on its last frame
let userPaused = false;
let seekTimer = null;
let ownScroll = false, ownScrollIdle = null;   // true while a scroll we started (go to step / snap) is still moving

// ---------- text helpers ----------
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function safeUrl(u) { u = String(u || '').trim(); return /^(https?:\/\/|\/|\.{0,2}\/|#|mailto:)/i.test(u) || /^[\w\-.\/ %]+$/.test(u) ? u : null; }
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
    const u = safeUrl(url.replace(/&amp;/g, '&'));
    return u ? `<a href="${esc(u)}"${/^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : ''}>${txt}</a>` : txt;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  return s;
}
function md(src) {
  if (!src || !String(src).trim()) return '';
  return String(src).replace(/\r/g, '').split(/\n\s*\n/).map(b => {
    const lines = b.split('\n').filter(l => l.trim());
    if (lines.length && lines.every(l => /^\s*[-*•]\s+/.test(l)))
      return '<ul>' + lines.map(l => `<li>${inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('') + '</ul>';
    if (lines.length && lines.every(l => /^\s*\d+[.)]\s+/.test(l)))
      return '<ol>' + lines.map(l => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('') + '</ol>';
    return '<p>' + lines.map(inline).join('<br>') + '</p>';
  }).join('');
}
const pad = (n) => String(n).padStart(2, '0');
const fmt = (t) => { const m = Math.floor(t / 60); return `${m}:${pad(Math.floor(t - m * 60))}`; };
const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
const partOf = (key) => (guide.parts || {})[key];
const thumbUrl = (key) => partOf(key) ? `${base}parts/${partOf(key).slug}.webp` : '';
const glbUrl = (key) => partOf(key) ? `${base}parts/${partOf(key).slug}.glb` : '';
const cutUrl = (key) => partOf(key) ? `${base}cuts/${partOf(key).slug}.svg` : '';
// CAD files live in their own repo (guide.cadBase); each link opens the file's page there,
// which has a download button (and a 3D viewer for STL)
const FORMATS = [['step', 'STEP'], ['stl', 'STL'], ['f3d', 'Fusion'], ['dxf', 'DXF']];
const fileUrl = (name) => (guide.cadBase || base) + name.split('/').map(encodeURIComponent).join('/');
const fileLinks = (files, cls = '') => FORMATS.filter(([f]) => files && files[f])
  .map(([f, label]) => `<a class="${cls}" href="${fileUrl(files[f])}" target="_blank" rel="noopener" title="${esc(files[f])}: open on GitHub to download">${label} ↗</a>`).join('');
const chColor = (id) => CH_COLORS[(chIndex[id] ?? 0) % CH_COLORS.length];
const dims = (d) => d ? d.map(v => Math.round(v)).join(' × ') + ' mm' : '';

// ---------- per-visitor progress (this browser only) ----------
function store(key) {
  const k = 'assembly-guide:' + base + key;
  let set;
  try { set = new Set(JSON.parse(localStorage.getItem(k) || '[]')); } catch (e) { set = new Set(); }
  return { has: v => set.has(v), toggle(v, on) { on ? set.add(v) : set.delete(v); try { localStorage.setItem(k, JSON.stringify([...set])); } catch (e) {} }, get size() { return set.size; } };
}
const done = store(':done');
const printed = store(':printed');

// ---------- data prep ----------
function prepare(data) {
  guide = data;
  steps = (guide.steps || []).slice().sort((a, b) => a.start - b.start);
  chapters = guide.chapters?.length ? guide.chapters : [...new Set(steps.map(s => s.phase || 'Build'))].map(t => ({ id: t, title: t }));
  chapters.forEach((c, i) => chIndex[c.id] = i);
  steps.forEach(s => { s.chapter = s.chapter || s.phase || chapters[0].id; });
  partUse = {};
  steps.forEach((s, i) => (s.prints || []).forEach(p => {
    const u = partUse[p.part] || (partUse[p.part] = { qty: 0, infill: null, steps: [], chapter: s.chapter, note: null });
    if (!p.fit) u.qty += p.qty || 1;
    if (p.infill) u.infill = p.infill;
    if (p.note) u.note = p.note;
    if (!u.steps.includes(i)) u.steps.push(i);
  }));
  Object.values(partUse).forEach(u => { if (!u.qty) u.qty = 1; });
}

// ---------- render: hero ----------
function splitChars(text) {
  return esc(text).split(' ').map(w => `<span class="ag-word">${[...w].map(c => `<span class="ag-char">${c}</span>`).join('')}</span>`).join(' ');
}
function renderHero() {
  document.title = `${guide.title || 'Assembly Guide'} - Tanvir Ahmed`;
  $('#agTitle').innerHTML = splitChars(guide.title || 'Assembly Guide');
  $('#agSubtitle').textContent = guide.subtitle || '';
  const cover = $('#agCover'), fin = $('#agFinal');
  cover.src = base + 'img/cover.jpg';
  fin.src = base + 'img/final.jpg';
  [cover, fin].forEach(img => img.onerror = () => img.closest('figure').classList.add('ag-hidden'));
}

function renderChapters() {
  $('#agChapters').innerHTML = chapters.map((c, i) => {
    const inCh = steps.map((s, j) => [s, j]).filter(([s]) => s.chapter === c.id);
    if (!inCh.length) return '';
    const cover = steps[(c.cover || 0) - 1] || inCh[inCh.length - 1][0], first = inCh[0][1];
    return `<button class="ag-chcard" data-goto="${first}" style="--ch:${chColor(c.id)}">
      <img src="${base}thumbs/${encodeURIComponent(cover.id)}.jpg" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <div><b>${pad(i + 1)} · ${inCh.length} steps</b><h3>${esc(c.title)}</h3><span>${esc(c.summary || '')}</span></div></button>`;
  }).join('');
}

function renderOverview() {
  const intro = md(guide.intro), notes = md(guide.notes);
  $('#agIntroText').innerHTML = intro;
  $('#agNotesText').innerHTML = notes;
  $('#agIntroCard').classList.toggle('ag-hidden', !intro);
  $('#agNotesCard').classList.toggle('ag-hidden', !notes);
  $('#overview').classList.toggle('ag-hidden', !intro && !notes);
}

// ---------- render: kit ----------
function kitTabs() {
  const k = guide.kit || {};
  const hw = Object.entries(guide.hardware || {}).map(([id, h]) => ({ name: h.name, note: h.spec, img: h.img }));
  const groups = [['Tools', k.tools], ['Hardware', hw], ['Electronics', k.electronics], ['Materials', k.materials]]
    .filter(([, list]) => list && list.length);
  // "All" shows every group at once; the PC parts list stays on its own tab
  const all = ['All', groups.flatMap(([, list]) => list), groups];
  return [all, ...groups, ['Computer', k.computer]].filter(([, list]) => list && list.length);
}
const kitCards = (list) => `<div class="ag-kit">${list.map(x => `<div class="ag-kitcard">
    <figure>${x.img ? `<img src="${base}${esc(x.img)}" alt="" loading="lazy">` : `<span class="noimg">${esc(x.name.slice(0, 1))}</span>`}${x.qty ? `<span class="q">×${x.qty}</span>` : ''}</figure>
    <div><h4>${esc(x.name)}</h4>${x.note ? `<p>${esc(x.note)}</p>` : ''}</div></div>`).join('')}</div>`;
function renderKit(tab = 0) {
  const tabs = kitTabs();
  if (!tabs.length) { $('#kit').classList.add('ag-hidden'); return; }
  $('#agKitTabs').innerHTML = tabs.map(([n, list], i) => `<button class="ag-tab ${i === tab ? 'on' : ''}" data-kit="${i}" role="tab" aria-selected="${i === tab}">${n}<b>${list.length}</b></button>`).join('');
  const [name, list, groups] = tabs[tab];
  if (name === 'Computer') {
    $('#agKitBody').innerHTML = `<p class="ag-lede" style="margin-bottom:1.2rem">Our build. Any Mini-ITX system fits the same mounts.</p>${kitCards(list.map(x => typeof x === 'string' ? { name: x } : x))}`;
  } else if (groups) {
    $('#agKitBody').innerHTML = groups.map(([g, l]) => `<div class="ag-kit-group"><h3>${esc(g)} <b>${l.length}</b></h3><div class="ag-kitlist">${l.map(x => `<div class="ag-kitrow">
        <span class="th">${x.img ? `<img src="${base}${esc(x.img)}" alt="" loading="lazy">` : esc(x.name.slice(0, 1))}</span>
        <span class="tx"><b>${esc(x.name)}${x.qty ? ` <i>×${x.qty}</i>` : ''}</b>${x.note ? `<small>${esc(x.note)}</small>` : ''}</span></div>`).join('')}</div></div>`).join('');
  } else {
    $('#agKitBody').innerHTML = kitCards(list);
  }
  stagger($$('.ag-kitcard, .ag-kitrow, .ag-pc li', $('#agKitBody')).slice(0, 30), { y: 14 });
}

// ---------- render: cut list ----------
function renderCuts() {
  const list = (guide.kit || {}).cutlist || [];
  if (!list.length) { $('#cutlist').classList.add('ag-hidden'); return; }
  const max = Math.max(...list.map(c => c.length));
  $('#agCuts').innerHTML = list.map(c => `<div class="ag-cut">
      <span class="len">${c.length}<small>mm</small></span>
      <div class="bar-wrap"><div class="bar" style="--w:${(c.length / max * 100).toFixed(1)}%"></div><div class="use">${esc(c.use || '')}</div></div>
      <span class="qty">×${c.qty}</span></div>`).join('');
  const total = list.reduce((a, c) => a + c.length * c.qty, 0);
  $('#agCutTotal').textContent = `${list.reduce((a, c) => a + c.qty, 0)} pieces · ${(total / 1000).toFixed(2)} m of profile in total (plus saw kerf)`;
}

// ---------- render: print queue ----------
let partFilter = 'all', partsExpanded = false;
function renderPartTabs() {
  if (guide.printMaterial) $('#agPrintLede').innerHTML = `Every printed part in the robot, all in <strong>${esc(guide.printMaterial)}</strong>. Click one to spin it in 3D, and tick it off once it's printed (saved in this browser).`;
  const counts = {};
  Object.values(partUse).forEach(u => counts[u.chapter] = (counts[u.chapter] || 0) + 1);
  const tabs = [['all', 'All', Object.keys(partUse).length], ...chapters.filter(c => counts[c.id]).map(c => [c.id, c.title, counts[c.id]])];
  $('#agPartTabs').innerHTML = tabs.map(([id, n, c]) => `<button class="ag-tab ${id === partFilter ? 'on' : ''}" data-pf="${esc(id)}">${esc(n)}<b>${c}</b></button>`).join('');
}
function renderParts() {
  const keys = Object.keys(partUse).filter(k => partFilter === 'all' || partUse[k].chapter === partFilter)
    .sort((a, b) => partUse[a].steps[0] - partUse[b].steps[0]);
  const shown = partFilter === 'all' && !partsExpanded ? keys.slice(0, 15) : keys;
  $('#agParts').innerHTML = shown.map(k => {
    const p = partOf(k) || { name: k }, u = partUse[k];
    return `<div class="ag-part ${printed.has(k) ? 'printed' : ''}" style="--ch:${chColor(u.chapter)}" data-key="${esc(k)}">
      <button class="open" data-part="${esc(k)}" aria-label="Open ${esc(p.name)} in 3D">
        <div class="img">${partOf(k) ? `<img src="${thumbUrl(k)}" alt="" loading="lazy">` : ''}</div>
        <div class="meta"><h4>${esc(p.name)}</h4><div class="sub"><span>${dims(p.dims)}</span>${u.infill ? `<span class="inf">${esc(u.infill)} infill</span>` : ''}${u.note ? `<span>${esc(u.note)}</span>` : ''}</div></div>
      </button>
      ${u.qty > 1 ? `<span class="qty">×${u.qty}</span>` : ''}
      <button class="chk" data-printed="${esc(k)}" title="Mark as printed" aria-label="Mark ${esc(p.name)} as printed">✓</button>
      <span class="ch-dot"></span></div>`;
  }).join('') + (shown.length < keys.length ? `<button class="ag-btn ag-more" data-more style="grid-column:1/-1;justify-self:center;height:44px;padding:0 1.4rem">Show all ${keys.length} parts ↓</button>` : '');
  updatePrinted();
  stagger($$('.ag-part', $('#agParts')).slice(0, 36), { y: 22, scale: 0.94 });
}
function updatePrinted() {
  const total = Object.keys(partUse).length;
  const n = Object.keys(partUse).filter(k => printed.has(k)).length;
  $('#agPrintedCount').textContent = `${n} / ${total} printed`;
  $('#agPrintedBar').style.width = (total ? n / total * 100 : 0) + '%';
}

// ---------- render: laser boards ----------
function renderBoards() {
  const boards = Object.entries(guide.parts || {}).filter(([, p]) => p.kind === 'cut');
  if (!boards.length) { $('#laser').classList.add('ag-hidden'); return; }
  $('#agBoards').innerHTML = boards.map(([k, p]) => `<div class="ag-board">
      <div class="svg" data-svg="${cutUrl(k)}"></div>
      <h4>${esc(p.name)}</h4>
      <div class="sub"><span>${dims(p.dims)}</span><span class="dl">${fileLinks(p.files)}</span></div></div>`).join('');
  loadSvgs($$('#agBoards [data-svg]'), true);
}
const svgCache = {};
function loadSvgs(nodes, animateIn) {
  nodes.forEach(n => {
    const url = n.dataset.svg;
    (svgCache[url] || (svgCache[url] = fetch(url).then(r => r.ok ? r.text() : '').catch(() => ''))).then(txt => {
      if (!txt.startsWith('<svg')) return;
      n.innerHTML = txt;
      if (animateIn) drawOnView(n);
    });
  });
}
function drawOnView(node) {
  if (!anime || reduceMotion) return;
  const paths = $$('path', node);
  paths.forEach(p => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; p.dataset.len = l; });
  onceVisible(node, () => paths.forEach((p, i) => anime.animate(p, {
    strokeDashoffset: { from: +p.dataset.len, to: 0 }, duration: 1400 + Math.min(p.dataset.len * 0.4, 1200), delay: Math.min(i * 12, 900), ease: 'inOutQuad',
  })));
}

// ---------- render: steps ----------
// a component named in a step ("AMD Ryzen 5 7500F") borrows the photo of the matching kit item
function kitImage(name) {
  const k = guide.kit || {}, n = name.toLowerCase().replace(/\s*×\d+$/, '');
  const hit = [...(k.computer || []), ...(k.electronics || [])]
    .find(x => x && x.img && (x.name.toLowerCase().startsWith(n) || n.startsWith(x.name.toLowerCase())));
  return hit ? hit.img : null;
}
function stepHTML(s, i) {
  const c = chColor(s.chapter);
  const prints = (s.prints || []).map(p => {
    const pt = partOf(p.part) || { name: p.part };
    return `<button class="ag-print" data-part="${esc(p.part)}" title="Open in 3D">
      <div class="img">${partOf(p.part) ? `<img src="${thumbUrl(p.part)}" alt="" loading="lazy">` : ''}</div>
      ${(p.qty || 1) > 1 ? `<span class="q">×${p.qty}</span>` : ''}
      <span>${esc(pt.name)}${p.infill ? `<i>${esc(p.infill)} infill</i>` : p.note ? `<i>${esc(p.note)}</i>` : p.fit ? '<i>fit</i>' : ''}</span></button>`;
  }).join('');
  const cuts = (s.cuts || []).map(k => `<a href="#laser" data-scroll-laser><span class="svg" data-svg="${cutUrl(k)}"></span>${esc(partOf(k)?.name || k)}</a>`).join('');
  const hw = (s.hardware || []).map(h => {
    const d = (guide.hardware || {})[h.id] || { name: h.id };
    return `<span class="ag-chip" title="${esc(d.spec || '')}">${d.img ? `<img src="${base}${esc(d.img)}" alt="" loading="lazy">` : ''}${esc(d.name)}${h.spec ? ` <b>${esc(h.spec)}</b>` : ''}</span>`;
  }).join('');
  const plain = (list) => (list || []).map(t => {
    const n = typeof t === 'string' ? t : t.name, img = kitImage(n);
    return `<span class="ag-chip${img ? '' : ' plain'}">${img ? `<img src="${base}${esc(img)}" alt="" loading="lazy">` : ''}${esc(n)}</span>`;
  }).join('');
  const tools = (s.tools || []).map(t => {
    const d = (guide.tools || {})[t];
    if (!d) return `<span class="ag-chip plain">${esc(t)}</span>`;
    return `<span class="ag-chip${d.img ? '' : ' plain'}" title="${esc(d.note || '')}">${d.img ? `<img src="${base}${esc(d.img)}" alt="" loading="lazy">` : ''}${esc(d.name)}</span>`;
  }).join('');
  const imgs = (s.images || []).map(im => `<button data-img="${base}${esc(im.src)}" data-cap="${esc(im.caption || '')}"><img src="${base}${esc(im.src)}" alt="${esc(im.caption || '')}" loading="lazy"><span>${esc(im.caption || '')}</span></button>`).join('');
  const files = (s.downloads || []).filter(d => Object.keys(d.files || {}).length)
    .map(d => `<span class="dlrow"><span class="nm" title="${esc(d.name)}">${esc(d.name)}</span>${fileLinks(d.files)}</span>`).join('');
  const printLabel = (s.prints || []).every(p => p.fit) ? 'Parts' : 'Print';
  return `<article class="ag-step ${done.has(s.id) ? 'is-done' : ''}" id="step-${i + 1}" data-i="${i}" style="--ch:${c}">
    <div class="ag-step-head" data-goto="${i}">
      <span class="ag-step-num">${pad(i + 1)}</span><h3>${esc(s.title || 'Step ' + (i + 1))}</h3>
    </div>
    <div class="ag-step-body">
      ${s.text ? `<div class="ag-prose">${md(s.text)}</div>` : ''}
      ${prints ? `<span class="ag-label">${printLabel}</span><div class="ag-prints">${prints}</div>` : ''}
      ${cuts ? `<span class="ag-label">Laser cut</span><div class="ag-cutmini">${cuts}</div>` : ''}
      ${imgs ? `<span class="ag-label">Dimensions</span><div class="ag-imgs">${imgs}</div>` : ''}
      ${hw ? `<span class="ag-label">Hardware</span><div class="ag-chips">${hw}</div>` : ''}
      ${s.components?.length ? `<span class="ag-label">Components</span><div class="ag-chips">${plain(s.components)}</div>` : ''}
      ${tools ? `<span class="ag-label">Tools</span><div class="ag-chips">${tools}</div>` : ''}
      ${s.tip ? `<div class="ag-callout tip"><span>💡</span><span>${inline(s.tip)}</span></div>` : ''}
      ${s.warning ? `<div class="ag-callout warn"><span>⚠️</span><span>${inline(s.warning)}</span></div>` : ''}
      <div class="ag-step-foot">
        <label class="ag-done"><input type="checkbox" data-done="${esc(s.id)}" ${done.has(s.id) ? 'checked' : ''}> Done</label>
        ${files ? `<span class="files">${files}</span>` : ''}
        <button class="ag-btn ag-replay" data-replay="${i}" title="Replay this step">↺ <span class="txt">Replay</span></button>
      </div>
    </div>
  </article>`;
}
function renderSteps() {
  let html = '', last = null;
  steps.forEach((s, i) => {
    if (s.chapter !== last) {
      const c = chapters[chIndex[s.chapter]] || { title: s.chapter };
      html += `<header class="ag-chapter" id="chapter-${esc(s.chapter)}" style="--ch:${chColor(s.chapter)}">
        <span class="n">${pad((chIndex[s.chapter] ?? 0) + 1)}</span><h3>${esc(c.title)}</h3>${c.summary ? `<p>${esc(c.summary)}</p>` : ''}<div class="line"></div></header>`;
      last = s.chapter;
    }
    html += stepHTML(s, i);
  });
  $('#agSteps').innerHTML = html || `<p class="ag-empty">No steps yet. Add them with the Guide Builder.</p>`;
  $('#agRail').innerHTML = steps.map((s, i) =>
    `<button data-goto="${i}" style="--w:${Math.max(1, s.end - s.start).toFixed(2)};--c:${chColor(s.chapter)}" title="${pad(i + 1)} · ${esc(s.title || '')}" class="${done.has(s.id) ? 'done' : ''}"></button>`).join('');
  // board outlines inside step cards load when the card nears the screen
  const io = new IntersectionObserver((entries) => entries.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    loadSvgs($$('[data-svg]', en.target), false);
  }), { rootMargin: '400px' });
  $$('.ag-step').forEach(el => { if (el.querySelector('[data-svg]')) io.observe(el); });
  // chapter headers draw their rule as they arrive
  $$('.ag-chapter').forEach(h => onceVisible(h, () => anime && !reduceMotion && anime.animate($('.line', h), { scaleX: { from: 0, to: 1 }, duration: 900, ease: 'outExpo' })));
}

// ---------- video sync ----------
const video = () => $('#agVideo');

function activate(i, { seek = true, scroll = false } = {}) {
  if (i < 0 || i >= steps.length) return;
  const changed = i !== current;
  current = i;
  const s = steps[i];
  $('#agGuide').style.setProperty('--ch', chColor(s.chapter));
  $$('.ag-step').forEach(el => el.classList.toggle('active', +el.dataset.i === i));
  $$('#agRail button').forEach((b, j) => b.classList.toggle('on', j === i));
  $('#agCounter').textContent = `${pad(i + 1)} / ${pad(steps.length)}`;
  if (changed) { hud(i); spotlight(i); }
  if (scroll) scrollToStep(i);
  if (seek) {
    clearTimeout(seekTimer);
    seekTimer = setTimeout(() => {
      const v = video();
      atEnd = false;
      v.currentTime = s.start + 0.01;
      if (!userPaused) v.play().catch(() => {});
    }, changed ? 90 : 0);
  }
}

function hud(i) {
  const s = steps[i];
  const num = $('#agHudNum'), title = $('#agHudTitle');
  const ch = chapters[chIndex[s.chapter]];
  num.innerHTML = `${[...pad(i + 1)].map(d => `<span class="d">${d}</span>`).join('')}<small>/${pad(steps.length)}</small>`;
  title.innerHTML = `${ch ? `<span class="ag-hud-phase">${esc(ch.title)}</span>` : ''}${esc(s.title || '')}`;
  if (anime && !reduceMotion) {
    anime.animate($$('.d', num), { translateY: { from: '100%', to: '0%' }, duration: 520, delay: anime.stagger(60), ease: 'outExpo' });
    anime.animate(title, { opacity: { from: 0, to: 1 }, translateX: { from: -12, to: 0 }, duration: 450, ease: 'outQuad' });
    const card = $(`.ag-step[data-i="${i}"]`);
    if (card) anime.animate($$('.ag-print, .ag-chip, .ag-callout, .ag-imgs button, .ag-cutmini a', card), { opacity: { from: 0, to: 1 }, translateY: { from: 10, to: 0 }, delay: anime.stagger(28), duration: 420, ease: 'outQuad' });
  }
}

// the "now print this part" panel under the video
let spotTimer = null, spotList = [], spotSel = 0;
function spotlight(i) {
  const s = steps[i], box = $('#agSpot');
  const prints = (s.prints || []);
  spotList = [...prints.filter(p => !p.fit), ...prints.filter(p => p.fit)].filter(p => partOf(p.part));
  spotSel = 0;
  if (!spotList.length) {
    const cut = (s.cuts || [])[0];
    box.innerHTML = cut
      ? `<div class="ag-spot-view" style="background:#121624;color:#ff6a3d;display:grid;place-items:center"><span data-svg="${cutUrl(cut)}" style="width:80%;height:80%;display:grid;place-items:center"></span></div>
         <div class="ag-spot-info"><span class="lbl">Laser cut</span><h4>${esc(partOf(cut)?.name || cut)}</h4><span class="sub">${dims(partOf(cut)?.dims)} · 3 mm acrylic</span></div>`
      : `<div class="ag-spot-empty"><span>Nothing to print in this step.</span></div>`;
    if (cut) loadSvgs($$('[data-svg]', box), false);
    return;
  }
  box.innerHTML = `<div class="ag-spot-view"><img alt=""></div>
    <div class="ag-spot-info"><span class="lbl"></span><h4></h4><span class="sub"></span>
      ${spotList.length > 1 ? `<div class="ag-spot-pick">${spotList.map((p, j) => `<button data-spot="${j}" class="${j ? '' : 'on'}" title="${esc(partOf(p.part).name)}"><img src="${thumbUrl(p.part)}" alt=""></button>`).join('')}</div>` : ''}</div>`;
  showSpot(0);
}
function showSpot(j) {
  spotSel = j;
  const p = spotList[j], pt = partOf(p.part), u = partUse[p.part] || {};
  const box = $('#agSpot');
  $('.lbl', box).textContent = p.fit ? 'Fit this part' : `Print ${p.qty > 1 ? '×' + p.qty : 'this part'}`;
  $('h4', box).textContent = pt.name;
  $('.sub', box).textContent = [dims(pt.dims), p.infill || u.infill ? `${p.infill || u.infill} infill` : ''].filter(Boolean).join(' · ');
  $$('.ag-spot-pick button', box).forEach((b, k) => b.classList.toggle('on', k === j));
  const view = $('.ag-spot-view', box);
  view.innerHTML = `<img src="${thumbUrl(p.part)}" alt="">`;
  view.dataset.part = p.part;
  // swap the still for a slowly turning 3D model once the reader settles on the step
  clearTimeout(spotTimer);
  spotTimer = setTimeout(() => {
    if (window.matchMedia('(max-width: 980px)').matches || view.dataset.part !== p.part) return;
    loadModelViewer();
    view.innerHTML = `<model-viewer src="${glbUrl(p.part)}" poster="${thumbUrl(p.part)}" auto-rotate rotation-per-second="40deg" camera-controls disable-zoom interaction-prompt="none" camera-orbit="-35deg 62deg auto" exposure="0.65" shadow-intensity="0.8" environment-image="neutral" alt="${esc(pt.name)}"></model-viewer>`;
  }, 700);
}

// our own scrolls can take over a second over long distances; treat them as ours until
// no scroll event has arrived for a short moment
// images loading during a long scroll can shift the page, so when it settles we check the
// target card and nudge it level with the video (a few times at most)
let ownTarget = -1, ownRetries = 0;
function startOwnScroll() {
  ownScroll = true;
  clearTimeout(ownScrollIdle);
  ownScrollIdle = setTimeout(settleOwnScroll, 220);
}
function settleOwnScroll() {
  ownScroll = false;
  const el = ownTarget >= 0 && $(`.ag-step[data-i="${ownTarget}"]`);
  if (!el) return;
  const d = el.getBoundingClientRect().top - snapLine();
  if (Math.abs(d) > 3 && ownRetries < 3) {
    ownRetries++;
    startOwnScroll();
    window.scrollBy({ top: d, behavior: reduceMotion || Math.abs(d) < 400 ? 'smooth' : 'auto' });
  } else ownTarget = -1;
}
function scrollToStep(i) {
  const el = $(`.ag-step[data-i="${i}"]`);
  if (!el) return;
  ownTarget = i; ownRetries = 0;
  startOwnScroll();
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });   // lands level with the video (scroll-margin-top)
}

function onTimeUpdate() {
  const v = video();
  const s = steps[current];
  if (!s) return;
  const p = Math.min(1, Math.max(0, (v.currentTime - s.start) / Math.max(0.01, s.end - s.start)));
  setScrub(p);
  if (v.currentTime < s.start - 0.5) { v.currentTime = s.start + 0.01; return; }
  if (v.currentTime >= s.end - 0.04) {
    if (autoAdvance && current < steps.length - 1) activate(current + 1, { seek: false, scroll: true });
    else if (repeat) v.currentTime = s.start + 0.01;   // loop the current step
    else if (!v.paused) { v.pause(); atEnd = true; v.currentTime = s.end - 0.06; }   // play once, rest on the last frame
  }
}

// which step card sits under the "reading line": a little below the video's top edge (desktop)
// or below the pinned video (phone), so the card that snaps level with the video is the active one
function readingLine() {
  const stage = $('.ag-stage-wrap').getBoundingClientRect();
  const top = window.innerWidth <= 980 ? stage.bottom : stage.top;
  return top + (window.innerHeight - top) * 0.3;
}
function onScroll() {
  if (!steps.length) return;
  if (ownScroll) { startOwnScroll(); return; }   // ignore our own smooth scrolling until it settles
  const line = readingLine();
  const guideBox = $('#agGuide').getBoundingClientRect();
  if (guideBox.top > line || guideBox.bottom < 0) return;
  let pick = 0;
  for (const c of $$('.ag-step')) { if (c.getBoundingClientRect().top <= line) pick = +c.dataset.i; else break; }
  if (pick !== current) activate(pick);
  clearTimeout(snapTimer);
  snapTimer = setTimeout(snapToStep, 160);
}

// when scrolling stops, glide the nearest step card level with the top of the video
let snapTimer = null;
function snapLine() {
  const wrap = $('.ag-stage-wrap').getBoundingClientRect();
  return window.innerWidth <= 980 ? wrap.bottom + 8 : wrap.top;
}
function snapToStep() {
  if (ownScroll || document.querySelector('.ag-modal')) return;
  const line = snapLine(), vh = window.innerHeight;
  const g = $('#agGuide').getBoundingClientRect();
  if (g.top > line + 4 || g.bottom < vh * 0.6) return;            // not inside the build
  let best = null, dist = Infinity;
  for (const c of $$('.ag-step')) {
    const r = c.getBoundingClientRect();
    if (r.bottom < line || r.top > vh) continue;
    const d = Math.abs(r.top - line);
    if (d < dist) { dist = d; best = c; }
  }
  if (!best || dist < 3 || dist > vh * 0.45) return;
  const r = best.getBoundingClientRect();
  if (r.top < line && r.bottom > vh - 60) return;                 // reading inside a long card: leave it
  const i = +best.dataset.i;
  ownTarget = i; ownRetries = 0;
  startOwnScroll();
  window.scrollBy({ top: r.top - line, behavior: reduceMotion ? 'auto' : 'smooth' });
  if (i !== current) activate(i);
}

// ---------- controls ----------
function setPlayIcon() {
  const v = video();
  $('#agPlay').innerHTML = v.paused ? icon('M8 5v14l11-7z') : icon('M6 5h4v14H6zm8 0h4v14h-4z');
  $('#agPlay').title = v.paused ? 'Play (K)' : 'Pause (K)';
}
function togglePlay() {
  const v = video();
  if (v.paused) {
    userPaused = false;
    if (current < 0) activate(0);
    else { if (atEnd) { v.currentTime = steps[current].start + 0.01; atEnd = false; } v.play().catch(() => {}); }
  }
  else { userPaused = true; v.pause(); }
}
function go(d) { activate(Math.max(0, Math.min(steps.length - 1, current < 0 ? 0 : current + d)), { scroll: true }); }

function bindControls() {
  const v = video();
  v.addEventListener('timeupdate', onTimeUpdate);
  v.addEventListener('play', setPlayIcon);
  v.addEventListener('pause', setPlayIcon);
  v.addEventListener('loadedmetadata', () => {
    if (v.videoWidth) $('.ag-stage').style.setProperty('--ag-ratio', `${v.videoWidth} / ${v.videoHeight}`);
    measureStage();
  });
  (function raf() { if (!v.paused) onTimeUpdate(); requestAnimationFrame(raf); })();

  $('#agPlay').onclick = togglePlay;
  $('#agPrev').onclick = () => go(-1);
  $('#agNext').onclick = () => go(1);
  $('#agReplay').onclick = () => { userPaused = false; activate(Math.max(0, current)); };
  $('#agAuto').onclick = (e) => { autoAdvance = !autoAdvance; e.currentTarget.classList.toggle('on', autoAdvance); e.currentTarget.setAttribute('aria-pressed', autoAdvance); };
  const showRepeat = () => {
    const b = $('#agRepeat');
    b.classList.toggle('on', repeat);
    b.setAttribute('aria-pressed', repeat);
    b.title = repeat ? 'Repeat on: the step loops (click to play it once)' : 'Repeat off: the step plays once (click to loop it)';
  };
  showRepeat();
  $('#agRepeat').onclick = () => {
    repeat = !repeat;
    try { localStorage.setItem('assembly-guide:repeat', repeat ? 'on' : 'off'); } catch (e) {}
    showRepeat();
    if (repeat && atEnd && !userPaused) { atEnd = false; activate(current); }   // switched back on while resting: start looping again
  };
  const speeds = [0.5, 1, 1.5, 2];
  $('#agSpeed').onclick = (e) => { const k = (speeds.indexOf(v.playbackRate) + 1) % speeds.length; v.playbackRate = speeds[k]; e.currentTarget.querySelector('.txt').textContent = speeds[k] + '×'; };
  bindScrub();
  bindRail();
  $('#agFs').onclick = () => { const st = $('.ag-stage'); document.fullscreenElement ? document.exitFullscreen() : st.requestFullscreen?.(); };

  document.addEventListener('click', (e) => {
    const t = e.target;
    const g = t.closest('[data-goto]');
    if (g && g.closest('.ag-rail') && railHandled) { e.preventDefault(); return; }   // pointerup already went there
    if (g) { e.preventDefault(); userPaused = false; if (!$('#agGuide').contains(g) || g.closest('.ag-rail') || g.closest('.ag-step-head')) activate(+g.dataset.goto, { scroll: true }); return; }
    const r = t.closest('[data-replay]');
    if (r) { userPaused = false; activate(+r.dataset.replay); return; }
    const pr = t.closest('[data-printed]');
    if (pr) { const k = pr.dataset.printed, on = !printed.has(k); printed.toggle(k, on); pr.closest('.ag-part').classList.toggle('printed', on); updatePrinted(); return; }
    const sp = t.closest('[data-spot]');
    if (sp) { showSpot(+sp.dataset.spot); return; }
    const pv = t.closest('.ag-spot-view[data-part]');
    if (pv && !t.closest('model-viewer')) { openPart(pv.dataset.part); return; }
    const p = t.closest('[data-part]');
    if (p) { e.preventDefault(); openPart(p.dataset.part); return; }
    const im = t.closest('[data-img]');
    if (im) { openImage(im.dataset.img, im.dataset.cap); return; }
    const kt = t.closest('[data-kit]');
    if (kt) { renderKit(+kt.dataset.kit); return; }
    if (t.closest('[data-more]')) { partsExpanded = true; renderParts(); return; }
    const pf = t.closest('[data-pf]');
    if (pf) { partFilter = pf.dataset.pf; renderPartTabs(); renderParts(); return; }
  });
  document.addEventListener('change', (e) => {
    const id = e.target.dataset?.done;
    if (!id) return;
    done.toggle(id, e.target.checked);
    const i = steps.findIndex(s => s.id === id);
    $(`.ag-step[data-i="${i}"]`)?.classList.toggle('is-done', e.target.checked);
    $$('#agRail button')[i]?.classList.toggle('done', e.target.checked);
    if (e.target.checked && i === current && i < steps.length - 1) setTimeout(() => go(1), 250);
  });
  document.addEventListener('keydown', (e) => {
    if ($('.ag-modal')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const g = $('#agGuide').getBoundingClientRect();
    if (g.top > window.innerHeight || g.bottom < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'j') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'h') { e.preventDefault(); go(-1); }
    else if (e.key === 'k') { e.preventDefault(); togglePlay(); }
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measureStage);
  // pause the video while the guide is off-screen (saves battery and data)
  new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) video().pause();
    else if (!userPaused && !atEnd && current >= 0) video().play().catch(() => {});
  }).observe($('#agGuide'));
}
// step rail: hovering magnifies the segments near the cursor and previews the step;
// click jumps to it, dragging scrubs through the steps (video follows, page scrolls on release)
let railHandled = false;   // set while a pointer click/drag on the rail is being finished
function bindRail() {
  const rail = $('#agRail'), tip = $('#agRailTip'), wrap = $('.ag-stage-wrap');
  let rects = [], tipIndex = -1, dragging = false, dragged = false, last = -1;
  const btns = () => $$('button', rail);
  const measure = () => { rects = btns().map(b => b.getBoundingClientRect()); };
  const indexAt = (x) => {
    let best = 0, d = Infinity;
    rects.forEach((r, i) => { const c = Math.abs(x - (r.left + r.width / 2)); if (c < d) { d = c; best = i; } });
    return best;
  };
  const magnify = (x) => {
    const reach = Math.max(28, rail.clientWidth / 14);
    btns().forEach((b, i) => {
      const r = rects[i], dist = Math.abs(x - (r.left + r.width / 2));
      const k = Math.exp(-((dist / reach) ** 2));
      b.style.height = (6 + 22 * k).toFixed(1) + 'px';
      b.classList.toggle('near', k > 0.35);
    });
  };
  const showTip = (i, x) => {
    const s = steps[i];
    if (!s) return;
    if (i !== tipIndex) {
      tipIndex = i;
      const ch = chapters[chIndex[s.chapter]];
      tip.innerHTML = `<img src="${base}thumbs/${encodeURIComponent(s.id)}.jpg" alt="" onerror="this.remove()">
        <div><b>${pad(i + 1)}</b><span>${esc(s.title || '')}</span>${ch ? `<small>${esc(ch.title)}</small>` : ''}</div>`;
    }
    const wr = wrap.getBoundingClientRect(), half = 100;
    const left = Math.min(wr.width - half, Math.max(half, x - wr.left));
    tip.style.left = left + 'px';
    tip.style.top = (rail.offsetTop - tip.offsetHeight - 10) + 'px';
    tip.classList.add('show');
  };
  const reset = () => {
    btns().forEach(b => { b.style.height = ''; b.classList.remove('near'); });
    rail.classList.remove('hot');
    tip.classList.remove('show');
    tipIndex = -1;
  };
  rail.addEventListener('pointerenter', () => { measure(); rail.classList.add('hot'); });
  rail.addEventListener('pointermove', (e) => {
    if (!rects.length) measure();
    rail.classList.add('hot');
    magnify(e.clientX);
    const i = indexAt(e.clientX);
    showTip(i, e.clientX);
    if (dragging && i !== last) {
      last = i;
      dragged = true;
      userPaused = false;
      activate(i);                       // video + HUD follow the drag; scroll waits for release
    }
  });
  rail.addEventListener('pointerleave', () => { if (!dragging) reset(); });
  rail.addEventListener('pointerdown', (e) => {
    measure();
    dragging = true; dragged = false; last = indexAt(e.clientX);
    rail.setPointerCapture(e.pointerId);
    rail.classList.add('dragging');
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    rail.classList.remove('dragging');
    // a plain click and the end of a drag both land on the step under the pointer
    userPaused = false;
    activate(last, { scroll: true });
    railHandled = true;
    setTimeout(() => { railHandled = false; }, 0);
    const r = rail.getBoundingClientRect();
    if (e.clientY < r.top - 6 || e.clientY > r.bottom + 14 || e.clientX < r.left || e.clientX > r.right) reset();
  };
  rail.addEventListener('pointerup', end);
  rail.addEventListener('pointercancel', end);
  window.addEventListener('resize', () => { rects = []; });
}

function setScrub(f) {
  const pct = (f * 100).toFixed(2) + '%';
  $('#agProgress').style.width = pct;
  $('#agScrub').style.setProperty('--p', pct);
  $('#agScrub').setAttribute('aria-valuenow', Math.round(f * 100));
}
// the bar along the bottom of the video seeks within the current step: click or drag
function bindScrub() {
  const bar = $('#agScrub'), v = video();
  let dragging = false, resume = false;
  const seek = (e) => {
    const s = steps[current];
    if (!s) return;
    const r = bar.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    v.currentTime = s.start + 0.01 + f * Math.max(0, s.end - s.start - 0.08);
    setScrub(f);
  };
  bar.addEventListener('pointerdown', (e) => {
    if (current < 0) activate(0, { seek: false });
    e.preventDefault();
    dragging = true;
    resume = !v.paused;
    v.pause();
    atEnd = false;
    bar.setPointerCapture(e.pointerId);
    bar.classList.add('dragging');
    seek(e);
  });
  bar.addEventListener('pointermove', (e) => { if (dragging) seek(e); });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    bar.classList.remove('dragging');
    if (resume) { userPaused = false; v.play().catch(() => {}); } else userPaused = true;
  };
  bar.addEventListener('pointerup', stop);
  bar.addEventListener('pointercancel', stop);
  bar.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); e.stopPropagation();
    const s = steps[current]; if (!s) return;
    v.pause(); userPaused = true; atEnd = false;
    v.currentTime = Math.min(s.end - 0.06, Math.max(s.start + 0.01, v.currentTime + (e.key === 'ArrowRight' ? 0.5 : -0.5)));
  });
}

// engineering line drawings behind the page, alternating sides down its whole length
// (the set repeats every ~850px; reused files come from the cache)
let wires = [];
async function renderWires() {
  wires = (await fetch(base + 'bg/wires.json').then(r => r.ok ? r.json() : []).catch(() => [])).filter(w => w.w >= 300);
  if (!$('#agWires') || !wires.length) return;
  layoutWires();
  new ResizeObserver(() => layoutWires()).observe(root);
}
function layoutWires() {
  const box = $('#agWires');
  if (!box) return;
  const H = root.scrollHeight, step = 850, n = Math.max(1, Math.floor(H / step));
  if (box.children.length !== n)
    box.innerHTML = Array.from({ length: n }, (_, i) => `<img src="${base}${esc(wires[i % wires.length].src)}" alt="" loading="lazy" decoding="async">`).join('');
  const narrow = window.innerWidth <= 980;
  [...box.children].forEach((img, i) => {
    const w = wires[i % wires.length], tall = w.h > w.w * 1.1;
    const width = narrow ? Math.min(window.innerWidth * 0.8, 420) : Math.min(window.innerWidth * (tall ? 0.28 : 0.36), tall ? 440 : 600);
    img.style.width = width + 'px';
    img.style.top = Math.round(i * step + (i % 3) * 110) + 'px';
    const left = i % 2 === 0, off = `${narrow ? -22 : -6 + (i % 4) * 2}vw`;
    img.style.left = left ? off : 'auto';
    img.style.right = left ? 'auto' : off;
  });
}

function measureStage() {
  const h = $('.ag-stage-wrap').getBoundingClientRect().height;
  document.body.style.setProperty('--ag-stage-h', h + 'px');
}

// ---------- modals ----------
let mvLoaded = false;
function loadModelViewer() {
  if (mvLoaded) return;
  mvLoaded = true;
  const s = document.createElement('script'); s.type = 'module'; s.src = MODEL_VIEWER_URL; document.head.appendChild(s);
}
function modal(html, cls = '') {
  video().pause();
  const wrap = document.createElement('div');
  wrap.className = 'ag-modal';
  wrap.innerHTML = `<div class="ag-modal-box ${cls}" role="dialog" aria-modal="true">${html}<button class="ag-btn ag-modal-close" aria-label="Close">✕</button></div>`;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); if (!userPaused && current >= 0) video().play().catch(() => {}); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('.ag-modal-close')) close();
    const g = e.target.closest('[data-goto]');
    if (g) { e.stopPropagation(); close(); userPaused = false; activate(+g.dataset.goto, { scroll: true }); }
  }, true);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(wrap);
  wrap.querySelector('.ag-modal-close').focus();
  if (anime && !reduceMotion) anime.animate(wrap.firstElementChild, { opacity: { from: 0, to: 1 }, scale: { from: 0.96, to: 1 }, duration: 380, ease: 'outExpo' });
}
function openPart(key) {
  const pt = partOf(key);
  if (!pt) return;
  loadModelViewer();
  const u = partUse[key] || { steps: [] };
  const ch = chapters[chIndex[u.chapter]];
  modal(`<div class="ag-modal-view" style="--ch:${chColor(u.chapter)}">
      <model-viewer src="${glbUrl(key)}" poster="${thumbUrl(key)}" camera-controls auto-rotate rotation-per-second="24deg" camera-orbit="-35deg 62deg auto" shadow-intensity="1" shadow-softness="0.6" exposure="0.62" environment-image="neutral" alt="${esc(pt.name)}"></model-viewer>
      <span class="hint">DRAG TO ROTATE · SCROLL TO ZOOM</span></div>
    <div class="ag-modal-side" style="--ch:${chColor(u.chapter)}">
      <span class="lbl">${ch ? esc(ch.title) : 'Part'}</span>
      <h3>${esc(pt.name)}</h3>
      <dl>
        <dt>Print</dt><dd>×${u.qty || 1}${u.note ? ` (${esc(u.note)})` : ''}</dd>
        ${guide.printMaterial ? `<dt>Material</dt><dd>${esc(guide.printMaterial)}</dd>` : ''}
        ${u.infill ? `<dt>Infill</dt><dd>${esc(u.infill)}</dd>` : ''}
        ${pt.dims ? `<dt>Size</dt><dd>${dims(pt.dims)}</dd>` : ''}
        <dt>Used in</dt><dd>${u.steps.map(i => `<button data-goto="${i}" title="${esc(steps[i].title)}">${pad(i + 1)}</button>`).join('')}</dd>
      </dl>
      ${pt.files && Object.keys(pt.files).length ? `<span class="lbl" style="color:var(--ag-faint)">CAD files (GitHub)</span>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">${fileLinks(pt.files, 'ag-btn')}</div>` : ''}
      <span class="file">${esc(key)}</span>
    </div>`);
}
function openImage(src, cap) {
  modal(`<img src="${esc(src)}" alt="${esc(cap || '')}">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}`, 'img');
}

// ---------- animation helpers ----------
function onceVisible(el, fn, margin = '0px 0px -12% 0px') {
  if (!el) return;
  const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: margin });
  io.observe(el);
}
function stagger(nodes, { y = 16, scale = 1 } = {}) {
  if (!anime || reduceMotion || !nodes.length) return;
  anime.animate(nodes, { opacity: { from: 0, to: 1 }, translateY: { from: y, to: 0 }, scale: { from: scale, to: 1 }, duration: 640, delay: anime.stagger(32), ease: 'outExpo' });
}
function intro() {
  if (!anime || reduceMotion) return;
  const { animate, stagger: st } = anime;
  animate('#agTitle .ag-char', { opacity: { from: 0, to: 1 }, translateY: { from: '0.25em', to: 0 }, duration: 800, delay: st(18), ease: 'outQuart' });
  animate('.ag-hero .ag-lede, .ag-hero .ag-cta', { opacity: { from: 0, to: 1 }, translateY: { from: 16, to: 0 }, duration: 800, delay: st(120, { start: 350 }), ease: 'outQuad' });
  animate('.ag-photo-wrap .ag-photo', { opacity: { from: 0, to: 1 }, translateY: { from: 12, to: 0 }, duration: 900, delay: 200, ease: 'outQuart' });
  // count the stats up
  $$('#agStats b').forEach((b, i) => {
    const n = +b.dataset.n, o = { v: 0 };
    animate(o, { v: n, duration: 1400, delay: 400 + i * 90, ease: 'outExpo', onUpdate: () => { b.textContent = Math.round(o.v); } });
  });
  onceVisible($('#agChapters'), () => stagger($$('.ag-chcard'), { y: 30 }));
  onceVisible($('#agCuts'), () => animate('.ag-cut .bar', { scaleX: { from: 0, to: 1 }, duration: 1100, delay: st(90), ease: 'outExpo' }));
  onceVisible($('#agCuts'), () => animate('.ag-cut .len, .ag-cut .qty, .ag-cut .use', { opacity: { from: 0, to: 1 }, duration: 700, delay: st(40, { start: 250 }), ease: 'outQuad' }));
}

// ---------- boot ----------
async function boot() {
  const [data, lib] = await Promise.all([
    fetch(base + 'guide.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    import(ANIME_URL).catch(() => null),
  ]).catch(err => { $('#agSteps').innerHTML = `<p class="ag-empty">Could not load the guide (${esc(err.message)}).</p>`; return []; });
  if (!data) return;
  anime = lib;
  prepare(data);

  const v = video();
  v.src = base + 'assembly.mp4';
  v.poster = base + 'poster.jpg';

  renderHero();
  renderChapters();
  renderOverview();
  renderKit(0);
  renderCuts();
  renderPartTabs();
  renderParts();
  renderBoards();
  renderSteps();
  bindControls();
  setPlayIcon();
  renderWires();
  intro();
  measureStage();
  $('#agSpot').innerHTML = `<div class="ag-spot-empty">Scroll into the steps. The part to print for each step appears here in 3D.</div>`;

  // deep link: page.html#step-7
  const m = location.hash.match(/^#step-(\d+)$/);
  if (m && steps[+m[1] - 1]) setTimeout(() => activate(+m[1] - 1, { scroll: true }), 300);
}
boot();
