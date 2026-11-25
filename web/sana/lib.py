# -*- coding: utf-8 -*-
import re

ORD = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة']
WEEKS_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر']

# وحدات العدّ: (واحد، اثنان، من 3 إلى 10، 11 فأكثر)
U = {
    'pull': ('عقلة واحدة', 'عقلتان', 'عقلات', 'عقلة'),
    'neg': ('نزلة واحدة', 'نزلتان', 'نزلات', 'نزلة'),
    'rep': ('تكرار واحد', 'تكراران', 'تكرارات', 'تكرارًا'),
    'push': ('ضغطة واحدة', 'ضغطتان', 'ضغطات', 'ضغطة'),
    'jump': ('قفزة واحدة', 'قفزتان', 'قفزات', 'قفزة'),
    'lunge': ('اندفاعة واحدة', 'اندفاعتان', 'اندفاعات', 'اندفاعة'),
    'roll': ('دفعة واحدة', 'دفعتان', 'دفعات', 'دفعة'),
    'raise': ('رفعة واحدة', 'رفعتان', 'رفعات', 'رفعة'),
    'squat': ('سكوات واحد', 'سكواتان', 'سكوات', 'سكوات'),
    'bound': ('متر واحد', 'متران', 'أمتار', 'مترًا'),
    'dip': ('غطسة واحدة', 'غطستان', 'غطسات', 'غطسة'),
}


def unit_txt(n, key):
    f = U[key]
    if n == 1:
        return f[0]
    if n == 2:
        return f[1]
    if n <= 10:
        return '%d %s' % (n, f[2])
    return '%d %s' % (n, f[3])


def sets_txt(s):
    return 'جولتان' if s == 2 else '%d جولات' % s


def en(t):
    return '<span class="en">%s</span>' % t


def fix_bidi(html):
    """يلفّ الأوقات مثل 6:30 بوسم اتجاه ثابت لمنع انعكاسها."""
    return re.sub(r'(?<![\d>])(\d{1,2}:\d{2})(?![\d])', r'<span class="ltr">\1</span>', html)


class Ex:
    def __init__(self, ar, en_name, cue, unit, weeks, rest, per='', hold=False, boom=False, trans=None):
        self.ar, self.en, self.cue, self.unit = ar, en_name, cue, unit
        self.weeks, self.rest, self.per, self.hold = weeks, rest, per, hold
        self.boom = boom
        self.trans = trans if trans else (180 if boom else (90 if hold else 120))

    def each(self, n):
        if self.hold:
            return 'ثبّت %d ثانية%s' % (n, self.per)
        return '%s%s' % (unit_txt(n, self.unit), self.per)

    def render(self, idx, base_week, deload_last=True, last=False):
        rest = self.rest
        h = ['<div class="ex">']
        h.append('<h4><span class="no">%d</span> %s <span class="dash">—</span> %s</h4>' % (idx, self.ar, en(self.en)))
        h.append('<p class="cue">%s</p>' % self.cue)
        if self.boom:
            h.append('<p class="boom">⚡ تمرين انفجاري: كل تكرار بأقصى سرعة وقوة. إذا بطؤت الحركة فأوقف الجولة.</p>')
        s0, n0 = self.weeks[0]
        h.append('<p class="wk">الأسبوع %s:</p><ul class="rounds">' % WEEKS_AR[base_week])
        for i in range(s0):
            line = 'الجولة %s: %s' % (ORD[i], self.each(n0))
            line += '، ثم راحة %d ثانية.' % rest if i < s0 - 1 else '.'
            h.append('<li>%s</li>' % line)
        h.append('</ul>')
        if len(self.weeks) > 1:
            h.append('<p class="prog"><b>التدرّج في الأسابيع التالية:</b></p><ul class="progl">')
            for j in range(1, len(self.weeks)):
                s, n = self.weeks[j]
                tag = ' (أسبوع تخفيف)' if (deload_last and j == 3 and len(self.weeks) == 4) else ''
                h.append('<li><b>الأسبوع %s%s:</b> %s، في كل جولة %s، راحة %d ثانية.</li>' % (
                    WEEKS_AR[base_week + j], tag, sets_txt(s), self.each(n), rest))
            h.append('</ul>')
        if last:
            h.append('<p class="trans">⏱ بعد الجولة الأخيرة: انتهت تمارين الجلسة، انتقل إلى التهدئة.</p>')
        else:
            t = self.trans
            tt = 'دقيقتان' if t == 120 else ('3 دقائق' if t == 180 else '%d ثانية' % t)
            h.append('<p class="trans">⏱ بعد الجولة الأخيرة: راحة %s، ثم انتقل إلى التمرين التالي.</p>' % tt)
        h.append('</div>')
        return '\n'.join(h)


def run_week(title, steps):
    h = ['<div class="runwk"><p class="wk">%s</p><ul>' % title]
    for s in steps:
        h.append('<li>%s</li>' % s)
    h.append('</ul></div>')
    return '\n'.join(h)


def day_band(cls, daynum, title_ar, title_en, duration):
    return ('<div class="dayband %s"><div class="dn">%s</div><div class="dt">%s <span class="en">%s</span></div>'
            '<div class="dur">%s</div></div>') % (cls, daynum, title_ar, title_en, duration)
