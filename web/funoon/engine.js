'use strict';
/* =====================================================================
   محرّك «فنون التدريب»: أنواع التمارين، وأنواع التدريب، وتحويلها إلى خطوات
   ===================================================================== */

const ORD = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'];

/* أنواع التمرين الواحد */
const MODES = {
  reps: { ar: 'تكرارات', ic: '🔁' },
  time: { ar: 'وقت', ic: '⏱' },
  reps_hold: { ar: 'تكرارات + ثبات', ic: '🔁⏸' },
  time_reps: { ar: 'وقت بهدف تكرارات', ic: '⏱🎯' },
  distance: { ar: 'مسافة', ic: '📏' },
};

/* فئات التدريب */
const CATEGORIES = ['كاليستنكس', 'قوة', 'قوة انفجارية', 'جري', 'HIIT ولياقة', 'تحمّل', 'ليونة وإطالة', 'قتالية', 'إحماء', 'أخرى'];

function num(v, d) { const n = parseFloat(v); return isFinite(n) && n >= 0 ? n : d; }
function int(v, d) { const n = parseInt(v, 10); return isFinite(n) && n >= 0 ? n : d; }
function secTxt(s) {
  s = Math.round(s);
  if (s < 60) return s + ' ثانية';
  const m = Math.floor(s / 60), r = s % 60;
  if (r) return m + ':' + (r < 10 ? '0' : '') + r + ' دقيقة';
  return m === 1 ? 'دقيقة' : (m === 2 ? 'دقيقتان' : (m <= 10 ? m + ' دقائق' : m + ' دقيقة'));
}
function repsTxt(n) {
  n = int(n, 0);
  if (n === 1) return 'تكرار واحد';
  if (n === 2) return 'تكراران';
  if (n >= 3 && n <= 10) return n + ' تكرارات';
  return n + ' تكرارًا';
}

/* وصف التمرين بنص عربي واضح */
function describe(ex, repsOverride) {
  const reps = repsOverride != null ? repsOverride : int(ex.reps, 0);
  let t = '';
  switch (ex.mode) {
    case 'time': t = secTxt(num(ex.secs, 30)); break;
    case 'reps_hold': t = repsTxt(reps) + '، مع ثبات ' + num(ex.hold, 3) + ' ث' + (ex.where ? ' في ' + ex.where : ''); break;
    case 'time_reps': t = secTxt(num(ex.secs, 30)) + (reps ? '، الهدف ' + repsTxt(reps) : ''); break;
    case 'distance': t = int(ex.dist, 0) + ' متر' + (ex.pace ? '، وتيرة ' + ex.pace : ''); break;
    default: t = repsTxt(reps);
  }
  if (ex.side) t += '، لكل جهة';
  if (ex.tempo) t += '، الإيقاع ' + ex.tempo;
  if (ex.load) t += ' (' + ex.load + ')';
  return t;
}

/* خطوات أداء التمرين مرة واحدة (جولة واحدة) */
function perform(ex, opt) {
  opt = opt || {};
  const name = ex.name || 'تمرين';
  const reps = opt.reps != null ? opt.reps : int(ex.reps, 0);
  const tag = opt.tag ? opt.tag + ' • ' : '';
  const note = [ex.tempo ? 'الإيقاع ' + ex.tempo : '', ex.load || '', ex.notes || ''].filter(Boolean).join(' — ');
  const sides = ex.side ? ['الجهة اليمنى', 'الجهة اليسرى'] : [''];
  const out = [];
  sides.forEach((sd, si) => {
    const sdt = sd ? ' — ' + sd : '';
    if (si > 0) out.push({ type: 'gap', secs: 5, label: 'بدّل الجهة', sub: name + ' — ' + sd, ex: name });
    switch (ex.mode) {
      case 'time':
        out.push({ type: 'work', secs: num(ex.secs, 30), label: name + sdt, sub: tag + describe(ex, reps), note, ex: name });
        break;
      case 'time_reps':
        out.push({ type: 'work', secs: num(ex.secs, 30), label: name + sdt, sub: tag + describe(ex, reps), big: reps ? '🎯 ' + reps : '', note, ex: name });
        break;
      case 'reps_hold': {
        const hold = num(ex.hold, 3), gap = Math.max(1, num(ex.gap, 3));
        const where = ex.where ? ' في ' + ex.where : '';
        for (let r = 1; r <= Math.max(1, reps); r++) {
          out.push({ type: 'gap', secs: r === 1 ? Math.max(3, gap) : gap, label: r === 1 ? 'استعد: ' + name + sdt : 'انزل، ثم اصعد للتكرار ' + r,
            sub: tag + 'التكرار ' + r + ' من ' + Math.max(1, reps), ex: name });
          out.push({ type: 'hold', secs: hold, label: 'ثبّت' + where, sub: tag + name + sdt + ' — التكرار ' + r + ' من ' + Math.max(1, reps), big: r + '/' + Math.max(1, reps), note, ex: name });
        }
        break;
      }
      case 'distance':
        out.push({ type: 'manual', label: name + sdt, sub: tag + describe(ex, reps), big: int(ex.dist, 0) + ' م', note, ex: name });
        break;
      default:
        out.push({ type: 'manual', label: name + sdt, sub: tag + describe(ex, reps), big: String(reps), note, ex: name });
    }
  });
  return out;
}
function rest(secs, label) { return { type: 'rest', secs: Math.max(1, secs), label: label || 'راحة' }; }

/* ============ أنواع التدريب ============ */
const FORMATS = {
  straight: {
    ar: 'مجموعات تقليدية', en: 'Straight Sets', ic: '🏋️',
    desc: 'تؤدّي جولات التمرين الأول كلها مع راحة بينها، ثم تنتقل إلى التمرين التالي. أنسب نوع لبناء القوة والحجم وتعلّم الحركات.',
    params: [{ k: 'restEx', ar: 'راحة بين التمارين (ثانية)', def: 120 }],
    exFields: ['sets', 'rest'],
    compile(w) {
      const s = []; const exs = w.exercises;
      exs.forEach((ex, i) => {
        const sets = Math.max(1, int(ex.sets, 3));
        for (let k = 1; k <= sets; k++) {
          s.push(...perform(ex, { tag: 'الجولة ' + (ORD[k - 1] || k) + ' من ' + sets }));
          if (k < sets) s.push(rest(num(ex.rest, 90), 'راحة بين الجولات'));
        }
        if (i < exs.length - 1) s.push(rest(num(w.p.restEx, 120), 'راحة قبل التمرين التالي'));
      });
      return s;
    },
  },
  circuit: {
    ar: 'دائرة / سوبرسِت', en: 'Circuit / Superset', ic: '🔄',
    desc: 'تؤدّي التمارين واحدًا بعد الآخر دون راحة أو براحة قصيرة، ثم ترتاح بعد الجولة كاملة. تمريـنان متتاليان = سوبرسِت. يجمع القوة والنَّفَس ويوفّر الوقت.',
    params: [{ k: 'rounds', ar: 'عدد الجولات', def: 3 }, { k: 'restEx', ar: 'راحة بين التمارين (ثانية)', def: 15 }, { k: 'restRound', ar: 'راحة بين الجولات (ثانية)', def: 90 }],
    compile(w) {
      const s = [], exs = w.exercises, R = Math.max(1, int(w.p.rounds, 3));
      for (let r = 1; r <= R; r++) {
        exs.forEach((ex, i) => {
          s.push(...perform(ex, { tag: 'الجولة ' + r + ' من ' + R }));
          if (i < exs.length - 1 && num(w.p.restEx, 0) > 0) s.push(rest(num(w.p.restEx, 15), 'انتقال'));
        });
        if (r < R) s.push(rest(num(w.p.restRound, 90), 'راحة بين الجولات'));
      }
      return s;
    },
  },
  emom: {
    ar: 'كل دقيقة (EMOM)', en: 'Every Minute On the Minute', ic: '⏰',
    desc: 'في بداية كل دقيقة تؤدّي العدد المطلوب، وما بقي من الدقيقة راحة. إن كتبت أكثر من تمرين تتناوب عليها الدقائق. ممتاز لحجم كبير بجودة ثابتة.',
    params: [{ k: 'minutes', ar: 'المدة الكلية (دقيقة)', def: 12 }, { k: 'every', ar: 'طول الفترة (ثانية) — 60 = كل دقيقة', def: 60 }],
    compile(w) {
      const s = [], exs = w.exercises, every = Math.max(10, num(w.p.every, 60));
      const count = Math.max(1, Math.floor(num(w.p.minutes, 12) * 60 / every));
      for (let m = 0; m < count; m++) {
        const ex = exs[m % exs.length];
        s.push({ type: 'emom', secs: every, label: 'الفترة ' + (m + 1) + ' من ' + count, sub: (ex.name || '') + ' — ' + describe(ex), big: ex.mode === 'reps' || ex.mode === 'reps_hold' ? String(int(ex.reps, 0)) : '', ex: ex.name });
      }
      return s;
    },
  },
  amrap: {
    ar: 'أكبر عدد جولات (AMRAP)', en: 'As Many Rounds As Possible', ic: '🔥',
    desc: 'تكرّر قائمة التمارين أكثر عدد ممكن من الجولات خلال وقت محدد، وتضغط «+ جولة» كلما أنهيت جولة. يقيس اللياقة ويتحدّاها.',
    params: [{ k: 'minutes', ar: 'المدة (دقيقة)', def: 15 }],
    compile(w) {
      return [{ type: 'amrap', secs: Math.max(1, num(w.p.minutes, 15)) * 60, label: 'AMRAP — ' + num(w.p.minutes, 15) + ' دقيقة', list: w.exercises.map((e) => (e.name || '') + ': ' + describe(e)) }];
    },
  },
  tabata: {
    ar: 'تاباتا', en: 'Tabata', ic: '⚡',
    desc: '20 ثانية بأقصى جهد، ثم 10 ثوانٍ راحة، 8 مرات (4 دقائق) لكل تمرين. شديد جدًا ويرفع اللياقة القلبية بسرعة.',
    params: [{ k: 'work', ar: 'الجهد (ثانية)', def: 20 }, { k: 'rest', ar: 'الراحة (ثانية)', def: 10 }, { k: 'rounds', ar: 'الجولات لكل تمرين', def: 8 }, { k: 'restEx', ar: 'راحة بين التمارين (ثانية)', def: 60 }],
    compile(w) {
      const s = [], exs = w.exercises, N = Math.max(1, int(w.p.rounds, 8));
      exs.forEach((ex, i) => {
        for (let r = 1; r <= N; r++) {
          s.push({ type: 'work', secs: Math.max(1, num(w.p.work, 20)), label: ex.name || 'تمرين', sub: 'الجولة ' + r + ' من ' + N + ' — بأقصى جهد', ex: ex.name });
          if (r < N) s.push(rest(num(w.p.rest, 10)));
        }
        if (i < exs.length - 1) s.push(rest(num(w.p.restEx, 60), 'راحة قبل التمرين التالي'));
      });
      return s;
    },
  },
  intervals: {
    ar: 'فترات (جهد/راحة)', en: 'Intervals / HIIT', ic: '⏱',
    desc: 'فترة جهد ثم فترة راحة، لعدد من الجولات، والتمارين تتناوب على الجولات. اكتب وقت الجهد 0 لتنفّذ تمرين كل جولة بعدده أو مسافته (مثل جري 400 م) ثم الراحة.',
    params: [{ k: 'work', ar: 'الجهد (ثانية) — 0 = حسب التمرين', def: 40 }, { k: 'rest', ar: 'الراحة (ثانية)', def: 20 }, { k: 'rounds', ar: 'عدد الجولات', def: 8 }],
    compile(w) {
      const s = [], exs = w.exercises, N = Math.max(1, int(w.p.rounds, 8)), W = num(w.p.work, 40);
      for (let r = 0; r < N; r++) {
        const ex = exs[r % exs.length], tag = 'الجولة ' + (r + 1) + ' من ' + N;
        if (W > 0) s.push({ type: 'work', secs: W, label: ex.name || 'تمرين', sub: tag, ex: ex.name });
        else s.push(...perform(ex, { tag }));
        if (r < N - 1) s.push(rest(num(w.p.rest, 20)));
      }
      return s;
    },
  },
  fortime: {
    ar: 'ضد الساعة', en: 'For Time', ic: '🏁',
    desc: 'تنهي قائمة التمارين كلها بأسرع وقت ممكن، وتسجّل زمنك. يمكن وضع حدّ أقصى للوقت. مناسب لمقارنة نفسك بنفسك أسبوعًا بعد أسبوع.',
    params: [{ k: 'rounds', ar: 'عدد الجولات', def: 1 }, { k: 'cap', ar: 'الحدّ الأقصى (دقيقة) — 0 بلا حد', def: 0 }],
    compile(w) {
      const R = Math.max(1, int(w.p.rounds, 1));
      const list = w.exercises.map((e) => (e.name || '') + ': ' + describe(e));
      return [{ type: 'stopwatch', cap: num(w.p.cap, 0) * 60, label: 'ضد الساعة' + (R > 1 ? ' — ' + R + ' جولات' : ''), list }];
    },
  },
  ladder: {
    ar: 'السلّم', en: 'Ladder', ic: '📶',
    desc: 'يزيد العدد في كل درجة: 1 ثم 2 ثم 3... وتؤدّي كل التمارين بعدد الدرجة. يجمع حجمًا كبيرًا دون أن تصل إلى الفشل مبكرًا.',
    params: [{ k: 'from', ar: 'من', def: 1 }, { k: 'to', ar: 'إلى', def: 5 }, { k: 'step', ar: 'الزيادة', def: 1 }, { k: 'rest', ar: 'راحة بين الدرجات (ثانية)', def: 45 }],
    seq(w) {
      const a = int(w.p.from, 1), b = int(w.p.to, 5), st = Math.max(1, int(w.p.step, 1)), out = [];
      if (a <= b) for (let x = a; x <= b; x += st) out.push(x); else for (let x = a; x >= b; x -= st) out.push(x);
      return out.slice(0, 60);
    },
    compile(w) {
      const s = [], seq = this.seq(w), exs = w.exercises;
      seq.forEach((k, j) => {
        exs.forEach((ex) => s.push(...perform(ex, { reps: k, tag: 'الدرجة ' + (j + 1) + ' من ' + seq.length + ' (' + k + ')' })));
        if (j < seq.length - 1) s.push(rest(num(w.p.rest, 45), 'راحة بين الدرجات'));
      });
      return s;
    },
  },
  pyramid: {
    ar: 'الهرم', en: 'Pyramid', ic: '🔺',
    desc: 'يصعد العدد حتى القمة ثم ينزل: 2، 4، 6، 8، 6، 4، 2. يجمع الصعوبة في الوسط والحجم في الطرفين.',
    params: [{ k: 'from', ar: 'البداية', def: 2 }, { k: 'top', ar: 'القمة', def: 8 }, { k: 'step', ar: 'الزيادة', def: 2 }, { k: 'rest', ar: 'راحة بين المستويات (ثانية)', def: 60 }],
    seq(w) {
      const a = Math.max(1, int(w.p.from, 2)), t = Math.max(a, int(w.p.top, 8)), st = Math.max(1, int(w.p.step, 2)), up = [];
      for (let x = a; x <= t; x += st) up.push(x);
      if (up[up.length - 1] !== t) up.push(t);
      return up.concat(up.slice(0, -1).reverse()).slice(0, 60);
    },
    compile(w) {
      const s = [], seq = this.seq(w), exs = w.exercises;
      seq.forEach((k, j) => {
        exs.forEach((ex) => s.push(...perform(ex, { reps: k, tag: 'المستوى ' + (j + 1) + ' من ' + seq.length + ' (' + k + ')' })));
        if (j < seq.length - 1) s.push(rest(num(w.p.rest, 60), 'راحة'));
      });
      return s;
    },
  },
  deathby: {
    ar: 'الموت بالدقيقة', en: 'Death By', ic: '💀',
    desc: 'في الدقيقة الأولى تكرار واحد، وفي الثانية تكراران، وهكذا تزيد كل دقيقة، حتى لا تستطيع إكمال العدد داخل الدقيقة. نتيجتك عدد الدقائق التي أكملتها.',
    params: [{ k: 'start', ar: 'عدد البداية', def: 1 }, { k: 'add', ar: 'الزيادة كل دقيقة', def: 1 }, { k: 'max', ar: 'أقصى عدد دقائق', def: 20 }],
    compile(w) {
      const ex = w.exercises[0], s = [], st = Math.max(1, int(w.p.start, 1)), ad = Math.max(1, int(w.p.add, 1));
      for (let m = 0; m < Math.max(1, int(w.p.max, 20)); m++) {
        const n = st + m * ad;
        s.push({ type: 'emom', secs: 60, deathby: true, label: 'الدقيقة ' + (m + 1), sub: (ex.name || '') + ' — ' + repsTxt(n), big: String(n), ex: ex.name });
      }
      return s;
    },
  },
};

/* معلومات إضافية في صفحة «فنون التدريب» عن أساليب تُنفَّذ بالأنواع أعلاه */
const EXTRA_METHODS = [
  ['العناقيد (Cluster Sets)', 'تقسيم الجولة إلى أجزاء صغيرة براحة قصيرة (15 إلى 20 ثانية) بينها، مثل 2+2+2 عقلات. نفّذها بنوع «المجموعات التقليدية» مع جولات كثيرة وراحة قصيرة.'],
  ['الراحة والتوقف (Rest-Pause)', 'جولة قريبة من الحد، ثم راحة 15 ثانية، ثم تكرارات إضافية. نفّذها بنوع «المجموعات التقليدية».'],
  ['الشد المستمر والثبات (Isometrics)', 'ثبات في وضع معيّن (بلانك، جلوس الحائط، تعلق). اكتب التمرين بنوع «وقت»، أو «تكرارات + ثبات» لثبات في كل تكرار.'],
  ['الإيقاع البطيء (Tempo)', 'تتحكم في سرعة النزول والصعود، مثل 3-1-1 (3 ثوانٍ نزول، ثانية توقف، ثانية صعود). اكتبه في خانة «الإيقاع» لأي تمرين.'],
  ['الفارتليك (Fartlek)', 'جري متواصل تتخلله تسارعات حرّة. نفّذه بنوع «الفترات» مع جهد 30 إلى 60 ثانية وراحة جري هادئ.'],
  ['الجري الهادئ الطويل (Zone 2)', 'جري طويل بنَفَس مريح لبناء القلب. اكتبه تمرينًا بنوع «وقت» (مثل 45 دقيقة) في «مجموعات تقليدية» بجولة واحدة.'],
  ['البليومترك (Plyometrics)', 'قفز وحركات انفجارية بتكرارات قليلة وراحة كاملة. نفّذها بنوع «المجموعات التقليدية» وفي أول الجلسة.'],
  ['التمرين المتصاعد (Chipper)', 'قائمة طويلة من تمارين مختلفة تنهيها مرة واحدة. نفّذه بنوع «ضد الساعة».'],
];

function compileWorkout(w) {
  const f = FORMATS[w.format];
  if (!f || !w.exercises || !w.exercises.length) return [];
  w.p = w.p || {};
  const steps = f.compile.call(f, w);
  // نص «التالي» في كل راحة
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].type === 'rest') {
      const nx = steps[i + 1];
      steps[i].sub = nx ? 'التالي: ' + nx.label + (nx.sub ? ' — ' + nx.sub : '') : '';
    }
  }
  return steps;
}

/* تقدير المدة بالثواني (التكرار اليدوي = 3 ثوانٍ لكل تكرار تقريبًا) */
function estimateTxt(w) {
  const m = Math.max(1, Math.round(estimate(w) / 60));
  return m === 1 ? 'دقيقة' : (m === 2 ? 'دقيقتان' : (m <= 10 ? m + ' دقائق' : m + ' دقيقة'));
}
function estimate(w) {
  const st = compileWorkout(w);
  let t = 0;
  st.forEach((s) => {
    if (s.secs) t += s.secs;
    else if (s.type === 'manual') { const n = parseInt(s.big, 10) || 10; t += /م$/.test(s.big || '') ? n / 3.3 : Math.max(10, n * 3); }
    else if (s.type === 'stopwatch') t += s.cap || 600;
  });
  return t;
}

if (typeof module !== 'undefined') module.exports = { FORMATS, MODES, CATEGORIES, EXTRA_METHODS, compileWorkout, estimate, describe, perform, secTxt, repsTxt };
