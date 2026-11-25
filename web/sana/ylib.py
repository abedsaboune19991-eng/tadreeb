# -*- coding: utf-8 -*-
"""أدوات خطة السنة: تمرين بتدرّج 11 أسبوعًا (+ أسبوع اختبار)."""
from lib import Ex, ORD, WEEKS_AR, en, sets_txt, U

U['contact'] = ('ملامسة واحدة', 'ملامستان', 'ملامسات', 'ملامسة')
U['att'] = ('محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة')
DELOAD = (4, 8)


def tt(sec):
    if sec == 120:
        return 'دقيقتان'
    if sec == 180:
        return '3 دقائق'
    if sec == 150:
        return 'دقيقتان ونصف'
    return '%d ثانية' % sec


class YEx(Ex):
    """A/B/C = (جولات، العدد في أول أسبوع من المرحلة الفرعية، الزيادة الأسبوعية)
    الأسابيع 1–3 من A، و5–7 من B، و9–11 من C. والأسبوعان 4 و8 تخفيف."""

    def __init__(self, ar, en_name, cue, unit, A, B, C, rest, per='', hold=False, boom=False, trans=None, loads=None):
        weeks = []
        for w in range(1, 12):
            if w in (1, 2, 3):
                s, n, st = A; n = n + st * (w - 1)
            elif w == 4:
                s, n, st = A; s = max(2, s - 1)
            elif w in (5, 6, 7):
                s, n, st = B; n = n + st * (w - 5)
            elif w == 8:
                s, n, st = B; s = max(2, s - 1)
            else:
                s, n, st = C; n = n + st * (w - 9)
            weeks.append((s, n))
        Ex.__init__(self, ar, en_name, cue, unit, weeks, rest, per=per, hold=hold, boom=boom, trans=trans)
        self.loads = loads  # نص الأوزان حسب المرحلة الفرعية

    def load_for(self, w):
        if not self.loads:
            return ''
        k = 0 if w <= 4 else (1 if w <= 8 else 2)
        return self.loads[k]

    def render(self, idx, base_week=0, deload_last=True, last=False):
        h = ['<div class="ex">']
        h.append('<h4><span class="no">%d</span> %s <span class="dash">—</span> %s</h4>' % (idx, self.ar, en(self.en)))
        h.append('<p class="cue">%s</p>' % self.cue)
        if self.boom:
            h.append('<p class="boom">⚡ تمرين انفجاري: كل تكرار بأقصى سرعة وقوة. إذا بطؤت الحركة أو ثقل الهبوط فأوقف الجولة.</p>')
        s0, n0 = self.weeks[0]
        ld = self.load_for(1)
        h.append('<p class="wk">الأسبوع الأول%s:</p><ul class="rounds">' % ((' (' + ld + ')') if ld else ''))
        for i in range(s0):
            line = 'الجولة %s: %s' % (ORD[i], self.each(n0))
            line += '، ثم راحة %d ثانية.' % self.rest if i < s0 - 1 else '.'
            h.append('<li>%s</li>' % line)
        h.append('</ul><p class="prog"><b>التدرّج في الأسابيع التالية:</b></p><ul class="progl">')
        for w in range(2, 12):
            s, n = self.weeks[w - 1]
            tag = ' (تخفيف)' if w in DELOAD else ''
            ld = self.load_for(w)
            ldt = (' — ' + ld) if ld and (w in (5, 9) or w == 2) else ''
            h.append('<li><b>الأسبوع %s%s:</b> %s، في كل جولة %s، راحة %d ثانية%s.</li>' % (
                WEEKS_AR[w - 1], tag, sets_txt(s), self.each(n), self.rest, ldt))
        h.append('</ul>')
        if last:
            h.append('<p class="trans">⏱ بعد الجولة الأخيرة: انتهت تمارين هذا الجزء.</p>')
        else:
            h.append('<p class="trans">⏱ بعد الجولة الأخيرة: راحة %s، ثم انتقل إلى التمرين التالي.</p>' % tt(self.trans))
        h.append('</div>')
        return '\n'.join(h)


def yexlist(exs):
    return '\n'.join(e.render(i, last=(i == len(exs))) for i, e in enumerate(exs, 1))
