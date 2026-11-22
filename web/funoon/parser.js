'use strict';
/* =====================================================================
   محلّل النص: يحوّل تمرينًا مكتوبًا بلغة عادية إلى تمرين منظّم
   يعمل دون إنترنت بقواعد ثابتة
   ===================================================================== */

function arNorm(s) {
  return String(s || '')
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٫]/g, '.').replace(/[،؛]/g, '،')
    .replace(/[ً-ْـ]/g, '') // التشكيل والتطويل
    .replace(/(\d)\s*[xX×*]\s*(\d)/g, '$1×$2')
    .replace(/\s+[xX*]\s+/g, ' × ')
    .replace(/[ \t]+/g, ' ');
}
/* تبسيط للمطابقة فقط */
function key(s) {
  return arNorm(s).toLowerCase().replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[()\-–—_.،,:]/g, ' ').replace(/\s+/g, ' ').trim();
}

const W_SEC = '(?:ثانيه|ثانية|ثواني|ثوان|ثوانٍ|ث|sec|secs|s)';
const W_MIN = '(?:دقيقه|دقيقة|دقائق|دقايق|د|min|mins|minutes?)';
const W_REP = '(?:عده|عدة|عدات|عدّات|عداة|عداه|تكرار|تكرارات|تكرارًا|تكرارا|مره|مرة|مرات|reps?|عد)';
const W_SET = '(?:جولات|جوله|جولة|مجموعات|مجموعه|مجموعة|سيتات|سيت|sets?|rounds?|دورات|دوره|دورة)';

function durWords(s) {
  // دقيقة/دقيقتين بلا رقم
  if (/دقيقتين|دقيقتان/.test(s)) return 120;
  if (/(^|\s)(دقيقه|دقيقة)(\s|$|،|,)/.test(s)) return 60;
  return null;
}

/* ---------- تحليل سطر تمرين واحد ---------- */
function parseExerciseLine(raw, ctx) {
  let s = ' ' + arNorm(raw).trim() + ' ';
  const ex = { name: '', mode: 'reps', reps: 0, secs: 0, hold: 0, where: '', gap: 3, dist: 0, pace: '', sets: 0, rest: 0, side: false, tempo: '', load: '', notes: '' };
  const cut = (re) => { s = s.replace(re, ' '); };
  let m;

  // الراحة (تُؤخذ أولًا حتى لا تختلط بالأوقات)
  m = s.match(new RegExp('راح[هة]\\s*(?:بين\\s*\\S+\\s*)?(\\d+(?:\\.\\d+)?)\\s*(' + W_MIN + '|' + W_SEC + ')?'));
  if (m) { ex.rest = /^(د|دق|min)/.test(m[2] || '') && !/^ث/.test(m[2] || '') ? Math.round(+m[1] * 60) : +m[1]; if (!m[2] && +m[1] <= 5) ex.rest = +m[1] * 60; cut(m[0]); }
  else if ((m = s.match(/راح[هة]\s*(دقيقتين|دقيقتان|دقيقه|دقيقة)/))) { ex.rest = /دقيقت/.test(m[1]) ? 120 : 60; cut(m[0]); }

  // الثبات
  m = s.match(new RegExp('(?:مع\\s*)?(?:ثبات|ثبّت|ثبت|تثبيت|hold)\\s*(?:لمد[هة]\\s*)?(\\d+(?:\\.\\d+)?)\\s*' + W_SEC + '?'));
  if (m) {
    ex.hold = +m[1]; cut(m[0]);
    const w = s.match(/^\s*(?:في|على|عند)\s+([^،,\d]+?)(?=\s*(?:،|,|\d|$|لكل|راح|ثم))/);
    if (w) { ex.where = w[1].trim(); cut(w[0]); }
    else { const w2 = s.match(/\s(?:في|على|عند)\s+((?:اعلى|أعلى|اسفل|أسفل|منتصف|وسط)[^،,\d]*?)(?=\s*(?:،|,|\d|$|لكل|راح))/); if (w2) { ex.where = w2[1].trim(); cut(w2[0]); } }
  }

  // الوتيرة
  m = s.match(/(?:ب?وتير[هة]|بسرع[هة]|pace)\s*(\d{1,2}[:.]\d{2})(\s*(?:د\/كم|دقيق[هة]\/كم|\/كم|min\/km))?/);
  if (m) { ex.pace = m[1].replace('.', ':') + ' دقيقة/كم'; cut(m[0]); }
  // الإيقاع
  m = s.match(/(?:ايقاع|إيقاع|tempo)?\s*(\d)\s*-\s*(\d)\s*-\s*(\d)/);
  if (m) { ex.tempo = m[1] + '-' + m[2] + '-' + m[3]; cut(m[0]); }
  // الوزن الإضافي
  m = s.match(/((?:مع\s*)?(?:حقيب[هة]|شنط[هة]|سترة|وزن)[^،,]*?\d+(?:\.\d+)?\s*(?:كغ|كيلو|kg))|(\d+(?:\.\d+)?\s*(?:كغ|كيلو|kg))/);
  if (m) { ex.load = (m[1] || m[2]).replace(/^مع\s*/, '').trim(); cut(m[0]); }
  // لكل جهة
  if ((m = s.match(/(?:لكل|كل)\s*(?:جه[هة]|رجل|يد|طرف|ساق|ذراع|side)|each side|per side/))) { ex.side = true; cut(m[0]); }

  // الجولات × العدد  (4×6 أو 4 × 30 ثانية)
  m = s.match(new RegExp('(\\d+)\\s*×\\s*(\\d+(?:\\.\\d+)?)\\s*(' + W_SEC + '|' + W_MIN + '|' + W_REP + '|متر|م|كم|km|m)?(?=\\s|$|،|,)'));
  if (m) {
    ex.sets = +m[1];
    const u = m[3] || '';
    if (new RegExp('^' + W_SEC + '$').test(u)) ex.secs = +m[2];
    else if (new RegExp('^' + W_MIN + '$').test(u)) ex.secs = Math.round(+m[2] * 60);
    else if (/^(متر|م|m)$/.test(u)) ex.dist = +m[2];
    else if (/^(كم|km)$/.test(u)) ex.dist = Math.round(+m[2] * 1000);
    else ex.reps = +m[2];
    cut(m[0]);
  }
  // عدد الجولات صراحة
  m = s.match(new RegExp('(\\d+)\\s*' + W_SET + '(?=\\s|$|،|,)'));
  if (m) { ex.sets = +m[1]; cut(m[0]); }
  else if ((m = s.match(new RegExp('(جولتين|جولتان|مجموعتين|مجموعتان)')))) { ex.sets = 2; cut(m[0]); }
  // × N في آخر السطر (جري 400 متر × 6)
  m = s.match(/×\s*(\d+)/);
  if (m && !ex.sets) { ex.sets = +m[1]; cut(m[0]); }

  // المسافة
  m = s.match(/(\d+(?:\.\d+)?)\s*(متر|م|m|كم|كيلومتر|km)(?=\s|$|،|,)/);
  if (m && !ex.dist) { ex.dist = /^(كم|كيلومتر|km)$/.test(m[2]) ? Math.round(+m[1] * 1000) : +m[1]; cut(m[0]); }
  // الوقت
  m = s.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*(' + W_SEC + '|' + W_MIN + ')(?=\\s|$|،|,)'));
  if (m && !ex.secs) { ex.secs = new RegExp('^' + W_MIN + '$').test(m[2]) ? Math.round(+m[1] * 60) : +m[1]; cut(m[0]); }
  else if (!ex.secs) { const dw = durWords(s); if (dw && !/راح/.test(raw)) { ex.secs = dw; cut(/دقيقتين|دقيقتان|دقيقه|دقيقة/); } }
  // العدّات
  m = s.match(new RegExp('(\\d+)\\s*' + W_REP + '(?=\\s|$|،|,)'));
  if (m && !ex.reps) { ex.reps = +m[1]; cut(m[0]); }
  // رقم مجرّد متبقٍّ = عدّات
  if (!ex.reps) { m = s.match(/(?:^|\s)(\d+)(?=\s|$|،|,)/); if (m) { ex.reps = +m[1]; cut(m[0]); } }
  if (ex.hold && !ex.reps) ex.reps = 1;

  // الاسم: ما بقي بعد حذف الكلمات المساعدة
  const STOP = /^(مع|ثم|في|على|بعد|قبل|لمده|لمدة|بين|الى|إلى|من|و|عدد|هدف|الهدف|تمرين|كل|ب)$/;
  let words = s.replace(/[،,:؛;\-–—•*]+/g, ' ').replace(/\d+(\.\d+)?/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  while (words.length && STOP.test(words[0])) words.shift();
  while (words.length && STOP.test(words[words.length - 1])) words.pop();
  let name = words.join(' ');
  const cn = canonicalName(name);
  ex.matched = !!cn;
  ex.name = cn || name;

  // نوع القياس
  if (ex.hold) ex.mode = 'reps_hold';
  else if (ex.dist) ex.mode = 'distance';
  else if (ex.secs && ex.reps) ex.mode = 'time_reps';
  else if (ex.secs) ex.mode = 'time';
  else ex.mode = 'reps';
  if (!ex.sets && ctx && ctx.defSets) ex.sets = ctx.defSets;
  return ex;
}

/* مطابقة الاسم مع المكتبة بالكلمات */
const STOPK = { 'من': 1, 'مع': 1, 'في': 1, 'على': 1, 'علي': 1, 'و': 1, 'the': 1, 'of': 1 };
function stem(t) {
  t = t.replace(/^(وال|بال|لل|ال)(?=..)/, '').replace(/^ال(?=...)/, '');
  if (t.length > 4) t = t.replace(/(ات|ين|ان)$/, '');
  if (t.length > 3) t = t.replace(/[هةي]$/, '');
  return t;
}
function toks(s) { return key(s).split(' ').filter((x) => x && !STOPK[x]).map(stem).filter((x) => x.length >= 2); }
function tokScore(a, b) {
  if (!a.length || !b.length) return 0;
  let m = 0;
  a.forEach((x) => { if (b.some((y) => x === y || (x.length >= 3 && y.length >= 3 && (x.indexOf(y) === 0 || y.indexOf(x) === 0)))) m++; });
  return m / Math.max(a.length, b.length) + (m === b.length ? 0.05 : 0);
}
function canonicalName(name) {
  const nt = toks(name);
  if (!nt.length || typeof LIBRARY === 'undefined') return '';
  let best = '', bs = 0;
  LIBRARY.forEach((full) => {
    const ar = toks(full.split('(')[0]);
    const en = toks((full.match(/\((.*?)\)/) || [])[1] || '');
    const sc = Math.max(tokScore(nt, ar), tokScore(nt, en));
    if (sc > bs + 1e-9 || (Math.abs(sc - bs) < 1e-9 && sc > 0 && full.length < best.length)) { best = full; bs = sc; }
  });
  return bs >= 0.66 ? best : '';
}

/* «راحة بين الجولات 2 دقيقة» بالثواني */
function restBetween(text, what, def) {
  const m = key(text).match(new RegExp('راحه بين ' + what + '\\s*(\\d+(?:\\.\\d+)?)\\s*(دقيقه|دقائق|د|min)?'));
  if (m) return Math.round(+m[1] * (m[2] ? 60 : 1));
  const m2 = key(text).match(new RegExp('راحه بين ' + what + '\\s*(دقيقتين|دقيقتان|دقيقه)'));
  if (m2) return /دقيقت/.test(m2[1]) ? 120 : 60;
  return def;
}

/* ---------- اكتشاف نوع التدريب ومعاملاته ---------- */
function detectFormat(text) {
  const t = key(text);
  let m;
  const num = (re, d) => { const x = t.match(re); return x ? +x[1] : d; };
  if (/emom|كل دقيقه|في بدايه كل دقيقه|e\dmom/.test(t)) {
    const every = /e2mom|كل دقيقتين/.test(t) ? 120 : (/e3mom|كل 3 دقائق/.test(t) ? 180 : 60);
    return { format: 'emom', p: { minutes: num(/(\d+)\s*(?:دقيقه|دقائق|د|min)/, 12), every } };
  }
  if (/amrap|اكبر عدد (?:من )?الجولات|اكبر عدد جولات|اقصي عدد جولات/.test(t)) return { format: 'amrap', p: { minutes: num(/(\d+)\s*(?:دقيقه|دقائق|د|min)/, 15) } };
  if (/tabata|تاباتا|طاباطا/.test(t)) return { format: 'tabata', p: { work: num(/(\d+)\s*(?:ث|ثانيه)?\s*(?:عمل|جهد)/, 20), rest: num(/(?:راحه)\s*(\d+)/, 10), rounds: num(/(\d+)\s*(?:جولات|مرات)/, 8), restEx: 60 } };
  if (/death by|الموت بال/.test(t)) return { format: 'deathby', p: { start: 1, add: 1, max: num(/(\d+)\s*دقيقه/, 20) } };
  if (/هرم|pyramid/.test(t)) {
    m = t.match(/(\d+)\s*(?:الي|-)\s*(\d+)/);
    return { format: 'pyramid', p: { from: m ? +m[1] : 2, top: m ? +m[2] : 8, step: num(/زياده\s*(\d+)/, m && +m[2] - +m[1] >= 6 ? 2 : 1), rest: num(/راحه\s*(\d+)/, 60) } };
  }
  if (/سلم|ladder/.test(t)) {
    m = t.match(/(\d+)\s*(?:الي|-)\s*(\d+)/);
    return { format: 'ladder', p: { from: m ? +m[1] : 1, to: m ? +m[2] : 5, step: 1, rest: num(/راحه\s*(\d+)/, 45) } };
  }
  if (/for time|ضد الساعه|باسرع وقت|اسرع وقت/.test(t)) return { format: 'fortime', p: { rounds: num(/(\d+)\s*جولات/, 1), cap: num(/(?:حد|cap)\D{0,8}(\d+)/, 0) } };
  if (/hiit|فترات|انترفال|interval|(\d+)\s*(?:ث|ثانيه)?\s*(?:عمل|جهد)/.test(t)) {
    return { format: 'intervals', p: { work: num(/(\d+)\s*(?:ث|ثانيه)?\s*(?:عمل|جهد)/, num(/(?:عمل|جهد)\s*(\d+)/, 40)), rest: num(/(\d+)\s*(?:ث|ثانيه)?\s*راحه/, num(/(?:راحه)\s*(\d+)/, 20)), rounds: num(/(\d+)\s*(?:جولات|جوله|مرات)/, 8) } };
  }
  if (/دائره|دايره|circuit|سوبر ?ست|superset|بالتتابع|متتاليه/.test(t)) {
    return { format: 'circuit', p: { rounds: num(/(\d+)\s*(?:جولات|دورات|rounds)/, 3), restEx: restBetween(text, 'التمارين', 15), restRound: restBetween(text, 'الجولات', 90) } };
  }
  return { format: 'straight', p: { restEx: num(/راحه بين التمارين\s*(\d+)/, 120) } };
}

/* ---------- الفئة المناسبة: كل تمرين يصوّت ---------- */
const CAT_RULES = [
  ['جري', /جري|ركض|سرعه قصوي|انطلاقات|تسارع|sprint|run|strides|مشي سريع/],
  ['ليونة وإطالة', /اطاله|تمديد|ليونه|stretch|pose|القطه|الحمامه|القرفصاء العميقه|تعلق سلبي|انحناء|فطيره|تهيئه/],
  ['قتالية', /ملاكمه|لكم|ركل|boxing|kick|punch/],
  ['قوة انفجارية', /قفز|انفجاري|تصفيق|jump|bound|hop|plyo|clap|القفزات/],
  ['كاليستنكس', /عقله|ضغط|غطس|تعلق|بلانك|مسل|ليفر|pull|push|dip|plank|hollow|l-sit|المشي باليدين|رفع الركبتين من|رفع الساقين/],
  ['قوة', /سكوات|اندفاع|رفع|بلغاري|squat|lunge|deadlift|جسر|جلوس الحائط/],
];
function detectCategory(w) {
  const votes = {};
  w.exercises.forEach((e) => {
    const k = key(e.name);
    const r = CAT_RULES.find((c) => c[1].test(k));
    const c = r ? r[0] : 'أخرى';
    votes[c] = (votes[c] || 0) + 1;
  });
  if (['tabata', 'intervals', 'emom', 'amrap', 'deathby', 'fortime'].indexOf(w.format) >= 0 && !votes['جري']) return 'HIIT ولياقة';
  let best = 'أخرى', bv = 0;
  CAT_RULES.map((c) => c[0]).concat(['أخرى']).forEach((c) => { if ((votes[c] || 0) > bv) { bv = votes[c]; best = c; } });
  return best;
}

/* ---------- التحليل الكامل ---------- */
function parseWorkoutText(text) {
  const src = arNorm(text);
  let lines = src.split(/\n+/).map((l) => l.replace(/^[\s\-–—•*·\d]+[.)]\s+/, '').replace(/^[\s\-–—•*·]+/, '').trim()).filter(Boolean);
  const warnings = [];
  let name = '';
  const headerRe = /emom|amrap|tabata|تاباتا|طاباطا|ضد الساعة|بأسرع وقت|for time|دائرة|دايرة|circuit|سوبر ?ست|superset|هرم|pyramid|سلّم|سلم|ladder|death by|الموت بال|فترات|hiit|انترفال|interval|\d+\s*(?:ث|ثانية|ثانيه)?\s*(?:عمل|جهد)/i;
  const roundsHdr = /^(\d+)\s*(جولات|جولة|دورات|rounds?)(?:\s|$|:)[^\n]*$/;
  // سطر العنوان: بلا أرقام، ولا يطابق تمرينًا، وليس سطر نوع تدريب
  if (lines.length > 1 && !/\d/.test(lines[0]) && !canonicalName(lines[0]) && !headerRe.test(lines[0])) {
    name = lines.shift().replace(/[:：]$/, '').trim();
  }
  // نوع التدريب يُؤخذ من أول سطرين فقط إن كانا سطري نوع
  const hdrIdx = [];
  for (let i = 0; i < Math.min(2, lines.length); i++) {
    const l = lines[i];
    const isRoundsOnly = roundsHdr.test(l) && !canonicalName(l.replace(/\d+|جولات|جولة|دورات|rounds?|دائرة|راحة.*$/g, ''));
    if (headerRe.test(l) || isRoundsOnly) hdrIdx.push(i); else break;
  }
  const fd = hdrIdx.length ? detectFormat(hdrIdx.map((i) => lines[i]).join('\n')) : detectFormat('');
  const restExM = key(src).match(/راحه بين التمارين\s*(\d+)\s*(دقيقه|دقائق|د|min)?/);
  if (restExM && fd.p.restEx != null) fd.p.restEx = +restExM[1] * (restExM[2] ? 60 : 1);
  let globalSets = 0;
  const exLines = [];
  lines.forEach((l, idx) => {
    if (hdrIdx.indexOf(idx) >= 0) {
      const mm = l.match(/^(\d+)\s*(جولات|جولة|دورات|rounds?)/);
      if (mm) { globalSets = +mm[1]; if (fd.format === 'circuit') fd.p.rounds = +mm[1]; }
      const after = l.split(/[:：]/).slice(1).join(':').trim();
      if (after) exLines.push(...after.split(/[،,+]|\sثم\s/).map((x) => x.trim()).filter(Boolean));
      return;
    }
    if (/^راحة بين/.test(l.trim())) return;
    if (headerRe.test(l)) {
      warnings.push('«' + l + '» فيه نوع تدريب مختلف عن بقية التمرين، فأضفته تمرينًا عاديًا. الأفضل أن تجعله تمرينًا مستقلًا.');
      l = l.replace(/هرم|سلّم|سلم|pyramid|ladder|emom|amrap|تاباتا|tabata|دائرة/ig, ' ').replace(/(\d+)\s*(?:إلى|الى|-)\s*(\d+)/, '$2');
    }
    // سطر فيه عدة تمارين مفصولة بفواصل في أنواع القوائم
    if (['emom', 'amrap', 'fortime', 'tabata', 'circuit', 'ladder', 'pyramid', 'intervals'].indexOf(fd.format) >= 0 && /[،,+]/.test(l) && !/راح/.test(l)) {
      exLines.push(...l.split(/[،,+]/).map((x) => x.trim()).filter(Boolean));
    } else exLines.push(l);
  });
  // «3 جولات» بلا كلمة دائرة مع أكثر من تمرين بلا جولات خاصة = دائرة
  if (fd.format === 'straight' && globalSets && exLines.length > 1) { fd.format = 'circuit'; fd.p = { rounds: globalSets, restEx: restBetween(src, 'التمارين', 15), restRound: restBetween(src, 'الجولات', 90) }; }

  const exercises = [];
  exLines.forEach((l) => {
    const ex = parseExerciseLine(l, { defSets: fd.format === 'straight' ? (globalSets || 0) : 0 });
    if (!ex.name || ex.name.length < 2) { warnings.push('لم أفهم: «' + l + '»'); return; }
    if (fd.format === 'straight') {
      if (!ex.sets) ex.sets = (ex.mode === 'time' && ex.secs >= 180) || (ex.mode === 'distance' && ex.dist >= 1000) ? 1 : 3;
      if (!ex.rest) ex.rest = ex.mode === 'time' ? 60 : 90;
    } else if (ex.rest && fd.format === 'circuit' && !fd.p.restRoundSet) { fd.p.restRound = ex.rest; fd.p.restRoundSet = true; }
    const timeFmt = fd.format === 'tabata' || (fd.format === 'intervals' && +fd.p.work > 0);
    const seqFmt = ['ladder', 'pyramid', 'deathby'].indexOf(fd.format) >= 0;
    if (timeFmt && ex.mode === 'reps' && !ex.reps) { ex.mode = 'time'; ex.secs = +fd.p.work || 20; }
    if (!ex.reps && (ex.mode === 'reps' || ex.mode === 'reps_hold')) { ex.reps = seqFmt ? 1 : 10; if (!seqFmt) warnings.push('لم أجد عدد التكرارات في «' + ex.name + '»، فوضعت 10. عدّله إن لزم.'); }
    if (ex.mode === 'time' && !ex.secs) ex.secs = 30;
    if (!ex.matched) warnings.push('«' + ex.name + '» ليس في مكتبة الأسماء، فأبقيته كما كتبته.');
    delete ex.matched;
    exercises.push(Object.assign({ name: '', mode: 'reps', reps: 10, secs: 30, hold: 3, where: '', gap: 3, dist: 400, pace: '', sets: 3, rest: 90, side: false, tempo: '', load: '', notes: '' },
      Object.fromEntries(Object.entries(ex).filter(([k, v]) => v !== 0 && v !== '' && v !== false || k === 'side'))));
  });
  delete fd.p.restRoundSet;
  // الفترات بلا وقت جهد مع تمرين مسافة
  if (fd.format === 'intervals' && exercises.some((e) => e.mode === 'distance')) {
    fd.p.work = 0;
    const e0 = exercises[0];
    if (e0 && e0.sets > 1 && !/جولات|rounds/.test(key(src))) fd.p.rounds = e0.sets;
    if (e0 && e0.rest) fd.p.rest = e0.rest;
  }
  // تمرين واحد بمسافة وجولات وراحة دون كلمة فترات = فترات
  if (fd.format === 'straight' && exercises.length === 1 && exercises[0].mode === 'distance' && exercises[0].sets > 1) {
    fd.format = 'intervals'; fd.p = { work: 0, rest: exercises[0].rest || 90, rounds: exercises[0].sets };
  }
  const w = { id: '', name, cat: '', format: fd.format, p: fd.p, exercises };
  w.cat = detectCategory(w);
  if (!w.name) w.name = (FORMATS[w.format] ? FORMATS[w.format].ar : 'تمرين') + (exercises[0] ? ' — ' + exercises[0].name.split('(')[0].trim() : '');
  return { workout: w, warnings };
}

if (typeof module !== 'undefined') module.exports = { parseWorkoutText, parseExerciseLine, arNorm, detectFormat };
