# Página da live — lançamento da Asfit

Página da live oficial de lançamento da Asfit (Agatha Sá), dia 11/11. Quem entra no Grupo de Espera chega aqui pelo
link das mensagens: vê o que vai rolar na live, mexe numa prévia do app e responde a pesquisa do Grupo de Espera (a
página `/pesquisa/`, ver abaixo), que dá o Kit de Receitas de presente. Nas mensagens ela aparece como "a página onde eu explico tudo sobre o lançamento".

No ar: https://asfit-live.netlify.app (Netlify, site id `0073bc3b-9719-45ac-82d5-94a0cea11bb7`, deploy manual:
`npx -y netlify-cli deploy --prod --dir . --site 0073bc3b-9719-45ac-82d5-94a0cea11bb7`).
Versão anterior de referência: https://live-asfit.pages.dev (Cloudflare Pages).

- `index.html` — a página, com o CSS. A configuração fica no fim (`CONFIG_AQUECIMENTO`).
- `js/pagina.js` — o que se mexe: a faixa com a contagem, a prévia do app (treino, dieta, creatina, legião e desafios)
  com o dedinho de demonstração, os vídeos dos bônus e o pop-up de saída. Cada parte roda separada: se uma der erro,
  as outras seguem.
- `js/gsap.min.js` e `js/ScrollTrigger.min.js` — GSAP 3.15, cópia local (a sequência "A Asfit é pra você que…").
- `js/legiao.js` — Three.js 0.186 só com o que a cena dos pontinhos usa, montado com esbuild a partir de
  `fonte/legiao-fonte.js`. Só baixa quando a pessoa chega perto da última dobra.
- `img/`, `video/` e `fonts/` (Figtree, licença OFL). Os vídeos só baixam quando aparecem na tela.
- `pesquisa/index.html` e `js/pesquisa.js` — a pesquisa do Grupo de Espera (formulário em etapas que substituiu o Google
  Forms). Ver a seção "A pesquisa" abaixo.
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
- `LINK_DA_PESQUISA` — a pesquisa do Grupo de Espera: `'pesquisa/'` (a página deste site). Todos os botões da página e o do
  pop-up abrem ela na mesma aba, levando junto as `utm_*` da visita. Se um dia apontar pra outro site, os botões voltam
  a abrir aba nova.
- `LINK_DA_LIVE` — quando a live começa, a faixa do topo vira link para ela.

## Se mexer em algum arquivo de `js/`

Rodar `python3 fonte/versionar.py` antes de publicar. Ele carimba `?v=` com o hash de cada script no `index.html` (e o
import da cena 3D no `pagina.js`) e do `js/pesquisa.js` no `pesquisa/index.html`. Sem isso, quem já abriu a página fica com o js antigo no cache por 1 dia, com o HTML
novo, e a prévia do app trava.

## Domínio

O `og:url` e o `og:image`, no topo do `index.html`, apontam para `https://asfit-live.netlify.app`. Se entrar domínio próprio, trocar nos dois. É o que
monta a prévia do link no WhatsApp. A página está com `noindex` (na meta `robots` e no `_headers`); se tiver que
aparecer no Google, tirar dos dois lugares.

## Como a página se comporta

- A primeira tela carrega só HTML, CSS, fonte e foto. O resto (Three.js, vídeos, telas do app) baixa quando chega perto.
- Com "reduzir movimento" ligado no aparelho, tudo aparece direto, sem animação.
- O pop-up de saída aparece uma vez por visita, a partir de 4 s (no computador quando o mouse sobe para fechar a aba;
  no celular no primeiro "voltar" e quando a pessoa volta de outro app), e não aparece mais depois que ela toca no
  botão da pesquisa.

## A pesquisa (`/pesquisa/`)

Formulário em etapas, mobile primeiro, sem biblioteca. Quem responde até o fim ganha o Kit de Receitas (3 PDFs). Tudo no
`js/pesquisa.js`; o visual está no `<style>` do `pesquisa/index.html`.

- **Pra onde grava:** `public.agatha_pesquisa` no Supabase `ewnsttmmbcdzchzpxqjb` (mesmo projeto do painel; só objetos
  `agatha_`). A página usa a chave pública e só consegue INSERT. As respostas aparecem no painel
  (https://asfit-painel-leads.netlify.app), aba da pesquisa. O envio usa um `envio_id` por pessoa: reenviar nunca duplica.
- **Se o envio falhar:** botão "Tentar de novo"; depois de 2 falhas (ou se o banco recusar o conteúdo) a pessoa recebe o
  kit mesmo assim e o rascunho fica guardado no celular; na próxima visita a página reenvia sozinha.
- **Rascunho:** `localStorage` (`asfit-pesquisa-rascunho`), vale 7 dias, com a tela "Continuar de onde parou". Depois de
  enviar, só a data fica guardada (`asfit-pesquisa-enviada`, 30 dias) pra mostrar o kit de novo em vez da capa.
- **Ligar e desligar pergunta:** é o array `PERGUNTAS` no começo do `js/pesquisa.js`; cada item tem `ativa: true/false`.
  **Cuidado:** o banco confere o conjunto exato de perguntas de cada caminho e o texto exato de cada opção. Desligar uma
  pergunta (ou mudar uma vírgula numa opção) só no js faz o banco RECUSAR o envio: a pessoa ainda recebe o kit, mas a
  resposta não grava. Ordem certa: 1) ajustar a função `agatha_pesquisa_valida` em
  `asfit-painel-leads/supabase/pesquisa.sql`; 2) trocar o js. Nome, e-mail e WhatsApp não se desligam.
- **Links do kit:** array `KIT` no `js/pesquisa.js` (os 3 PDFs no Google Drive). Num site estático não há como esconder
  esses links; o Google Forms também os expunha.
- **Textos da interface:** objeto `TEXTOS` no `js/pesquisa.js`. Perguntas e opções são as do Google Forms, sem mexer.
- **Caminhos:** vitalícia grava só `tempo_acompanha` e `usa_asfit`; menor de 18 grava essas duas mais `faixa_etaria`;
  "nunca usei" ganha também a pergunta `representa`.
- **Contador "N meninas já responderam":** aparece sempre na capa (e no painel "O seu presente"). O número é
  `RESPOSTAS_ANTERIORES` (constante no topo do `js/pesquisa.js`, hoje 374: as respostas que o Google Forms já tinha
  recebido antes da troca; a confirmar com o dono) mais `agatha_pesquisa_total()`. Se o banco não responder, mostra só a base.
- **Progresso:** a barra começa em ~18% na primeira pergunta e anda mais rápido no começo (curva ease-out), chegando a 100%
  só no envio. O rótulo usa estados ("Você já começou", "Tá indo bem", "Passou da metade", "Quase lá", "Faltam só 3",
  "Faltam só 2", "Última"), e os de metade e de fim só aparecem quando a contagem real de etapas confirma. Leitor de tela
  recebe o progresso real ("Etapa X de Y").
- **Perguntas desligadas:** `preco_justo` está com `ativa: false` (só `investiria` fica na etapa P11); o banco aceita a
  resposta sem essa chave.
- **Demonstração do app:** o celular da etapa "Você já estava esperando…" é clicável (check-in, sobe no ranking); o código
  é uma versão enxuta da prévia da página da live, dentro do próprio `pesquisa.js`.
- **Anti-robô:** campo-isca e 20 s mínimos entre abrir a página e enviar (quem termina antes só espera em segundo plano).
- **UTM:** a página da live repassa as `utm_*` pro link da pesquisa e a pesquisa grava junto com o `referrer`.
- **Imagens novas** (`img/manual-*-160.webp`, `agatha-academia*.webp`): copiadas da pasta da captação; as de 160 px são só
  redimensionadas.
- **Teste:** `scratchpad/obra-pesquisa/teste-form.js` (Playwright com o Chrome do sistema) percorre os caminhos e confere a
  linha gravada; foi escrito na obra e fica fora deste repositório.
