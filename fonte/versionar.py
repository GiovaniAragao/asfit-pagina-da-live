#!/usr/bin/env python3
"""Carimba a versão (?v=hash do conteúdo) nos scripts da página de aquecimento e da pesquisa.

Rodar SEMPRE depois de mexer em qualquer arquivo de js/ e antes de publicar:
    /usr/bin/python3 fonte/versionar.py

Por quê: os scripts ficam 1 dia em cache no celular de quem já abriu a página. Sem o carimbo,
o HTML novo rodava com o js antigo e a página travava (aconteceu em 10/10/2026: a animação da
segunda dobra sumiu no celular do Giovani depois que a tela de calls saiu).
"""
import hashlib
import re
from pathlib import Path

PASTA = Path(__file__).resolve().parent.parent


def carimbo(arquivo):
    return hashlib.md5((PASTA / arquivo).read_bytes()).hexdigest()[:8]


# 1) a cena da legião é importada de dentro do pagina.js
pagina = PASTA / 'js/pagina.js'
txt = pagina.read_text(encoding='utf-8')
txt, n = re.subn(r"import\('\./legiao\.js(?:\?v=[0-9a-f]+)?'\)", "import('./legiao.js?v=%s')" % carimbo('js/legiao.js'), txt)
assert n == 1, 'não achei o import da legião no pagina.js'
pagina.write_text(txt, encoding='utf-8')

# 2) os scripts chamados pelo index.html (o pagina.js já com o import carimbado)
indice = PASTA / 'index.html'
html = indice.read_text(encoding='utf-8')
for arq in ('js/gsap.min.js', 'js/ScrollTrigger.min.js', 'js/pagina.js'):
    html, n = re.subn(r'src="%s(?:\?v=[0-9a-f]+)?"' % re.escape(arq), 'src="%s?v=%s"' % (arq, carimbo(arq)), html)
    assert n == 1, 'não achei %s no index.html' % arq
indice.write_text(html, encoding='utf-8')

# 3) a página da pesquisa (pesquisa/index.html) chama ../js/pesquisa.js
pesq = PASTA / 'pesquisa/index.html'
ph = pesq.read_text(encoding='utf-8')
ph, n = re.subn(r'src="\.\./js/pesquisa\.js(?:\?v=[0-9a-f]+)?"', 'src="../js/pesquisa.js?v=%s"' % carimbo('js/pesquisa.js'), ph)
assert n == 1, 'não achei ../js/pesquisa.js no pesquisa/index.html'
pesq.write_text(ph, encoding='utf-8')
print('versões carimbadas:', ', '.join('%s=%s' % (a, carimbo(a)) for a in ('js/legiao.js', 'js/gsap.min.js', 'js/ScrollTrigger.min.js', 'js/pagina.js', 'js/pesquisa.js')))
