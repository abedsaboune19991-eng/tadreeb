# -*- coding: utf-8 -*-
import base64, sys
SRC = '/home/claude/funoon/src/'
FONTS = '/home/claude/build/fonts/'
def b64(n): return base64.b64encode(open(FONTS + n, 'rb').read()).decode()
css = open(SRC + 'app.css', encoding='utf-8').read()
css = (css.replace('__AR400__', b64('cairo-arabic-400-normal.woff')).replace('__AR700__', b64('cairo-arabic-700-normal.woff'))
          .replace('__LA400__', b64('cairo-latin-400-normal.woff')).replace('__LA700__', b64('cairo-latin-700-normal.woff')))
r = lambda n: open(SRC + n, encoding='utf-8').read()
html = r('app.html').replace('__CSS__', css).replace('__ENGINE__', r('engine.js')).replace('__LIB__', r('library.js')).replace('__PARSER__', r('parser.js')).replace('__JS__', r('app.js'))
open(sys.argv[1], 'w', encoding='utf-8').write(html)
print(sys.argv[1], len(html) // 1024, 'KB')
