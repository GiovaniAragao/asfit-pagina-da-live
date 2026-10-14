# Página da live — lançamento da Asfit

Página da live oficial de lançamento da Asfit (Agatha Sá), dia 11/11. Quem entra no Grupo de Espera chega aqui pelo
link das mensagens, e quem vê os carrosséis de aquecimento, pelo tráfego. A primeira dobra diz para que serve a página:
é uma prévia do lançamento, em que a pessoa mexe no app, vê o que vai rolar na live e conhece os bônus. Desde 14/10/2026
a página não tem botão (a pesquisa do Grupo de Espera e o pop-up de saída saíram). Nas mensagens ela aparece como "a página onde eu explico tudo sobre o lançamento".

Versão de referência no ar: https://live-asfit.pages.dev (Cloudflare Pages, provisória).

- `index.html` — a página, com o CSS. A configuração fica no fim (`CONFIG_AQUECIMENTO`).
- `js/pagina.js` — o que se mexe: a faixa com a contagem, a prévia do app (treino, dieta, creatina, legião e desafios)
  com o dedinho de demonstração, e os vídeos dos bônus. Cada parte roda separada: se uma der erro,
  as outras seguem.
- `js/gsap.min.js` e `js/ScrollTrigger.min.js` — GSAP 3.15, cópia local (a sequência "A Asfit é pra você que…").
- `js/legiao.js` — Three.js 0.186 só com o que a cena dos pontinhos usa, montado com esbuild a partir de
  `fonte/legiao-fonte.js`. Só baixa quando a pessoa chega perto da última dobra.
- `img/`, `video/` e `fonts/` (Figtree, licença OFL). Os vídeos só baixam quando aparecem na tela.
- `_headers` — `noindex` e cache das imagens, dos vídeos, dos scripts e da fonte. A Netlify lê esse mesmo formato.
- `fonte/` — só manutenção (`versionar.py` e a fonte da cena 3D). Pode ir publicada junto, não pesa nada.

## Para publicar na Netlify

É um site estático, sem build. Na Netlify: **Add new site → Import from GitHub**, escolher este repositório e deixar:

- Build command: *(vazio)*
- Publish directory: `.`

## Configuração (fim do `index.html`)

- `INICIO_DA_LIVE` — dia e hora da live, no horário de Brasília (ex.: `'2026-11-11T20:00:00-03:00'`). Vazio, a faixa do
  topo conta só os dias; preenchido, vira contagem com segundos.
- `PLATAFORMA` — `'no YouTube'`.
- `LINK_DA_LIVE` — quando a live começa, a faixa do topo vira link para ela.

## Se mexer em algum arquivo de `js/`

Rodar `python3 fonte/versionar.py` antes de publicar. Ele carimba `?v=` com o hash de cada script no `index.html` (e o
import da cena 3D no `pagina.js`). Sem isso, quem já abriu a página fica com o js antigo no cache por 1 dia, com o HTML
novo, e a prévia do app trava.

## Domínio

Trocar `https://live-asfit.pages.dev` pelo domínio final no `og:url` e no `og:image`, no topo do `index.html`. É o que
monta a prévia do link no WhatsApp. A página está com `noindex` (na meta `robots` e no `_headers`); se tiver que
aparecer no Google, tirar dos dois lugares.

## Como a página se comporta

- A primeira tela carrega só HTML, CSS, fonte e foto. O resto (Three.js, vídeos, telas do app) baixa quando chega perto.
- Com "reduzir movimento" ligado no aparelho, tudo aparece direto, sem animação.
