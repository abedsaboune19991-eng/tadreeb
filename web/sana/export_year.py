# -*- coding: utf-8 -*-
"""يستخرج برنامج السنة إلى JSON لتطبيق «سنة الرياضي»."""
import json
import re
import sys
sys.path.insert(0, '/home/claude/build')
import warmups as W
import year as Y
from year_blocks import BLOCKS, d2_steps, d5_steps
from extras import D10_YEAR, D10_RULE

TAG = re.compile(r'<[^>]+>')


def txt(s):
    s = TAG.sub('', str(s)).replace('&amp;', '&')
    s = re.sub(r'T\s*−\s*(\d+)', r'أسرع من T بـ \1', s)
    s = re.sub(r'T\s*\+\s*(\d+)', r'أبطأ من T بـ \1', s)
    return re.sub(r'\s+', ' ', s).strip()


LI = re.compile(r'<li><b>(.*?)</b> <span class="en">(.*?)</span> — <b class="dose">(.*?)</b><br><span class="how">(.*?)</span></li>', re.S)


def items(lst):
    out = []
    for s in lst:
        m = LI.match(s)
        out.append({'ar': txt(m.group(1)), 'en': txt(m.group(2)), 'dose': txt(m.group(3)), 'how': txt(m.group(4))})
    return out


WU = {}
for cls in ('pull', 'run', 'push', 'legs', 'long'):
    wt, wl = Y.WARM[cls]
    if cls == 'long':
        cool = items([W.WALK2]); mt = 'الروتين الأسبوعي للليونة (25 دقيقة)'
        mob = items(W.MOB_DAILY + W.MOB_WEEKLY_EXTRA + Y.SKILL_MOB)
        coolt = 'التهدئة'; tail = txt(W.TAILS['long'])
    else:
        coolt, cl = Y.COOL[cls]; cool = items(cl); mt = 'الروتين اليومي للليونة (10 دقائق)'
        mob = items(W.MOB_DAILY); tail = txt(Y.TAIL[cls])
    WU[cls] = {'warmTitle': txt(wt), 'warm': items(wl), 'coolTitle': txt(coolt), 'cool': cool, 'mobTitle': mt, 'mob': mob, 'tail': tail}


def ex_json(e, w):
    s, n = e.weeks[w - 1]
    return {'ar': e.ar, 'en': e.en, 'cue': txt(e.cue), 'boom': e.boom, 'hold': e.hold, 'sets': s, 'n': n,
            'each': txt(e.each(n)), 'rest': e.rest, 'trans': e.trans, 'deload': w in (4, 8), 'load': e.load_for(w)}


MT = {
    'pull': 'الاختبار القصير: بعد الإحماء مباشرة، أقصى عقلات نظيفة، وسجّله في صفحة السجلّ. ثم ارتح 5 دقائق وأكمل جلسة التخفيف. إن زاد رقمك عقلتين أو أكثر على آخر اختبار فأضف تكرارًا لكل جولة في تمارين السحب بالتكرارات للأسابيع الثلاثة التالية، وإن نقص فأعد أرقام الأسابيع الثلاثة السابقة.',
    'push': 'الاختبار القصير: بعد الإحماء مباشرة، أقصى ضغط عادي، وسجّله في صفحة السجلّ. ثم ارتح 5 دقائق وأكمل جلسة التخفيف. إن زاد رقمك 3 ضغطات أو أكثر على آخر اختبار فأضف تكرارين لكل جولة في تمارين الدفع بالتكرارات للأسابيع الثلاثة التالية، وإن نقص فأعد أرقام الأسابيع الثلاثة السابقة.',
}
ORDER = 'ترتيب الجلسة: الانفجار أولًا وأنت منتعش ⚡، ثم القوة والمهارة، ثم تمارين الأوتار (الثبات والنزول البطيء) في الآخر.'
PLYO = 'البليومترك على أرض أنعم إن وجدت (عشب أو تراب)، وبحذاء جيد. لا تتجاوز عدد الملامسات المكتوب. وإن ظهر ألم في أخيل أو الركبة فاحذف القفز هذا الأسبوع وأبقِ تمارين الأوتار.'
RUNNOTE = 'الوتائر من رقمك T (آخر اختبار جري). في الساحة القصيرة اعتمد على زمن الجولة.'

weeks = []
for bi, B in enumerate(BLOCKS):
    for w in range(1, 13):
        gw = bi * 12 + w
        if w == 12:
            days = []
            for i, (t, e, its) in enumerate(B['tests'], 1):
                cls = ['pull', 'run', 'push', 'legs', 'long'][i - 1]
                days.append({'day': i, 'cls': cls, 'title': t, 'en': e, 'dur': '',
                             'notes': ['أدِّ إحماء هذا اليوم كما هو، ثم الاختبارات، وبينها راحة 3 إلى 4 دقائق. وسجّل النتائج في صفحة السجلّ.'],
                             'blocks': [], 'run': {'title': 'الاختبارات', 'steps': [txt(x) for x in its]}, 'wu': cls})
            weeks.append({'week': gw, 'local': 12, 'phase': bi + 1, 'deload': False, 'test': True, 'days': days})
            continue
        main = lambda key: {'title': None, 'kind': 'main', 'exs': [ex_json(e, w) for e in B[key]]}
        box = lambda key, t: {'title': t, 'kind': key, 'exs': [ex_json(e, w) for e in B[key]]}
        mt = w in (4, 8)
        days = [
            {'day': 1, 'cls': 'pull', 'title': 'السحب والجذع والأوتار العلوية', 'en': 'Pull, Core & Upper Tendons', 'dur': 'نحو 70 دقيقة',
             'notes': ([MT['pull']] if mt else []) + [ORDER], 'blocks': [main('pull')], 'run': None, 'wu': 'pull'},
            {'day': 2, 'cls': 'run', 'title': 'الجري والسرعة', 'en': 'Running & Speed', 'dur': '60 إلى 75 دقيقة',
             'notes': [RUNNOTE], 'blocks': [box('mini_push', 'جلسة الدفع المصغرة — تدعم اليوم الثالث (جهد متوسط، بلا فشل)')],
             'run': {'title': 'الأسبوع ' + str(w) + (' (تخفيف)' if w in (4, 8) else ''), 'steps': [txt(x) for x in d2_steps(bi + 1, w)]},
             'd10': items(D10_YEAR[bi + 1]), 'wu': 'run'},
            {'day': 3, 'cls': 'push', 'title': 'الدفع والترايسبس والأوتار العلوية', 'en': 'Push, Triceps & Upper Tendons', 'dur': 'نحو 70 دقيقة',
             'notes': ([MT['push']] if mt else []) + [ORDER], 'blocks': [main('push')], 'run': None, 'wu': 'push'},
            {'day': 4, 'cls': 'legs', 'title': 'الأرجل والبليومترك والأوتار السفلية', 'en': 'Legs, Plyometrics & Lower Tendons', 'dur': 'نحو 80 دقيقة',
             'notes': [PLYO, ORDER], 'blocks': [main('legs'), box('mini_pull', 'جلسة السحب المصغرة — تدعم اليوم الأول (جهد متوسط، بلا فشل)')], 'run': None, 'wu': 'legs'},
            {'day': 5, 'cls': 'long', 'title': 'جري طويل وجلسة لكل الجسم وليونة', 'en': 'Long Run, Full-Body & Mobility', 'dur': '90 إلى 120 دقيقة',
             'notes': [], 'blocks': [box('full', 'الجلسة المتوسطة لكل الجسم — بعد الجري وراحة 10 دقائق')],
             'run': {'title': 'الجري الطويل', 'steps': [txt(x) for x in d5_steps(bi + 1, w)]}, 'wu': 'long'},
        ]
        weeks.append({'week': gw, 'local': w, 'phase': bi + 1, 'deload': w in (4, 8), 'days': days})

PHASES = [{'num': i + 1, 'name': B['num'], 'title': B['title'], 'months': B['months'], 'goal': txt(B['goal']),
           'entry': txt(B['entry']), 'success': txt(B['success']), 'points': [txt(p) for p in B['points']]} for i, B in enumerate(BLOCKS)]
MEAS = [
    ['mtpu4', 'الاختبار القصير — الأسبوع 4: أقصى عقلات', 'Week 4 Pull-ups'],
    ['mtps4', 'الاختبار القصير — الأسبوع 4: أقصى ضغط', 'Week 4 Push-ups'],
    ['mtpu8', 'الاختبار القصير — الأسبوع 8: أقصى عقلات', 'Week 8 Pull-ups'],
    ['mtps8', 'الاختبار القصير — الأسبوع 8: أقصى ضغط', 'Week 8 Push-ups'],
    ['pu', 'أقصى عقلات نظيفة', 'Max Pull-ups'],
    ['wpu', 'أثقل حقيبة للعقلة (كغ)', 'Weighted Pull-up'],
    ['mu', 'المسل أب (عدد)', 'Muscle-ups'],
    ['fl', 'الفرونت ليفر (ثانية)', 'Front Lever'],
    ['dip', 'أقصى غطس', 'Dips'],
    ['hs', 'الوقوف على اليدين (ثانية)', 'Handstand'],
    ['hspu', 'ضغط الوقوف على اليدين', 'HSPU'],
    ['bj', 'القفزة العريضة (سم)', 'Broad Jump'],
    ['vj', 'القفزة العمودية (سم)', 'Vertical Jump'],
    ['pis', 'البيستول لكل رجل', 'Pistol'],
    ['calf', 'رفع الكعب برجل واحدة', 'SL Calf Raise'],
    ['k5', 'زمن 5 كم', '5 km'],
    ['t', 'رقمك T (وتيرة الجري)', 'T pace'],
    ['ls', 'الجلوس على شكل L (ثانية)', 'L-sit'],
    ['tt', 'لمس أصابع القدم (سم)', 'Toe Touch'],
]
DATA = {'phases': PHASES, 'weeks': weeks, 'wu': WU, 'd10rule': txt(D10_RULE), 'measures': MEAS}
out = sys.argv[1]
json.dump(DATA, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
import os
print(out, os.path.getsize(out) // 1024, 'KB', len(weeks), 'weeks')
