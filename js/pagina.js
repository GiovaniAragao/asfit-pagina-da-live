/* Página de aquecimento da live de lançamento da Asfit (11/11/2026).
   Roda depois do GSAP (todos com defer). Sem GSAP, tudo continua funcionando, só sem as animações de rolagem. */
(function () {
  'use strict';

  // Links e horário ficam no fim do index.html (window.CONFIG_AQUECIMENTO), pra trocar sem mexer aqui
  var CONFIG = window.CONFIG_AQUECIMENTO || {};
  var INICIO_DA_LIVE = CONFIG.INICIO_DA_LIVE || '';
  var PLATAFORMA = CONFIG.PLATAFORMA || '';
  var LINK_DA_PESQUISA = CONFIG.LINK_DA_PESQUISA || '';
  var LINK_DA_LIVE = CONFIG.LINK_DA_LIVE || '';

  var doc = document;
  window.__paginaOk = true;
  // imagens de enfeite (pattern) só entram depois que a capa carregou
  if (doc.readyState === 'complete') doc.documentElement.classList.add('pos-load');
  else window.addEventListener('load', function () { doc.documentElement.classList.add('pos-load'); });
  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  var guarda = {
    ler: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    gravar: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function sessao(k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  // cada parte roda protegida: se uma der erro, as outras seguem (pesquisa, animações, prévia)
  function seguro(nome, fn) { try { fn(); } catch (e) { if (window.console) console.error('[aquecimento] ' + nome, e); } }
  function dois(n) { return (n < 10 ? '0' : '') + n; }
  function mmss(s) { return dois(Math.floor(s / 60)) + ':' + dois(s % 60); }
  var inicio = INICIO_DA_LIVE ? new Date(INICIO_DA_LIVE) : null;
  if (inicio && isNaN(inicio)) inicio = null;

  // ===== Datas de hoje nas telas do app (como o app real mostra) =====
  seguro('datas', function () {
    var h = new Date();
    function data(op) { try { return new Intl.DateTimeFormat('pt-BR', op).format(h); } catch (e) { return h.toLocaleDateString(); } }
    var semPonto = function (txt) { return txt.replace('.', ''); };
    $$('[data-hoje-curto]').forEach(function (el) { el.textContent = data({ day: 'numeric', month: 'short', year: 'numeric' }); });
    $$('[data-hoje-dieta]').forEach(function (el) { el.textContent = 'Hoje, ' + semPonto(data({ weekday: 'short' })) + ' ' + h.getDate() + ' ' + semPonto(data({ month: 'short' })); });
    $$('[data-hoje-trava]').forEach(function (el) { el.textContent = data({ weekday: 'long', day: 'numeric', month: 'long' }); });
  });

  // ===== Quando: dia, hora e plataforma na linha da live e no pop-up =====
  seguro('quando', function () {
    var hora = '';
    if (inicio) {
      var br = new Date(inicio.getTime() - 3 * 3600e3);
      hora = br.getUTCHours() + 'h' + (br.getUTCMinutes() ? dois(br.getUTCMinutes()) : '');
    }
    var aoVivo = 'ao vivo' + (PLATAFORMA ? ' ' + PLATAFORMA : '');
    $$('[data-quando]').forEach(function (el) { el.textContent = 'Dia 11 de novembro' + (hora ? ', às ' + hora : '') + ' · ' + aoVivo; });
    $$('[data-quando-popup]').forEach(function (el) { el.textContent = '11 de novembro' + (hora ? ', às ' + hora : '') + ', ' + aoVivo; });
  });

  // ===== Faixa do topo: sem horário conta os dias; com horário, dias, horas, minutos e segundos =====
  seguro('faixa', function () {
    var evento = $('[data-faixa-evento]'), tempo = $('[data-faixa-tempo]');
    if (!evento) return;
    function diasAte() {
      var agoraBR = new Date(Date.now() - 3 * 3600e3);
      var hojeBR = Date.UTC(agoraBR.getUTCFullYear(), agoraBR.getUTCMonth(), agoraBR.getUTCDate());
      return Math.round((Date.UTC(2026, 10, 11) - hojeBR) / 864e5);
    }
    function atualizar() {
      if (inicio) {
        var falta = inicio.getTime() - Date.now();
        if (falta > 0) {
          var s = Math.floor(falta / 1000);
          var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
          evento.textContent = 'A live de lançamento começa em';
          tempo.innerHTML = (d ? '<b>' + d + 'd</b>' : '') + '<b>' + dois(h) + 'h</b><b>' + dois(m) + 'm</b><b>' + dois(s % 60) + 's</b>';
          return true;
        }
        tempo.textContent = '';
        if (LINK_DA_LIVE) {
          evento.innerHTML = '';
          var a = doc.createElement('a');
          a.href = LINK_DA_LIVE; a.target = '_blank'; a.rel = 'noopener';
          a.textContent = 'A live de lançamento já começou: toque pra assistir';
          evento.appendChild(a);
        } else {
          evento.textContent = 'A live de lançamento já começou';
        }
        return false;
      }
      var dias = diasAte();
      evento.textContent = dias === 0 ? 'A live oficial de lançamento é hoje' : 'Live oficial de lançamento: 11/11';
      tempo.textContent = dias > 1 ? 'faltam ' + dias + ' dias' : dias === 1 ? 'é amanhã' : '';
      return false;
    }
    if (atualizar()) {
      var t = setInterval(function () { if (!atualizar()) clearInterval(t); }, 1000);
    }
  });

  // ===== Pesquisa do Grupo de Espera (dá o Kit de Receitas). O lembrete saiu em 12/10/2026 =====
  var fecharPopup = function () {};
  seguro('pesquisa', function () {
    var pesquisas = $$('.js-pesquisa');
    pesquisas.forEach(function (a) { if (LINK_DA_PESQUISA) a.href = LINK_DA_PESQUISA; });
    pesquisas.forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (!LINK_DA_PESQUISA) e.preventDefault();
        guarda.gravar('asfit-pesquisa', '1');
        fecharPopup();
      });
    });
  });

  // ===== Blocos surgindo ao rolar (mesmo código do site da mãe do Giovani) =====
  seguro('revela', function () {
    var alvos = $$('.revela');
    if (reduzir || !('IntersectionObserver' in window)) { alvos.forEach(function (el) { el.classList.add('visivel'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    alvos.forEach(function (el) { io.observe(el); });
  });

  // ===== Vídeos dos bônus: tocam sem som quando aparecem (e só então baixam) =====
  seguro('vídeos dos bônus', function () { $$('.bonus__midia').forEach(function (fig) {
    var v = $('video', fig), b = $('.video__pausa', fig), pausadoPelaPessoa = false;
    // a capa (poster) não respeita o lazy do navegador: entra quando a dobra está a ~1 tela
    function capa() { if (v.getAttribute('data-poster')) { v.poster = v.getAttribute('data-poster'); v.removeAttribute('data-poster'); } }
    if ('IntersectionObserver' in window) {
      var ioCapa = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { capa(); ioCapa.disconnect(); } }, { rootMargin: '900px 0px' });
      ioCapa.observe(v);
    } else capa();
    function tocar() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    if ('IntersectionObserver' in window && !reduzir) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { if (!pausadoPelaPessoa) tocar(); } else v.pause(); });
      }, { threshold: .35 }).observe(v);
    }
    function atualizar() {
      b.setAttribute('data-estado', v.paused ? 'parado' : 'tocando');
      b.setAttribute('aria-label', v.paused ? 'Tocar vídeo' : 'Pausar vídeo');
    }
    v.addEventListener('play', atualizar);
    v.addEventListener('pause', atualizar);
    function alternar() { if (v.paused) { pausadoPelaPessoa = false; tocar(); } else { pausadoPelaPessoa = true; v.pause(); } }
    b.addEventListener('click', alternar);
    v.addEventListener('click', alternar);
  }); });

  // ===== Bônus secretos: o cadeado treme e responde =====
  $$('[data-segredo]').forEach(function (el) {
    var t = 0;
    el.addEventListener('click', function () {
      el.classList.remove('balanca'); void el.offsetWidth; el.classList.add('balanca');
      clearTimeout(t); t = setTimeout(function () { el.classList.remove('balanca'); }, 1800);
    });
  });

  // ===== Pop-up de saída: uma vez por visita, a partir de 4 s =====
  seguro('pop-up', function () {
    var el = $('#popup');
    if (!el) return;
    var aberto = false, mostrou = sessao('asfit-popup') === '1', desde = Date.now(), foco = null;
    function pode() { return !mostrou && !aberto && Date.now() - desde > 4000 && guarda.ler('asfit-pesquisa') !== '1'; }
    function esc(e) { if (e.key === 'Escape') fecharPopup(); }
    function abrir() {
      if (!pode()) return false;
      aberto = true; mostrou = true; sessao('asfit-popup', '1');
      foco = doc.activeElement;
      el.hidden = false; el.classList.add('abrindo');
      $('.popup__fechar', el).focus();
      doc.addEventListener('keydown', esc);
      return true;
    }
    fecharPopup = function () {
      if (!aberto) return;
      aberto = false; el.hidden = true; el.classList.remove('abrindo');
      doc.removeEventListener('keydown', esc);
      if (foco && foco.focus) foco.focus();
    };
    $$('[data-fechar-popup]', el).forEach(function (b) { b.addEventListener('click', fecharPopup); });
    // computador: o mouse sobe para fechar a aba
    doc.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) abrir(); });
    // celular: o primeiro "voltar" mostra o pop-up; o segundo sai da página
    if (window.matchMedia('(pointer: coarse)').matches && history.pushState) {
      history.pushState({ asfit: 1 }, '');
      window.addEventListener('popstate', function () { if (!abrir()) history.back(); });
    }
    // voltou de outra aba ou de outro app
    doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible') abrir(); });
  });

  // ===== A prévia do app =====
  var tourApi = null;
  seguro('prévia do app', function () {
    var ui = $('#app-ui');
    if (!ui) return;
    var celular = $('#celular');
    var dedo = $('.ui-dedo', ui);
    var avisoEl = $('[data-aviso]', ui);
    var dica = $('[data-dica-tour]');
    var legenda = $('[data-legenda]');
    var lista = $('.tour__partes');
    var abas = $$('.parte');
    var ordem = abas.map(function (b) { return b.getAttribute('data-parte'); });
    var telas = {};
    $$('.ui-tela', ui).forEach(function (t) { telas[t.getAttribute('data-parte')] = t; });
    var partes = {};
    var atual = null, livre = false, demo = null, visivel = false;

    function ponto(el) {
      var r = el.getBoundingClientRect(), u = ui.getBoundingClientRect(), k = u.width / 375;
      return { x: (r.left + r.width / 2 - u.left) / k, y: (r.top + r.height / 2 - u.top) / k };
    }
    function escala() { return ui.getBoundingClientRect().width / 375 || 1; }
    function trocarVista(de, para) {
      de.hidden = true; para.hidden = false;
      if (reduzir) return;
      para.classList.add('some'); void para.offsetWidth; para.classList.remove('some');
    }
    var tAviso = 0;
    function avisar(txt) {
      avisoEl.textContent = txt; avisoEl.classList.add('mostra');
      clearTimeout(tAviso); tAviso = setTimeout(function () { avisoEl.classList.remove('mostra'); }, 2400);
    }

    // ---------- Treino ----------
    (function () {
      var tela = telas.treino;
      var andamento = $('.ui-treino__andamento', tela), salvo = $('.ui-treino__salvo', tela);
      var oks = $$('.ui-ok', tela), seg = $('[data-seg]', tela), contagem = $('[data-contagem]', tela);
      var concluir = $('[data-concluir]', tela), conta = $('[data-concluir-conta]', tela);
      var descanso = $('[data-descanso]', tela), descTempo = $('[data-descanso-tempo]', tela), volta = $('[data-volta]', tela);
      var relogio = $('[data-relogio]', tela), tempoFinal = $('[data-tempo-final]', tela), pularBtn = $('[data-pular]', tela);
      var feitas = [false, false, false], segundos = 0, tRelogio = 0, resta = 60, tDesc = 0;
      function quantas() { return feitas.filter(Boolean).length; }
      function atualizar() {
        var n = quantas();
        seg.style.transform = 'scaleX(' + n / 3 + ')';
        contagem.textContent = (n === 3 ? 3 : 2) + '/3';
        conta.textContent = n + '/3';
        concluir.disabled = n < 3;
      }
      function desenharDescanso() {
        var r = Math.max(0, resta);
        descTempo.textContent = mmss(r);
        volta.style.strokeDashoffset = (169.6 * (1 - Math.min(r, 60) / 60)).toFixed(1);
      }
      function esconderDescanso() { clearInterval(tDesc); descanso.classList.remove('mostra'); }
      function mostrarDescanso() {
        resta = 60; desenharDescanso(); descanso.classList.add('mostra');
        clearInterval(tDesc);
        tDesc = setInterval(function () { resta--; desenharDescanso(); if (resta <= 0) esconderDescanso(); }, 1000);
      }
      function marcar(i) {
        feitas[i] = !feitas[i];
        oks[i].setAttribute('aria-pressed', feitas[i] ? 'true' : 'false');
        atualizar();
        if (feitas[i] && quantas() < 3) mostrarDescanso(); else esconderDescanso();
      }
      function concluirTreino() {
        if (concluir.disabled) return;
        esconderDescanso();
        tempoFinal.textContent = mmss(Math.max(segundos, 1));
        trocarVista(andamento, salvo);
        salvo.classList.remove('festa'); void salvo.offsetWidth; salvo.classList.add('festa');
      }
      oks.forEach(function (b, i) { b.addEventListener('click', function () { marcar(i); }); });
      pularBtn.addEventListener('click', esconderDescanso);
      $('[data-mais15]', tela).addEventListener('click', function () { resta += 15; desenharDescanso(); });
      concluir.addEventListener('click', concluirTreino);
      $('[data-voltar-treino]', tela).addEventListener('click', function () { partes.treino.resetar(); });
      partes.treino = {
        resetar: function () {
          feitas = [false, false, false];
          oks.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          esconderDescanso(); atualizar();
          segundos = 0; relogio.textContent = '00:00';
          salvo.classList.remove('festa');
          if (andamento.hidden) trocarVista(salvo, andamento);
        },
        entrar: function () { clearInterval(tRelogio); tRelogio = setInterval(function () { segundos++; relogio.textContent = mmss(segundos); }, 1000); },
        sair: function () { clearInterval(tRelogio); esconderDescanso(); },
        demo: function (tl, g) {
          g.espera(tl, .5);
          g.toque(tl, function () { return oks[0]; }, function () { marcar(0); }, 1.2);
          g.toque(tl, function () { return pularBtn; }, esconderDescanso, .35);
          g.toque(tl, function () { return oks[1]; }, function () { marcar(1); }, .8);
          g.toque(tl, function () { return pularBtn; }, esconderDescanso, .35);
          g.toque(tl, function () { return oks[2]; }, function () { marcar(2); }, .5);
          g.toque(tl, function () { return concluir; }, concluirTreino, 2.8);
        }
      };
    })();

    // ---------- Dieta ----------
    (function () {
      var tela = telas.dieta;
      var almoco = $('.ui-almoco', tela), resumo = $('.ui-resumo', tela);
      var listaItens = $('[data-itens]', tela), opcoesEl = $('[data-opcoes]', tela), folhaTitulo = $('[data-folha-titulo]', tela);
      var comiBtn = $('[data-comi]', tela), maisAgua = $('[data-agua-mais]', tela);
      var arco = $('[data-arco]', tela), kcalEl = $('[data-kcal]', tela), kcalRot = $('[data-kcal-rotulo]', tela), dicaEl = $('[data-dica]', tela);
      var aguaEl = $('[data-agua]', tela), coposEl = $('[data-copos]', tela), nivel = $('[data-agua-nivel]', tela), refeicaoKcal = $('[data-refeicao-kcal]', tela);
      var COMPRIMENTO = 377;
      // Alimentos do almoço da gravação; as trocas são exemplos da dieta flexível
      var ITENS = [
        { nome: 'Arroz branco', porcao: '4 col. de sopa · 120 g', kcal: 155, opcoes: [['Arroz integral', '4 col. de sopa · 120 g', 149], ['Batata-doce', '1 unidade média · 150 g', 116], ['Mandioca cozida', '2 pedaços · 100 g', 125]] },
        { nome: 'Feijão carioca', porcao: '1 concha · 100 g', kcal: 76, opcoes: [['Feijão preto', '1 concha · 100 g', 77], ['Lentilha', '1 concha · 100 g', 93]] },
        { nome: 'Frango grelhado', porcao: '1 filé · 110 g', kcal: 175, opcoes: [['Tilápia grelhada', '1 filé · 120 g', 154], ['Ovos mexidos', '2 unidades', 172]] },
        { nome: 'Couve refogada', porcao: '50 g', kcal: 45, opcoes: [['Brócolis', '3 floretes · 60 g', 15], ['Salada de folhas', '1 prato de sobremesa', 12]] }
      ];
      var escolhas, registrado, agua, trocando = -1;
      function itemAtual(i) {
        var it = ITENS[i], j = escolhas[i];
        return j === null ? { nome: it.nome, porcao: it.porcao, kcal: it.kcal } : { nome: it.opcoes[j][0], porcao: it.opcoes[j][1], kcal: it.opcoes[j][2] };
      }
      function preencherItem(li, i) {
        var a = itemAtual(i);
        $('b', li).textContent = a.nome;
        $('.ui-item__txt span', li).textContent = a.porcao + ' · ' + a.kcal + ' kcal';
        $('.ui-marcar', li).setAttribute('aria-label', 'Marcar ' + a.nome.toLowerCase());
      }
      function desenharItens() {
        listaItens.innerHTML = '';
        ITENS.forEach(function (_, i) {
          var li = doc.createElement('li');
          li.innerHTML = '<button class="ui-marcar" type="button" aria-pressed="false"><i class="ui-radio"><svg aria-hidden="true"><use href="#i-check"/></svg></i></button><div class="ui-item__txt"><b></b><span></span></div><button class="ui-trocar" type="button" data-trocar="' + i + '"><svg aria-hidden="true"><use href="#i-arrows-left-right"/></svg>Trocar</button>';
          preencherItem(li, i);
          listaItens.appendChild(li);
        });
      }
      function abrirTroca(i) {
        if (registrado) return;
        trocando = i;
        var atualItem = itemAtual(i), it = ITENS[i];
        folhaTitulo.textContent = 'Trocar ' + atualItem.nome.toLowerCase() + ' por';
        var todas = [[it.nome, it.porcao, it.kcal, null]].concat(it.opcoes.map(function (o, j) { return [o[0], o[1], o[2], j]; }));
        opcoesEl.innerHTML = '';
        var n = 0;
        todas.forEach(function (o) {
          if (o[3] === escolhas[i]) return;
          var b = doc.createElement('button');
          b.type = 'button'; b.className = 'ui-opcao';
          b.setAttribute('data-opcao', n++);
          b.innerHTML = '<span><b></b><small></small></span><svg><use href="#i-arrows-left-right"/></svg>';
          $('b', b).textContent = o[0];
          $('small', b).textContent = o[1] + ' · ' + o[2] + ' kcal';
          b.addEventListener('click', function () { escolher(i, o[3]); });
          opcoesEl.appendChild(b);
        });
        tela.classList.add('trocando');
      }
      function fecharTroca() { tela.classList.remove('trocando'); trocando = -1; }
      function escolher(i, j) {
        escolhas[i] = j;
        fecharTroca();
        var li = listaItens.children[i];
        preencherItem(li, i);
        var txt = $('.ui-item__txt', li);
        txt.classList.remove('troca'); void txt.offsetWidth; txt.classList.add('troca');
      }
      function total() { var t = 0; for (var i = 0; i < ITENS.length; i++) t += itemAtual(i).kcal; return t; }
      function fmt(n) { return n.toLocaleString('pt-BR'); }
      function mostrarResumo() {
        trocarVista(almoco, resumo);
        var t = total();
        refeicaoKcal.textContent = t + ' kcal · registrado';
        kcalEl.textContent = fmt(1700 - t) + '–' + fmt(1900 - t);
        kcalRot.textContent = 'kcal restantes na faixa';
        dicaEl.textContent = '';
        requestAnimationFrame(function () {
          arco.style.strokeDashoffset = (COMPRIMENTO * (1 - t / 1900)).toFixed(1);
          [['p', 44, 135], ['c', 67, 230], ['g', 7, 60]].forEach(function (m) {
            $('[data-macro="' + m[0] + '"]', tela).textContent = m[1] + ' g';
            $('[data-barra="' + m[0] + '"]', tela).style.transform = 'scaleX(' + (m[1] / m[2]).toFixed(3) + ')';
          });
        });
      }
      var tResumo = 0;
      function marcarItem(li, ligar) {
        li.classList.toggle('comido', ligar);
        $('.ui-marcar', li).setAttribute('aria-pressed', ligar ? 'true' : 'false');
      }
      // marcar cada alimento, igual às séries do treino; marcou tudo, a refeição fica registrada
      function marcar(i) {
        if (registrado) return;
        var li = listaItens.children[i];
        if (!li) return;
        marcarItem(li, !li.classList.contains('comido'));
        var todos = Array.prototype.every.call(listaItens.children, function (x) { return x.classList.contains('comido'); });
        if (todos) { registrado = true; fecharTroca(); clearTimeout(tResumo); tResumo = setTimeout(mostrarResumo, 750); }
      }
      function comi() {
        if (registrado) return;
        registrado = true;
        fecharTroca();
        Array.prototype.forEach.call(listaItens.children, function (li, i) { setTimeout(function () { marcarItem(li, true); }, i * 110); });
        clearTimeout(tResumo);
        tResumo = setTimeout(mostrarResumo, 950);
      }
      function desenharAgua(acabou) {
        var v = agua / 1000;
        aguaEl.textContent = v === 0 ? '0' : v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
        var copos = agua / 250;
        coposEl.innerHTML = '';
        if (copos > 0) {
          coposEl.appendChild(doc.createTextNode(copos + (copos === 1 ? ' copo' : ' copos') + ' de 250 ml' + (acabou ? ' · Adicionado. ' : '')));
          if (acabou) {
            var d = doc.createElement('button');
            d.type = 'button'; d.textContent = 'Desfazer';
            d.addEventListener('click', function () { agua = Math.max(0, agua - 250); desenharAgua(false); });
            coposEl.appendChild(d);
          }
        }
        nivel.style.transform = 'translateY(' + ((1 - Math.min(1, agua / 2000)) * 100).toFixed(1) + '%)';
      }
      function beber() { agua = Math.min(3000, agua + 250); desenharAgua(true); }
      listaItens.addEventListener('click', function (e) {
        var b = e.target.closest('[data-trocar]');
        if (b) { abrirTroca(+b.getAttribute('data-trocar')); return; }
        // o círculo ou o nome do alimento marcam e desmarcam
        var alvo = e.target.closest('.ui-marcar, .ui-item__txt');
        if (alvo) marcar(Array.prototype.indexOf.call(listaItens.children, alvo.closest('li')));
      });
      $('[data-fechar-folha]', tela).addEventListener('click', fecharTroca);
      comiBtn.addEventListener('click', comi);
      maisAgua.addEventListener('click', beber);
      $('[data-voltar-almoco]', tela).addEventListener('click', function () { partes.dieta.resetar(); });
      partes.dieta = {
        resetar: function () {
          clearTimeout(tResumo);
          escolhas = [null, null, null, null]; registrado = false; agua = 0;
          fecharTroca(); desenharItens(); desenharAgua(false);
          kcalEl.textContent = '1.700–1.900'; kcalRot.textContent = 'kcal para o seu dia';
          dicaEl.textContent = 'Seu dia começa quando você quiser.';
          arco.style.strokeDasharray = COMPRIMENTO; arco.style.strokeDashoffset = COMPRIMENTO;
          ['p', 'c', 'g'].forEach(function (m) {
            $('[data-macro="' + m + '"]', tela).textContent = '0 g';
            $('[data-barra="' + m + '"]', tela).style.transform = 'scaleX(0)';
          });
          if (almoco.hidden) trocarVista(resumo, almoco);
        },
        sair: function () { clearTimeout(tResumo); fecharTroca(); },
        demo: function (tl, g) {
          g.espera(tl, .5);
          g.toque(tl, function () { return $('[data-trocar="0"]', tela); }, function () { abrirTroca(0); }, .8);
          // segunda opção da folha do arroz = batata-doce (opcoes[1])
          g.toque(tl, function () { return $('[data-opcao="1"]', tela) || comiBtn; }, function () { escolher(0, 1); }, .7);
          g.toque(tl, function () { return $('.ui-marcar', listaItens.children[0]); }, function () { marcar(0); }, .35);
          g.toque(tl, function () { return $('.ui-marcar', listaItens.children[2]); }, function () { marcar(2); }, .45);
          g.toque(tl, function () { return comiBtn; }, comi, 2.1);
          g.toque(tl, function () { return maisAgua; }, beber, .5);
          g.toque(tl, function () { return maisAgua; }, beber, 1.5);
        }
      };
    })();

    // ---------- Creatina ----------
    (function () {
      var tela = telas.creatina;
      var notif = $('[data-notificacao]', tela), acoes = $('[data-notif-acoes]', tela);
      var titulo = $('[data-notif-titulo]', tela), texto = $('[data-notif-texto]', tela), tomeiBtn = $('[data-tomei]', tela);
      var tChega = 0;
      function responder(t1, t2) {
        titulo.textContent = t1; texto.textContent = t2;
        acoes.classList.add('some');
        notif.animate && !reduzir && notif.animate([{ transform: 'scale(.97)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      }
      function tomei() { responder('Anotado!', 'Amanhã eu te lembro de novo.'); }
      tomeiBtn.addEventListener('click', tomei);
      $('[data-depois]', tela).addEventListener('click', function () { responder('Combinado', 'Daqui a 1 hora eu te lembro de novo.'); });
      partes.creatina = {
        resetar: function () {
          clearTimeout(tChega);
          notif.classList.remove('chegou'); acoes.classList.add('some');
          titulo.textContent = 'Hora da creatina, mô'; texto.textContent = 'Já tomou a de hoje?';
        },
        entrar: function () {
          clearTimeout(tChega);
          tChega = setTimeout(function () { notif.classList.add('chegou'); acoes.classList.remove('some'); }, reduzir ? 0 : 450);
        },
        sair: function () { clearTimeout(tChega); },
        demo: function (tl, g) {
          g.espera(tl, 1.2);
          g.toque(tl, function () { return tomeiBtn; }, tomei, 2);
        }
      };
    })();

    // ---------- Comunidade ----------
    (function () {
      var tela = telas.legiao;
      var video = $('video', tela), carregado = false;
      var curtirBtn = $('[data-curtir]', tela), curtidas = $('[data-curtidas]', tela), seguirBtn = $('[data-seguir]', tela);
      var painelV = $('[data-painel="videos"]', tela), painelF = $('[data-painel="feed"]', tela);
      var botoesAba = $$('[data-aba]', tela);
      function carregar() { if (carregado) return; carregado = true; video.src = video.getAttribute('data-src'); }
      function tocar() { if (reduzir || painelV.hidden) return; var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      function coracao(x, y) {
        var s = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('class', 'ui-coracao');
        s.innerHTML = '<use href="#f-heart"/>';
        s.style.left = x + 'px'; s.style.top = y + 'px';
        painelV.appendChild(s);
        setTimeout(function () { s.remove(); }, 950);
      }
      function curtir(ligar, x, y) {
        var on = ligar === undefined ? curtirBtn.getAttribute('aria-pressed') !== 'true' : ligar;
        curtirBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        curtidas.textContent = on ? '26' : '25';
        if (x !== undefined) coracao(x, y);
      }
      function seguir() {
        var on = seguirBtn.getAttribute('aria-pressed') !== 'true';
        seguirBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        seguirBtn.textContent = on ? 'Seguindo' : 'Seguir';
      }
      function aba(nome) {
        botoesAba.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-aba') === nome ? 'true' : 'false'); });
        painelV.hidden = nome !== 'videos'; painelF.hidden = nome !== 'feed';
        if (nome === 'videos') tocar(); else video.pause();
      }
      function noPainel(clientX, clientY) {
        var r = painelV.getBoundingClientRect(), k = escala();
        return { x: (clientX - r.left) / k, y: (clientY - r.top) / k };
      }
      curtirBtn.addEventListener('click', function () { curtir(); });
      seguirBtn.addEventListener('click', seguir);
      botoesAba.forEach(function (b) { b.addEventListener('click', function () { aba(b.getAttribute('data-aba')); }); });
      // dois toques no vídeo curtem, como no TikTok
      var ultimoToque = 0;
      painelV.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        var agora = Date.now();
        if (agora - ultimoToque < 320) { var p = noPainel(e.clientX, e.clientY); curtir(true, p.x, p.y); ultimoToque = 0; }
        else ultimoToque = agora;
      });
      partes.legiao = {
        resetar: function () {
          aba('videos');
          curtirBtn.setAttribute('aria-pressed', 'false'); curtidas.textContent = '25';
          seguirBtn.setAttribute('aria-pressed', 'false'); seguirBtn.textContent = 'Seguir';
        },
        entrar: function () { carregar(); tocar(); },
        sair: function () { video.pause(); },
        visivel: function (v) { if (v) tocar(); else video.pause(); },
        demo: function (tl, g) {
          // o ponto do coração: 45% da largura e 40% da altura do vídeo
          function alvoTela() { var r = painelV.getBoundingClientRect(); return { x: r.left + r.width * .45, y: r.top + r.height * .4 }; }
          g.espera(tl, 1);
          g.duplo(tl, function () {
            var c = alvoTela(), u = ui.getBoundingClientRect(), k = escala();
            return { x: (c.x - u.left) / k, y: (c.y - u.top) / k };
          }, function () {
            var c = alvoTela(), p = noPainel(c.x, c.y);
            curtir(true, p.x, p.y);
          }, .8);
          g.toque(tl, function () { return seguirBtn; }, seguir, .9);
          g.toque(tl, function () { return botoesAba[0]; }, function () { aba('feed'); }, 2.2);
        }
      };
    })();

    // ---------- Desafios ----------
    (function () {
      var tela = telas.desafios;
      var btn = $('[data-checkin]', tela), rotulo = $('[data-checkin-rotulo]', tela), ranking = $('[data-ranking]', tela), confete = $('[data-confete]', tela);
      // ordem e pontos do começo (refazer o innerHTML perderia as imagens já carregadas)
      var linhas = $$('li', ranking), pontosIniciais = linhas.map(function (li) { return $('em', li).textContent; });
      var feito = false, tSobe = 0;
      var CORES = ['#853B48', '#FCE176', '#C46334', '#F7F3E8', '#518092'];
      function confetes() {
        if (reduzir || !confete.animate) return;
        var r = btn.getBoundingClientRect(), t = tela.getBoundingClientRect(), k = escala();
        var x0 = (r.left + r.width / 2 - t.left) / k, y0 = (r.top + r.height / 2 - t.top) / k;
        for (var i = 0; i < 22; i++) {
          var p = doc.createElement('i');
          p.style.left = x0 + 'px'; p.style.top = y0 + 'px'; p.style.background = CORES[i % CORES.length];
          confete.appendChild(p);
          var ang = Math.random() * Math.PI - Math.PI, vel = 90 + Math.random() * 120;
          var dx = Math.cos(ang) * vel, dy = Math.sin(ang) * vel;
          p.animate([
            { transform: 'translate(0,0) rotate(0)', opacity: 1 },
            { transform: 'translate(' + dx + 'px,' + (dy - 20) + 'px) rotate(' + (Math.random() * 540) + 'deg)', opacity: 1, offset: .55 },
            { transform: 'translate(' + dx * 1.3 + 'px,' + (dy + 160) + 'px) rotate(' + (Math.random() * 720) + 'deg)', opacity: 0 }
          ], { duration: 1100 + Math.random() * 400, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'forwards' });
        }
        setTimeout(function () { confete.innerHTML = ''; }, 1700);
      }
      function checkin() {
        if (feito) return;
        feito = true;
        btn.classList.add('feito'); rotulo.textContent = 'Check-in de hoje feito';
        var voce = $('li.voce', ranking), acima = voce.previousElementSibling, pts = $('[data-meus-pontos]', ranking);
        pts.textContent = String(+pts.textContent + 1);
        pts.classList.remove('sobe'); void pts.offsetWidth; pts.classList.add('sobe');
        confetes();
        clearTimeout(tSobe);
        tSobe = setTimeout(function () {
          // se a pessoa trocou de tela nesse meio-tempo, a lista já foi refeita: não mexe
          if (!acima || voce.parentNode !== ranking || acima.parentNode !== ranking) return;
          if (+$('em', acima).textContent >= +pts.textContent) return;
          // FLIP: "Você" passa a Ana e sobe uma posição
          var k = escala(), y1 = voce.getBoundingClientRect().top, y2 = acima.getBoundingClientRect().top;
          ranking.insertBefore(voce, acima);
          $$('li', ranking).forEach(function (li, i) { $('span', li).textContent = i + 1; });
          if (reduzir || !voce.animate) return;
          var d = (y1 - y2) / k;
          voce.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,0,0,1)' });
          acima.animate([{ transform: 'translateY(' + (-d) + 'px)' }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,0,0,1)' });
        }, 350);
      }
      btn.addEventListener('click', checkin);
      partes.desafios = {
        resetar: function () {
          clearTimeout(tSobe);
          feito = false;
          linhas.forEach(function (li, i) {
            if (li.getAnimations) li.getAnimations().forEach(function (a) { a.cancel(); });
            ranking.appendChild(li);
            $('span', li).textContent = i + 1;
            $('em', li).textContent = pontosIniciais[i];
            $('em', li).classList.remove('sobe');
          });
          btn.classList.remove('feito'); rotulo.textContent = 'Fazer check-in de hoje';
          confete.innerHTML = '';
        },
        demo: function (tl, g) {
          g.espera(tl, .7);
          g.toque(tl, function () { return btn; }, checkin, 2.6);
        }
      };
    })();

    // ---------- Troca de parte, dedinho e controle ----------
    var temGsap = !!window.gsap && !reduzir;
    var gestos = {
      espera: function (tl, s) { tl.to({}, { duration: s }); },
      toque: function (tl, alvo, acao, depois) {
        tl.to(dedo, { x: function () { return ponto(alvo()).x; }, y: function () { return ponto(alvo()).y; }, duration: .6, ease: 'power2.inOut' });
        tl.to(dedo, { scale: .76, duration: .12, ease: 'power2.out' });
        tl.call(acao);
        tl.to(dedo, { scale: 1, duration: .24, ease: 'power2.out' });
        if (depois) tl.to({}, { duration: depois });
      },
      // dois toques num ponto da tela (alvo devolve {x, y} nas medidas do app)
      duplo: function (tl, alvo, acao, depois) {
        tl.to(dedo, { x: function () { return alvo().x; }, y: function () { return alvo().y; }, duration: .6, ease: 'power2.inOut' });
        tl.to(dedo, { scale: .76, duration: .08, yoyo: true, repeat: 1 });
        tl.to(dedo, { scale: .76, duration: .08 });
        tl.call(acao);
        tl.to(dedo, { scale: 1, duration: .2 });
        if (depois) tl.to({}, { duration: depois });
      }
    };
    function zerarBarras() { $$('.parte__barra b').forEach(function (b) { b.style.transform = 'scaleX(0)'; }); }
    function esconderDedo() { if (window.gsap) gsap.to(dedo, { autoAlpha: 0, duration: .2, overwrite: true }); }
    function assumir() {
      if (livre) return;
      livre = true;
      if (demo) { demo.kill(); demo = null; }
      zerarBarras(); esconderDedo();
      if (dica) { dica.style.opacity = '0'; dica.disabled = true; }
    }
    if (dica) dica.addEventListener('click', assumir);
    // ícones dentro de botões com texto ou rótulo são decorativos pra leitor de tela
    $$('svg:not([aria-label])', ui).forEach(function (s) { s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); });
    function tocarDemo() {
      if (demo) { demo.kill(); demo = null; }
      zerarBarras();
      if (livre || !temGsap || !visivel || !atual) return;
      var parte = atual;
      var tl = gsap.timeline({ paused: true, onComplete: function () { demo = null; if (!livre) proxima(); } });
      tl.set(dedo, { x: 220, y: 760, scale: 1 });
      tl.to(dedo, { autoAlpha: 1, duration: .3 });
      partes[parte].demo(tl, gestos);
      tl.to(dedo, { autoAlpha: 0, duration: .3 });
      var barra = $('.parte[data-parte="' + parte + '"] .parte__barra b');
      if (barra) tl.fromTo(barra, { scaleX: 0 }, { scaleX: 1, duration: tl.duration(), ease: 'none' }, 0);
      demo = tl;
      tl.play();
    }
    function proxima() { var i = ordem.indexOf(atual); ir(ordem[(i + 1) % ordem.length]); }
    function centralizarAba(b) {
      if (!lista || lista.scrollWidth <= lista.clientWidth) return;
      var alvo = b.offsetLeft - (lista.clientWidth - b.offsetWidth) / 2;
      lista.scrollTo({ left: Math.max(0, alvo), behavior: reduzir ? 'auto' : 'smooth' });
    }
    function atualizarLegenda(b) {
      if (!legenda) return;
      $('h3', legenda).textContent = $('.parte__titulo', b).textContent;
      $('p', legenda).textContent = $('.parte__texto', b).textContent;
      legenda.classList.remove('troca'); void legenda.offsetWidth; legenda.classList.add('troca');
    }
    function ir(nome, daPessoa) {
      if (!telas[nome]) return;
      if (daPessoa) assumir();
      if (atual === nome) { partes[nome].resetar(); partes[nome].entrar && partes[nome].entrar(); tocarDemo(); return; }
      if (atual) {
        var velha = telas[atual];
        partes[atual].sair && partes[atual].sair();
        velha.classList.remove('ativa'); velha.classList.add('saindo');
        setTimeout(function () { velha.classList.remove('saindo'); }, 400);
      }
      atual = nome;
      partes[nome].resetar();
      telas[nome].classList.remove('saindo');
      telas[nome].classList.add('ativa');
      ui.setAttribute('data-tema', telas[nome].getAttribute('data-tema') || 'claro');
      if (visivel || daPessoa) partes[nome].entrar && partes[nome].entrar();
      abas.forEach(function (b) {
        var sel = b.getAttribute('data-parte') === nome;
        b.setAttribute('aria-selected', sel ? 'true' : 'false');
        b.tabIndex = sel ? 0 : -1;
        if (sel) { centralizarAba(b); atualizarLegenda(b); }
      });
      tocarDemo();
    }

    abas.forEach(function (b) {
      b.addEventListener('click', function () { ir(b.getAttribute('data-parte'), true); });
      b.addEventListener('keydown', function (e) {
        var i = abas.indexOf(b), n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = abas[(i + 1) % abas.length];
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = abas[(i - 1 + abas.length) % abas.length];
        if (n) { e.preventDefault(); n.focus(); ir(n.getAttribute('data-parte'), true); }
      });
    });
    // qualquer toque de verdade dentro do celular passa o controle pra pessoa (clique simulado não conta)
    ui.addEventListener('click', function (e) {
      if (!e.isTrusted) return;
      assumir();
      var alvo = e.target.closest('[data-fora], [data-ir]');
      if (!alvo) return;
      if (alvo.hasAttribute('data-fora')) avisar('Essa parte eu te mostro na live, mô.');
      else ir(alvo.getAttribute('data-ir'), true);
    });

    // as imagens das outras telas (e a capa do vídeo do feed) só baixam quando o celular chega perto
    function carregarImagens() {
      // só <img>: o vídeo do feed também tem data-src, mas ele carrega na hora em que a tela da legião abre
      $$('img[data-src]', ui).forEach(function (img) { img.src = img.getAttribute('data-src'); img.removeAttribute('data-src'); });
      $$('[data-poster]', ui).forEach(function (v) { v.poster = v.getAttribute('data-poster'); v.removeAttribute('data-poster'); });
      ui.classList.add('pronta');
    }
    if ('IntersectionObserver' in window) {
      var ioImg = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { carregarImagens(); ioImg.disconnect(); }
      }, { rootMargin: '700px 0px' });
      ioImg.observe(celular);
    } else {
      carregarImagens();
    }

    ir(ordem[0]);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          visivel = e.isIntersecting;
          var p = partes[atual];
          if (visivel) {
            if (p.entrar && !p._entrou) { p._entrou = true; p.entrar(); }
            p.visivel && p.visivel(true);
            if (!livre) { if (demo) demo.play(); else tocarDemo(); }
          } else {
            if (demo) demo.pause();
            p.visivel && p.visivel(false);
          }
        });
      }, { threshold: .45 }).observe(celular);
    }
    tourApi = { ir: ir };
  });

  // ===== Movimento com GSAP: capa, sequência do caos e linha do tempo da live =====
  function movimento() {
    var caos = $('#caos');
    if (!window.gsap || !window.ScrollTrigger || reduzir) {
      if (caos) caos.classList.add('caos--estatico');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // sequência: a grade da bagunça se curva em 3D, cada frase acende, o sol nasce e sobra o essencial
    if (caos) {
      var cil = $('.caos__cilindro', caos);
      var nomes = ['play-circle', 'bookmark-simple', 'fork-knife', 'calendar-x', 'hourglass-medium', 'question', 'play-circle', 'bowl-food', 'device-mobile', 'scales', 'x-circle', 'play-circle'];
      var html = '';
      for (var l = -2; l <= 2; l++) {
        for (var c = 0; c < 12; c++) {
          var n = nomes[(c * 7 + (l + 2) * 5) % nomes.length];
          html += '<i class="caos__item' + (n === 'play-circle' ? ' caos__item--video' : '') + '" style="--c:' + c + ';--l:' + l + '"><svg><use href="#i-' + n + '"/></svg></i>';
        }
      }
      cil.innerHTML = html;
      if (window.matchMedia('(max-width: 640px)').matches) cil.style.setProperty('--raio', '205px');
      var itens = $$('.caos__item', caos).sort(function () { return Math.random() - .5; });
      var lotes = [itens.slice(0, 15), itens.slice(15, 31), itens.slice(31, 47), itens.slice(47)];
      var frases = $$('.caos__frases li', caos), fase1 = $('.caos__fase--1', caos), fase2 = $('.caos__fase--2', caos);
      var essenciais = $$('.caos__essencial', caos), virada = $('.caos__virada', caos);
      var sol = $('.caos__sol', caos), fundo = $('.caos__fundo', caos), grade = $('.caos__grade', caos);
      caos.classList.add('js-animado');
      // a primeira frase e a primeira leva de ícones já chegam visíveis, pra dobra não entrar vazia
      gsap.set(itens, { autoAlpha: 0, scale: .6 });
      gsap.set(lotes[0], { autoAlpha: 1, scale: 1 });
      gsap.set(frases, { autoAlpha: 0, y: 26 });
      gsap.set(frases[0], { autoAlpha: 1, y: 0 });
      gsap.set(fase2, { autoAlpha: 1 });
      gsap.set(essenciais, { autoAlpha: 0, y: 24, scale: .7 });
      gsap.set(virada, { autoAlpha: 0, y: 16 });

      var tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: { trigger: caos, start: 'top top', end: '+=280%', pin: true, scrub: .6, anticipatePin: 1, invalidateOnRefresh: true }
      });
      // gira o cilindro pelo transform (mais leve que animar variável CSS, que recalcula os 60 ícones)
      gsap.set(cil, { rotationX: 10, rotationY: 0 });
      tl.to(cil, { rotationY: -150, duration: 6.6, ease: 'none' }, 0);
      frases.forEach(function (f, i) {
        var t = i * 1.2;
        if (i > 0) {
          tl.to(lotes[i], { autoAlpha: 1, scale: 1, duration: .5, stagger: .02 }, t - .25);
          tl.to(f, { autoAlpha: 1, y: 0, duration: .45 }, t - .15);
        }
        if (i < frases.length - 1) tl.to(f, { autoAlpha: 0, y: -26, duration: .35, ease: 'power2.in' }, t + .6);
      });
      var tSol = (frases.length - 1) * 1.2 + .9;
      tl.to(fase1, { autoAlpha: 0, y: -30, duration: .4, ease: 'power2.in' }, tSol);
      tl.to(sol, { opacity: 1, scale: 1, duration: .7, ease: 'power3.out' }, tSol);
      tl.to(grade, { autoAlpha: 0, scale: 1.3, duration: .8, ease: 'power2.in' }, tSol + .1);
      tl.to(fundo, { opacity: 1, duration: .7 }, tSol + .25);
      tl.to(sol, { scale: .62, y: -70, duration: .7, ease: 'power2.inOut' }, tSol + .75);
      tl.to(essenciais, { autoAlpha: 1, y: 0, scale: 1, duration: .5, stagger: .12, ease: 'back.out(1.7)' }, tSol + .9);
      tl.to(virada, { autoAlpha: 1, y: 0, duration: .5 }, tSol + 1.25);
      tl.to({}, { duration: .5 });
      // o essencial desce na direção do celular que vem logo abaixo (e o vão até a prévia some)
      tl.to(fase2, { y: function () { return Math.round(window.innerHeight * .26); }, duration: .8, ease: 'power2.inOut' });
      tl.to(sol, { y: function () { return Math.round(window.innerHeight * .26) - 70; }, opacity: .0, duration: .8, ease: 'power2.inOut' }, '<');
    }

    // linha do tempo da live: o traço desce com a rolagem e cada ponto acende quando chega
    var linha = $('[data-linha]');
    if (linha) {
      gsap.fromTo($('[data-linha-cheia]', linha), { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: linha, start: 'top 72%', end: 'bottom 62%', scrub: .5 } });
      $$('.linha__item', linha).forEach(function (item) {
        item.style.setProperty('--aceso', 0);
        ScrollTrigger.create({
          trigger: item, start: 'top 70%',
          onEnter: function () { item.style.setProperty('--aceso', 1); },
          onLeaveBack: function () { item.style.setProperty('--aceso', 0); }
        });
      });
    }

    // fontes e imagens mudam a altura das dobras: recalcula as posições quando tudo carregar
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  seguro('movimento', movimento);

  // ===== A legião (Three.js): baixa só quando a dobra está a ~1 tela de distância =====
  seguro('legião', function () {
    var palco = $('[data-legiao]');
    if (!palco || reduzir || !window.gsap || !('IntersectionObserver' in window)) return;
    var canvas = $('canvas', palco);
    var cena = null, ciclo = null, carregou = false, perto = false, parado = false, tAcorda = 0;
    // parado no 11/11: o dedo ou o mouse acordam os pontinhos por uns segundos
    function acordar() {
      if (!cena || !parado) return;
      cena.ligar();
      clearTimeout(tAcorda);
      tAcorda = setTimeout(function () { if (parado) cena.desligar(); }, 2500);
    }
    canvas.addEventListener('pointermove', acordar, { passive: true });
    canvas.addEventListener('pointerdown', acordar, { passive: true });
    function ligar() {
      if (!cena) return;
      // parado: desenha uns quadros pra tela voltar com o 11/11 e desliga de novo
      if (parado) { cena.ligar(); clearTimeout(tAcorda); tAcorda = setTimeout(function () { if (parado) cena.desligar(); }, 150); return; }
      cena.ligar();
      if (!ciclo) {
        var u = cena.uniforms;
        ciclo = gsap.timeline({ repeat: 1, repeatDelay: .3, onComplete: function () {
          // depois de 2 voltas, fica no 11/11 e o desenho para de rodar (o toque acorda de novo)
          gsap.timeline({ onComplete: function () { parado = true; cena.desligar(); } })
            .to(u.uMorfB, { value: 1, duration: 2.2, ease: 'power2.inOut' })
            .to(u.uMorfC, { value: 1, duration: 2.2, ease: 'power2.inOut' }, '+=1.6');
        } });
        ciclo.to(u.uMorfB, { value: 1, duration: 2.4, ease: 'power2.inOut' }, 1)
          .to(u.uMorfC, { value: 1, duration: 2.4, ease: 'power2.inOut' }, '+=2.4')
          .to([u.uMorfB, u.uMorfC], { value: 0, duration: 2.2, ease: 'power2.inOut' }, '+=2.6');
      } else if (!parado) {
        ciclo.play();
      }
    }
    function desligar() { if (cena) cena.desligar(); if (ciclo) ciclo.pause(); }
    function carregar() {
      if (carregou) return;
      carregou = true;
      var img = new Image();
      img.src = 'img/simbolo-mascara.webp';
      var imagem = img.decode ? img.decode() : new Promise(function (ok) { img.onload = ok; });
      var fonte = doc.fonts && doc.fonts.load ? doc.fonts.load('500 100px Figtree') : Promise.resolve();
      Promise.all([import('./legiao.js?v=30155986'), imagem, fonte]).then(function (r) {
        cena = r[0].iniciarLegiao({ canvas: canvas, simbolo: img, fonte: 'Figtree' });
        if (!cena) return;
        palco.classList.add('pronto');
        if (perto) ligar();
      }).catch(function () {});
    }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) carregar(); });
    }, { rootMargin: '900px 0px' }).observe(palco);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { perto = e.isIntersecting; if (perto) ligar(); else desligar(); });
    }, { threshold: .05 }).observe(palco);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) desligar(); else if (perto) ligar(); });
  });
})();
