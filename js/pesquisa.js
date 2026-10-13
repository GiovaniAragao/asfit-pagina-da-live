/* Pesquisa do Grupo de Espera da Asfit (substitui o Google Forms).
   Sem biblioteca e sem build. Quem lê: /pesquisa/index.html.
   Grava em public.agatha_pesquisa (Supabase) e, no fim, entrega o Kit de Receitas.

   COMO LIGAR E DESLIGAR PERGUNTA
   - Cada pergunta é um item do array PERGUNTAS, com `ativa: true/false`. Ordem, etapa e caminho moram no mesmo item.
   - ATENÇÃO: o banco confere o conjunto EXATO de chaves de cada caminho (ver cabeçalho de
     asfit-painel-leads/supabase/pesquisa.sql). Desligar uma pergunta aqui sem ajustar o SQL faz o banco RECUSAR
     o envio (a pessoa ainda recebe o kit e o rascunho fica guardado, mas a resposta não grava). Ordem certa:
     1) ajustar o SQL (a função agatha_pesquisa_valida), 2) trocar `ativa` aqui.
   - Nome, e-mail e WhatsApp são colunas da tabela e não se desligam. O texto de cada opção é congelado: mudar uma
     vírgula aqui exige mudar no SQL também. */
(function () {
  'use strict';

  var SUPABASE = 'https://ewnsttmmbcdzchzpxqjb.supabase.co/rest/v1';
  var CHAVE = 'sb_publishable_mIb6RJkWqC5QESdczkFWng_Oo5O17hi';
  var TEMPO_MINIMO = 20000;          // ms entre abrir a página e enviar (anti-robô; não é segurança)
  var VALE_RASCUNHO = 7 * 864e5;     // rascunho vale 7 dias
  var VALE_ENVIADA = 30 * 864e5;     // "já respondeu" vale 30 dias
  // Respostas que a pesquisa já tinha recebido no Google Forms até a troca (base do contador; a confirmar com o dono).
  // O número mostrado é RESPOSTAS_ANTERIORES + agatha_pesquisa_total(). Se a chamada ao banco falhar, mostra só a base.
  var RESPOSTAS_ANTERIORES = 374;
  var K_RASC = 'asfit-pesquisa-rascunho';
  var K_ENV = 'asfit-pesquisa-enviada';   // só a data do envio, nenhum dado pessoal
  var K_POPUP = 'asfit-pesquisa';         // o mesmo flag que a página da live usa pra não abrir o pop-up

  var OPC_VIT = 'Sou vitalícia da Asfit', OPC_NUNCA = 'Nunca usei a Asfit', OPC_MENOR = 'Menos de 18 anos', OPC_OUTRO = 'Outro';

  /* ===== Textos da interface (os [PROVISÓRIO] do LAYOUT.md estão aqui; trocar sem mexer no resto) ===== */
  var TEXTOS = {
    comecar: 'Começar', continuar: 'Continuar', voltar: 'Voltar', enviar: 'Enviar e pegar meu presente', tentar: 'Tentar de novo',
    enviando: 'Enviando…', ultima: 'Última', comecou: 'Você já começou', indo: 'Tá indo bem', metade: 'Passou da metade', quase: 'Quase lá', faltamSo: 'Faltam só {n}', naoSouEu: 'Não sou eu, começar do zero',
    retomaTitulo: 'Continuar de onde parou, {nome}?', retomaSemNome: 'Continuar de onde parou?',
    jaRespondeu: 'Você já respondeu. O seu kit está aqui.',
    conta: '{n} meninas já responderam',
    avisoEyebrow: 'Seus dados', avisoTitulo: 'Antes de começar',
    avisoA: 'A equipe da Agatha e da Asfit guarda as suas respostas pra montar o lançamento, te entregar o kit e te avisar da live. Pra pedir pra apagar, é só mandar um ',
    avisoB: 'direct pro @agathasa no Instagram', avisoC: '.',
    aceite: 'Li e aceito que a equipe guarde as minhas respostas pra isso',
    faixa1: 'Agora é sobre o seu dia a dia, mô. Com isso eu monto um lançamento que cabe na sua vida.',
    faixa2: 'Esse é o app novo. Agora eu quero saber o que mais te interessa nele.',
    faixa3: 'Faltam só umas perguntinhas pra eu te conhecer melhor. Pode escrever do seu jeito.',
    demo: 'Demonstração',
    escolhidas: 'Escolhidas {n} de 3', marcadas: 'Marcadas {n}', cheio: '3 de 3. Desmarca uma pra trocar',
    outro: 'Qual a sua ideia?',
    erroUnica: 'Escolha uma opção.', erroVarias: 'Escolha pelo menos uma.', erroTexto: 'Falta preencher este campo.',
    erroNome: 'Coloque o seu nome.', erroOutro: 'Escreva qual é a ideia.', erroAceite: 'Marque a caixinha para continuar.',
    erroEmail: 'Confira o e-mail. Exemplo: seunome@gmail.com', erroWhats: 'Só os números, com DDD. Exemplo: 21998765421',
    erroNumero: 'Só o número, sem R$. Exemplo: 300', erroMax: 'Escolha até 3.',
    demora: 'Está demorando um pouco. Não feche esta tela.',
    falha: 'Não consegui enviar agora. As suas respostas estão guardadas. Quer tentar de novo?',
    rascunho: 'Não consegui enviar as suas respostas, mas elas ficaram guardadas neste celular e serão enviadas de novo quando você voltar aqui.',
    finalTitulo: 'Prontinho, mô! 🎁', finalTexto: 'Aqui está o seu Kit de Receitas. É só tocar pra abrir e salvar no seu celular:',
    finalLive: 'E enquanto a live não chega, eu deixei uma página com tudo que vai rolar no dia 11/11, onde você já pode mexer no app novo antes de todo mundo:',
    verLive: 'Ver o que vai rolar na live', pdf: 'PDF · toque pra abrir',
    finalAviso: 'Não sai do Grupo de Espera, tá? É por lá que eu mando o link da live oficial de lançamento.',
    fecho: 'Bora dá-lhe pra não tomá-lhe! 🧿'
  };

  /* O kit: os links ficam aqui mesmo (num site estático não há como esconder) */
  var KIT = [
    { k: 's', titulo: '🍹 Lista de Sucos Glow Up', url: 'https://drive.google.com/file/d/1kaNLNlrzoI5y-TZN9FGcie95Vrm-2FZR/view', mini: '../img/manual-sucos-160.webp' },
    { k: 'c', titulo: '🍵 Seu Ritual de Chás da Semana', url: 'https://drive.google.com/file/d/1PHbIgaC_FVmMHgrFPFnmY8uviZdlQR-R/view', mini: '../img/manual-chas-160.webp' },
    { k: 'd', titulo: '🍫 Doces Proteicos para Comer sem Sair da Dieta', url: 'https://drive.google.com/file/d/1bg23TA1NVj4VEeUYORpkpvGJycRm713p/view', mini: '../img/manual-doces-160.webp' }
  ];

  /* ===== AS PERGUNTAS (texto verbatim do Google Forms; opções congeladas, iguais às do banco) =====
     quem: 'todas' | 'nao_vit' (todas menos vitalícia) | 'longo' (todas menos vitalícia e menor) | 'nunca' (só quem nunca usou)
     tipo: nome, email, whats, numero, texto (curto), longo, unica, varias */
  /* PERGUNTAS:INICIO */
  var PERGUNTAS = [
    { id: 'nome', etapa: 'P1', ativa: true, quem: 'todas', tipo: 'nome', coluna: true, obrig: true, enunciado: 'Qual o seu nome?' },
    { id: 'email', etapa: 'P1', ativa: true, quem: 'todas', tipo: 'email', coluna: true, obrig: true, enunciado: 'Qual o seu e-mail?', ajuda: '(O mesmo que você usou pra se cadastrar)' },
    { id: 'whatsapp', etapa: 'P1', ativa: true, quem: 'todas', tipo: 'whats', coluna: true, obrig: true, enunciado: 'Qual o seu WhatsApp?', ajuda: '(Pode digitar desse jeito, EXEMPLO: 21998765421) DDD + número, sem símbolos e sem espaços' },
    { id: 'tempo_acompanha', etapa: 'P2', ativa: true, quem: 'todas', tipo: 'unica', modo: 'chips', obrig: true, enunciado: 'Há quanto tempo você me acompanha?', opcoes: ["Comecei a te seguir agora", "Há menos de 6 meses", "De 6 meses a 1 ano", "De 1 a 3 anos", "Há mais de 3 anos"] },
    { id: 'usa_asfit', etapa: 'P2', ativa: true, quem: 'todas', tipo: 'unica', modo: 'lista', obrig: true, enunciado: 'Você usa a Asfit, ou já usou?', opcoes: ["Já usei a Asfit tempos atrás", "Uso a Asfit hoje (mas não sou vitalícia)", "Nunca usei a Asfit", "Sou vitalícia da Asfit"] },
    { id: 'faixa_etaria', etapa: 'P3', ativa: true, quem: 'nao_vit', tipo: 'unica', modo: 'chips', obrig: true, enunciado: 'Qual a sua faixa etária?', opcoes: ["Menos de 18 anos", "18 a 24 anos", "25 a 29 anos", "30 a 34 anos", "35 a 39 anos", "40 a 44 anos", "45 anos ou mais"] },
    { id: 'renda', etapa: 'P4', ativa: true, quem: 'longo', tipo: 'unica', modo: 'chips', obrig: true, enunciado: 'Qual a sua renda mensal aproximada?', ajuda: '(Pode ser a da sua família, caso você ainda não tenha.)', sigilo: 'Essa é uma informação sigilosa.', opcoes: ["Até R$ 2.000", "De R$ 2.000 a R$ 3.000", "De R$ 3.000 a R$ 5.000", "De R$ 5.000 a R$ 8.000", "Acima de R$ 8.000"] },
    { id: 'representa', etapa: 'P4b', ativa: true, quem: 'nunca', tipo: 'unica', modo: 'lista', obrig: true, enunciado: 'Qual das opções abaixo mais te representa hoje?', opcoes: ["Começo a academia animada e na terceira semana já tô arrumando desculpa pra não ir", "Salvo um monte de vídeo de exercício e chego na academia sem lembrar de nenhum", "Já fiz todas as dietas da moda e nunca fiquei mais de um mês em nenhuma", "Cansei de treinar sozinha", "Ainda não treino, quero começar agora"] },
    { id: 'onde_treina', etapa: 'P5', ativa: true, quem: 'longo', tipo: 'unica', modo: 'chips', obrig: true, enunciado: 'Onde você treina hoje?', opcoes: ["Na academia", "Em casa", "Nos dois", "Tô parada no momento"] },
    { id: 'gasto_academia', etapa: 'P5', ativa: true, quem: 'longo', tipo: 'unica', modo: 'chips', obrig: true, enunciado: 'Quanto você gasta por mês com academia?', opcoes: ["Nada, treino em casa ou no condomínio", "Até R$ 100", "De R$ 101 a R$ 150", "De R$ 151 a R$ 250", "Mais de R$ 250"] },
    { id: 'gasto_suplemento', etapa: 'P6', ativa: true, quem: 'longo', tipo: 'unica', modo: 'chips', obrig: true, enunciado: 'E com suplemento (creatina, whey etc.), por mês?', opcoes: ["Nada", "Até R$ 100", "De R$ 101 a R$ 200", "De R$ 201 a R$ 300", "Mais de R$ 300"] },
    { id: 'gasto_ano', etapa: 'P6', ativa: true, quem: 'longo', tipo: 'unica', modo: 'chips', obrig: true, enunciado: 'Somando tudo (academia, suplemento, personal, nutri, apps e roupa de treino), quanto você acha que gasta num ano com treino e dieta?', ajuda: 'Sem contar o mercado do dia a dia.', opcoes: ["Até R$ 1.000", "De R$ 1.001 a R$ 2.500", "De R$ 2.501 a R$ 5.000", "De R$ 5.001 a R$ 10.000", "Mais de R$ 10.000"] },
    { id: 'esperava_lancamento', etapa: 'P7', ativa: true, quem: 'longo', tipo: 'unica', modo: 'chips', grande: true, obrig: true, enunciado: 'Você já estava esperando pelo lançamento do app novo da Asfit?', opcoes: ["Sim", "Não"] },
    { id: 'beneficios', etapa: 'P8', ativa: true, quem: 'longo', tipo: 'varias', modo: 'lista', rotulo: true, contador: 'marcadas', obrig: true, enunciado: 'Eu listei todos os benefícios que você vai ter na Asfit, selecione abaixo os que mais fizeram sentido pra você:', opcoes: ["BENEFÍCIO 1: Nunca mais chegar perdida na academia, com o seu treino já montado e vídeo meu em cada exercício.", "BENEFÍCIO 2: Comer o que você gosta sem passar fome, com a dieta flexível e sem depender de nutri ou do GPT.", "BENEFÍCIO 3: Saber quanto cabe no seu dia, com o contador de calorias e de água.", "BENEFÍCIO 4: Nunca mais treinar sozinha, com o feed só das meninas da legião treinando e as amizades pra achar a sua parceira de treino.", "BENEFÍCIO 5: Entrar nos desafios entre as meninas, com ranking e premiação pras mais constantes.", "BENEFÍCIO 6: Nunca mais esquecer a creatina, com o lembrete de creatina e suplementação.", "BENEFÍCIO 7: Participar das calls em grupo comigo e com convidados especiais.", "BENEFÍCIO 8: Entrar com o preço promocional de lançamento e o tempo de acesso aumentado, que eu só vou liberar na live."] },
    { id: 'top3_itens', etapa: 'P9', ativa: true, quem: 'longo', tipo: 'varias', modo: 'lista', limite: 3, contador: 'escolhidas', obrig: true, enunciado: 'Selecione abaixo os 3 itens que você mais acredita que vão te ajudar a ter o corpo que você quer, sem desistir no meio do caminho:', emojis: ['💪', '🥗', '🔥', '📲', '👯‍♀️', '🏆', '💊', '📞', '🎁', '🎁'], opcoes: ["TREINO PERSONALIZADO: pra nunca mais chegar perdida na academia", "DIETA FLEXÍVEL: pra comer o que gosta sem depender de nutri ou do GPT", "CONTADOR DE CALORIAS E DE ÁGUA", "FEED IGUAL O DO TIKTOK: só com as meninas da legião treinando", "AMIZADES: pra achar a sua parceira de treino", "DESAFIOS ENTRE AS MENINAS: com ranking e premiação", "LEMBRETE DE CREATINA E SUPLEMENTAÇÃO", "CALLS EM GRUPO: comigo e com convidados especiais", "TREINO COMIGO: a primeira inscrita vai treinar comigo, e esse treino vai ser gravado", "KIT DAS GOSTOSAS: as primeiras inscritas recebem em casa creatina, garrafa, cropped da Asfit, pulseira de olho grego e muito mais"] },
    { id: 'bonus', etapa: 'P10', ativa: true, quem: 'longo', tipo: 'varias', modo: 'lista', limite: 3, contador: 'escolhidas', outro: true, obrig: true, enunciado: 'Se você pudesse escolher, quais bônus você mais gostaria de ganhar no lançamento da Asfit?', ajuda: 'Marca até 3. Se tiver outra ideia, escreve em "Outro".', opcoes: ["Desafio de estreia das fundadoras do app novo, com ranking e premiação", "Primeiro dia na academia sem ficar perdida: um mapa dos principais aparelhos", "Trilhas de treino pra cada objetivo: braço, popô e postura", "Treinão de 30 minutos, pra mães e pra quem não tem tempo", "Merendas da Agatha: as receitas que bombaram no meu perfil, como a coxinha fit e o pão com ovo", "Ritual da deusa: uma rotina semanal de autocuidado, como a minha quarta de detox", "Selo de fundadora no seu perfil do app, pra sempre", "Preço congelado na renovação", "Concorrer a um dia comigo no Rio, com treino e almoço", "Outro"] },
    { id: 'investiria', etapa: 'P11', ativa: true, quem: 'longo', tipo: 'numero', obrig: true, enunciado: 'Quanto você estaria disposta a investir por 1 ano de acesso a tudo isso?', ajuda: 'Com base em tudo que você já viu que vai ter na Asfit (e ainda tem muito mais coisa que eu vou revelar na live oficial). Digite apenas o valor, ok? EX: 300, 500, 700' },
    { id: 'preco_justo', etapa: 'P11', ativa: false, quem: 'longo', tipo: 'unica', modo: 'chips', obrig: true, enunciado: 'E qual dessas faixas parece um preço justo por 1 ano de Asfit com tudo isso?', ajuda: 'Não é o mais barato que você conseguiria pagar: é o valor que você acha justo por algo que vai te entregar resultado de verdade.', opcoes: ["Mais de R$ 1.000", "De R$ 700 a R$ 1.000", "De R$ 500 a R$ 700", "De R$ 300 a R$ 500", "Até R$ 300"] },
    { id: 'duvida', etapa: 'P12', ativa: true, quem: 'longo', tipo: 'longo', obrig: false, enunciado: 'Tem alguma dúvida sobre a Asfit? Pode perguntar o que quiser: as funções do app, as formas de pagamento, como vai funcionar o acesso…', ajuda: 'Se não tiver nenhuma, pode deixar em branco.' },
    { id: 'por_que_entrou', etapa: 'P13', ativa: true, quem: 'longo', tipo: 'texto', obrig: true, enunciado: 'Por que você entrou no Grupo de Espera da Asfit?' },
    { id: 'maior_problema', etapa: 'P13', ativa: true, quem: 'longo', tipo: 'texto', obrig: true, enunciado: 'Qual o maior problema que te incomoda hoje, em relação ao seu corpo?' },
    { id: 'tem_buscado', etapa: 'P13', ativa: true, quem: 'longo', tipo: 'texto', obrig: true, enunciado: 'O que você tem buscado pra resolver o que te incomoda hoje?' },
    { id: 'o_que_impede', etapa: 'P14', ativa: true, quem: 'longo', tipo: 'longo', obrig: true, enunciado: 'Além de tempo e dinheiro, o que você acredita que te impede de conseguir o corpo que você deseja?' },
    { id: 'sentimento', etapa: 'P14', ativa: true, quem: 'longo', tipo: 'longo', obrig: true, enunciado: 'Descreva brevemente qual seria o seu sentimento se a Asfit te ajudasse a ter o corpo que você quer, sem desistir no meio do caminho?' },
    { id: 'perguntaria', etapa: 'P15', ativa: true, quem: 'longo', tipo: 'texto', obrig: true, enunciado: 'Numa conversa aberta entre eu e você, o que você me perguntaria?' },
    { id: 'compromisso_live', etapa: 'P15', ativa: true, quem: 'longo', tipo: 'unica', modo: 'lista', obrig: true, enunciado: 'Você se compromete em estar comigo AO VIVO no dia 11 de novembro, na LIVE OFICIAL DE LANÇAMENTO DA ASFIT, no meu canal do YouTube?', opcoes: ["Sim! Eu vou estar na live!", "Não! Eu vou perder uma condição que talvez nunca mais apareça de novo.."] }
  ];
  /* PERGUNTAS:FIM */

  /* Por etapa: título da seção (do Forms), faixa do celular e arte do painel do computador */
  var ETAPA = {
    P1: { sec: 'Sobre você', arte: 'v1' }, P2: { sec: 'Sobre você', arte: 'v1' }, P3: { sec: 'Sobre você', arte: 'v1' },
    P4: { sec: 'Sobre você', arte: 'v1' }, P4b: { sec: 'Sobre você', arte: 'v1' },
    P5: { sec: 'Sobre você', arte: 'v1b', faixa: 'b1' }, P6: { sec: 'Sobre você', arte: 'v1b' },
    P7: { sec: 'Sobre a Asfit', arte: 'v2', faixa: 'b2' }, P8: { sec: 'Sobre a Asfit', arte: 'v2' }, P9: { sec: 'Sobre a Asfit', arte: 'v2' },
    P10: { sec: 'Sobre a Asfit', arte: 'v2' }, P11: { sec: 'Sobre a Asfit', arte: 'v2' }, P12: { sec: 'Sobre a Asfit', arte: 'v2' },
    P13: { sec: 'Sobre você', arte: 'v3', faixa: 'b3' }, P14: { sec: 'Sobre você', arte: 'v3' }, P15: { sec: 'Para finalizar...', arte: 'v3' }
  };

  /* ===== Utilitários ===== */
  var NS = 'http://www.w3.org/2000/svg';
  var doc = document;
  function $(s, r) { return (r || doc).querySelector(s); }
  function h(tag, a, kids) {
    var e = doc.createElement(tag);
    if (a) Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === false || v == null) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }
  function icone(id, cls) {
    var s = doc.createElementNS(NS, 'svg'), u = doc.createElementNS(NS, 'use');
    s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    u.setAttribute('href', '#' + id);
    s.appendChild(u);
    return s;
  }
  function limpar(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function trim(s) { return String(s == null ? '' : s).replace(/^\s+|\s+$/g, ''); }
  function sub(t, o) { return t.replace(/\{(\w+)\}/g, function (m, k) { return o[k]; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var reduzir = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var desktop = window.matchMedia ? window.matchMedia('(min-width: 900px)') : { matches: false };
  function uuid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    var b = new Uint8Array(16);
    try { crypto.getRandomValues(b); } catch (e) { for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var x = Array.prototype.map.call(b, function (n) { return (n < 16 ? '0' : '') + n.toString(16); }).join('');
    return x.slice(0, 8) + '-' + x.slice(8, 12) + '-' + x.slice(12, 16) + '-' + x.slice(16, 20) + '-' + x.slice(20);
  }

  /* Armazenamento: tudo em try/catch. Com o storage bloqueado a página funciona só com memória */
  var mem = {};
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } }
  function gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  function apagar(k) { try { localStorage.removeItem(k); } catch (e) {} delete mem[k]; }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  /* ===== Estado ===== */
  var S = {
    v: {},            // respostas e campos (por id)
    aceite: null,     // ISO da hora em que a pessoa marcou o aceite
    envio: uuid(),    // envio_id: nasce com o rascunho e vale pra todo reenvio
    etapa: null,      // última etapa vista (pro "continuar de onde parou")
    utm: {}, ref: '', pend: false, enviado: false,
    tela: null, atual: null, seq: 0, abertoEm: Date.now(), falhas: 0, enviando: false, isca: '', voltaFinal: false,
    kPrev: 4, palco: false, avisoRasc: null
  };
  var UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function salvar() {
    if (!S.aceite || S.enviado) return;
    gravar(K_RASC, JSON.stringify({ v: 1, em: Date.now(), envio: S.envio, aceite: S.aceite, r: S.v, etapa: S.etapa, utm: S.utm, ref: S.ref, pend: S.pend }));
  }
  var salvarTimer = null;
  function salvarLogo() { clearTimeout(salvarTimer); salvarTimer = setTimeout(salvar, 250); }
  function carregarRascunho() {
    var raw = ler(K_RASC);
    if (!raw) return false;
    try {
      var o = JSON.parse(raw);
      if (!o || o.v !== 1 || !o.aceite || !o.envio || !o.r || typeof o.r !== 'object' || Date.now() - o.em > VALE_RASCUNHO || Date.now() < o.em - 864e5) { apagar(K_RASC); return false; }
      S.v = o.r; S.aceite = o.aceite; S.envio = o.envio; S.etapa = o.etapa || null; S.pend = !!o.pend;
      S.utm = o.utm && typeof o.utm === 'object' ? o.utm : {}; S.ref = typeof o.ref === 'string' ? o.ref : '';
      return true;
    } catch (e) { apagar(K_RASC); return false; }
  }

  /* ===== Caminhos ===== */
  function visivel(p) {
    if (!p.ativa) return false;
    var vit = S.v.usa_asfit === OPC_VIT, menor = S.v.faixa_etaria === OPC_MENOR;
    switch (p.quem) {
      case 'todas': return true;
      case 'nao_vit': return !vit;
      case 'longo': return !vit && !menor;
      case 'nunca': return !vit && !menor && S.v.usa_asfit === OPC_NUNCA;
    }
    return false;
  }
  function etapasVisiveis() {
    var ids = [];
    PERGUNTAS.forEach(function (p) { if (visivel(p) && ids.indexOf(p.etapa) < 0) ids.push(p.etapa); });
    return ids;
  }
  function perguntasDe(et) { return PERGUNTAS.filter(function (p) { return p.etapa === et && visivel(p); }); }
  function ehEtapa(t) { return !!ETAPA[t]; }
  function ehUltima(et) { var l = etapasVisiveis(); return l[l.length - 1] === et; }
  function proximaEtapa(et) { var l = etapasVisiveis(), i = l.indexOf(et); return i >= 0 && i < l.length - 1 ? l[i + 1] : null; }
  function progresso() {
    var l = etapasVisiveis(), T = l.length, d = 0;
    if (S.tela === 'final') d = T;
    else if (ehEtapa(S.tela)) d = Math.max(0, l.indexOf(S.tela));
    else if (S.tela === 'retoma') d = Math.max(0, l.indexOf(S.etapa));
    return { T: T, d: d, curta: T <= 3 };
  }

  /* ===== Validação ===== */
  function validarPergunta(p) {
    var v = S.v[p.id];
    switch (p.tipo) {
      case 'nome': return trim(v).length < 2 ? { m: TEXTOS.erroNome } : null;
      case 'email': { var e = trim(v); return e.length >= 5 && e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? null : { m: TEXTOS.erroEmail }; }
      case 'whats': { var n = String(v || '').replace(/\D/g, ''); return n.length >= 10 && n.length <= 13 ? null : { m: TEXTOS.erroWhats }; }
      case 'numero': { var t = trim(v); return /^\d{1,6}$/.test(t) && parseInt(t, 10) <= 100000 ? null : { m: TEXTOS.erroNumero }; }
      case 'texto': case 'longo': return p.obrig && !trim(v) ? { m: TEXTOS.erroTexto } : null;
      case 'unica': return p.obrig && !v ? { m: TEXTOS.erroUnica } : null;
      case 'varias': {
        var sel = v || [];
        if (p.obrig && !sel.length) return { m: TEXTOS.erroVarias };
        if (p.limite && sel.length > p.limite) return { m: TEXTOS.erroMax };
        if (p.outro && sel.indexOf(OPC_OUTRO) > -1 && !trim(S.v.bonus_outro)) return { m: TEXTOS.erroOutro, outro: true };
        return null;
      }
    }
    return null;
  }

  /* ===== Blocos de pergunta ===== */
  function tamanho(txt) { return txt.length <= 70 ? 'g' : txt.length <= 110 ? 'm' : 'p'; }
  function cabeca(p, multi, pequeno, campo) {
    var id = 'q-' + p.id, el;
    if (multi && campo) el = h('label', { class: pequeno ? 'rot' : 'q q--sub', id: id, for: 'f-' + p.id, text: p.enunciado });
    else if (multi) el = h('h2', { class: 'q q--sub', id: id, text: p.enunciado });
    else el = h('h1', { class: 'q', id: id, 'data-len': tamanho(p.enunciado), text: p.enunciado });
    return el;
  }
  function erroEl(id) { var s = h('span'); return h('p', { class: 'p-erro', id: 'erro-' + id, hidden: true }, [icone('i-warning'), s]); }
  function ajudaEl(p) {
    var a = h('p', { class: 'ajuda', id: 'aj-' + p.id });
    if (p.ajuda) a.appendChild(doc.createTextNode(p.ajuda));
    if (p.sigilo) { if (p.ajuda) a.appendChild(doc.createElement('br')); a.appendChild(icone('i-lock-simple')); a.appendChild(doc.createTextNode(p.sigilo)); }
    return p.ajuda || p.sigilo ? a : null;
  }
  function mostrarErroEm(el, campo, msg) {
    el.hidden = !msg;
    el.lastChild.textContent = msg || '';
    if (campo) { if (msg) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid'); }
  }
  function treme(el) {
    if (!el || reduzir.matches) return;
    el.classList.remove('treme'); void el.offsetWidth; el.classList.add('treme');
    setTimeout(function () { el.classList.remove('treme'); }, 300);
  }
  function autoTamanho(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }

  /* Campo de texto: nome, e-mail, WhatsApp, valor em reais, texto curto e texto longo */
  function blocoCampo(p, multi, aoMudar) {
    var id = 'f-' + p.id, erro = erroEl(p.id), ajuda = ajudaEl(p), campo, wrap;
    var area = p.tipo === 'texto' || p.tipo === 'longo';
    var descr = (ajuda ? ajuda.id + ' ' : '') + erro.id;
    if (area) {
      campo = h('textarea', { class: 'cx' + (p.tipo === 'longo' ? ' cx--longo' : ''), id: id, name: p.id, rows: p.tipo === 'longo' ? 6 : 3, maxlength: 1500, autocomplete: 'off' });
    } else {
      var at = { class: 'cx', id: id, name: p.id, type: 'text', autocomplete: 'off', enterkeyhint: 'next' };
      if (p.tipo === 'nome') { at.autocomplete = 'name'; at.maxlength = 120; }
      if (p.tipo === 'email') { at.type = 'email'; at.inputmode = 'email'; at.autocomplete = 'email'; at.autocapitalize = 'off'; at.autocorrect = 'off'; at.spellcheck = 'false'; at.maxlength = 200; }
      if (p.tipo === 'whats') { at.type = 'tel'; at.inputmode = 'numeric'; at.autocomplete = 'tel'; at.maxlength = 30; }
      if (p.tipo === 'numero') { at.inputmode = 'numeric'; at.pattern = '[0-9]*'; at.maxlength = 6; }
      campo = h('input', at);
    }
    campo.setAttribute('aria-describedby', descr);
    if (!multi) campo.setAttribute('aria-labelledby', 'q-' + p.id);
    if (S.v[p.id] != null) campo.value = S.v[p.id];
    var cont = h('p', { class: 'cx-cont', hidden: true, 'aria-hidden': 'true' });
    wrap = p.tipo === 'numero' ? h('div', { class: 'cx-num' }, [h('span', { class: 'cx-num__r', 'aria-hidden': 'true', text: 'R$' }), campo]) : campo;
    var pequeno = ['nome', 'email', 'whats'].indexOf(p.tipo) > -1;
    var corpo = h('div', { class: 'p-q__corpo' }, [wrap, cont, erro]);
    var el = h('div', { class: 'p-q p-q--campo' }, [cabeca(p, multi, pequeno, true), ajuda, corpo]);
    var b = {
      p: p, el: el, campo: campo, erroShown: false,
      validar: function () { return validarPergunta(p); },
      mostrar: function (r) { b.erroShown = !!r; mostrarErroEm(erro, campo, r ? r.m : null); },
      foco: function () { campo.focus({ preventScroll: true }); try { campo.scrollIntoView({ block: 'center', behavior: reduzir.matches ? 'auto' : 'smooth' }); } catch (e) {} }
    };
    campo.addEventListener('input', function () {
      S.v[p.id] = campo.value;
      if (area) autoTamanho(campo);
      var n = campo.value.length;
      if (area && n >= 1300) { cont.hidden = false; cont.textContent = n + '/1500'; } else cont.hidden = true;
      if (b.erroShown) b.mostrar(b.validar());
      salvarLogo(); aoMudar();
    });
    b.depois = function () { if (area) autoTamanho(campo); };
    return b;
  }

  /* Escolha única e várias opções */
  function opcaoEl(p, valor, i, b) {
    var radio = p.tipo === 'unica';
    var inp = h('input', { class: 'op__in', type: radio ? 'radio' : 'checkbox', name: p.id, id: 'o-' + p.id + '-' + i });
    inp.value = valor;
    var chip = p.modo === 'chips';
    var cls = 'op ' + (chip ? 'op--chip' : 'op--lista') + (radio ? '' : ' op--caixa');
    if (chip && (valor.length > 28)) cls += ' larga';
    if (p.grande) cls += ' op--grande';
    var kids = [inp, h('span', { class: 'op__fundo', 'aria-hidden': 'true' })];
    var txt = h('span', { class: 'op__txt' });
    if (p.rotulo) {
      var cut = valor.indexOf(': ');
      txt.appendChild(h('span', { class: 'op__rot', text: valor.slice(0, cut) }));
      txt.appendChild(doc.createTextNode(valor.slice(cut + 2)));
    } else if (p.emojis) {
      var c2 = valor.indexOf(': ');
      txt.appendChild(h('span', { class: 'op__tit', text: c2 < 0 ? valor : valor.slice(0, c2) }));
      if (c2 >= 0) txt.appendChild(h('span', { class: 'op__desc', text: ': ' + valor.slice(c2 + 2) }));
    } else txt.textContent = valor;
    if (chip) kids.push(txt, icone('i-check', 'op__tick'));
    else {
      kids.push(h('span', { class: 'op__marca', 'aria-hidden': 'true' }, [icone('i-check')]));
      if (p.emojis) kids.push(h('span', { class: 'op__emoji', 'aria-hidden': 'true', text: p.emojis[i] }));
      kids.push(txt);
    }
    return h('label', { class: cls }, kids);
  }
  function blocoOpcoes(p, multi, aoMudar) {
    var erro = erroEl(p.id), ajuda = ajudaEl(p), unica = p.tipo === 'unica';
    var grupo = h('div', { class: 'opcoes opcoes--' + p.modo, role: unica ? 'radiogroup' : 'group', 'aria-labelledby': 'q-' + p.id, 'aria-describedby': (ajuda ? ajuda.id + ' ' : '') + erro.id });
    var b = { p: p, erroShown: false }, inputs = [];
    p.opcoes.forEach(function (o, i) {
      var l = opcaoEl(p, o, i, b);
      grupo.appendChild(l);
      inputs.push($('input', l));
    });
    var atual = S.v[p.id];
    inputs.forEach(function (inp) { inp.checked = unica ? atual === inp.value : (atual || []).indexOf(inp.value) > -1; });
    var pilula = null;
    if (!unica) pilula = h('div', { class: 'p-conta', 'aria-live': 'polite' });
    var outro = null, outroCampo = null, outroErro = null;
    if (p.outro) {
      outroErro = erroEl(p.id + '-outro');
      outroCampo = h('input', { class: 'cx', id: 'f-' + p.id + '-outro', name: p.id + '_outro', type: 'text', maxlength: 300, autocomplete: 'off', enterkeyhint: 'done', 'aria-describedby': outroErro.id });
      if (S.v.bonus_outro != null) outroCampo.value = S.v.bonus_outro;
      outro = h('div', { class: 'p-outro' }, [h('div', { class: 'p-outro__in' }, [h('div', null, [h('label', { class: 'rot', for: outroCampo.id, text: TEXTOS.outro }), h('div', { class: 'p-q__corpo', style: 'margin-top:10px' }, [outroCampo, outroErro])])])]);
    }
    function sincronizar() {
      var sel = inputs.filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
      if (unica) { if (sel.length) S.v[p.id] = sel[0]; else delete S.v[p.id]; }
      else { S.v[p.id] = p.opcoes.filter(function (o) { return sel.indexOf(o) > -1; }); }
      if (p.limite) inputs.forEach(function (i) { i.disabled = !i.checked && sel.length >= p.limite; });
      if (pilula) {
        var cheio = p.limite && sel.length >= p.limite;
        pilula.className = 'p-conta' + (cheio ? ' cheio' : '');
        pilula.textContent = cheio ? TEXTOS.cheio : sub(p.contador === 'marcadas' ? TEXTOS.marcadas : TEXTOS.escolhidas, { n: sel.length });
      }
      if (outro) { var on = sel.indexOf(OPC_OUTRO) > -1; outro.classList.toggle('aberto', on); }
    }
    sincronizar();
    inputs.forEach(function (inp) {
      inp.addEventListener('change', function () {
        sincronizar();
        if (b.erroShown) b.mostrar(b.validar());
        salvarLogo(); aoMudar();
      });
    });
    grupo.addEventListener('click', function (e) {
      var l = e.target.closest ? e.target.closest('.op') : null;
      if (!l) return;
      var inp = $('input', l);
      if (inp && inp.disabled) { treme(l); treme(pilula); mostrarErroEm(erro, grupo, TEXTOS.erroMax); b.erroShown = true; }
    });
    if (outroCampo) outroCampo.addEventListener('input', function () {
      S.v.bonus_outro = outroCampo.value;
      if (b.erroShown) b.mostrar(b.validar());
      salvarLogo(); aoMudar();
    });
    var corpo = h('div', { class: 'p-q__corpo' }, [pilula, grupo, outro, erro]);
    b.el = h('div', { class: 'p-q' }, [cabeca(p, multi), ajuda, corpo]);
    b.validar = function () { return validarPergunta(p); };
    b.mostrar = function (r) {
      b.erroShown = !!r;
      mostrarErroEm(erro, grupo, r && !r.outro ? r.m : null);
      if (outroErro) mostrarErroEm(outroErro, outroCampo, r && r.outro ? r.m : null);
    };
    b.foco = function (r) {
      var alvo = r && r.outro ? outroCampo : (inputs.filter(function (i) { return i.checked; })[0] || inputs[0]);
      alvo.focus({ preventScroll: true });
      try { (r && r.outro ? outroCampo : grupo).scrollIntoView({ block: 'center', behavior: reduzir.matches ? 'auto' : 'smooth' }); } catch (e) {}
    };
    b.depois = function () {};
    return b;
  }

  /* ===== Celular de demonstração ===== */
  function celular() {
    var cel = $('#tpl-celular').content.firstElementChild.cloneNode(true), feito = false;
    var btn = $('.ui-botao', cel), rot = $('.ui-botao span', cel), rank = $('.ui-ranking', cel), conf = $('.ui-confete', cel), dedo = $('.ui-dedo', cel);
    var cores = ['#853B48', '#FCE176', '#C46334', '#F7F3E8', '#518092'];
    function checkin() {
      if (feito) return;
      feito = true;
      dedo.classList.add('some');
      btn.classList.add('feito', 'brilho'); rot.textContent = 'Check-in feito';
      cel.setAttribute('aria-label', 'Demonstração do app: check-in feito, você subiu no ranking');
      var voce = $('li.voce', rank), acima = voce.previousElementSibling, pts = $('em', voce);
      pts.textContent = String(+pts.textContent + 1);
      pts.classList.add('sobe');
      if (!reduzir.matches && conf.animate) {
        for (var i = 0; i < 20; i++) {
          var c = doc.createElement('i'), ang = Math.random() * Math.PI - Math.PI, vel = 70 + Math.random() * 100;
          c.style.left = '187px'; c.style.top = '262px'; c.style.background = cores[i % cores.length];
          conf.appendChild(c);
          c.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + Math.cos(ang) * vel + 'px,' + (Math.sin(ang) * vel - 20) + 'px) rotate(' + Math.random() * 540 + 'deg)', opacity: 1, offset: .55 }, { transform: 'translate(' + Math.cos(ang) * vel * 1.3 + 'px,' + (Math.sin(ang) * vel + 150) + 'px) rotate(' + Math.random() * 720 + 'deg)', opacity: 0 }], { duration: 1000 + Math.random() * 400, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'forwards' });
        }
        setTimeout(function () { while (conf.firstChild) conf.removeChild(conf.firstChild); }, 1600);
      }
      setTimeout(function () {
        if (+$('em', acima).textContent >= +pts.textContent) return;
        rank.insertBefore(voce, acima);
        Array.prototype.forEach.call(rank.children, function (li, k) { $('span', li).textContent = k + 1; });
        if (!reduzir.matches && voce.animate) {
          voce.animate([{ transform: 'translateY(58px)' }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,0,0,1)' });
          acima.animate([{ transform: 'translateY(-58px)' }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,0,0,1)' });
        }
      }, 350);
    }
    cel.addEventListener('click', checkin);
    cel.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); checkin(); } });
    return cel;
  }

  /* ===== Telas ===== */
  function botaoPrincipal(rotulo, aoClicar) {
    return h('button', { class: 'botao', type: 'button', onclick: aoClicar }, [h('span', { text: rotulo }), icone('i-arrow-right', 'ic')]);
  }
  function rotuloBotao(et) { return ehUltima(et) ? TEXTOS.enviar : TEXTOS.continuar; }
  function trocarRotulo(btn, rotulo) { var s = $('span', btn); if (s && s.textContent !== rotulo) s.textContent = rotulo; }

  function faixaEl(tipo) {
    if (tipo === 'b1') return h('div', { class: 'p-faixa p-faixa--foto' }, [h('img', { src: '../img/agatha-academia-160.webp', alt: '', width: 160, height: 213, loading: 'lazy', style: 'object-position:50% 18%' }), h('p', { text: TEXTOS.faixa1 })]);
    if (tipo === 'b3') return h('div', { class: 'p-faixa p-faixa--foto' }, [h('img', { src: '../img/call-agatha.webp', alt: '', width: 360, height: 450, loading: 'lazy', style: 'object-position:50% 22%' }), h('p', { text: TEXTOS.faixa3 })]);
    var f = h('div', { class: 'p-faixa p-faixa--app' }, [h('p', null, [h('span', { class: 'etiqueta', text: TEXTOS.demo }), TEXTOS.faixa2]), h('div', { class: 'p-faixa__tel' }, [celular()])]);
    return f;
  }

  function construirEtapa(et) {
    var ps = perguntasDe(et), info = ETAPA[et] || {}, multi = ps.length > 1;
    var blocos = [], textual = false;
    var corpo = h('div', { class: 'p-corpo' });
    var tela = h('section', { class: 'p-tela', 'data-tela': et, tabindex: '-1' }, [corpo]);
    var ctx = { id: et, blocos: blocos, botao: null, fixo: false, tela: tela };
    function aoMudar() { atualizarEtapa(ctx); }
    if (info.faixa) corpo.appendChild(faixaEl(info.faixa));
    var eyebrow = h(multi ? 'h1' : 'p', { class: 'eyebrow', text: info.sec });
    corpo.appendChild(eyebrow);
    ps.forEach(function (p) {
      var b = (p.tipo === 'unica' || p.tipo === 'varias') ? blocoOpcoes(p, multi, aoMudar) : blocoCampo(p, multi, aoMudar);
      if (!(p.tipo === 'unica' || p.tipo === 'varias') || p.outro) textual = true;
      blocos.push(b); corpo.appendChild(b.el);
    });
    if (et === 'P1') {
      var isca = h('input', { name: 'contato_extra', type: 'text', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
      isca.value = S.isca;
      isca.addEventListener('input', function () { S.isca = isca.value; });
      corpo.appendChild(h('div', { class: 'isca', 'aria-hidden': 'true' }, [isca]));
    }
    ctx.fixo = !textual;
    var btn = botaoPrincipal(rotuloBotao(et), function () { continuar(ctx); });
    ctx.botao = btn;
    if (ctx.fixo) { tela.classList.add('p-tela--fixo'); tela.appendChild(h('div', { class: 'p-rodape' }, [btn])); }
    else corpo.appendChild(h('div', { class: 'p-acao' }, [btn]));
    // Enter nos campos de uma linha: vai pro próximo campo; no último, continua
    corpo.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type === 'checkbox' || e.target.type === 'radio') return;
      e.preventDefault();
      var campos = Array.prototype.slice.call(corpo.querySelectorAll('input.cx, textarea.cx')).filter(function (c) { return c.offsetParent !== null; });
      var i = campos.indexOf(e.target);
      if (i >= 0 && i < campos.length - 1) campos[i + 1].focus(); else continuar(ctx);
    });
    var campos1 = Array.prototype.slice.call(corpo.querySelectorAll('input.cx, textarea.cx'));
    if (campos1.length && campos1[campos1.length - 1].tagName === 'INPUT') campos1[campos1.length - 1].setAttribute('enterkeyhint', 'done');
    ctx.depois = function () { blocos.forEach(function (b) { if (b.depois) b.depois(); }); };
    atualizarBotao(ctx);
    return ctx;
  }
  function atualizarBotao(ctx) {
    if (!ctx.botao) return;
    trocarRotulo(ctx.botao, rotuloBotao(ctx.id));
    if (ctx.fixo && !S.enviando) {
      var ok = ctx.blocos.every(function (b) { return !b.validar(); });
      var era = ctx.botao.getAttribute('aria-disabled') === 'true';
      if (ok) { ctx.botao.removeAttribute('aria-disabled'); if (era && !reduzir.matches) { ctx.botao.classList.remove('sobe'); void ctx.botao.offsetWidth; ctx.botao.classList.add('sobe'); } }
      else ctx.botao.setAttribute('aria-disabled', 'true');
    }
  }
  function atualizarEtapa(ctx) { atualizarBotao(ctx); chrome(); }

  function continuar(ctx) {
    if (S.enviando || S.ocupado) return;
    var primeiro = null, primeiroRes = null;
    ctx.blocos.forEach(function (b) {
      var r = b.validar();
      b.mostrar(r);
      if (r && !primeiro) { primeiro = b; primeiroRes = r; }
    });
    if (primeiro) {
      var e = $('.p-erro:not([hidden])', ctx.tela);
      if (e && !e.getAttribute('role')) e.setAttribute('role', 'alert');
      primeiro.foco(primeiroRes);
      return;
    }
    salvar();
    var prox = proximaEtapa(ctx.id);
    if (prox) ir(prox); else enviar(ctx);
  }

  function construirAviso() {
    var erro = erroEl('aceite');
    var inp = h('input', { class: 'op__in', type: 'checkbox', name: 'aceite', id: 'o-aceite', 'aria-describedby': erro.id });
    inp.checked = !!S.aceite;
    var corpo = h('div', { class: 'p-corpo' });
    var tela = h('section', { class: 'p-tela p-tela--fixo', 'data-tela': 'aviso', tabindex: '-1', 'aria-labelledby': 'aviso-titulo' }, [corpo]);
    var ctx = { id: 'aviso', blocos: [], botao: null, fixo: true, tela: tela };
    var btn = botaoPrincipal(TEXTOS.continuar, function () {
      if (!inp.checked) { mostrarErroEm(erro, inp, TEXTOS.erroAceite); inp.focus({ preventScroll: true }); return; }
      salvar(); ir('P1');
    });
    function estado() {
      if (inp.checked) btn.removeAttribute('aria-disabled'); else btn.setAttribute('aria-disabled', 'true');
    }
    inp.addEventListener('change', function () {
      if (inp.checked) { S.aceite = S.aceite || new Date().toISOString(); mostrarErroEm(erro, inp, null); salvar(); }
      else { S.aceite = null; apagar(K_RASC); }
      estado();
    });
    ctx.botao = btn;
    var l = h('label', { class: 'op op--caixa op--aceite' }, [inp, h('span', { class: 'op__fundo', 'aria-hidden': 'true' }), h('span', { class: 'op__marca', 'aria-hidden': 'true' }, [icone('i-check')]), h('span', { class: 'op__txt', text: TEXTOS.aceite })]);
    corpo.appendChild(h('p', { class: 'eyebrow', text: TEXTOS.avisoEyebrow }));
    corpo.appendChild(h('h1', { class: 'q', id: 'aviso-titulo', 'data-len': 'g', text: TEXTOS.avisoTitulo }));
    corpo.appendChild(h('div', { class: 'aviso' }, [icone('i-lock-simple'), h('p', null, [TEXTOS.avisoA, h('b', { text: TEXTOS.avisoB }), TEXTOS.avisoC])]));
    corpo.appendChild(h('div', { class: 'p-aceite' }, [l, erro]));
    tela.appendChild(h('div', { class: 'p-rodape' }, [btn]));
    estado();
    return ctx;
  }

  function construirRetoma() {
    var nome = trim(S.v.nome).split(/\s+/)[0] || '';
    var pr = progresso();
    var titulo = h('h1', { id: 'retoma-titulo', text: nome ? sub(TEXTOS.retomaTitulo, { nome: nome }) : TEXTOS.retomaSemNome });
    var barra = h('div', { class: 'retoma__barra', 'aria-hidden': 'true' }, [h('i')]);
    barra.firstChild.style.setProperty('--p', mostrado(pr.d / pr.T));
    var corpo = h('div', { class: 'p-corpo' }, [
      h('img', { class: 'retoma__av', src: '../img/call-agatha.webp', alt: '', width: 360, height: 450 }),
      titulo,
      h('div', { class: 'retoma__prog' }, [barra, h('span', { text: rotuloProgresso(pr, 'retoma') })]),
      h('div', { class: 'retoma__bt' }, [
        botaoPrincipal(TEXTOS.continuar, function () { ir(destinoSeguro(S.etapa)); }),
        h('button', { class: 'p-link', type: 'button', text: TEXTOS.naoSouEu, onclick: reiniciar })
      ])
    ]);
    return { id: 'retoma', blocos: [], tela: h('section', { class: 'p-tela retoma', 'data-tela': 'retoma', tabindex: '-1', 'aria-labelledby': 'retoma-titulo' }, [corpo]) };
  }

  function construirFinal() {
    var cartoes = KIT.map(function (m) {
      return h('a', { class: 'cartao', href: m.url, target: '_blank', rel: 'noopener' }, [
        h('img', { src: m.mini, alt: '', width: 160, height: 227 }),
        h('span', null, [h('b', { text: m.titulo }), h('small', { text: TEXTOS.pdf })]),
        h('span', { class: 'cartao__seta', 'aria-hidden': 'true' }, [icone('i-arrow-right')])
      ]);
    });
    S.avisoRasc = S.pend ? h('p', { class: 'final__rasc', role: 'status', text: TEXTOS.rascunho }) : null;
    var voltou = S.voltaFinal && !S.pend;
    var corpo = h('div', { class: 'p-corpo' }, [
      h('div', { class: 'final__topo' }, [h('img', { class: 'final__av', src: '../img/call-agatha.webp', alt: '', width: 360, height: 450 }), h('h1', { id: 'final-titulo', text: voltou ? TEXTOS.jaRespondeu : TEXTOS.finalTitulo })]),
      h('p', { class: 'final__txt', text: TEXTOS.finalTexto }),
      S.avisoRasc,
      h('div', { class: 'final__links' }, cartoes),
      h('div', { class: 'final__live' }, [h('p', { class: 'final__txt', style: 'margin-top:0', text: TEXTOS.finalLive }), h('a', { class: 'botao', href: '../' }, [h('span', { text: TEXTOS.verLive }), icone('i-arrow-right', 'ic')])]),
      h('div', { class: 'final__aviso' }, [icone('i-bell'), h('p', { text: TEXTOS.finalAviso })]),
      h('p', { class: 'final__fecho', text: TEXTOS.fecho }),
      S.voltaFinal ? h('div', { class: 'final__volta' }, [h('button', { class: 'p-link', type: 'button', text: TEXTOS.naoSouEu, onclick: reiniciar })]) : null
    ]);
    var tela = h('section', { class: 'p-tela final' + (reduzir.matches ? '' : ' animar'), 'data-tela': 'final', tabindex: '-1', 'aria-labelledby': 'final-titulo' }, [corpo]);
    if (!reduzir.matches) [[22, 14], [88, 30], [60, 4]].forEach(function (pos, i) {
      var e = icone('f-sparkle', 'estrela'); e.style.left = pos[0] + '%'; e.style.top = (60 + pos[1]) + 'px'; e.style.animationDelay = (.15 + i * .12) + 's'; corpo.appendChild(e);
    });
    corpo.style.position = 'relative';
    return { id: 'final', blocos: [], tela: tela };
  }

  var capaEl = null;
  function construirCapa() { return { id: 'capa', blocos: [], tela: capaEl }; }

  function construir(tela) {
    if (tela === 'capa') return construirCapa();
    if (tela === 'aviso') return construirAviso();
    if (tela === 'retoma') return construirRetoma();
    if (tela === 'final') return construirFinal();
    return construirEtapa(tela);
  }

  /* ===== Cabeçalho, progresso, kit e painel do computador ===== */
  function kitEl(v) {
    var k = h('div', { class: 'kit kit--' + v, 'aria-hidden': 'true' });
    KIT.forEach(function (m) { k.appendChild(h('img', { class: 'kc kc-' + m.k, src: m.mini, alt: '', width: 160, height: 227 })); });
    return k;
  }
  function faseKit(pr) {
    if (S.tela === 'capa' || S.tela === 'final') return 4;
    if (pr.curta) return 0;
    if (pr.d >= pr.T - 1 && ehEtapa(S.tela)) return 3;
    if (pr.d >= Math.ceil(2 * pr.T / 3)) return 2;
    if (pr.d >= Math.ceil(pr.T / 3)) return 1;
    return 0;
  }
  function pulsar(sel, atraso) {
    if (reduzir.matches) return;
    setTimeout(function () {
      Array.prototype.forEach.call(doc.querySelectorAll(sel), function (el) { el.classList.remove('pulso'); void el.offsetWidth; el.classList.add('pulso'); setTimeout(function () { el.classList.remove('pulso'); }, 1000); });
    }, atraso);
  }
  /* Barra: começa andada (capa e aviso contam como caminho feito) e anda mais rápido no começo; só chega a 100% no envio.
     O rótulo só afirma "metade" e "quase lá" quando a contagem real de etapas confirma. */
  function mostrado(f) { return 0.18 + 0.78 * (1 - Math.pow(1 - f, 2)); }
  function rotuloProgresso(pr, t) {
    if (t === 'final') return '';
    var rest = pr.T - pr.d;
    if (rest <= 1) return TEXTOS.ultima;
    if (rest <= 3) return sub(TEXTOS.faltamSo, { n: rest });
    if (pr.d === 0) return TEXTOS.comecou;
    if (pr.d * 3 >= 2 * pr.T) return TEXTOS.quase;
    if (pr.d * 2 > pr.T) return TEXTOS.metade;
    return TEXTOS.indo;
  }
  function chrome() {
    var app = $('#p-app'), topo = $('#p-topo'), pr = progresso();
    var t = S.tela;
    topo.hidden = t === 'capa';
    var depth = (history.state && history.state.d) || 0;
    $('#p-voltar').classList.toggle('oculto', !(ehEtapa(t) || t === 'aviso') || depth < 1);
    $('#p-prog').classList.toggle('oculto', t === 'retoma');
    var barra = $('#p-barra'), frac = t === 'final' ? 1 : t === 'aviso' ? 0.12 : mostrado(pr.d / pr.T);
    barra.style.setProperty('--p', frac);
    var mq = barra.querySelectorAll('.p-marco');
    mq[0].style.setProperty('--x', (mostrado(Math.ceil(pr.T / 3) / pr.T) * 100) + '%'); mq[1].style.setProperty('--x', (mostrado(Math.ceil(2 * pr.T / 3) / pr.T) * 100) + '%'); mq[2].style.setProperty('--x', '100%');
    barra.setAttribute('aria-valuemax', pr.T); barra.setAttribute('aria-valuenow', pr.d);
    barra.setAttribute('aria-valuetext', t === 'final' ? '' : 'Etapa ' + (pr.d + 1) + ' de ' + pr.T);
    if (t === 'final') barra.removeAttribute('aria-valuetext');
    var rot = rotuloProgresso(pr, t);
    var rotEl = $('#p-rot'); if (rotEl.textContent !== rot) rotEl.textContent = rot;
    var k = faseKit(pr), antes = S.kPrev;
    app.setAttribute('data-k', k);
    app.classList.toggle('k-s', k >= 1); app.classList.toggle('k-c', k >= 2); app.classList.toggle('k-d', k === 4); app.classList.toggle('k-quase', k === 3);
    var marcos = barra.querySelectorAll('.p-marco');
    marcos[0].classList.toggle('on', k >= 1); marcos[1].classList.toggle('on', k >= 2); marcos[2].classList.toggle('on', k === 4);
    if (k !== antes && antes !== 4 && k !== 4) {
      if (k === 1 && antes < 1) pulsar('.kc-s', 0);
      if (k >= 2 && antes < 2) pulsar('.kc-c', antes < 1 ? 140 : 0);
    }
    if (k === 4 && antes !== 4 && !reduzir.matches) { var kt = $('.kit--topo'); if (kt) { kt.classList.remove('pulsa'); void kt.offsetWidth; kt.classList.add('pulsa'); } }
    S.kPrev = k;
    palco();
  }

  var ARTE = { v1: 'arte--v1', v1b: 'arte--v1b', v2: 'arte--v2', v3: 'arte--v3' };
  function montarPalco() {
    if (S.palco || !desktop.matches) return;
    S.palco = true;
    var pa = $('#p-palco');
    var selo = h('div', { class: 'selo', role: 'img', 'aria-label': 'Save the date: 11 de novembro' }, [h('span', { text: 'Save the date' }), h('strong', { text: '11/11' })]);
    var v2 = h('div', { class: 'arte arte--v2' }, [h('span', { class: 'etiqueta', text: TEXTOS.demo })]);
    pa.appendChild(h('div', { class: 'arte arte--v1 on' }, [h('img', { src: '../img/agatha-por-do-sol.webp', alt: '', width: 853, height: 1066 }), selo]));
    pa.appendChild(h('div', { class: 'arte arte--v1b' }, [h('img', { 'data-src': '../img/agatha-academia.webp', alt: '', width: 800, height: 1064 })]));
    pa.appendChild(v2);
    pa.appendChild(h('div', { class: 'arte arte--v3' }, [h('img', { 'data-src': '../img/feed-agatha.webp', alt: '', width: 360, height: 640 })]));
    pa.appendChild(kitEl('palco'));
    pa.appendChild(h('div', { class: 'kit__rot', text: 'Kit de Receitas' }));
    palco();
  }
  function carregarArte(nome) {
    var el = $('.' + ARTE[nome]); if (!el) return;
    var img = $('img[data-src]', el);
    if (img) { img.src = img.getAttribute('data-src'); img.removeAttribute('data-src'); }
    if (nome === 'v2' && !$('.celular', el)) el.appendChild(celular());
  }
  function palco() {
    if (!S.palco) return;
    var et = ehEtapa(S.tela) ? S.tela : (S.tela === 'retoma' ? S.etapa : null);
    var nome = et && ETAPA[et] ? ETAPA[et].arte : 'v1';
    if (S.arteAtual === nome) return;
    S.arteAtual = nome;
    carregarArte(nome);
    var ordem = ['v1', 'v1b', 'v2', 'v3'], prox = ordem[ordem.indexOf(nome) + 1];
    if (prox) setTimeout(function () { carregarArte(prox); }, 600);
    Object.keys(ARTE).forEach(function (n) { var el = $('.' + ARTE[n]); if (el) el.classList.toggle('on', n === nome); });
  }

  /* ===== Navegação (history: o "voltar" do Android volta uma pergunta, não fecha a página) ===== */
  function perguntaPendente(et) { return perguntasDe(et).some(function (p) { return validarPergunta(p); }); }
  // Se a tela pedida não faz sentido agora (aceite faltando, etapa fora do caminho, já enviou), cai na tela certa
  function destinoSeguro(t) {
    if (t === 'capa' || t === 'retoma') return S.enviado && t === 'retoma' ? 'final' : t;
    if (t === 'final') return S.enviado || S.pend || S.voltaFinal ? 'final' : destinoSeguro(S.etapa || 'P1');
    if (S.enviado) return 'final';
    if (!S.aceite) return 'capa';
    if (t === 'aviso') return 'aviso';
    var l = etapasVisiveis();
    if (l.indexOf(t) < 0) t = 'P1';
    for (var i = 0; i < l.length; i++) {
      if (l.indexOf(t) < i) break;
      if (perguntaPendente(l[i])) return l[i];
    }
    return t;
  }
  function ir(tela) {
    if (S.ocupado) return;
    var d = ((history.state && history.state.d) || 0) + 1;
    try { history.pushState({ t: tela, d: d }, ''); } catch (e) {}
    mostrar(tela, 'f');
  }
  function voltar() { if (history.state && history.state.d > 0) history.back(); }
  window.addEventListener('popstate', function (e) {
    var st = e.state, t = st && st.t;
    if (!t) return;
    var seguro = destinoSeguro(t);
    if (seguro !== t) { try { history.replaceState({ t: seguro, d: st.d || 0 }, ''); } catch (er) {} }
    mostrar(seguro, 'u');
  });

  function mostrar(tela, dir) {
    var seq = ++S.seq;
    var main = $('#p-main'), velho = main.querySelector('.p-tela');
    S.tela = tela;
    if (ehEtapa(tela)) { S.etapa = tela; salvar(); }
    var novo = construir(tela);
    S.atual = novo;
    var antes = dir === 'u' ? 't' : dir;
    S.ocupado = !!velho && !!dir;
    function trocar() {
      if (seq !== S.seq) return;
      S.ocupado = false;
      var c = novo.tela.querySelector('.p-corpo');
      if (c) c.className = 'p-corpo';
      if (velho && velho.parentNode === main) main.removeChild(velho);
      main.appendChild(novo.tela);
      if (c && dir) c.classList.add('entra-' + (antes === 't' ? 't' : 'f'));
      chrome();
      if (novo.depois) novo.depois();
      try { window.scrollTo(0, 0); } catch (e) {}
      if (dir) novo.tela.focus({ preventScroll: true });
    }
    chrome();
    if (velho && dir) {
      var vc = velho.querySelector('.p-corpo');
      if (vc) vc.classList.add('sai-' + (antes === 't' ? 't' : 'f'));
      setTimeout(trocar, 120);
    } else trocar();
  }

  function reiniciar() {
    apagar(K_RASC); apagar(K_ENV);
    S.v = {}; S.aceite = null; S.envio = uuid(); S.etapa = null; S.pend = false; S.enviado = false; S.falhas = 0; S.enviando = false; S.isca = ''; S.voltaFinal = false;
    S.abertoEm = Date.now();
    try { history.replaceState({ t: 'capa', d: 0 }, ''); } catch (e) {}
    mostrar('capa', 'u');
  }

  /* ===== Envio ===== */
  function montarPayload() {
    var r = {}, v = S.v;
    PERGUNTAS.forEach(function (p) {
      if (!visivel(p) || p.coluna) return;
      var x = v[p.id];
      if (p.tipo === 'unica') { if (x) r[p.id] = x; }
      else if (p.tipo === 'varias') {
        var sel = p.opcoes.filter(function (o) { return (x || []).indexOf(o) > -1; });
        if (sel.length) r[p.id] = sel;
        if (p.outro && sel.indexOf(OPC_OUTRO) > -1) r.bonus_outro = trim(v.bonus_outro).slice(0, 300);
      }
      else if (p.tipo === 'numero') r[p.id] = parseInt(trim(x), 10);
      else if (trim(x)) r[p.id] = trim(x).slice(0, 1500);
    });
    var o = { envio_id: S.envio, aceite_em: S.aceite, nome: trim(v.nome), email: trim(v.email).toLowerCase(), whatsapp: String(v.whatsapp || '').replace(/\D/g, ''), respostas: r };
    UTMS.forEach(function (k) { var u = trim(S.utm[k]).slice(0, 200); if (u) o[k] = u; });
    if (S.ref) o.referrer = S.ref.slice(0, 500);
    return o;
  }
  // 'ok' | 'rede' (tentar de novo) | 'validacao' (4xx: o banco recusou o conteúdo)
  function postar() {
    var ctl = window.AbortController ? new AbortController() : null;
    var corte = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    return fetch(SUPABASE + '/agatha_pesquisa', {
      method: 'POST',
      headers: { apikey: CHAVE, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(montarPayload()),
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      clearTimeout(corte);
      if (res.status === 201 || res.status === 200 || res.status === 204 || res.status === 409) return 'ok';
      if (res.status >= 500 || res.status === 408 || res.status === 429) return 'rede';
      return res.text().then(function (t) { return /pesquisa_teto/.test(t) ? 'rede' : 'validacao'; }, function () { return 'validacao'; });
    }, function () { clearTimeout(corte); return 'rede'; });
  }
  function ocupar(ctx, sim) {
    S.enviando = sim;
    var b = ctx && ctx.botao; if (!b) return;
    if (sim) {
      b.setAttribute('aria-busy', 'true'); b.setAttribute('aria-disabled', 'true');
      limpar(b).appendChild(h('span', { class: 'anel', 'aria-hidden': 'true' })); b.appendChild(h('span', { text: TEXTOS.enviando }));
      Array.prototype.forEach.call(ctx.tela.querySelectorAll('input.cx, textarea.cx'), function (c) { c.readOnly = true; });
      var kt = $('.kit--topo'); if (kt && !reduzir.matches) { kt.classList.remove('pulsa'); void kt.offsetWidth; kt.classList.add('pulsa'); }
    } else {
      b.removeAttribute('aria-busy'); b.removeAttribute('aria-disabled');
      limpar(b).appendChild(h('span', { text: ctx.tentar ? TEXTOS.tentar : rotuloBotao(ctx.id) })); b.appendChild(icone('i-arrow-right', 'ic'));
      Array.prototype.forEach.call(ctx.tela.querySelectorAll('input.cx, textarea.cx'), function (c) { c.readOnly = false; });
    }
  }
  function enviar(ctx) {
    if (S.enviando) return;
    ctx = ctx || S.atual;
    var pendente = etapasVisiveis().filter(perguntaPendente)[0];
    if (pendente) { ir(pendente); return; }
    ocupar(ctx, true);
    var tinha = $('.p-envio-erro', ctx.tela); if (tinha) tinha.remove();
    var demora = ctx.tela.querySelector('.p-demora'); if (demora) demora.remove();
    // Tempo mínimo: quem termina antes dos 20 s não é barrada, só espera em segundo plano (mostrando "Enviando…")
    var resta = Math.max(0, TEMPO_MINIMO - (Date.now() - S.abertoEm));
    sleep(resta).then(function () {
      if (S.isca) return 'ok';   // campo-isca preenchido: robô; finge sucesso e não grava
      var avisa = setTimeout(function () {
        if (ctx.tela.querySelector('.p-demora')) return;
        ctx.botao.parentNode.appendChild(h('p', { class: 'p-demora', role: 'status', text: TEXTOS.demora }));
      }, 8000);
      return postar().then(function (r) { clearTimeout(avisa); return r; });
    }).then(function (res) {
      var d = ctx.tela.querySelector('.p-demora'); if (d) d.remove();
      if (res === 'ok') { sucesso(); return; }
      if (res === 'validacao') { abandonar(); return; }
      S.falhas++;
      if (S.falhas >= 2) { abandonar(); return; }
      ocupar(ctx, false);
      ctx.tentar = true;
      trocarRotulo(ctx.botao, TEXTOS.tentar);
      var caixa = h('div', { class: 'p-envio-erro', role: 'alert' }, [icone('i-warning'), h('p', { text: TEXTOS.falha })]);
      ctx.botao.parentNode.insertBefore(caixa, ctx.botao);
    });
  }
  function sucesso() {
    S.enviado = true; S.pend = false; S.enviando = false;
    apagar(K_RASC); clearTimeout(salvarTimer);
    gravar(K_ENV, hoje()); gravar(K_POPUP, '1');
    irFinal();
  }
  function abandonar() {   // 2ª falha ou 4xx de validação: entrega o kit e guarda o rascunho pra reenviar na próxima visita
    S.pend = true; S.enviando = false;
    salvar();
    irFinal();
  }
  function irFinal() { S.ocupado = false; ir('final'); }

  // Visita nova com um envio que não passou: tenta de novo em silêncio (a pessoa já está vendo o kit)
  function reenviarPendente() {
    postar().then(function (r) {
      if (r !== 'ok') return;
      S.enviado = true; S.pend = false;
      apagar(K_RASC); gravar(K_ENV, hoje()); gravar(K_POPUP, '1');
      if (S.avisoRasc && S.avisoRasc.parentNode) S.avisoRasc.parentNode.removeChild(S.avisoRasc);
      S.avisoRasc = null;
      var t = $('#final-titulo'); if (t) t.textContent = TEXTOS.finalTitulo;
    });
  }

  /* ===== Contagem: base do Google Forms + respostas reais do banco (se o banco falhar, só a base) ===== */
  function mostrarConta(n) {
    var t = sub(TEXTOS.conta, { n: n.toLocaleString('pt-BR') });
    var c = $('#capa-conta'); if (c) { $('span', c).textContent = t; c.classList.add('on'); }
    var d = $('#presente-conta'); if (d) d.textContent = t;
  }
  function contagem() {
    mostrarConta(RESPOSTAS_ANTERIORES);
    var ctl = window.AbortController ? new AbortController() : null;
    var corte = setTimeout(function () { if (ctl) ctl.abort(); }, 2500);
    fetch(SUPABASE + '/rpc/agatha_pesquisa_total', {
      method: 'POST', headers: { apikey: CHAVE, 'Content-Type': 'application/json' }, body: '{}', signal: ctl ? ctl.signal : undefined
    }).then(function (r) { clearTimeout(corte); return r.ok ? r.json() : null; }).then(function (n) {
      if (typeof n !== 'number' || n < 0 || n !== Math.floor(n)) return;
      mostrarConta(RESPOSTAS_ANTERIORES + n);
    }).catch(function () { clearTimeout(corte); });
  }

  /* ===== Painel "O seu presente" (celular) ===== */
  function presente() {
    var d = $('#p-presente'), kb = $('#p-kitbtn');
    kb.appendChild(kitEl('topo'));
    function fechar() { if (d.close) d.close(); else d.removeAttribute('open'); }
    kb.addEventListener('click', function () { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); });
    $('#presente-x').addEventListener('click', fechar);
    $('#presente-fechar').addEventListener('click', fechar);
    d.addEventListener('click', function (e) { if (e.target === d) fechar(); });
  }

  /* ===== Início ===== */
  function init() {
    capaEl = $('#tela-capa');
    // UTMs da URL (a página da live repassa as dela) e referrer
    try {
      var q = new URLSearchParams(location.search), achou = {};
      UTMS.forEach(function (k) { var v = q.get(k); if (v) achou[k] = v; });
      var tem = carregarRascunho();
      if (Object.keys(achou).length) S.utm = achou;
      if (!S.ref) S.ref = (doc.referrer || '').slice(0, 500);
      S.tem = tem;
    } catch (e) { S.tem = carregarRascunho(); }
    presente();
    $('#p-voltar').addEventListener('click', voltar);
    $('#btn-comecar').addEventListener('click', function () { ir('aviso'); });
    var onDesk = function () { montarPalco(); };
    if (desktop.addEventListener) desktop.addEventListener('change', onDesk); else if (desktop.addListener) desktop.addListener(onDesk);
    doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'hidden') salvar(); });
    window.addEventListener('pagehide', salvar);

    var inicial = 'capa';
    var env = ler(K_ENV);
    if (S.tem) inicial = S.pend ? 'final' : 'retoma';
    else if (env && /^\d{4}-\d{2}-\d{2}$/.test(env) && Date.now() - new Date(env + 'T12:00:00').getTime() < VALE_ENVIADA) { inicial = 'final'; S.voltaFinal = true; }
    else if (env) apagar(K_ENV);
    if (S.tem && S.pend) S.voltaFinal = true;
    try { history.replaceState({ t: inicial, d: 0 }, ''); } catch (e) {}
    doc.documentElement.classList.remove('tem-estado');
    montarPalco();
    if (inicial === 'capa') { S.tela = 'capa'; S.atual = construirCapa(); chrome(); contagem(); }
    else { mostrar(inicial, null); contagem(); }
    if (S.tem && S.pend) reenviarPendente();
  }
  init();
})();
