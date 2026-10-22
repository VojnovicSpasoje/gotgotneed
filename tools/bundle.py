#!/usr/bin/env python3
"""Pack the app into ONE self-contained HTML file (for the Claude preview version).
The real app (website / future phone app) uses the files in src/ directly.
Usage: python3 tools/bundle.py [out.html]
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
IMPORT = re.compile(r"^import\s+(?:\{[^}]*\}\s+from\s+)?'([^']+)';[^\n]*$", re.M)

def deps(path):
    code = open(path).read()
    return [os.path.normpath(os.path.join(os.path.dirname(path), m)) for m in IMPORT.findall(code)]

order, seen = [], set()
def visit(p, stack=()):
    if p in seen or p in stack: return
    for d in deps(p):
        if not d.endswith('pwa/install.js'): visit(d, stack + (p,))
    seen.add(p); order.append(p)
visit(os.path.join(SRC, 'main.js'))

js = []
for p in order:
    code = IMPORT.sub('', open(p).read())
    code = re.sub(r'^export\s+', '', code, flags=re.M)
    js.append(f'/* ---- {os.path.relpath(p, SRC)} ---- */\n' + code.strip())
script = '(() => {\n' + '\n\n'.join(js) + '\n})();'

index = open(os.path.join(ROOT, 'index.html')).read()
css_files = re.findall(r'<link rel="stylesheet" href="(src/[^"]+)">', index)
css = '\n'.join(open(os.path.join(ROOT, f)).read() for f in css_files if 'pwa/' not in f)
fonts = re.search(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]+>', index).group(0)
out = f'''<title>GotGotNeed</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
<style>
{css}
</style>

<div id="app"></div>
<div id="toast" class="toast" hidden></div>
<div id="modal" class="modal" hidden></div>

<script>
{script}
</script>
'''
dest = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'gotgotneed-single.html')
os.makedirs(os.path.dirname(dest), exist_ok=True)
open(dest, 'w').write(out)
print('wrote', dest, len(out), 'bytes;', len(order), 'modules')
