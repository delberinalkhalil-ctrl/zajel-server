"""Builds app/assets/i18n/<lang>.json from tools/i18n/<lang>.py and checks every language against English."""
import importlib, json, re, sys, pathlib
here = pathlib.Path(__file__).parent
sys.path.insert(0, str(here))
LANGS = ['ar', 'en', 'fr', 'tr', 'he', 'es', 'pt', 'fa', 'ru', 'zh', 'hi', 'ku', 'de', 'it', 'uk']
out = here.parent.parent / 'app' / 'assets' / 'i18n'
out.mkdir(parents=True, exist_ok=True)
en = importlib.import_module('en').T
ph = lambda s: sorted(re.findall(r'\{(\w+)\}', s))
ok = True
for l in LANGS:
    T = importlib.import_module(l).T
    miss, extra = set(en) - set(T), set(T) - set(en)
    bad = [k for k in en if k in T and ph(en[k]) != ph(T[k])]
    if miss or extra or bad:
        ok = False
        print(l, 'missing', sorted(miss), 'extra', sorted(extra), 'placeholders', bad)
    (out / f'{l}.json').write_text(json.dumps({k: T.get(k, en[k]) for k in en}, ensure_ascii=False, indent=1), encoding='utf-8')
print('ok' if ok else 'PROBLEMS', len(en), 'keys x', len(LANGS))
sys.exit(0 if ok else 1)
