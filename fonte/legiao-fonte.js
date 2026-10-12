// A legião: pontinhos (cada um é uma de nós) que se juntam no olho da Asfit e depois viram 11/11.
// Three.js só com o que a cena usa (o esbuild corta o resto). Carregado pela página quando a dobra chega perto.
import {
  WebGLRenderer, Scene, OrthographicCamera, BufferGeometry, BufferAttribute,
  Points, ShaderMaterial, NormalBlending, Vector2, Color
} from 'three';

const VERT = /* glsl */`
  attribute vec3 aA;
  attribute vec3 aB;
  attribute vec3 aC;
  attribute float aSemente;
  uniform float uTempo;
  uniform float uMorfB;
  uniform float uMorfC;
  uniform float uPixelRatio;
  uniform float uTamanho;
  uniform float uForca;
  uniform float uRaio;
  uniform vec2 uPonteiro;
  varying float vAlfa;

  float suave(float t) { return t * t * (3.0 - 2.0 * t); }

  void main() {
    // cada ponto sai num tempo um pouco diferente, como gente chegando
    float tB = suave(clamp(uMorfB * 1.7 - aSemente * 0.7, 0.0, 1.0));
    float tC = suave(clamp(uMorfC * 1.7 - aSemente * 0.7, 0.0, 1.0));
    vec3 p = mix(aA, aB, tB);
    p = mix(p, aC, tC);

    // espalhados, os pontos andam; formados, só respiram
    float deriva = mix(1.0, 0.16, max(tB, tC));
    p.x += sin(uTempo * (0.45 + aSemente * 0.7) + aSemente * 40.0) * 7.0 * deriva;
    p.y += cos(uTempo * (0.4 + aSemente * 0.6) + aSemente * 23.0) * 7.0 * deriva;

    // o dedo (ou o mouse) abre caminho e os pontos voltam
    vec2 d = p.xy - uPonteiro;
    float dist = length(d);
    float f = (1.0 - smoothstep(0.0, uRaio, dist)) * uForca;
    p.xy += (d / max(dist, 0.001)) * f * uRaio * 0.55;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uTamanho * uPixelRatio * (0.7 + aSemente * 0.65);
    vAlfa = 0.5 + 0.5 * fract(aSemente * 7.31);
  }
`;

const FRAG = /* glsl */`
  uniform vec3 uCor;
  varying float vAlfa;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.12, d) * vAlfa;
    if (a < 0.02) discard;
    gl_FragColor = vec4(uCor, a);
  }
`;

// Lê os pixels acesos de um desenho e devolve pontos centralizados (em px CSS)
function amostrar(desenhar, largura, altura, passo) {
  const c = document.createElement('canvas');
  c.width = largura; c.height = altura;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  desenhar(ctx, largura, altura);
  const dados = ctx.getImageData(0, 0, largura, altura).data;
  const pts = [];
  for (let y = 0; y < altura; y += passo) {
    for (let x = 0; x < largura; x += passo) {
      if (dados[(y * largura + x) * 4 + 3] > 128) pts.push(x - largura / 2, altura / 2 - y);
    }
  }
  return pts;
}

function distribuir(pts, n, jitter) {
  // n pontos tirados da amostra; se faltar, repete com um tremidinho
  const out = new Float32Array(n * 3);
  const total = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const k = total ? Math.floor(Math.random() * total) : 0;
    out[i * 3] = (pts[k * 2] || 0) + (Math.random() - 0.5) * jitter;
    out[i * 3 + 1] = (pts[k * 2 + 1] || 0) + (Math.random() - 0.5) * jitter;
    out[i * 3 + 2] = 0;
  }
  return out;
}

export function iniciarLegiao({ canvas, simbolo, fonte, cor = [0.969, 0.953, 0.91] }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const cena = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -100, 100);
  let pontos = null;
  let largura = 0, altura = 0;

  const uniforms = {
    uTempo: { value: 0 },
    uMorfB: { value: 0 },
    uMorfC: { value: 0 },
    uPixelRatio: { value: dpr },
    uTamanho: { value: 3.2 },
    uForca: { value: 0 },
    uRaio: { value: 90 },
    uPonteiro: { value: new Vector2(9999, 9999) },
    uCor: { value: new Color(cor[0], cor[1], cor[2]) }
  };

  function montar() {
    const r = canvas.getBoundingClientRect();
    largura = Math.max(1, Math.round(r.width));
    altura = Math.max(1, Math.round(r.height));
    renderer.setSize(largura, altura, false);
    camera.left = -largura / 2; camera.right = largura / 2;
    camera.top = altura / 2; camera.bottom = -altura / 2;
    camera.updateProjectionMatrix();

    const celular = largura < 640;
    const n = celular ? 1900 : 3000;
    uniforms.uTamanho.value = celular ? 2.6 : 3.2;
    uniforms.uRaio.value = celular ? 70 : 100;
    const passo = celular ? 3 : 3;

    // A: a multidão espalhada pela faixa inteira
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = (Math.random() - 0.5) * largura * 1.05;
      a[i * 3 + 1] = (Math.random() - 0.5) * altura * 1.05;
      a[i * 3 + 2] = 0;
    }

    // B: o símbolo da Asfit (olho com o brilho)
    const largSimbolo = Math.min(largura * 0.82, 560);
    const altSimbolo = largSimbolo * (simbolo.naturalHeight / simbolo.naturalWidth);
    const ptsB = amostrar((ctx, w, h) => {
      ctx.drawImage(simbolo, (w - largSimbolo) / 2, (h - altSimbolo) / 2, largSimbolo, altSimbolo);
    }, largura, altura, passo);

    // C: 11/11, na Figtree da página
    const corpo = Math.min(largura * 0.3, altura * 0.62, 240);
    const ptsC = amostrar((ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.font = `500 ${corpo}px ${fonte}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('11/11', w / 2, h / 2 + corpo * 0.04);
    }, largura, altura, passo);

    const sementes = new Float32Array(n);
    for (let i = 0; i < n; i++) sementes[i] = Math.random();

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(a, 3));
    geo.setAttribute('aA', new BufferAttribute(a, 3));
    geo.setAttribute('aB', new BufferAttribute(distribuir(ptsB, n, 1.2), 3));
    geo.setAttribute('aC', new BufferAttribute(distribuir(ptsC, n, 1.2), 3));
    geo.setAttribute('aSemente', new BufferAttribute(sementes, 1));

    if (pontos) { pontos.geometry.dispose(); cena.remove(pontos); }
    const mat = pontos ? pontos.material : new ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthTest: false, depthWrite: false, blending: NormalBlending
    });
    pontos = new Points(geo, mat);
    pontos.frustumCulled = false;
    cena.add(pontos);
  }

  montar();

  // Ponteiro em coordenadas da cena; a força sobe e desce devagar
  let alvoForca = 0;
  function mover(e) {
    const r = canvas.getBoundingClientRect();
    uniforms.uPonteiro.value.x = e.clientX - r.left - r.width / 2;
    uniforms.uPonteiro.value.y = r.height / 2 - (e.clientY - r.top);
    alvoForca = 1;
  }
  function sair() { alvoForca = 0; }
  canvas.addEventListener('pointermove', mover, { passive: true });
  canvas.addEventListener('pointerdown', mover, { passive: true });
  canvas.addEventListener('pointerleave', sair, { passive: true });
  canvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') sair(); }, { passive: true });
  canvas.addEventListener('pointercancel', sair, { passive: true });

  let rodando = false;
  let ultimo = 0;
  let raf = 0;
  function quadro(t) {
    raf = requestAnimationFrame(quadro);
    const dt = Math.min(0.05, (t - (ultimo || t)) / 1000);
    ultimo = t;
    uniforms.uTempo.value += dt;
    uniforms.uForca.value += (alvoForca - uniforms.uForca.value) * Math.min(1, dt * 6);
    renderer.render(cena, camera);
  }

  let timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const r = canvas.getBoundingClientRect();
      if (Math.round(r.width) !== largura || Math.abs(Math.round(r.height) - altura) > 80) montar();
    }, 200);
  });

  return {
    uniforms,
    ligar() { if (!rodando) { rodando = true; ultimo = 0; raf = requestAnimationFrame(quadro); } },
    desligar() { rodando = false; cancelAnimationFrame(raf); }
  };
}
