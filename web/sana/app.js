'use strict';
/* ============ البيانات والحالة ============ */
const PLAN = window.PLAN_DATA;
const KEY = 'sana_v1';
const NW = PLAN_NW();
function PLAN_NW() { return window.PLAN_DATA.weeks.length; }
const LOCAL = (w) => window.PLAN_DATA.weeks[w - 1].local;
const PHN = (w) => window.PLAN_DATA.weeks[w - 1].phase;
const ORD = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'];
const DAYS_AR = ['', 'اليوم الأول', 'اليوم الثاني', 'اليوم الثالث', 'اليوم الرابع', 'اليوم الخامس'];
const PH_COLORS = { pull: 'c-pull', run: 'c-run', push: 'c-push', legs: 'c-legs', long: 'c-long' };

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
  s = s || {};
  s.done = s.done || {};
  s.rounds = s.rounds || {};
  s.checks = s.checks || {};
  s.sleep = s.sleep || {};
  s.rec = s.rec || {};
  s.weights = s.weights || [];
  s.closed = s.closed || {};
  return s;
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

const $ = (sel, el) => (el || document).querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sk = (w, d) => w + '-' + d;
const weekObj = (w) => PLAN.weeks[w - 1];
const dayObj = (w, d) => weekObj(w).days[d - 1];
const today = () => { const t = new Date(); return t.getFullYear() + '/' + (t.getMonth() + 1) + '/' + t.getDate(); };

function nextSession() {
  for (let w = 1; w <= NW; w++) for (let d = 1; d <= 5; d++) if (!S.done[sk(w, d)]) return { w, d };
  return null;
}
function weekDone(w) { for (let d = 1; d <= 5; d++) if (!S.done[sk(w, d)]) return false; return true; }

/* ============ الصوت والاهتزاز ============ */
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function beep(freq, ms, vol) {
  const ac = audio(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.value = freq || 880;
  g.gain.value = vol || 0.25;
  o.connect(g); g.connect(ac.destination);
  const t = ac.currentTime;
  g.gain.setValueAtTime(vol || 0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + (ms || 150) / 1000);
  o.start(t); o.stop(t + (ms || 150) / 1000 + 0.02);
}
function vibrate(ms) {
  try { if (window.Android && window.Android.vibrate) { window.Android.vibrate(ms); return; } } catch (e) { /* ignore */ }
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
}
function endSignal() { beep(988, 220, 0.35); setTimeout(() => beep(988, 220, 0.35), 280); setTimeout(() => beep(1318, 380, 0.35), 560); vibrate(700); }

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============ المؤقت ============ */
const TM = { q: [], i: 0, end: 0, left: 0, total: 0, paused: false, iv: null, lastSec: -1 };
function fmt(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}
function timerStart(queue) {
  audio();
  TM.q = queue; TM.i = -1; TM.paused = false;
  $('#tm').classList.add('show');
  timerNext();
}
function timerNext() {
  const prev = TM.q[TM.i];
  if (prev && prev.onEnd) prev.onEnd();
  TM.i++;
  clearInterval(TM.iv);
  if (TM.i >= TM.q.length) { timerClose(); return; }
  const p = TM.q[TM.i];
  const el = $('#tm');
  el.className = 'tm show ' + (p.type || 'rest');
  $('#tm-lbl').textContent = p.label || '';
  $('#tm-sub').textContent = p.sub || '';
  $('#tm-pause').textContent = 'إيقاف مؤقت';
  TM.paused = false; TM.lastSec = -1;
  if (p.manual) {
    $('#tm-clock').textContent = '—';
    $('.tm .ring i').style.width = '100%';
    $('#tm-skip').textContent = 'انتهيت ✓';
    beep(660, 160);
    return;
  }
  $('#tm-skip').textContent = TM.i < TM.q.length - 1 ? 'التالي ⏭' : 'إنهاء ⏭';
  TM.total = p.secs; TM.end = Date.now() + p.secs * 1000;
  if (p.type === 'work' || p.type === 'hold') { beep(1046, 250, 0.35); vibrate(250); }
  timerTick();
  TM.iv = setInterval(timerTick, 200);
}
function timerTick() {
  if (TM.paused) return;
  const p = TM.q[TM.i]; if (!p || p.manual) return;
  const left = (TM.end - Date.now()) / 1000;
  $('#tm-clock').textContent = fmt(left);
  $('.tm .ring i').style.width = Math.min(100, 100 * (1 - left / TM.total)) + '%';
  const sec = Math.ceil(left);
  if (sec !== TM.lastSec) {
    TM.lastSec = sec;
    if (sec <= 3 && sec >= 1) { beep(740, 120, 0.25); vibrate(80); }
  }
  if (left <= 0) { endSignal(); timerNext(); }
}
function timerPause() {
  const p = TM.q[TM.i]; if (!p || p.manual) return;
  if (!TM.paused) { TM.paused = true; TM.left = (TM.end - Date.now()) / 1000; $('#tm-pause').textContent = 'متابعة ▶'; }
  else { TM.paused = false; TM.end = Date.now() + TM.left * 1000; $('#tm-pause').textContent = 'إيقاف مؤقت'; }
}
function timerAdd(s) {
  const p = TM.q[TM.i]; if (!p || p.manual) return;
  if (TM.paused) TM.left += s; else TM.end += s * 1000;
  TM.total += s; timerTick();
}
function timerClose() {
  clearInterval(TM.iv); TM.q = []; TM.i = 0;
  $('#tm').className = 'tm';
  render();
}

/* ============ التنقّل ============ */
let VIEW = { name: 'home' };
const HIST = [];
function go(v) { HIST.push(VIEW); VIEW = v; render(); window.scrollTo(0, 0); }
function tab(name) { HIST.length = 0; VIEW = { name }; render(); window.scrollTo(0, 0); }
window.onAndroidBack = function () {
  if ($('#tm').classList.contains('show')) { timerClose(); return true; }
  if (HIST.length) { VIEW = HIST.pop(); render(); return true; }
  if (VIEW.name !== 'home') { tab('home'); return true; }
  return false;
};

/* ============ الرئيسية ============ */
function viewHome() {
  const nx = nextSession();
  const doneCount = Object.keys(S.done).length;
  if (!S.selWeek) S.selWeek = nx ? nx.w : NW;
  let h = '<div class="top"><h1>🏆 سنة الرياضي الشامل</h1></div><div class="wrap">';
  if (nx) {
    const d = dayObj(nx.w, nx.d);
    h += '<div class="card hero"><div class="k">الجلسة التالية</div>' +
      '<div class="t">المرحلة ' + PHN(nx.w) + ' • الأسبوع ' + LOCAL(nx.w) + ' — ' + DAYS_AR[nx.d] + '</div>' +
      '<div>' + esc(d.title) + ' <span class="en">' + esc(d.en) + '</span></div>' +
      (d.dur ? '<div class="small">' + esc(d.dur) + '</div>' : '') +
      '<button class="btn full" data-go="' + nx.w + '-' + nx.d + '">ابدأ الجلسة ▶</button></div>';
  } else {
    h += '<div class="card hero"><div class="t">🎉 أنهيت السنة كاملة!</div><div class="small">قارن أرقامك في صفحة السجلّ.</div></div>';
  }
  h += '<div class="small">أنجزت ' + doneCount + ' من ' + (NW * 5) + ' جلسة</div>';
  // الأسابيع
  PLAN.phases.forEach((ph, pi) => {
    h += '<div class="phase-lbl">المرحلة ' + ph.num + ': ' + esc(ph.title) + ' (' + esc(ph.months) + ')</div><div class="chips">';
    for (let w = pi * 12 + 1; w <= pi * 12 + 12; w++) {
      const wd = weekDone(w), lw = LOCAL(w);
      const lbl = lw === 4 || lw === 8 ? 'تخفيف' : (lw === 12 ? 'اختبار' : '');
      h += '<button class="chip' + (S.selWeek === w ? ' on' : '') + (wd ? ' done' : '') + '" data-week="' + w + '">' +
        (wd ? '<span class="dot"></span>' : '') + lw + '<span class="s">' + (lbl || 'الأسبوع') + '</span></button>';
    }
    h += '</div>';
  });
  // أيام الأسبوع المختار
  const W = weekObj(S.selWeek);
  const PH = PLAN.phases[W.phase - 1];
  h += '<h2>المرحلة ' + W.phase + ' • الأسبوع ' + W.local + (W.deload ? ' — أسبوع تخفيف' : '') + (W.test ? ' — أسبوع الاختبارات' : '') + '</h2>';
  const pk = 'ph' + W.phase, pclosed = S.closed[pk] !== false;
  h += '<div class="sec' + (pclosed ? ' closed' : '') + '"><button class="sec-h" data-phinfo="' + pk + '">🎯 عن المرحلة ' + esc(PH.name) + ': ' + esc(PH.title) + '<span class="arr">◀</span></button><div class="sec-b"><div class="card">' +
    '<div>' + esc(PH.goal) + '</div><ul class="rules">' + PH.points.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
    '<div class="note warn"><b>شرط الدخول:</b> ' + esc(PH.entry) + '</div><div class="note"><b>علامة النجاح:</b> ' + esc(PH.success) + '</div></div></div></div>';
  W.days.forEach((d) => {
    const k = sk(S.selWeek, d.day);
    h += '<button class="day" data-go="' + k + '"><span class="badge ' + PH_COLORS[d.cls] + '">' + d.day + '</span>' +
      '<span class="sp"><span class="tt">' + esc(d.title) + '</span><br><span class="st">' + esc(d.dur || d.en) + '</span></span>' +
      (S.done[k] ? '<span class="chk" title="' + esc(S.done[k]) + '">✓</span>' : '') + '</button>';
    if (d.day === 2 || d.day === 4) h += '<div class="rest-day">— يوم راحة: الدقائق العشر + الروتين اليومي للليونة مساءً —</div>';
  });
  h += '</div>';
  return h;
}

/* ============ الجلسة ============ */
function roundText(ex, i) { return 'الجولة ' + (ORD[i] || (i + 1)) + ': ' + ex.each; }

function sessionExercises(w, d) {
  const day = dayObj(w, d), sleep = !!S.sleep[sk(w, d)];
  const out = [];
  day.blocks.forEach((b, bi) => {
    if (sleep && b.kind !== 'main') return;
    b.exs.forEach((ex, ei) => {
      if (sleep && ex.boom) return;
      out.push({ ex, bi, ei, sets: sleep ? Math.max(1, ex.sets - 1) : ex.sets });
    });
  });
  return out;
}

function checklist(prefix, items, k) {
  const c = S.checks[k] || {};
  return items.map((it, i) => {
    const id = prefix + i, on = !!c[id];
    return '<button class="it' + (on ? ' done' : '') + '" data-chk="' + id + '"><span class="box">' + (on ? '✓' : '') + '</span>' +
      '<span class="sp"><span class="nm">' + esc(it.ar) + '</span> <span class="en">' + esc(it.en) + '</span>' +
      (it.dose ? ' — <span class="dose">' + esc(it.dose) + '</span>' : '') +
      (it.how ? '<br><span class="how">' + esc(it.how) + '</span>' : '') + '</span></button>';
  }).join('');
}

function parseDur(s) {
  if (!s) return null;
  let m;
  if (/دقيقة واحدة/.test(s)) return 60;
  if (/دقيقتان|دقيقتين/.test(s)) return 120;
  if ((m = s.match(/(\d+)\s*ثانية/))) return +m[1];
  if ((m = s.match(/(\d+)\s*دقائق/))) return +m[1] * 60;
  if ((m = s.match(/(\d+)\s*دقيقة/))) return +m[1] * 60;
  return null;
}
/* يستخرج من خطوة الجري مؤقّت فترات إن أمكن */
function stepTimer(step) {
  let m = step.match(/(\d+)\s*جولات\s*×\s*(\d+)\s*ثانية،\s*راحة\s*(\d+)\s*ثانية/);
  if (m) return { rounds: +m[1], work: +m[2], rest: +m[3] };
  m = step.match(/^(\d+)\s*جولات:\s*(.+?)\s*سريع[^ ]*.*?ثم\s+(.+?)\s+(?:جري|مشي)/);
  if (m) { const wk = parseDur(m[2]), rs = parseDur(m[3]); if (wk && rs) return { rounds: +m[1], work: wk, rest: rs }; }
  m = step.match(/(\d+)\s*جولات(?::|\s*×).*?(?:متر|ثوان).*?ثم راحة\s*(.+?)\s*مشي/);
  if (m) { const rs = parseDur(m[2]); if (rs) return { rounds: +m[1], work: 0, rest: rs }; }
  m = step.match(/^(\d+)\s*جولات:.*?(?:اركض|بأقصى).*?ثم راحة\s*(.+?)\s*مشي/);
  if (m) { const rs = parseDur(m[2]); if (rs) return { rounds: +m[1], work: 0, rest: rs }; }
  return null;
}
function intervalQueue(t, name) {
  const q = [];
  for (let r = 1; r <= t.rounds; r++) {
    const lab = (name ? name + ' — ' : '') + 'الجولة ' + (ORD[r - 1] || r) + ' من ' + t.rounds;
    if (t.work) q.push({ type: 'work', secs: t.work, label: lab, sub: 'جهد' });
    else q.push({ type: 'work', manual: true, label: lab, sub: 'اركض، ثم اضغط «انتهيت»' });
    if (r < t.rounds) q.push({ type: 'rest', secs: t.rest, label: 'راحة', sub: 'التالي: الجولة ' + (ORD[r] || r + 1) });
  }
  return q;
}

function section(id, k, icon, title, cnt, body) {
  const closed = !!S.closed[k + ':' + id];
  return '<div class="sec' + (closed ? ' closed' : '') + '"><button class="sec-h" data-sec="' + id + '">' + icon + ' ' + title +
    (cnt ? ' <span class="cnt">' + cnt + '</span>' : '') + '<span class="arr">◀</span></button><div class="sec-b">' + body + '</div></div>';
}

function viewSession(w, d) {
  const day = dayObj(w, d), W = weekObj(w), k = sk(w, d);
  const wu = PLAN.wu[day.wu];
  const sleep = !!S.sleep[k];
  const c = S.checks[k] || {};
  let h = '<div class="top"><button class="back" data-back><span class="ltr">→</span></button><h1>م' + W.phase + ' • الأسبوع ' + W.local + ' — ' + DAYS_AR[d] + '</h1></div><div class="wrap">';
  h += '<div class="band ' + PH_COLORS[day.cls] + '"><div class="d">المرحلة ' + W.phase + (W.deload ? ' • أسبوع تخفيف' : '') + (W.test ? ' • أسبوع الاختبارات' : '') + '</div>' +
    '<div class="t">' + esc(day.title) + '</div><div class="d">' + esc(day.en) + (day.dur ? ' • ' + esc(day.dur) : '') + '</div></div>';
  if (S.done[k]) h += '<div class="note">✓ أنجزت هذه الجلسة في ' + esc(S.done[k]) + '</div>';
  if (!W.test) {
    h += '<button class="toggle' + (sleep ? ' on' : '') + '" data-sleep><span class="sw"></span><span class="sp">نمت أقل من 6 ساعات</span></button>';
    if (sleep) h += '<div class="note warn">تخفيف الليلة: حُذفت آخر جولة من كل تمرين، والتمارين الانفجارية، والجلسة المصغرة أو المتوسطة، والدقائق العشر إلا القرفصاء العميقة. وفي الجري: اجعل السريع هادئًا واحذف السرعة القصوى.</div>';
  }
  day.notes.forEach((n) => { h += '<div class="note' + (/قياس البداية|الاختبار القصير/.test(n) ? ' warn' : '') + '">' + esc(n) + '</div>'; });

  // الإحماء
  const wDone = wu.warm.filter((x, i) => c['w' + i]).length;
  h += section('warm', k, '🔥', 'الإحماء', wDone + '/' + wu.warm.length + ' • ' + esc(wu.warmTitle.replace(/^.*?\(/, '(')),
    checklist('w', wu.warm, k) + '<div class="small">بعد الإحماء ارتح دقيقة، ثم ابدأ.</div>');

  // الجري أو الاختبارات
  const runBlock = () => {
    if (!day.run) return '';
    let b = '';
    day.run.steps.forEach((s, i) => {
      const id = 'r' + i, on = !!c[id], t = stepTimer(s);
      b += '<div class="row"><button class="it' + (on ? ' done' : '') + '" data-chk="' + id + '"><span class="box">' + (on ? '✓' : '') + '</span><span class="sp nm" style="font-weight:400">' + esc(s) + '</span></button>' +
        (t ? '<button class="btn ghost" style="padding:6px 10px;font-size:14px" data-ivt="' + t.rounds + ',' + t.work + ',' + t.rest + '">⏱</button>' : '') + '</div>';
    });
    const n = day.run.steps.filter((s, i) => c['r' + i]).length;
    return section('run', k, W.test ? '📋' : '🏃', esc(day.run.title), n + '/' + day.run.steps.length, b);
  };

  // التمارين
  const exBlock = () => {
    const list = sessionExercises(w, d);
    if (!list.length) return '';
    const R = S.rounds[k] || {};
    let b = '', lastBlock = -1, num = 0, done = 0, total = 0;
    list.forEach((it, idx) => {
      const ex = it.ex, blk = day.blocks[it.bi];
      if (it.bi !== lastBlock) {
        lastBlock = it.bi;
        if (blk.title) b += '<div class="blk-h">➕ ' + esc(blk.title) + '</div>';
      }
      num++;
      const rk = it.bi + '.' + it.ei, rd = R[rk] || [];
      const nDone = rd.filter(Boolean).length;
      const complete = nDone >= it.sets;
      done += Math.min(nDone, it.sets); total += it.sets;
      b += '<div class="ex' + (complete ? ' complete' : '') + '"><div class="h"><span class="no">' + num + '</span><span class="sp"><span class="nm">' + esc(ex.ar) + '</span> <span class="en">' + esc(ex.en) + '</span></span>' + (complete ? '<span class="chk" style="color:var(--ok)">✓</span>' : '') + '</div>';
      if (ex.boom) b += '<div class="boom">⚡ انفجاري: كل تكرار بأقصى سرعة وقوة. إذا بطؤت الحركة فأوقف الجولة.</div>';
      b += '<div class="cue">' + esc(ex.cue) + '</div>';
      b += '<div class="meta">' + it.sets + ' جولات • ' + esc(ex.each) + ' • راحة ' + ex.rest + ' ث بين الجولات' + (ex.deload ? ' • تخفيف' : '') + '</div>' + (ex.load ? '<div class="boom" style="color:#bfe0ff">🎒 ' + esc(ex.load) + '</div>' : '');
      b += '<div class="rounds">';
      let firstOpen = -1;
      for (let r = 0; r < it.sets; r++) if (!rd[r] && firstOpen < 0) firstOpen = r;
      for (let r = 0; r < it.sets; r++) {
        b += '<button class="rd' + (rd[r] ? ' done' : '') + (r === firstOpen ? ' next' : '') + '" data-rd="' + idx + ',' + r + '"><b>' + (rd[r] ? '✓ ' : '') + 'الجولة ' + (ORD[r] || r + 1) + '</b>' + esc(ex.each) + (ex.hold && !rd[r] ? '<br>⏱ اضغط للتثبيت' : '') + '</button>';
      }
      b += '</div>';
      const tt = ex.trans === 120 ? 'دقيقتان' : (ex.trans === 180 ? '3 دقائق' : ex.trans + ' ثانية');
      b += '<div class="trans">' + (idx < list.length - 1 ? '⏱ بعد الجولة الأخيرة: راحة ' + tt + '، ثم التمرين التالي.' : '⏱ هذا آخر تمرين في الجلسة.') + '</div></div>';
    });
    return section('ex', k, '💪', 'التمارين', done + '/' + total + ' جولة', b);
  };

  if (day.cls === 'run' || day.cls === 'long' || W.test) h += runBlock() + exBlock();
  else h += exBlock() + runBlock();

  if (day.d10) {
    const items = sleep ? day.d10.filter((x) => /القرفصاء/.test(x.ar)) : day.d10;
    const dd = items.filter((x, i) => c['t' + i]).length;
    h += section('d10', k, '⏳', 'الدقائق العشر', dd + '/' + items.length, checklist('t', items, k) + '<div class="small">' + esc(PLAN.d10rule) + '</div>');
  }
  // التمدد والليونة
  const cDone = wu.cool.filter((x, i) => c['c' + i]).length;
  h += section('cool', k, '🧘', 'التمدد بعد التمرين', cDone + '/' + wu.cool.length, checklist('c', wu.cool, k));
  const mDone = wu.mob.filter((x, i) => c['m' + i]).length;
  h += section('mob', k, '🤸', esc(wu.mobTitle), mDone + '/' + wu.mob.length, checklist('m', wu.mob, k) + '<div class="note">' + esc(wu.tail) + '</div>');

  h += S.done[k]
    ? '<button class="btn ghost full" data-undone>إلغاء علامة الإنجاز</button>'
    : '<button class="btn ok full" data-finish>✓ أنهيت الجلسة</button>';
  h += '<div style="height:20px"></div></div>';
  return h;
}

function tapRound(w, d, idx, r) {
  const k = sk(w, d), list = sessionExercises(w, d), it = list[idx];
  if (!it) return;
  const ex = it.ex, rk = it.bi + '.' + it.ei;
  S.rounds[k] = S.rounds[k] || {};
  const rd = S.rounds[k][rk] = S.rounds[k][rk] || [];
  if (rd[r]) { rd[r] = false; save(); render(); return; }
  const mark = () => { rd[r] = true; save(); };
  const isLastRound = r >= it.sets - 1 || rd.filter(Boolean).length + 1 >= it.sets;
  const next = list[idx + 1];
  const restPhase = () => {
    if (!isLastRound) return [{ type: 'rest', secs: ex.rest, label: 'راحة بين الجولات', sub: 'التالي: ' + ex.ar + ' — الجولة ' + (ORD[r + 1] || r + 2) }];
    if (next) return [{ type: 'rest', secs: ex.trans, label: 'راحة قبل التمرين التالي', sub: 'التالي: ' + next.ex.ar }];
    return [];
  };
  if (ex.hold) {
    timerStart([{ type: 'hold', secs: ex.n, label: 'ثبّت — ' + ex.ar, sub: 'الجولة ' + (ORD[r] || r + 1), onEnd: mark }].concat(restPhase()));
  } else {
    mark();
    const q = restPhase();
    if (q.length) timerStart(q);
    else { toast('أحسنت! انتهت التمارين، انتقل إلى التمدد.'); render(); }
  }
}

/* ============ الأدوات ============ */
function viewTools() {
  const t = S.ivt || { work: 30, rest: 60, rounds: 5 };
  let h = '<div class="top"><h1>⏱ مؤقّت الفترات</h1></div><div class="wrap">';
  h += '<div class="card"><div class="fld"><label>وقت الجهد (ثانية) — اكتب 0 للجري بالمسافة</label><input id="iv-w" type="number" inputmode="numeric" value="' + t.work + '"></div>' +
    '<div class="fld"><label>وقت الراحة (ثانية)</label><input id="iv-r" type="number" inputmode="numeric" value="' + t.rest + '"></div>' +
    '<div class="fld"><label>عدد الجولات</label><input id="iv-n" type="number" inputmode="numeric" value="' + t.rounds + '"></div>' +
    '<button class="btn full" data-ivstart>ابدأ ▶</button></div>';
  h += '<h2>اختصارات</h2><div class="grid2">' +
    [['رفع الركبتين', 30, 60, 5], ['فترات دقيقة/دقيقتين', 60, 120, 6], ['فترات دقيقتين', 120, 120, 5], ['200 متر + راحة 90', 0, 90, 6], ['تعلق ثابت 30', 30, 60, 3], ['بلانك 75', 75, 60, 3]]
      .map((p) => '<button class="btn ghost" data-ivpre="' + p[1] + ',' + p[2] + ',' + p[3] + '">' + p[0] + '<br><span class="small">' + p[3] + ' × ' + (p[1] || 'مسافة') + ' / ' + p[2] + '</span></button>').join('') +
    '</div>';
  h += '<h2>مؤقّت راحة سريع</h2><div class="grid2">' +
    [45, 60, 75, 90, 120, 180].map((s) => '<button class="btn ghost" data-rest="' + s + '">' + (s >= 120 ? s / 60 + ' دقائق' : s + ' ثانية') + '</button>').join('') + '</div>';
  h += '</div>';
  return h;
}

/* ============ السجلّ ============ */
const MEASURES = [
  ['pu', 'أقصى عقلات نظيفة', 'Pull-ups'],
  ['dh', 'أقصى تعلق ثابت (ثانية)', 'Dead Hang'],
  ['epu', 'عقلات سريعة متتالية', 'Explosive Pull-ups'],
  ['psh', 'أقصى ضغط عادي', 'Push-ups'],
  ['dia', 'أقصى ضغط ألماس', 'Diamond Push-ups'],
  ['pl', 'أقصى بلانك (ثانية)', 'Plank'],
  ['pw', 'المشي باليدين المتتالي', 'Plank Walkout'],
  ['sq', 'سكوات في 60 ثانية', 'Squats / 60s'],
  ['ws', 'جلوس الحائط (ثانية)', 'Wall Sit'],
  ['bj', 'القفزة العريضة (سم)', 'Broad Jump'],
  ['hk', 'رفع الركبتين 30 ث (لمسات اليمنى)', 'High Knees'],
  ['t', 'متوسط الوتيرة T (دقيقة:ثانية)', 'Calibration Pace'],
  ['k3', 'زمن 3 كم', '3 km'],
  ['r35', 'مسافة جري 35 دقيقة (كم)', '35-min Run'],
  ['tt', 'لمس أصابع القدم (سم متبقية)', 'Toe Touch'],
  ['ds', 'القرفصاء العميقة (ثانية)', 'Deep Squat'],
];
function paceSec(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})[:.](\d{1,2})$/);
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}
function paceFmt(sec) { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

function viewRecords() {
  const r = S.rec;
  let h = '<div class="top"><h1>📊 السجلّ</h1></div><div class="wrap">';
  // الوتائر
  const T = paceSec(S.T || (r.t && (r.t.p4 || r.t.p3 || r.t.p2 || r.t.p1)));
  h += '<div class="card"><div class="fld"><label><b>رقمك T</b> (متوسط وتيرة آخر اختبار جري)<br><span class="small">مثل 5:33</span></label><input id="Tin" value="' + esc(S.T || '') + '" placeholder="5:00"></div>';
  if (T) {
    h += '<div class="grid2" style="margin-top:8px">' +
      '<div class="pace"><span class="z">🟢 هادئ</span><b>' + paceFmt(T + 60) + ' – ' + paceFmt(T + 90) + '</b></div>' +
      '<div class="pace"><span class="z">🟡 ثابت</span><b>' + paceFmt(T - 5) + ' – ' + paceFmt(T + 10) + '</b></div>' +
      '<div class="pace"><span class="z">🟠 فترات سريعة</span><b>' + paceFmt(T - 45) + ' – ' + paceFmt(T - 30) + '</b></div>' +
      '<div class="pace"><span class="z">⚡ انطلاقات (100 م)</span><b>24–28 s</b></div></div>';
  } else h += '<div class="small">اكتب رقمك T لتظهر وتائرك.</div>';
  h += '</div>';
  // الوزن
  h += '<h2>الوزن</h2><div class="card"><div class="fld"><label>وزن اليوم (كغ)</label><input id="wt" type="number" inputmode="decimal" step="0.1"><button class="btn" data-addw style="padding:6px 12px">حفظ</button></div>';
  if (S.weights.length) {
    h += '<div class="hist">' + S.weights.slice(-8).reverse().map((x, i) => '<div class="row"><span class="ltr">' + esc(x.v) + ' كغ</span><span class="sp"></span><span>' + esc(x.d) + '</span><button data-delw="' + (S.weights.length - 1 - i) + '" style="color:var(--red);padding:0 8px">✕</button></div>').join('') + '</div>';
  }
  h += '</div>';
  // القياسات
  h += '<h2>الاختبارات في كل مرحلة</h2><div class="card">';
  h += '<div class="row small" style="padding-bottom:4px"><span class="sp"></span>' + ['م١', 'م٢', 'م٣', 'م٤'].map((t) => '<span style="width:52px;text-align:center">' + t + '</span>').join('') + '</div>';
  PLAN.measures.forEach((m) => {
    const v = r[m[0]] || {};
    h += '<div class="fld"><label>' + esc(m[1]) + '<br><span class="en">' + esc(m[2]) + '</span></label>' +
      [1, 2, 3, 4].map((i) => '<input class="m4" data-rec="' + m[0] + '.p' + i + '" value="' + esc(v['p' + i] || '') + '">').join('') + '</div>';
  });
  h += '</div>';
  // نسخ احتياطي
  h += '<h2>نسخة احتياطية</h2><div class="card"><div class="small">قبل حذف التطبيق أو تغيير الهاتف، انسخ بياناتك واحفظها، ثم ألصقها هنا لاستعادتها.</div>' +
    '<button class="btn ghost full" data-export>نسخ بياناتي</button><textarea id="imp" style="width:100%;height:70px;margin-top:8px;background:var(--card2);color:var(--tx);border:1px solid var(--line);border-radius:10px;direction:ltr" placeholder="ألصق النسخة هنا"></textarea>' +
    '<button class="btn ghost full" data-import>استعادة البيانات</button></div>';
  h += '</div>';
  return h;
}

/* ============ القواعد ============ */
function viewRules() {
  return '<div class="top"><h1>📘 قواعد السنة</h1></div><div class="wrap">' +
    '<h3>ترتيب الجلسة</h3><ul class="rules"><li>⚡ الانفجار أولًا وأنت منتعش، ثم القوة والمهارة، ثم الأوتار (ثبات ونزول بطيء) في الآخر.</li></ul>' +
    '<h3>الجهد</h3><ul class="rules"><li>اترك تكرارًا إلى ثلاثة في كل جولة، ولا فشل إلا في الاختبارات.</li>' +
    '<li>الأوزان بالحقيبة تقديرية: اختر الوزن الذي يترك لك تكرارًا أو اثنين.</li></ul>' +
    '<h3>البليومترك</h3><ul class="rules"><li>العدّ بملامسات القدم للأرض: المرحلة الأولى 60 إلى 90، والثانية 80 إلى 110، والثالثة 90 إلى 120 أعلى شدة، والرابعة 80 إلى 100.</li>' +
    '<li>الهبوط ناعم على مقدّمة القدم ثم الكعب، والركبتان في اتجاه الأصابع.</li><li>إذا ثقل الهبوط أو قصرت المسافة فأوقف الجولة.</li><li>اقفز على عشب أو تراب إن وجدت، لا على البلاط.</li></ul>' +
    '<h3>الأوتار</h3><ul class="rules"><li>ألم خفيف حتى 3 من 10 يزول في اليوم التالي مقبول. أما الألم في صباح اليوم التالي فعلامة لتخفيف القفز أسبوعًا والإبقاء على الثبات والنزول البطيء.</li>' +
    '<li>إن استمر الألم أسبوعين فراجع أخصائي علاج طبيعي.</li></ul>' +
    '<h3>الاختبار القصير كل 4 أسابيع</h3><ul class="rules"><li>في الأسبوعين 4 و 8: أقصى عقلات في أول اليوم الأول، وأقصى ضغط في أول اليوم الثالث.</li>' +
    '<li>زيادة عقلتين أو أكثر ← أضف تكرارًا لكل جولة في السحب. زيادة 3 ضغطات أو أكثر ← أضف تكرارين لكل جولة في الدفع. وإن نقص الرقم فأعد أرقام الأسابيع الثلاثة السابقة.</li></ul>' +
    '<h3>الدقائق العشر</h3><ul class="rules"><li>' + esc(PLAN.d10rule) + '</li></ul>' +
    '<h3>النوم 😴</h3><ul class="rules"><li>ليلة أقل من 6 ساعات: فعّل زر «نمت أقل من 6 ساعات» في الجلسة.</li><li>3 ليالٍ قليلة النوم في أسبوع: اجعله أسبوع تخفيف.</li></ul>' +
    '<h3>الجري بالساعة 🏃</h3><ul class="rules"><li>🟢 هادئ: أبطأ من T بـ 60 إلى 90 ثانية. 🟡 ثابت: T. 🟠 فترات: أسرع من T بـ 30 إلى 45 ثانية.</li><li>رقمك T يتجدّد في كل أسبوع اختبارات، وتكتبه في صفحة السجلّ.</li></ul>' +
    '<h3>الأمان ⚠️</h3><ul class="rules"><li>توقّف فورًا وراجع الطبيب عند ألم في الصدر أو دوخة شديدة أو ألم حاد.</li></ul><div style="height:10px"></div></div>';
}

/* ============ الرسم والأحداث ============ */
function render() {
  let h = '';
  if (VIEW.name === 'home') h = viewHome();
  else if (VIEW.name === 'session') h = viewSession(VIEW.w, VIEW.d);
  else if (VIEW.name === 'tools') h = viewTools();
  else if (VIEW.name === 'records') h = viewRecords();
  else if (VIEW.name === 'rules') h = viewRules();
  $('#app').innerHTML = h;
  document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === (VIEW.name === 'session' ? 'home' : VIEW.name)));
}

document.addEventListener('click', (e) => {
  audio();
  const t = e.target.closest('button'); if (!t) return;
  const ds = t.dataset;
  if (ds.tab) { tab(ds.tab); return; }
  if (ds.go) { const [w, d] = ds.go.split('-').map(Number); go({ name: 'session', w, d }); return; }
  if (ds.week) { S.selWeek = +ds.week; save(); render(); return; }
  if (ds.phinfo) { S.closed[ds.phinfo] = S.closed[ds.phinfo] === false ? true : false; save(); render(); return; }
  if ('back' in ds) { window.onAndroidBack(); return; }
  if (t.id === 'tm-skip') { const p = TM.q[TM.i]; if (p && !p.manual) beep(880, 120); timerNext(); return; }
  if (t.id === 'tm-pause') { timerPause(); return; }
  if (t.id === 'tm-add') { timerAdd(15); return; }
  if (t.id === 'tm-close') { timerClose(); return; }
  if (VIEW.name === 'session') {
    const k = sk(VIEW.w, VIEW.d);
    if (ds.chk) { S.checks[k] = S.checks[k] || {}; S.checks[k][ds.chk] = !S.checks[k][ds.chk]; save(); render(); return; }
    if (ds.sec) { const ck = k + ':' + ds.sec; S.closed[ck] = !S.closed[ck]; save(); render(); return; }
    if ('sleep' in ds) { S.sleep[k] = !S.sleep[k]; save(); render(); return; }
    if (ds.rd) { const [i, r] = ds.rd.split(',').map(Number); tapRound(VIEW.w, VIEW.d, i, r); return; }
    if (ds.ivt) { const [n, wk, rs] = ds.ivt.split(',').map(Number); timerStart(intervalQueue({ rounds: n, work: wk, rest: rs })); return; }
    if ('finish' in ds) { S.done[k] = today(); const nx = nextSession(); if (nx) S.selWeek = nx.w; save(); toast('أحسنت! سُجّلت الجلسة ✓'); tab('home'); return; }
    if ('undone' in ds) { delete S.done[k]; save(); render(); return; }
  }
  if (VIEW.name === 'tools') {
    if ('ivstart' in ds) {
      const wk = Math.max(0, +$('#iv-w').value || 0), rs = Math.max(0, +$('#iv-r').value || 0), n = Math.max(1, +$('#iv-n').value || 1);
      S.ivt = { work: wk, rest: rs, rounds: n }; save();
      timerStart(intervalQueue({ rounds: n, work: wk, rest: rs })); return;
    }
    if (ds.ivpre) { const [wk, rs, n] = ds.ivpre.split(',').map(Number); S.ivt = { work: wk, rest: rs, rounds: n }; save(); timerStart(intervalQueue({ rounds: n, work: wk, rest: rs })); return; }
    if (ds.rest) { timerStart([{ type: 'rest', secs: +ds.rest, label: 'راحة', sub: '' }]); return; }
  }
  if (VIEW.name === 'records') {
    if ('addw' in ds) { const v = parseFloat($('#wt').value); if (v > 20 && v < 300) { S.weights.push({ v, d: today() }); save(); render(); toast('حُفظ الوزن'); } return; }
    if (ds.delw) { S.weights.splice(+ds.delw, 1); save(); render(); return; }
    if ('export' in ds) {
      const txt = JSON.stringify(S);
      const ta = $('#imp'); ta.value = txt; ta.select();
      try { if (window.Android && window.Android.copy) window.Android.copy(txt); else document.execCommand('copy'); toast('نُسخت البيانات'); } catch (err) { toast('انسخ النص من المربع'); }
      return;
    }
    if ('import' in ds) {
      try { const o = JSON.parse($('#imp').value); if (o && typeof o === 'object' && o.done) { localStorage.setItem(KEY, JSON.stringify(o)); S = load(); render(); toast('استُعيدت البيانات'); } else toast('النص غير صالح'); } catch (err) { toast('النص غير صالح'); }
      return;
    }
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.rec) {
    const [m, f] = t.dataset.rec.split('.');
    S.rec[m] = S.rec[m] || {}; S.rec[m][f] = t.value.trim(); save();
    if (m === 't') render();
  }
  if (t.id === 'Tin') { S.T = t.value.trim(); save(); render(); }
});

render();
