'use strict';
/* =====================================================================
   واجهة «فنون التدريب»
   ===================================================================== */
const KEY = 'funoon_v1';
const $ = (s, el) => (el || document).querySelector(s);
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = (o) => JSON.parse(JSON.stringify(o));
const today = () => { const t = new Date(); return t.getFullYear() + '/' + (t.getMonth() + 1) + '/' + t.getDate(); };

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
  s = s || {};
  s.workouts = s.workouts || [];
  s.history = s.history || [];
  if (!s.seeded) { s.workouts = sampleWorkouts().concat(s.workouts); s.seeded = true; }
  s.filter = s.filter || 'الكل';
  return s;
}
let DB = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { /* ignore */ } }
save();

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============ الصوت والاهتزاز ============ */
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function beep(freq, ms, vol) {
  const ac = audio(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime, d = (ms || 150) / 1000;
  o.type = 'sine'; o.frequency.value = freq || 880;
  o.connect(g); g.connect(ac.destination);
  g.gain.setValueAtTime(vol || 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.start(t); o.stop(t + d + 0.02);
}
function vibrate(ms) {
  try { if (window.Android && window.Android.vibrate) { window.Android.vibrate(ms); return; } } catch (e) { /* ignore */ }
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
}
function sigStart() { beep(1046, 260, 0.35); vibrate(250); }
function sigTick() { beep(740, 110, 0.25); vibrate(70); }
function sigEnd() { beep(988, 200, 0.35); setTimeout(() => beep(988, 200, 0.35), 260); setTimeout(() => beep(1318, 360, 0.35), 520); vibrate(600); }

/* ============ التنقّل ============ */
let VIEW = { name: 'list' };
const HIST = [];
function go(v) { HIST.push(VIEW); VIEW = v; render(); window.scrollTo(0, 0); }
function tab(name) { HIST.length = 0; VIEW = { name }; render(); window.scrollTo(0, 0); }
window.onAndroidBack = function () {
  if (VIEW.name === 'player') { if (P && !P.finished) { if (confirm('إنهاء التمرين الآن؟')) playerFinish(true); } else tab('list'); return true; }
  if (VIEW.name === 'edit') { if (confirm('الخروج دون حفظ؟')) { HIST.length ? (VIEW = HIST.pop(), render()) : tab('list'); } return true; }
  if (VIEW.name === 'import') { PARSED = null; }
  if (HIST.length) { VIEW = HIST.pop(); render(); return true; }
  if (VIEW.name !== 'list') { tab('list'); return true; }
  return false;
};

/* ============ قائمة التمارين ============ */
function exCount(n) { return n === 1 ? 'تمرين واحد' : (n === 2 ? 'تمرينان' : n + ' تمارين'); }
function viewList() {
  const cats = ['الكل'].concat(CATEGORIES.filter((c) => DB.workouts.some((w) => w.cat === c)));
  if (cats.indexOf(DB.filter) < 0) DB.filter = 'الكل';
  let h = '<div class="top"><h1>💪 فنون التدريب</h1><button class="btn sm ghost" data-import-view>📋 لصق</button><button class="btn sm" data-new>+ جديد</button></div><div class="wrap">';
  h += '<div class="fchips">' + cats.map((c) => '<button class="fc' + (DB.filter === c ? ' on' : '') + '" data-filter="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>';
  const list = DB.workouts.filter((w) => DB.filter === 'الكل' || w.cat === DB.filter);
  if (!list.length) h += '<div class="empty">لا توجد تمارين بعد.<br><button class="btn" data-new>+ أنشئ أول تمرين</button></div>';
  list.forEach((w) => {
    const f = FORMATS[w.format] || {};
    const last = DB.history.filter((x) => x.wid === w.id).slice(-1)[0];
    h += '<div class="wcard"><div class="wh"><span class="fic">' + (f.ic || '•') + '</span><span class="sp"><b>' + esc(w.name) + '</b><br>' +
      '<span class="small">' + esc(f.ar || '') + ' • ' + esc(w.cat || '') + ' • ' + exCount(w.exercises.length) + ' • نحو ' + estimateTxt(clone(w)) + '</span>' +
      (last ? '<br><span class="small ok">آخر مرة: ' + esc(last.date) + (last.result ? ' — ' + esc(last.result) : '') + '</span>' : '') + '</span></div>' +
      '<div class="wex">' + w.exercises.slice(0, 4).map((e) => '• ' + esc(e.name) + ': ' + esc(describe(e))).join('<br>') + (w.exercises.length > 4 ? '<br>…' : '') + '</div>' +
      '<div class="wbtns"><button class="btn sm" data-play="' + w.id + '">▶ ابدأ</button><button class="btn sm ghost" data-edit="' + w.id + '">✎ تعديل</button>' +
      '<button class="btn sm ghost" data-dup="' + w.id + '">⧉ نسخ</button><button class="btn sm ghost danger" data-del="' + w.id + '">🗑</button></div></div>';
  });
  h += '</div>';
  return h;
}

/* ============ المنشئ ============ */
let EDIT = null;
function newEx() { return { name: '', mode: 'reps', reps: 10, secs: 30, hold: 3, where: '', gap: 3, dist: 400, pace: '', sets: 3, rest: 90, side: false, tempo: '', load: '', notes: '' }; }
function startEdit(w, fmt) {
  EDIT = w ? clone(w) : { id: '', name: '', cat: 'كاليستنكس', format: fmt || 'straight', p: {}, exercises: [newEx()] };
  EDIT.exercises = EDIT.exercises.map((e) => Object.assign(newEx(), e));
  go({ name: 'edit' });
}
function fmtDefaults() {
  const f = FORMATS[EDIT.format];
  f.params.forEach((pp) => { if (EDIT.p[pp.k] == null || EDIT.p[pp.k] === '') EDIT.p[pp.k] = pp.def; });
}

function exFieldsHtml(ex, i) {
  const f = FORMATS[EDIT.format];
  const seqFmt = ['ladder', 'pyramid', 'deathby'].indexOf(EDIT.format) >= 0;
  const timeFmt = EDIT.format === 'tabata' || (EDIT.format === 'intervals' && +EDIT.p.work > 0);
  const inp = (k, label, type, ph, w) => '<label class="ef' + (w ? ' w' : '') + '"><span>' + label + '</span><input data-i="' + i + '" data-f="' + k + '" ' +
    (type === 'n' ? 'type="number" inputmode="decimal" min="0"' : 'type="text"') + ' value="' + esc(ex[k]) + '" placeholder="' + esc(ph || '') + '"></label>';
  let h = '<div class="modes">' + Object.keys(MODES).map((m) => '<button class="md' + (ex.mode === m ? ' on' : '') + '" data-mode="' + m + '" data-i="' + i + '">' + MODES[m].ic + ' ' + MODES[m].ar + '</button>').join('') + '</div>';
  if (timeFmt) h += '<div class="hint">في هذا النوع يأتي الوقت من إعدادات النوع، ويكفي اسم التمرين.</div>';
  if (seqFmt) h += '<div class="hint">العدد في هذا النوع يأتي من الدرجات أو الدقائق، لا من خانة التكرارات.</div>';
  h += '<div class="efs">';
  const m = ex.mode;
  if ((m === 'reps' || m === 'reps_hold' || m === 'time_reps') && !seqFmt) h += inp('reps', m === 'time_reps' ? 'الهدف (تكرار)' : 'التكرارات', 'n');
  if (m === 'time' || m === 'time_reps') h += inp('secs', 'الوقت (ثانية)', 'n');
  if (m === 'reps_hold') { h += inp('hold', 'ثبات كل تكرار (ث)', 'n') + inp('where', 'مكان الثبات', 't', 'أعلى البار') + inp('gap', 'وقت النزول والصعود بين التكرارات (ث)', 'n'); }
  if (m === 'distance') { h += inp('dist', 'المسافة (متر)', 'n') + inp('pace', 'الوتيرة المستهدفة', 't', '5:00 دقيقة/كم'); }
  if (f.exFields && f.exFields.indexOf('sets') >= 0) h += inp('sets', 'الجولات', 'n') + inp('rest', 'راحة بين الجولات (ث)', 'n');
  h += inp('tempo', 'الإيقاع (اختياري)', 't', '3-1-1') + inp('load', 'وزن إضافي (اختياري)', 't', 'حقيبة 5 كغ');
  h += inp('notes', 'ملاحظة (اختياري)', 't', 'قبضة واسعة…', true);
  h += '</div><button class="tg' + (ex.side ? ' on' : '') + '" data-side="' + i + '"><span class="sw"></span> لكل جهة (يمين ثم يسار)</button>';
  return h;
}

function viewEdit() {
  fmtDefaults();
  const f = FORMATS[EDIT.format];
  let h = '<div class="top"><button class="back" data-back><span class="ltr">→</span></button><h1>' + (EDIT.id ? 'تعديل التمرين' : 'تمرين جديد') + '</h1><button class="btn sm ok" data-save>حفظ</button></div><div class="wrap">';
  h += '<label class="ef w"><span>اسم التمرين</span><input id="w-name" type="text" value="' + esc(EDIT.name) + '" placeholder="مثلًا: يوم السحب"></label>';
  h += '<label class="ef w"><span>الفئة</span><select id="w-cat">' + CATEGORIES.map((c) => '<option' + (EDIT.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>';
  h += '<h2>نوع التدريب</h2><div class="fgrid">' + Object.keys(FORMATS).map((k) => '<button class="fbtn' + (EDIT.format === k ? ' on' : '') + '" data-fmt="' + k + '"><span class="fic">' + FORMATS[k].ic + '</span>' + esc(FORMATS[k].ar) + '</button>').join('') + '</div>';
  h += '<div class="fdesc"><b>' + esc(f.ar) + '</b> <span class="en">' + esc(f.en) + '</span><br>' + esc(f.desc) + '</div>';
  h += '<div class="efs">' + f.params.map((pp) => '<label class="ef"><span>' + esc(pp.ar) + '</span><input data-p="' + pp.k + '" type="number" inputmode="decimal" min="0" value="' + esc(EDIT.p[pp.k]) + '"></label>').join('') + '</div>';
  if (EDIT.format === 'deathby' && EDIT.exercises.length > 1) h += '<div class="hint">في «الموت بالدقيقة» يُستعمل التمرين الأول فقط.</div>';
  h += '<h2>التمارين</h2>';
  EDIT.exercises.forEach((ex, i) => {
    h += '<div class="excard"><div class="exh"><span class="no">' + (i + 1) + '</span><input class="exname" data-i="' + i + '" data-f="name" list="lib" value="' + esc(ex.name) + '" placeholder="اكتب اسم التمرين أو اختر من القائمة">' +
      '<button class="ib" data-up="' + i + '">▲</button><button class="ib" data-down="' + i + '">▼</button><button class="ib danger" data-rm="' + i + '">✕</button></div>' + exFieldsHtml(ex, i) +
      '<div class="prev" id="pv' + i + '">' + esc(describe(ex)) + '</div></div>';
  });
  h += '<button class="btn ghost full" data-addex>+ إضافة تمرين</button>';
  h += '<div class="card"><b>المدة التقديرية:</b> <span id="est">نحو ' + estimateTxt(clone(EDIT)) + '</span><br><button class="btn ghost sm" data-steps style="margin-top:6px">عرض الخطوات</button><div id="steps"></div></div>';
  h += '<button class="btn ok full" data-save>💾 حفظ التمرين</button><div style="height:24px"></div></div>';
  h += '<datalist id="lib">' + LIBRARY.map((n) => '<option value="' + esc(n) + '">').join('') + '</datalist>';
  return h;
}
function refreshPreview() {
  EDIT.exercises.forEach((ex, i) => { const el = $('#pv' + i); if (el) el.textContent = describe(ex); });
  const e = $('#est'); if (e) e.textContent = 'نحو ' + estimateTxt(clone(EDIT));
}
function saveEdit() {
  EDIT.name = (EDIT.name || '').trim() || (FORMATS[EDIT.format].ar + ' — ' + today());
  EDIT.exercises = EDIT.exercises.filter((e) => (e.name || '').trim());
  if (!EDIT.exercises.length) { toast('أضف تمرينًا واحدًا على الأقل باسمه'); return; }
  if (!EDIT.id) { EDIT.id = uid(); DB.workouts.unshift(clone(EDIT)); }
  else { const i = DB.workouts.findIndex((w) => w.id === EDIT.id); if (i >= 0) DB.workouts[i] = clone(EDIT); else DB.workouts.unshift(clone(EDIT)); }
  save(); toast('حُفظ التمرين ✓'); tab('list');
}


/* ============ لصق تمرين مكتوب ============ */
let PARSED = null;
const IMPORT_EXAMPLE = 'يوم السحب\nعقلة 4 عدات مع ثبات 4 ثوان في أعلى البار، 3 جولات راحة 90 ثانية\nتعلق ثابت 3×30 ثانية راحة 60\nرفع الركبتين من التعلق 3×12 راحة دقيقة\nبلانك جانبي 2×40 ثانية لكل جهة';
function viewImport() {
  let h = '<div class="top"><button class="back" data-back><span class="ltr">→</span></button><h1>📋 لصق تمرين مكتوب</h1></div><div class="wrap">';
  h += '<div class="small">الصق التمرين كما كتبته في الملاحظات، كل تمرين في سطر، فيرتّبه التطبيق: العدّات والأوقات والثبات والجولات والراحة، ونوع التدريب والفئة.</div>';
  h += '<textarea id="imp-text" class="big" placeholder="مثال:\nعقلة 4 عدات مع ثبات 4 ثوان في أعلى البار، 3 جولات راحة 90\nضغط 3×15 راحة 60\nبلانك 3×45 ثانية">' + esc(DB.importText || '') + '</textarea>';
  h += '<div class="row" style="margin-top:8px"><button class="btn sm ghost" data-paste>📋 لصق من الحافظة</button><button class="btn sm ghost" data-example>مثال</button><button class="btn sm ghost" data-clear>مسح</button></div>';
  h += '<button class="btn full" data-parse>⚙ رتّب التمرين</button>';
  if (PARSED) {
    const w = PARSED.workout, f = FORMATS[w.format];
    h += '<div class="card hero" style="margin-top:14px"><div class="row"><span class="fic">' + f.ic + '</span><span class="sp"><b>' + esc(w.name) + '</b><br><span class="small">' + esc(f.ar) + ' • ' + esc(w.cat) + ' • نحو ' + estimateTxt(clone(w)) + '</span></span></div>';
    const pp = f.params.map((x) => esc(x.ar) + ': ' + esc(w.p[x.k])).join(' • ');
    h += '<div class="small" style="margin-top:6px">' + pp + '</div></div>';
    w.exercises.forEach((e, i) => {
      h += '<div class="excard"><div class="exh"><span class="no">' + (i + 1) + '</span><b class="sp">' + esc(e.name) + '</b><span class="small">' + esc(MODES[e.mode].ic + ' ' + MODES[e.mode].ar) + '</span></div>' +
        '<div class="prev">' + esc(describe(e)) + (w.format === 'straight' ? ' • ' + setsTxt(e.sets) + ' • راحة ' + e.rest + ' ث' : '') + '</div></div>';
    });
    if (PARSED.warnings.length) h += '<div class="card warnc">⚠️ ' + PARSED.warnings.map(esc).join('<br>⚠️ ') + '</div>';
    if (!w.exercises.length) h += '<div class="card warnc">لم أجد تمارين في النص. اكتب كل تمرين في سطر مع عدده أو وقته.</div>';
    else h += '<div class="row" style="margin-top:8px"><button class="btn ok sp" data-imp-save>💾 احفظه</button><button class="btn ghost sp" data-imp-edit>✎ راجع وعدّل</button><button class="btn ghost sp" data-imp-play>▶ ابدأ</button></div>';
  }
  h += '<h2>طريقة الكتابة</h2><div class="card"><ul class="rules">' +
    '<li>كل تمرين في سطر: <b>الاسم ثم العدد أو الوقت</b>، مثل «ضغط 15» أو «بلانك 45 ثانية».</li>' +
    '<li><b>الجولات:</b> «3×15» أو «3 جولات 15 عدة». و<b>الراحة:</b> «راحة 90» أو «راحة دقيقتين».</li>' +
    '<li><b>الثبات:</b> «عقلة 4 عدات مع ثبات 4 ثوان في أعلى البار».</li>' +
    '<li><b>الجري:</b> «جري 400 متر × 6 راحة 90 بوتيرة 4:50».</li>' +
    '<li><b>لكل جهة، والإيقاع، والوزن:</b> «اندفاع 10 لكل رجل»، «ضغط 12 إيقاع 3-1-1»، «سكوات 15 مع حقيبة 5 كغ».</li>' +
    '<li><b>نوع التدريب</b> في أول سطر: «EMOM 12 دقيقة»، «AMRAP 15 دقيقة»، «تاباتا»، «3 جولات دائرة»، «سلم 1 إلى 5»، «هرم 2 إلى 10»، «ضد الساعة»، «40 ثانية عمل 20 راحة 8 جولات».</li>' +
    '<li>أول سطر بلا أرقام يصبح اسم التمرين.</li></ul></div><div style="height:20px"></div></div>';
  return h;
}
function doParse() {
  const t = ($('#imp-text') || {}).value || '';
  DB.importText = t; save();
  if (!t.trim()) { toast('الصق نص التمرين أولًا'); return; }
  try { PARSED = parseWorkoutText(t); } catch (err) { PARSED = { workout: { name: '', format: 'straight', p: {}, exercises: [], cat: '' }, warnings: ['حدث خطأ في القراءة: ' + err.message] }; }
  render();
  setTimeout(() => { const c = $('.hero'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
}
function setsTxt(n) { n = +n; return n === 1 ? 'جولة واحدة' : (n === 2 ? 'جولتان' : (n <= 10 ? n + ' جولات' : n + ' جولة')); }
function parsedWorkout() { const w = clone(PARSED.workout); w.id = uid(); return w; }

/* ============ المشغّل ============ */
let P = null;
function fmt(sec) { sec = Math.max(0, Math.ceil(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
function startPlayer(w) {
  audio();
  const steps = compileWorkout(clone(w));
  if (!steps.length) { toast('لا خطوات في هذا التمرين'); return; }
  P = { w, steps, i: 0, t0: Date.now(), pausedAt: 0, pausedTotal: 0, paused: false, end: 0, swStart: 0, rounds: 0, lastSec: -1, finished: false, result: '' };
  stepTiming();
  go({ name: 'player' });
  stepSignal();
  P.iv = setInterval(tick, 200);
}
function stepNow() { return P.steps[P.i]; }
function stepTiming() {
  const s = stepNow(); if (!s) return;
  P.lastSec = -1; P.paused = false;
  if (s.secs) P.end = Date.now() + s.secs * 1000;
  P.swStart = Date.now();
}
function stepSignal() {
  const s = stepNow(); if (!s) return;
  if (s.type === 'work' || s.type === 'hold' || s.type === 'emom' || s.type === 'amrap' || s.type === 'stopwatch') sigStart();
  else if (s.type === 'manual') beep(660, 150, 0.3);
}
function enterStep() {
  stepTiming();
  stepSignal();
  paintPlayer();
}
function nextStep() {
  if (!P) return;
  if (P.i >= P.steps.length - 1) { playerFinish(false); return; }
  P.i++; enterStep();
}
function prevStep() { if (!P || P.i === 0) return; P.i--; enterStep(); }
function togglePause() {
  if (!P) return;
  if (!P.paused) { P.paused = true; P.pausedAt = Date.now(); }
  else { const d = Date.now() - P.pausedAt; P.end += d; P.swStart += d; P.pausedTotal += d; P.paused = false; }
  paintPlayer();
}
function add15() { if (P && stepNow().secs) { P.end += 15000; tick(); } }
function elapsedTotal() { return (Date.now() - P.t0 - P.pausedTotal - (P.paused ? Date.now() - P.pausedAt : 0)) / 1000; }

function tick() {
  if (!P || P.finished || VIEW.name !== 'player') return;
  const s = stepNow(); if (!s) return;
  const el = $('#pl-total'); if (el) el.textContent = fmt(elapsedTotal());
  if (P.paused) return;
  if (s.secs && s.type !== 'stopwatch') {
    const left = (P.end - Date.now()) / 1000;
    $('#pl-clock').textContent = fmt(left);
    $('#pl-bar').style.width = Math.min(100, 100 * (1 - left / s.secs)) + '%';
    const sec = Math.ceil(left);
    if (sec !== P.lastSec) { P.lastSec = sec; if (sec <= 3 && sec >= 1) sigTick(); }
    if (left <= 0) {
      sigEnd();
      if (s.type === 'amrap') { P.result = P.rounds + ' جولة'; playerFinish(false); return; }
      nextStep();
    }
  } else if (s.type === 'stopwatch') {
    const e = (Date.now() - P.swStart) / 1000;
    $('#pl-clock').textContent = fmt(e);
    if (s.cap && e >= s.cap) { sigEnd(); P.result = 'لم يكتمل قبل الحد (' + fmt(s.cap) + ')'; playerFinish(false); }
  } else {
    // يدوي: عدّاد تصاعدي صغير
    const e = (Date.now() - P.swStart) / 1000;
    const c = $('#pl-up'); if (c) c.textContent = fmt(e);
  }
}

function viewPlayer() {
  if (!P) return '';
  if (P.finished) {
    return '<div class="top"><h1>🏁 انتهى التمرين</h1></div><div class="wrap"><div class="card hero center"><div class="big2">' + esc(P.w.name) + '</div>' +
      '<div class="small">المدة: ' + fmt(P.total) + (P.result ? '<br>النتيجة: <b>' + esc(P.result) + '</b>' : '') + '</div></div>' +
      '<label class="ef w"><span>ملاحظة على هذا التمرين (اختياري)</span><input id="h-note" type="text" placeholder="كيف كان الأداء؟"></label>' +
      '<button class="btn ok full" data-hsave>💾 حفظ في السجلّ</button><button class="btn ghost full" data-hskip>رجوع دون حفظ</button></div>';
  }
  return '<div class="player"><div class="ptop"><button class="ib" data-pexit>✕</button><span class="sp center"><span id="pl-pos"></span></span><span class="ltr small" id="pl-total">0:00</span></div>' +
    '<div class="pbody"><div class="ptype" id="pl-type"></div><div class="plabel" id="pl-label"></div><div class="psub" id="pl-sub"></div>' +
    '<div class="pbig" id="pl-big"></div><div class="pclock" id="pl-clock"></div><div class="pbarw"><i id="pl-bar"></i></div><div class="pnote" id="pl-note"></div>' +
    '<div class="plist" id="pl-list"></div><div class="pnext" id="pl-next"></div></div>' +
    '<div class="pctl"><button class="pmain" id="pl-main" data-pmain></button><div class="prow"><button data-pprev>⏮ السابق</button><button data-ppause id="pl-pause">⏸ إيقاف</button><button data-padd>+15 ث</button><button data-pskip>التالي ⏭</button></div>' +
    '<button class="pend" data-pend id="pl-end"></button></div></div>';
}
const TYPE_AR = { manual: 'نفّذ', work: 'جهد', hold: 'ثبات', gap: 'استعد', rest: 'راحة', emom: 'بداية الفترة', amrap: 'AMRAP', stopwatch: 'ضد الساعة' };
function paintPlayer() {
  if (VIEW.name !== 'player' || !P || P.finished) return;
  const s = stepNow();
  $('.player').className = 'player t-' + s.type + (P.paused ? ' paused' : '');
  $('#pl-pos').textContent = 'الخطوة ' + (P.i + 1) + ' من ' + P.steps.length;
  $('#pl-type').textContent = TYPE_AR[s.type] || '';
  $('#pl-label').textContent = s.label || '';
  $('#pl-sub').textContent = s.sub || '';
  $('#pl-big').textContent = s.type === 'amrap' ? 'الجولات: ' + P.rounds : (s.big || '');
  $('#pl-note').textContent = s.note || '';
  $('#pl-list').innerHTML = s.list ? s.list.map((x) => '<div>• ' + esc(x) + '</div>').join('') : '';
  const nx = P.steps[P.i + 1];
  $('#pl-next').textContent = nx && s.type !== 'rest' ? 'التالي: ' + nx.label : '';
  if (s.type === 'manual') { $('#pl-clock').innerHTML = '<span class="small">الوقت</span> <span id="pl-up" class="ltr">0:00</span>'; $('#pl-bar').style.width = '0'; }
  else if (s.type === 'stopwatch') $('#pl-clock').textContent = '0:00';
  const main = $('#pl-main');
  main.textContent = s.type === 'manual' ? 'تم ✓' : s.type === 'amrap' ? '+ جولة' : s.type === 'stopwatch' ? 'انتهيت 🏁' : (s.type === 'rest' || s.type === 'gap' ? 'تخطَّ الراحة ⏭' : 'التالي ⏭');
  $('#pl-pause').textContent = P.paused ? '▶ متابعة' : '⏸ إيقاف';
  const end = $('#pl-end');
  end.textContent = s.deathby ? 'لم أكمل العدد — إنهاء' : (s.type === 'amrap' ? 'إنهاء الآن' : 'إنهاء التمرين');
  tick();
}
function playerMain() {
  const s = stepNow();
  if (s.type === 'amrap') { P.rounds++; beep(880, 120); vibrate(60); paintPlayer(); return; }
  if (s.type === 'stopwatch') { P.result = 'الزمن ' + fmt((Date.now() - P.swStart) / 1000); sigEnd(); playerFinish(false); return; }
  nextStep();
}
function playerFinish(early) {
  if (!P) return;
  const s = stepNow();
  if (s && s.deathby && !P.result) P.result = 'أكملت ' + P.i + ' دقيقة';
  if (s && s.type === 'amrap' && !P.result) P.result = P.rounds + ' جولة';
  if (early && !P.result) P.result = 'توقّف عند الخطوة ' + (P.i + 1) + ' من ' + P.steps.length;
  P.total = elapsedTotal();
  P.finished = true; clearInterval(P.iv);
  render();
}

/* ============ فنون التدريب ============ */
function viewFormats() {
  let h = '<div class="top"><h1>📘 فنون التدريب</h1></div><div class="wrap">';
  h += '<p class="small">كل نوع هنا يمكنك أن تبني عليه تمرينك. اضغط «أنشئ بهذا النوع» لتبدأ.</p>';
  Object.keys(FORMATS).forEach((k) => {
    const f = FORMATS[k];
    h += '<div class="card"><div class="row"><span class="fic">' + f.ic + '</span><b class="sp">' + esc(f.ar) + ' <span class="en">' + esc(f.en) + '</span></b></div><div class="small" style="margin:6px 0">' + esc(f.desc) + '</div>' +
      '<button class="btn sm" data-newfmt="' + k + '">+ أنشئ بهذا النوع</button></div>';
  });
  h += '<h2>أنواع التمرين الواحد</h2><div class="card"><ul class="rules">' +
    '<li><b>🔁 تكرارات:</b> عدد محدد، وتضغط «تم» حين تنهي.</li>' +
    '<li><b>⏱ وقت:</b> عمل أو ثبات لمدة محددة، والعدّ تلقائي.</li>' +
    '<li><b>🔁⏸ تكرارات + ثبات:</b> كل تكرار فيه ثبات بالثواني في مكان تحدّده، مثل 4 عقلات مع ثبات 4 ث في أعلى البار. المؤقّت يوجّهك في كل تكرار.</li>' +
    '<li><b>⏱🎯 وقت بهدف تكرارات:</b> مثل 30 ثانية والهدف 20 سكوات.</li>' +
    '<li><b>📏 مسافة:</b> مثل جري 400 متر بوتيرة محددة.</li>' +
    '<li>ولكل تمرين: «لكل جهة»، والإيقاع (مثل 3-1-1)، والوزن الإضافي، وملاحظة.</li></ul></div>';
  h += '<h2>أساليب أخرى وكيف تنفّذها هنا</h2>';
  EXTRA_METHODS.forEach((m) => { h += '<div class="card"><b>' + esc(m[0]) + '</b><div class="small">' + esc(m[1]) + '</div></div>'; });
  h += '</div>';
  return h;
}

/* ============ السجلّ ============ */
function viewHistory() {
  let h = '<div class="top"><h1>📊 السجلّ</h1></div><div class="wrap">';
  if (!DB.history.length) h += '<div class="empty">لم تسجّل أي تمرين بعد.</div>';
  DB.history.slice().reverse().forEach((x, ri) => {
    const i = DB.history.length - 1 - ri;
    h += '<div class="card"><div class="row"><b class="sp">' + esc(x.name) + '</b><span class="small">' + esc(x.date) + '</span><button class="ib danger" data-hdel="' + i + '">✕</button></div>' +
      '<div class="small">المدة: ' + esc(x.dur) + (x.result ? ' • ' + esc(x.result) : '') + (x.note ? '<br>📝 ' + esc(x.note) : '') + '</div></div>';
  });
  h += '<h2>نسخة احتياطية</h2><div class="card"><div class="small">قبل حذف التطبيق أو تغيير الهاتف انسخ بياناتك واحفظها، ثم ألصقها هنا لاستعادتها.</div>' +
    '<button class="btn ghost full" data-export>نسخ بياناتي</button><textarea id="imp" placeholder="ألصق النسخة هنا"></textarea><button class="btn ghost full" data-import>استعادة البيانات</button></div></div>';
  return h;
}

/* ============ الرسم ============ */
function render() {
  let h = '';
  if (VIEW.name === 'list') h = viewList();
  else if (VIEW.name === 'edit') h = viewEdit();
  else if (VIEW.name === 'player') h = viewPlayer();
  else if (VIEW.name === 'formats') h = viewFormats();
  else if (VIEW.name === 'history') h = viewHistory();
  else if (VIEW.name === 'import') h = viewImport();
  $('#app').innerHTML = h;
  document.body.classList.toggle('playing', VIEW.name === 'player' && P && !P.finished);
  document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === (VIEW.name === 'edit' || VIEW.name === 'player' || VIEW.name === 'import' ? 'list' : VIEW.name)));
  if (VIEW.name === 'player') paintPlayer();
}

/* ============ الأحداث ============ */
document.addEventListener('click', (e) => {
  audio();
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.tab) { if (VIEW.name === 'player' && P && !P.finished) { toast('أنهِ التمرين أولًا أو اضغط ✕'); return; } tab(d.tab); return; }
  if ('back' in d) { window.onAndroidBack(); return; }
  // القائمة
  if ('new' in d) { startEdit(null); return; }
  if ('importView' in d) { PARSED = null; go({ name: 'import' }); return; }
  if (VIEW.name === 'import') {
    if ('parse' in d) { doParse(); return; }
    if ('example' in d) { $('#imp-text').value = IMPORT_EXAMPLE; return; }
    if ('clear' in d) { $('#imp-text').value = ''; DB.importText = ''; PARSED = null; save(); render(); return; }
    if ('paste' in d) {
      let txt = '';
      try { if (window.Android && window.Android.paste) txt = window.Android.paste() || ''; } catch (err) { txt = ''; }
      if (txt) { $('#imp-text').value = txt; toast('لُصق النص'); return; }
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then((x) => { if (x) { $('#imp-text').value = x; toast('لُصق النص'); } else toast('الحافظة فارغة'); })
          .catch(() => toast('اضغط مطولًا في المربع ثم «لصق»'));
      } else toast('اضغط مطولًا في المربع ثم «لصق»');
      return;
    }
    if ('impSave' in d) { const w = parsedWorkout(); DB.workouts.unshift(w); save(); PARSED = null; DB.importText = ''; save(); toast('حُفظ التمرين ✓'); tab('list'); return; }
    if ('impEdit' in d) { const w = PARSED.workout; startEdit(Object.assign(clone(w), { id: '' })); return; }
    if ('impPlay' in d) { const w = parsedWorkout(); DB.workouts.unshift(w); save(); PARSED = null; startPlayer(w); return; }
  }
  if (d.newfmt) { startEdit(null, d.newfmt); return; }
  if (d.filter) { DB.filter = d.filter; save(); render(); return; }
  if (d.play) { const w = DB.workouts.find((x) => x.id === d.play); if (w) startPlayer(w); return; }
  if (d.edit) { const w = DB.workouts.find((x) => x.id === d.edit); if (w) startEdit(w); return; }
  if (d.dup) { const w = DB.workouts.find((x) => x.id === d.dup); if (w) { const c = clone(w); c.id = uid(); c.name += ' (نسخة)'; DB.workouts.splice(DB.workouts.indexOf(w) + 1, 0, c); save(); render(); toast('نُسخ التمرين'); } return; }
  if (d.del) { const w = DB.workouts.find((x) => x.id === d.del); if (w && confirm('حذف «' + w.name + '»؟')) { DB.workouts = DB.workouts.filter((x) => x.id !== d.del); save(); render(); } return; }
  // المنشئ
  if (VIEW.name === 'edit') {
    if ('save' in d) { saveEdit(); return; }
    if (d.fmt) { EDIT.format = d.fmt; render(); return; }
    if (d.mode) { EDIT.exercises[+d.i].mode = d.mode; render(); return; }
    if (d.side) { const ex = EDIT.exercises[+d.side]; ex.side = !ex.side; render(); return; }
    if ('addex' in d) { const ne = newEx(); if (EDIT.exercises.length) { const l = EDIT.exercises[EDIT.exercises.length - 1]; ne.sets = l.sets; ne.rest = l.rest; } EDIT.exercises.push(ne); render(); return; }
    if (d.rm) { EDIT.exercises.splice(+d.rm, 1); render(); return; }
    if (d.up) { const i = +d.up; if (i > 0) { const a = EDIT.exercises; [a[i - 1], a[i]] = [a[i], a[i - 1]]; render(); } return; }
    if (d.down) { const i = +d.down, a = EDIT.exercises; if (i < a.length - 1) { [a[i + 1], a[i]] = [a[i], a[i + 1]]; render(); } return; }
    if ('steps' in d) {
      const st = compileWorkout(clone(EDIT));
      $('#steps').innerHTML = '<ol class="stl">' + st.slice(0, 80).map((s) => '<li><b>' + esc(TYPE_AR[s.type] || '') + (s.secs ? ' ' + secTxt(s.secs) : '') + ':</b> ' + esc(s.label) + (s.sub ? ' — <span class="small">' + esc(s.sub) + '</span>' : '') + '</li>').join('') + '</ol>' + (st.length > 80 ? '<div class="small">… و' + (st.length - 80) + ' خطوة أخرى</div>' : '');
      return;
    }
  }
  // المشغّل
  if (VIEW.name === 'player') {
    if ('pmain' in d) { playerMain(); return; }
    if ('pskip' in d) { nextStep(); return; }
    if ('pprev' in d) { prevStep(); return; }
    if ('ppause' in d) { togglePause(); return; }
    if ('padd' in d) { add15(); return; }
    if ('pend' in d) { if (confirm('إنهاء التمرين؟')) playerFinish(true); return; }
    if ('pexit' in d) { window.onAndroidBack(); return; }
    if ('hsave' in d) {
      const n = $('#h-note'); DB.history.push({ wid: P.w.id, name: P.w.name, date: today(), dur: fmt(P.total), result: P.result, note: n ? n.value.trim() : '' });
      save(); toast('حُفظ في السجلّ ✓'); P = null; tab('list'); return;
    }
    if ('hskip' in d) { P = null; tab('list'); return; }
  }
  // السجلّ
  if (VIEW.name === 'history') {
    if (d.hdel) { DB.history.splice(+d.hdel, 1); save(); render(); return; }
    if ('export' in d) {
      const txt = JSON.stringify(DB); const ta = $('#imp'); ta.value = txt; ta.select();
      try { if (window.Android && window.Android.copy) window.Android.copy(txt); else document.execCommand('copy'); toast('نُسخت البيانات'); } catch (err) { toast('انسخ النص من المربع'); }
      return;
    }
    if ('import' in d) {
      try { const o = JSON.parse($('#imp').value); if (o && Array.isArray(o.workouts)) { localStorage.setItem(KEY, JSON.stringify(o)); DB = load(); render(); toast('استُعيدت البيانات'); } else toast('النص غير صالح'); } catch (err) { toast('النص غير صالح'); }
    }
  }
});

document.addEventListener('input', (e) => {
  if (VIEW.name === 'import' && e.target.id === 'imp-text') { DB.importText = e.target.value; save(); return; }
  if (VIEW.name !== 'edit') return;
  const t = e.target, d = t.dataset;
  if (t.id === 'w-name') { EDIT.name = t.value; return; }
  if (d.p) { EDIT.p[d.p] = t.value; refreshPreview(); return; }
  if (d.f != null && d.i != null) { EDIT.exercises[+d.i][d.f] = t.value; refreshPreview(); }
});
document.addEventListener('change', (e) => {
  if (VIEW.name === 'edit' && e.target.id === 'w-cat') EDIT.cat = e.target.value;
  if (VIEW.name === 'edit' && e.target.dataset.p === 'work' && EDIT.format === 'intervals') render();
});

render();
