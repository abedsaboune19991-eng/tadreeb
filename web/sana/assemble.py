# -*- coding: utf-8 -*-
"""يجمع التطبيق في ملف HTML واحد يعمل دون إنترنت."""
import base64
import json
import sys

SRC = '/home/claude/sana/src/'
FONTS = '/home/claude/build/fonts/'
out = sys.argv[1]


def b64(name):
    return base64.b64encode(open(FONTS + name, 'rb').read()).decode()


css = open(SRC + 'app.css', encoding='utf-8').read()
css = (css.replace('__AR400__', b64('cairo-arabic-400-normal.woff'))
          .replace('__AR700__', b64('cairo-arabic-700-normal.woff'))
          .replace('__LA400__', b64('cairo-latin-400-normal.woff'))
          .replace('__LA700__', b64('cairo-latin-700-normal.woff')))
data = json.load(open('/home/claude/sana/plan.json', encoding='utf-8'))
js = open(SRC + 'app.js', encoding='utf-8').read()
html = open(SRC + 'app.html', encoding='utf-8').read()
# </script> داخل البيانات يكسر الوسم
djs = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
html = html.replace('__CSS__', css).replace('__JS__', js).replace('__DATA__', djs)
open(out, 'w', encoding='utf-8').write(html)
print(out, len(html) // 1024, 'KB')
