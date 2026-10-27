/**
 * Interface do Caixa da Empresa.
 *
 * As contas nao estao aqui: estao em assets/nucleo.js, que e puro e testado.
 * Este arquivo cuida de guardar o estado, desenhar as telas e ouvir os cliques.
 *
 * Onde os dados ficam: localStorage deste navegador, na chave CHAVE abaixo.
 * Nao existe servidor. Por isso o aviso de backup e insistente de proposito.
 */

const N = window.Nucleo;
const CHAVE = 'caixa-empresa:v1';

/* ========================================================== ATALHOS ===== */

const $ = (sel, raiz) => (raiz || document).querySelector(sel);
const $$ = (sel, raiz) => Array.prototype.slice.call((raiz || document).querySelectorAll(sel));

/** Escapa texto que vai para dentro de HTML. */
function esc(txt) {
  return String(txt === null || txt === undefined ? '' : txt)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let tempoToast = null;
function toast(msg, erro) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'visivel' + (erro ? ' erro' : '');
  clearTimeout(tempoToast);
  tempoToast = setTimeout(() => (t.className = ''), erro ? 5200 : 2800);
}

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const dinheiro = (c, o) => N.formatarBRL(c, o);

/** Coluna de valor com cor por sinal. */
function valorColorido(centavos, tipo) {
  if (tipo === 'transferencia') return '<span class="fraco">' + esc(dinheiro(centavos)) + '</span>';
  const cor = tipo === 'entrada' ? 'verde' : 'vermelho';
  const sinal = tipo === 'entrada' ? '+' : '−';
  return '<span class="' + cor + '">' + sinal + ' ' + esc(dinheiro(centavos)) + '</span>';
}

/* ====================================================== ESTADO PADRAO === */

const CATEGORIAS_PADRAO = [
  { id: 'venda-ml', nome: 'Venda marketplace A', tipo: 'entrada' },
  { id: 'venda-shopee', nome: 'Venda marketplace B', tipo: 'entrada' },
  { id: 'venda-outros', nome: 'Venda outros canais', tipo: 'entrada' },
  { id: 'aporte', nome: 'Aporte do sócio', tipo: 'entrada' },
  { id: 'outra-entrada', nome: 'Outra entrada', tipo: 'entrada' },

  { id: 'estoque', nome: 'Estoque (reposição)', tipo: 'saida', envelope: 'estoque' },
  { id: 'produto-novo', nome: 'Produto novo (teste)', tipo: 'saida', envelope: 'novos' },
  { id: 'insumos', nome: 'Insumos e embalagem', tipo: 'saida', envelope: 'insumos' },
  { id: 'frete', nome: 'Frete e envio', tipo: 'saida', envelope: 'insumos' },
  { id: 'ads', nome: 'Anúncios / mídia paga', tipo: 'saida', envelope: 'marketing' },
  { id: 'investimento', nome: 'Investimento próprio', tipo: 'saida', envelope: 'investimentos' },
  { id: 'imposto', nome: 'Imposto', tipo: 'saida', obrigatoria: true },
  { id: 'prolabore', nome: 'Pró-labore', tipo: 'saida', obrigatoria: true },
  { id: 'contador', nome: 'Contador', tipo: 'saida', obrigatoria: true },
  { id: 'software', nome: 'Software e assinaturas', tipo: 'saida', obrigatoria: true },
  { id: 'tarifas', nome: 'Tarifas bancárias', tipo: 'saida', obrigatoria: true },
  { id: 'devolucao', nome: 'Devolução / estorno', tipo: 'saida', obrigatoria: true },
  { id: 'pessoal', nome: 'Gasto pessoal (vazamento)', tipo: 'saida', obrigatoria: true },
  { id: 'outra-saida', nome: 'Outra saída', tipo: 'saida' },
];

const ENVELOPES_PADRAO = [
  { id: 'reserva', nome: 'Reserva de emergência', pct: 20, cor: 'var(--azul)' },
  { id: 'estoque', nome: 'Estoque (profundidade)', pct: 35, cor: 'var(--verde)' },
  { id: 'novos', nome: 'Produtos novos', pct: 15, cor: 'var(--roxo)' },
  { id: 'insumos', nome: 'Insumos', pct: 10, cor: 'var(--ciano)' },
  { id: 'marketing', nome: 'Mídia paga', pct: 10, cor: 'var(--rosa)' },
  { id: 'investimentos', nome: 'Investimentos próprios', pct: 10, cor: 'var(--amarelo)' },
];

const REGRAS_PADRAO = [
  { id: 'r1', contem: 'cdb', tipo: 'transferencia' },
  { id: 'r2', contem: 'aplicacao', tipo: 'transferencia' },
  { id: 'r3', contem: 'resgate', tipo: 'transferencia' },
  { id: 'r4', contem: 'simples nacional', tipo: 'saida', categoria: 'imposto' },
  { id: 'r5', contem: 'das ', tipo: 'saida', categoria: 'imposto' },
  { id: 'r6', contem: 'pro-labore', tipo: 'saida', categoria: 'prolabore' },
  { id: 'r7', contem: 'correios', tipo: 'saida', categoria: 'frete' },
];

function estadoPadrao() {
  return {
    versao: 1,
    carteiras: [],
    lancamentos: [],
    recorrentes: [],
    categorias: CATEGORIAS_PADRAO.map((c) => Object.assign({}, c)),
    regras: REGRAS_PADRAO.map((r) => Object.assign({}, r)),
    orcamento: { modo: 'auto', base: 0, envelopes: ENVELOPES_PADRAO.map((e) => Object.assign({}, e)) },
    reserva: { metaMeses: 3 },
    premissas: {
      entradaDiaria: 0,
      usarEntradaDiaria: true,
      recompraMensal: 0,
      diaRecompra: 10,
      colchao: 0,
      custoFixoMensal: null,
    },
    horizonte: 90,
    tema: 'escuro',
    salvoEm: null,
    backupEm: null,
  };
}

let estado = estadoPadrao();

// o que esta na tela agora (nao e salvo)
const vista = {
  cenario: { vendas: 0, atrasoLiberacao: 0 },
  mesesRelatorio: 6,
  editando: null,
  editandoBoleto: null,
  filtros: { mes: '', tipo: '', categoria: '', carteira: '', busca: '' },
  boletos: { quando: 'este', status: '', busca: '' },
  importacao: null,
};

/* ====================================================== PERSISTENCIA ==== */

function carregar() {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return;
    const dados = JSON.parse(cru);
    estado = Object.assign(estadoPadrao(), dados);
    estado.premissas = Object.assign(estadoPadrao().premissas, dados.premissas || {});
    estado.orcamento = Object.assign(estadoPadrao().orcamento, dados.orcamento || {});
    estado.reserva = Object.assign({ metaMeses: 3 }, dados.reserva || {});
    if (!estado.categorias || !estado.categorias.length) estado.categorias = CATEGORIAS_PADRAO.map((c) => Object.assign({}, c));
    if (!estado.orcamento.envelopes || !estado.orcamento.envelopes.length) estado.orcamento.envelopes = ENVELOPES_PADRAO.map((e) => Object.assign({}, e));
  } catch (erro) {
    toast('Não consegui ler os dados salvos. Comecei do zero — se você tem backup, restaure em Ajustes.', true);
  }
}

function salvar() {
  estado.salvoEm = new Date().toISOString();
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch (erro) {
    toast('Não consegui salvar (armazenamento cheio ou bloqueado). Baixe um backup agora.', true);
  }
  pintarSeloSalvo();
}

function pintarSeloSalvo() {
  const selo = $('#selo-salvo');
  const seloBackup = $('#selo-backup');
  const dias = estado.backupEm ? N.diasEntre(estado.backupEm.slice(0, 10), N.hojeIso()) : null;

  if (dias === null) {
    selo.className = 'selo amarelo so-desktop';
    selo.textContent = 'sem backup';
  } else if (dias >= 7) {
    selo.className = 'selo amarelo so-desktop';
    selo.textContent = 'backup há ' + dias + 'd';
  } else {
    selo.className = 'selo verde so-desktop';
    selo.textContent = dias === 0 ? 'backup hoje' : 'backup há ' + dias + 'd';
  }

  if (seloBackup) {
    seloBackup.className = 'selo ' + (dias === null || dias >= 7 ? 'amarelo' : 'verde');
    seloBackup.textContent =
      (dias === null ? 'nunca baixou backup' : dias === 0 ? 'último backup: hoje' : 'último backup: há ' + dias + ' dias') +
      ' · ' +
      estado.lancamentos.length +
      ' lançamentos';
  }
}

/* ========================================================= DERIVADOS ==== */

function categoria(id) {
  return estado.categorias.find((c) => c.id === id) || null;
}

function nomeCategoria(id) {
  const c = categoria(id);
  return c ? c.nome : id ? id : '—';
}

function carteira(id) {
  return estado.carteiras.find((c) => c.id === id) || null;
}

function nomeCarteira(id) {
  const c = carteira(id);
  return c ? c.nome : id ? id : '—';
}

/** Custo fixo mensal: o que o usuario digitou, ou a soma das contas fixas. */
function custoFixoMensal() {
  if (estado.premissas.custoFixoMensal) return estado.premissas.custoFixoMensal;
  return estado.recorrentes
    .filter((r) => r.ativo !== false && (r.tipo || 'saida') === 'saida')
    .reduce((s, r) => s + (r.valor || 0), 0);
}

/** Piso que a projecao nao deve furar: reserva guardada + colchao. */
function piso() {
  return N.somarCarteiras(estado.carteiras, estado.lancamentos).reserva + (estado.premissas.colchao || 0);
}

function projecao(horizonte) {
  return N.projetar({
    carteiras: estado.carteiras,
    lancamentos: estado.lancamentos,
    recorrentes: estado.recorrentes,
    premissas: estado.premissas,
    cenario: vista.cenario,
    horizonte: horizonte || estado.horizonte,
    hoje: N.hojeIso(),
    piso: piso(),
  });
}

/** Gasto do mes por envelope. Transferencia para carteira de reserva conta como
 *  "gasto" do envelope reserva — e exatamente isso que o envelope quer medir. */
function gastoPorEnvelope(mes) {
  const porEnvelope = {};
  estado.lancamentos.forEach((l) => {
    if (N.mesDe(l.data) !== mes || l.status !== 'realizado') return;
    if (l.tipo === 'transferencia') {
      const destino = carteira(l.carteiraDestino);
      if (destino && destino.reserva) porEnvelope.reserva = (porEnvelope.reserva || 0) + (l.valor || 0);
      return;
    }
    if (l.tipo !== 'saida') return;
    const cat = categoria(l.categoria);
    if (!cat || !cat.envelope) return;
    porEnvelope[cat.envelope] = (porEnvelope[cat.envelope] || 0) + (l.valor || 0);
  });
  return porEnvelope;
}

/**
 * Base do orcamento: entradas do mes menos tudo que e obrigatorio pagar.
 *
 * As contas fixas obrigatorias do mes contam SEMPRE, tenham sido pagas ou nao —
 * sobra nao e sobra enquanto o imposto e o pro-labore do mes nao estiverem
 * descontados. Para nao contar duas vezes, a saida realizada de uma categoria
 * que ja tem conta fixa no mes e ignorada: ela e o pagamento daquela conta.
 *
 * Conta fixa que TEM envelope (mídia paga, por exemplo) NAO sai da base: ela e
 * gasta de dentro do envelope dela. Tirar das duas pontas descontaria duas vezes.
 */
function baseDoMes(mes) {
  // Aqui a conta fixa do mes conta SEMPRE, com ou sem boleto vinculado: o que
  // o orcamento quer saber e quanto o mes deve, nao como a conta foi guardada.
  // O pagamento dela nao e somado de novo porque a categoria entra em
  // `categoriasFixas` logo abaixo.
  const fixas = N.expandirRecorrentes(estado.recorrentes, mes + '-01', N.diaDoMes(mes, 31)).filter((r) => {
    if (r.tipo !== 'saida') return false;
    const cat = categoria(r.categoria);
    return !cat || cat.obrigatoria || !cat.envelope;
  });
  const categoriasFixas = {};
  fixas.forEach((f) => {
    if (f.categoria) categoriasFixas[f.categoria] = true;
  });
  const totalFixas = fixas.reduce((s, f) => s + (f.valor || 0), 0);

  let entradas = 0;
  let avulsas = 0;
  estado.lancamentos.forEach((l) => {
    if (N.mesDe(l.data) !== mes || l.status !== 'realizado') return;
    if (l.tipo === 'entrada') entradas += l.valor || 0;
    else if (l.tipo === 'saida') {
      const cat = categoria(l.categoria);
      if (cat && cat.obrigatoria && !categoriasFixas[l.categoria]) avulsas += l.valor || 0;
    }
  });

  const obrigatorias = totalFixas + avulsas;
  return {
    entradas: entradas,
    fixas: totalFixas,
    avulsas: avulsas,
    obrigatorias: obrigatorias,
    base: Math.max(0, entradas - obrigatorias),
  };
}

function orcamentoAtual() {
  const mes = N.mesDe(N.hojeIso());
  const calc = baseDoMes(mes);
  const base = estado.orcamento.modo === 'manual' ? estado.orcamento.base || 0 : calc.base;
  return {
    mes: mes,
    detalhe: calc,
    resultado: N.calcularOrcamento({ base: base, envelopes: estado.orcamento.envelopes }, gastoPorEnvelope(mes)),
  };
}

function reservaAtual() {
  return N.calcularReserva(estado.reserva, custoFixoMensal(), N.somarCarteiras(estado.carteiras, estado.lancamentos).reserva);
}

/* ========================================================= GRAFICOS ==== */

/** Linha do saldo projetado, com piso, zero e o menor ponto marcado. */
function graficoProjecao(proj) {
  const L = 760;
  const A = 250;
  const m = { e: 56, d: 12, t: 14, b: 26 };
  const dias = proj.dias;
  if (!dias.length) return '<p class="vazio">Sem dados para projetar.</p>';

  const valores = dias.map((d) => d.saldo).concat([proj.piso, 0]);
  let max = Math.max.apply(null, valores);
  let min = Math.min.apply(null, valores);
  if (max === min) { max += 10000; min -= 10000; }
  const folga = (max - min) * 0.08;
  max += folga;
  min -= folga;

  const x = (i) => m.e + (i * (L - m.e - m.d)) / Math.max(1, dias.length - 1);
  const y = (v) => m.t + ((max - v) * (A - m.t - m.b)) / (max - min);

  const linha = dias.map((d, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(d.saldo).toFixed(1)).join(' ');
  const area = linha + ' L' + x(dias.length - 1).toFixed(1) + ' ' + y(Math.max(min, 0)).toFixed(1) + ' L' + x(0).toFixed(1) + ' ' + y(Math.max(min, 0)).toFixed(1) + ' Z';

  // 4 marcas no eixo vertical
  let eixoY = '';
  for (let k = 0; k <= 4; k++) {
    const v = min + ((max - min) * k) / 4;
    const yy = y(v).toFixed(1);
    eixoY +=
      '<line class="grade-linha" x1="' + m.e + '" y1="' + yy + '" x2="' + (L - m.d) + '" y2="' + yy + '"/>' +
      '<text x="' + (m.e - 7) + '" y="' + (+yy + 3.5) + '" text-anchor="end">' + esc(N.moedaCurta(v)) + '</text>';
  }

  // datas: inicio, meio e fim
  let eixoX = '';
  [0, Math.floor(dias.length / 3), Math.floor((2 * dias.length) / 3), dias.length - 1].forEach((i) => {
    eixoX +=
      '<text x="' + x(i).toFixed(1) + '" y="' + (A - 8) + '" text-anchor="middle">' +
      esc(N.formatarData(dias[i].data, { curta: true })) + '</text>';
  });

  const iMenor = dias.findIndex((d) => d.data === proj.dataMenorSaldo);
  const yPiso = y(proj.piso).toFixed(1);
  const yZero = y(0).toFixed(1);

  return (
    '<svg class="grafico" viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="Projeção do saldo disponível dia a dia">' +
    '<defs><linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="var(--verde)" stop-opacity="0.28"/>' +
    '<stop offset="100%" stop-color="var(--verde)" stop-opacity="0.02"/>' +
    '</linearGradient></defs>' +
    eixoY +
    (0 >= min && 0 <= max ? '<line class="linha-zero" x1="' + m.e + '" y1="' + yZero + '" x2="' + (L - m.d) + '" y2="' + yZero + '"/>' : '') +
    (proj.piso > 0 ? '<line class="linha-piso" x1="' + m.e + '" y1="' + yPiso + '" x2="' + (L - m.d) + '" y2="' + yPiso + '"/>' : '') +
    '<path class="area-saldo" d="' + area + '"/>' +
    '<path class="linha-saldo" d="' + linha + '"/>' +
    (iMenor >= 0 ? '<circle class="ponto-menor" cx="' + x(iMenor).toFixed(1) + '" cy="' + y(proj.menorSaldo).toFixed(1) + '" r="4.5"/>' : '') +
    eixoX +
    '</svg>'
  );
}

/** Barras de entradas, saidas e sobra por mes. */
function graficoMensal(serie) {
  const L = 760;
  const A = 240;
  const m = { e: 56, d: 12, t: 14, b: 32 };
  if (!serie.length) return '<p class="vazio">Sem lançamentos para somar.</p>';

  const todos = [];
  serie.forEach((s) => todos.push(s.entradas, s.saidas, s.resultado, 0));
  let max = Math.max.apply(null, todos);
  let min = Math.min.apply(null, todos);
  if (max === min) max += 10000;
  const folga = (max - min) * 0.1;
  max += folga;
  if (min < 0) min -= folga;

  const faixa = (L - m.e - m.d) / serie.length;
  const larg = Math.min(26, (faixa - 14) / 3);
  const y = (v) => m.t + ((max - v) * (A - m.t - m.b)) / (max - min);
  const y0 = y(0);

  let eixoY = '';
  for (let k = 0; k <= 4; k++) {
    const v = min + ((max - min) * k) / 4;
    const yy = y(v).toFixed(1);
    eixoY +=
      '<line class="grade-linha" x1="' + m.e + '" y1="' + yy + '" x2="' + (L - m.d) + '" y2="' + yy + '"/>' +
      '<text x="' + (m.e - 7) + '" y="' + (+yy + 3.5) + '" text-anchor="end">' + esc(N.moedaCurta(v)) + '</text>';
  }

  let barras = '';
  serie.forEach((s, i) => {
    const centro = m.e + faixa * i + faixa / 2;
    const trio = [
      { v: s.entradas, cls: 'barra-e', dx: -larg - 2 },
      { v: s.saidas, cls: 'barra-s', dx: 0 },
      { v: s.resultado, cls: 'barra-r', dx: larg + 2 },
    ];
    trio.forEach((b) => {
      const topo = Math.min(y(b.v), y0);
      const alt = Math.max(1.5, Math.abs(y(b.v) - y0));
      barras +=
        '<rect class="' + b.cls + '" x="' + (centro + b.dx - larg / 2).toFixed(1) + '" y="' + topo.toFixed(1) +
        '" width="' + larg.toFixed(1) + '" height="' + alt.toFixed(1) + '" rx="2"><title>' +
        esc(N.formatarMes(s.mes) + ': ' + dinheiro(b.v)) + '</title></rect>';
    });
    barras += '<text x="' + centro.toFixed(1) + '" y="' + (A - 10) + '" text-anchor="middle">' + esc(N.formatarMes(s.mes)) + '</text>';
  });

  return (
    '<svg class="grafico" viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="Entradas, saídas e sobra de caixa por mês">' +
    eixoY +
    '<line class="eixo" x1="' + m.e + '" y1="' + y0.toFixed(1) + '" x2="' + (L - m.d) + '" y2="' + y0.toFixed(1) + '"/>' +
    barras +
    '</svg>'
  );
}

/* ====================================================== TELA: PAINEL ==== */

function pintarPainel() {
  const soma = N.somarCarteiras(estado.carteiras, estado.lancamentos);
  const proj = projecao();
  const mes = N.mesDe(N.hojeIso());
  const fechado = N.fecharMes(estado.lancamentos, mes);
  const cf = custoFixoMensal();
  const runway = N.calcularRunway(soma.total, cf);

  // KPIs
  const emAberto = N.resumoBoletos(boletosDe().filter((b) => b.status !== 'realizado'), N.hojeIso());

  const kpis = [
    { rotulo: 'Caixa total da empresa', valor: dinheiro(soma.total), nota: 'disponível + a liberar, todas as carteiras', destaque: true, luz: 'ciano' },
    { rotulo: 'Disponível hoje', valor: dinheiro(soma.disponivel), nota: 'dá para gastar agora', luz: 'azul' },
    { rotulo: 'A liberar', valor: dinheiro(soma.aLiberar), nota: 'venda feita que o marketplace ainda não soltou', luz: 'roxo' },
    {
      rotulo: 'Menor saldo em ' + proj.horizonte + 'd',
      valor: dinheiro(proj.menorSaldo),
      nota: 'no dia ' + N.formatarData(proj.dataMenorSaldo),
      cor: proj.menorSaldo < 0 ? 'vermelho' : proj.menorSaldo < piso() ? 'amarelo' : 'verde',
      luz: proj.menorSaldo < 0 ? 'vermelho' : proj.menorSaldo < piso() ? 'amarelo' : 'verde',
    },
    {
      rotulo: 'Boletos em aberto',
      valor: dinheiro(emAberto.aberto),
      nota: emAberto.vencido ? dinheiro(emAberto.vencido) + ' já venceu' : emAberto.quantidade + ' contas guardadas',
      cor: emAberto.vencido ? 'vermelho' : '',
      luz: emAberto.vencido ? 'vermelho' : 'laranja',
    },
    {
      rotulo: 'Sobra de caixa do mês',
      valor: dinheiro(fechado.resultado, { comMais: true }),
      nota: 'não é lucro — é caixa',
      cor: fechado.resultado >= 0 ? 'verde' : 'vermelho',
      luz: fechado.resultado >= 0 ? 'verde' : 'vermelho',
    },
    {
      rotulo: 'Sobrevive sem vender',
      valor: runway === null ? '—' : runway.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' meses',
      nota: cf ? 'custo fixo de ' + dinheiro(cf) + '/mês' : 'cadastre as contas fixas',
      cor: runway === null ? '' : runway < 1 ? 'vermelho' : runway < 3 ? 'amarelo' : 'verde',
      luz: runway === null ? 'azul' : runway < 1 ? 'vermelho' : runway < 3 ? 'amarelo' : 'verde',
    },
  ];

  $('#kpis').innerHTML = kpis
    .map(
      (k) =>
        '<div class="kpi' + (k.destaque ? ' destaque' : '') + '" data-luz="' + (k.luz || 'azul') + '">' +
        '<div class="kpi-rotulo">' + esc(k.rotulo) + '</div>' +
        '<div class="kpi-valor ' + (k.cor || '') + '">' + esc(k.valor) + '</div>' +
        '<div class="kpi-nota">' + esc(k.nota) + '</div></div>'
    )
    .join('');

  pintarAlertas(soma, proj, fechado, runway);

  // grafico + nota
  $('#grafico-projecao').innerHTML = graficoProjecao(proj);
  $$('#pilulas-horizonte .pilula').forEach((b) => b.classList.toggle('ativa', +b.dataset.horizonte === estado.horizonte));

  const notas = [];
  if (!estado.premissas.recompraMensal) notas.push('<b>Atenção:</b> não há recompra de estoque nas premissas, então a curva sobe como se o dinheiro ficasse parado. Ajuste em Ajustes → Premissas.');
  if (estado.premissas.usarEntradaDiaria && estado.premissas.entradaDiaria) notas.push('Depois de ' + N.formatarData(N.somarDias(N.hojeIso(), 1)) + ', a curva usa a premissa de ' + dinheiro(estado.premissas.entradaDiaria) + '/dia de venda nova.');
  notas.push('Piso de segurança: ' + dinheiro(piso()) + ' (reserva guardada + colchão).');
  $('#nota-projecao').innerHTML = notas.join(' ');

  // cenario
  pintarCenario(proj);

  // resumo do mes
  $('#selo-mes').textContent = N.formatarMes(mes) + ' · ' + fechado.quantidade + ' lançamentos';
  const linhasMes = [
    ['Entradas', fechado.entradas, 'verde'],
    ['Saídas', fechado.saidas, 'vermelho'],
    ['Sobra de caixa', fechado.resultado, fechado.resultado >= 0 ? 'verde' : 'vermelho'],
    ['Transferências (não contam)', fechado.transferencias, 'fraco'],
    ['Gasto pessoal pela empresa', fechado.pessoais, fechado.pessoais > 0 ? 'amarelo' : 'fraco'],
  ];
  $('#resumo-mes').innerHTML =
    '<table><tbody>' +
    linhasMes
      .map((l) => '<tr><td>' + esc(l[0]) + '</td><td class="dir ' + l[2] + '">' + esc(dinheiro(l[1])) + '</td></tr>')
      .join('') +
    '</tbody></table>';

  // carteiras
  $('#tabela-carteiras-resumo').innerHTML = estado.carteiras.length
    ? '<table><thead><tr><th>Carteira</th><th class="dir">Disponível</th><th class="dir">A liberar</th><th class="dir">Total</th></tr></thead><tbody>' +
      estado.carteiras
        .map(
          (c) =>
            '<tr><td>' + esc(c.nome) + (c.reserva ? ' <span class="selo azul">reserva</span>' : '') + '</td>' +
            '<td class="dir">' + esc(dinheiro(N.saldoDaCarteira(c, estado.lancamentos))) + '</td>' +
            '<td class="dir fraco">' + esc(dinheiro(c.aLiberar)) + '</td>' +
            '<td class="dir"><b>' + esc(dinheiro(N.saldoDaCarteira(c, estado.lancamentos) + (c.aLiberar || 0))) + '</b></td></tr>'
        )
        .join('') +
      '</tbody><tfoot><tr><td>Total</td><td class="dir">' + esc(dinheiro(soma.disponivel)) + '</td><td class="dir">' +
      esc(dinheiro(soma.aLiberar)) + '</td><td class="dir">' + esc(dinheiro(soma.total)) + '</td></tr></tfoot></table>'
    : '<p class="vazio">Nenhuma carteira cadastrada. Comece em <b>Ajustes → Carteiras</b>.</p>';

  // proximos 30 dias
  const hoje = N.hojeIso();
  const fim = N.somarDias(hoje, 30);
  const proximos = estado.lancamentos
    .filter((l) => l.status !== 'realizado' && l.data >= hoje && l.data <= fim)
    .concat(N.expandirRecorrentes(estado.recorrentes, hoje, fim, estado.lancamentos))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

  const aPagar = proximos.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0);
  const aReceber = proximos.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
  $('#selo-proximos').textContent = 'a pagar ' + dinheiro(aPagar) + ' · a receber ' + dinheiro(aReceber);

  $('#tabela-proximos').innerHTML = proximos.length
    ? '<div class="rolagem"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="dir">Valor</th><th>Origem</th></tr></thead><tbody>' +
      proximos
        .map(
          (l) =>
            '<tr><td class="num">' + esc(N.formatarData(l.data)) + '</td>' +
            '<td>' + esc(l.descricao) + '</td>' +
            '<td class="fraco">' + esc(nomeCategoria(l.categoria)) + '</td>' +
            '<td class="dir">' + valorColorido(l.valor, l.tipo) + '</td>' +
            '<td>' + (l.recorrente ? '<span class="selo">conta fixa</span>' : '<span class="selo azul">marcado</span>') + '</td></tr>'
        )
        .join('') +
      '</tbody></table></div>'
    : '<p class="vazio">Nada marcado para os próximos 30 dias.</p>';
}

function pintarAlertas(soma, proj, fechado, runway) {
  const avisos = [];
  const p = piso();

  if (!estado.carteiras.length) {
    avisos.push(['info', '◆', 'Comece por aqui: cadastre suas carteiras em <b>Ajustes → Carteiras</b> e as contas fixas em <b>Agenda</b>. Sem isso o painel não tem o que projetar. Se quiser ver o app funcionando antes, use <b>Ajustes → Carregar dados de exemplo</b>.']);
  }
  if (proj.negativa) {
    avisos.push(['ruim', '▲', 'O caixa fica <b>negativo</b> em ' + N.formatarData(proj.dataMenorSaldo) + ' (' + dinheiro(proj.menorSaldo) + '). Antecipe recebimento, segure compra ou renegocie prazo — nessa ordem.']);
  } else if (proj.furaPiso) {
    avisos.push(['atencao', '▲', 'Em ' + N.formatarData(proj.dataFuraPiso) + ' o saldo encosta no piso de segurança (' + dinheiro(p) + '). Dá para pagar as contas, mas sem folga para imprevisto.']);
  }
  if (fechado.pessoais > 0) {
    avisos.push(['atencao', '◉', 'Este mês já saíram <b>' + dinheiro(fechado.pessoais) + '</b> de gasto pessoal pela conta da empresa' + (fechado.pctPessoal ? ' (' + N.pct(fechado.pctPessoal) + ' das saídas)' : '') + '. Isso não é pró-labore: é mistura, e ela some do radar justamente por ser pequena cada vez.']);
  }
  const boletosAbertos = N.resumoBoletos(boletosDe().filter((b) => b.status !== 'realizado'), N.hojeIso());
  if (boletosAbertos.vencido > 0) {
    avisos.push(['ruim', '▲', '<b>' + dinheiro(boletosAbertos.vencido) + '</b> em boletos já venceu' + (boletosAbertos.quantidadeVencida > 1 ? ' (' + boletosAbertos.quantidadeVencida + ' contas)' : '') + '. Juros correm todo dia — veja na aba <b>Boletos</b>.']);
  } else if (boletosAbertos.venceHoje > 0) {
    avisos.push(['atencao', '◉', '<b>' + dinheiro(boletosAbertos.venceHoje) + '</b> em boletos vence <b>hoje</b>.']);
  }

  const res = reservaAtual();
  if (res.meta > 0 && !res.completa) {
    avisos.push(['info', '◇', 'Reserva de emergência em <b>' + N.pct(res.progresso, 0) + '</b> da meta (faltam ' + dinheiro(res.falta) + ' para cobrir ' + res.metaMeses + ' meses de custo fixo).']);
  }
  if (runway !== null && runway < 1) {
    avisos.push(['ruim', '▲', 'O caixa total cobre menos de <b>1 mês</b> de custo fixo. Qualquer atraso de repasse vira aperto imediato.']);
  }
  if (!estado.lancamentos.length && estado.carteiras.length) {
    avisos.push(['info', '◆', 'Sem lançamentos ainda. O caminho mais rápido é <b>Importar</b> o CSV do extrato em vez de digitar.']);
  }

  $('#alertas').innerHTML = avisos
    .map((a) => '<div class="aviso ' + a[0] + '"><span class="aviso-icone">' + a[1] + '</span><div>' + a[2] + '</div></div>')
    .join('');
}

function pintarCenario(proj) {
  $('#rot-vendas').textContent = (vista.cenario.vendas * 100).toFixed(0) + '%';
  $('#rot-atraso').textContent = vista.cenario.atrasoLiberacao + ' dias';

  if (!vista.cenario.vendas && !vista.cenario.atrasoLiberacao) {
    $('#resumo-cenario').innerHTML = '<p class="ajuda">Cenário normal: nada alterado.</p>';
    return;
  }
  const base = N.projetar({
    carteiras: estado.carteiras,
    lancamentos: estado.lancamentos,
    recorrentes: estado.recorrentes,
    premissas: estado.premissas,
    horizonte: estado.horizonte,
    hoje: N.hojeIso(),
    piso: piso(),
  });
  const difMenor = proj.menorSaldo - base.menorSaldo;
  const classe = proj.negativa ? 'ruim' : proj.furaPiso ? 'atencao' : 'bom';
  $('#resumo-cenario').innerHTML =
    '<div class="aviso ' + classe + '"><span class="aviso-icone">◈</span><div>' +
    'Nesse cenário o menor saldo vira <b>' + esc(dinheiro(proj.menorSaldo)) + '</b> em ' + esc(N.formatarData(proj.dataMenorSaldo)) +
    ' — ' + esc(dinheiro(Math.abs(difMenor))) + (difMenor < 0 ? ' pior' : ' melhor') + ' que o normal.' +
    (proj.negativa ? ' <b>O caixa não aguenta.</b>' : proj.furaPiso ? ' Fura o piso de segurança.' : ' Ainda aguenta.') +
    '</div></div>';
}

/* ==================================================== TELA: BOLETOS ===== */

/**
 * Boleto e um lancamento como qualquer outro — marcado com `boleto: true` e com
 * `vencimento` proprio. E de proposito: assim ele ja entra na projecao de caixa
 * e no fechamento do mes, sem lista paralela que vive fora das contas.
 *
 * Enquanto esta em aberto, `data` = vencimento (e nesse dia que o caixa sente).
 * Quando e pago, `data` passa a ser o dia do pagamento e o vencimento fica
 * guardado — e assim que se enxerga quem foi pago atrasado.
 */
function boletosDe() {
  return estado.lancamentos.filter((l) => l.boleto);
}

const CORES_SITUACAO = { pago: 'verde', vencido: 'vermelho', hoje: 'laranja', perto: 'amarelo', aberto: 'azul' };
const ROTULOS_SITUACAO = { pago: 'pago', vencido: 'venceu', hoje: 'vence hoje', perto: 'vence já', aberto: 'a pagar' };

function janelaBoletos() {
  const hoje = N.hojeIso();
  const mesAtual = N.mesDe(hoje);
  const proximo = N.mesDe(N.somarMeses(hoje, 1));
  if (vista.boletos.quando === 'este') return { mes: mesAtual, titulo: N.formatarMes(mesAtual) };
  if (vista.boletos.quando === 'proximo') return { mes: proximo, titulo: N.formatarMes(proximo) };
  if (vista.boletos.quando === 'vencidos') return { vencidos: true, titulo: 'atrasados' };
  return { todos: true, titulo: 'todos' };
}

function filtrarBoletos() {
  const hoje = N.hojeIso();
  const j = janelaBoletos();
  const busca = (vista.boletos.busca || '').trim().toLowerCase();
  const mesAtual = N.mesDe(hoje);

  return boletosDe()
    .filter((b) => {
      const mesVenc = N.mesDe(b.vencimento || b.data);
      if (j.vencidos) return N.situacaoBoleto(b, hoje) === 'vencido';
      if (!j.mes) return true;
      if (mesVenc === j.mes) return true;
      // O que venceu e nao foi pago continua sendo pendencia DESTE mes: virar a
      // folha do calendario nao paga a conta do mes passado.
      return j.mes === mesAtual && mesVenc < j.mes && b.status !== 'realizado';
    })
    .filter((b) => {
      const s = N.situacaoBoleto(b, hoje);
      if (vista.boletos.status === 'pago') return s === 'pago';
      if (vista.boletos.status === 'aberto') return s !== 'pago';
      return true;
    })
    .filter((b) => !busca || String(b.descricao || '').toLowerCase().indexOf(busca) >= 0)
    .sort((a, b) => {
      const va = a.vencimento || a.data;
      const vb = b.vencimento || b.data;
      return va < vb ? -1 : va > vb ? 1 : 0;
    });
}

function pintarBoletos() {
  const hoje = N.hojeIso();
  const todos = boletosDe();
  const lista = filtrarBoletos();
  const j = janelaBoletos();
  const resumo = N.resumoBoletos(lista, hoje);
  const resumoGeral = N.resumoBoletos(todos.filter((b) => b.status !== 'realizado'), hoje);

  $('#b-categoria').innerHTML = opcoesCategoria('saida', $('#b-categoria').value, 'sem categoria');
  $('#b-carteira').innerHTML = opcoesCarteira($('#b-carteira').value, 'sem carteira');
  $('#b-recorrente').innerHTML =
    '<option value="">— nenhuma —</option>' +
    estado.recorrentes
      .filter((r) => (r.tipo || 'saida') === 'saida')
      .map((r) => '<option value="' + esc(r.id) + '"' + (r.id === $('#b-recorrente').value ? ' selected' : '') + '>' + esc(r.descricao) + '</option>')
      .join('');

  // bolinha na aba quando tem conta atrasada
  $('#pino-boletos').hidden = resumoGeral.quantidadeVencida === 0;

  // KPIs
  // o atrasado e SEMPRE de tudo que esta em aberto, nao so do filtro da tela:
  // um numero de alerta que muda conforme o filtro nao alerta ninguem
  const kpis = [
    { rotulo: 'A pagar — ' + j.titulo, valor: dinheiro(resumo.aberto), nota: resumo.quantidade - resumo.porSituacao.pago + ' contas em aberto', luz: 'azul', destaque: true },
    { rotulo: 'Atrasado (tudo)', valor: dinheiro(resumoGeral.vencido), nota: resumoGeral.quantidadeVencida ? resumoGeral.quantidadeVencida + ' conta(s) passou do prazo' : 'nada vencido', luz: resumoGeral.vencido ? 'vermelho' : 'verde', cor: resumoGeral.vencido ? 'vermelho' : 'verde' },
    { rotulo: 'Vence em 7 dias', valor: dinheiro(resumo.proximos7), nota: resumo.venceHoje ? dinheiro(resumo.venceHoje) + ' é hoje' : 'nada para hoje', luz: 'amarelo', cor: resumo.proximos7 ? 'amarelo' : '' },
    { rotulo: 'Já pago — ' + j.titulo, valor: dinheiro(resumo.pago), nota: resumo.porSituacao.pago + ' de ' + resumo.quantidade + ' contas', luz: 'verde', cor: 'verde' },
  ];
  $('#kpis-boletos').innerHTML = kpis
    .map(
      (k) =>
        '<div class="kpi' + (k.destaque ? ' destaque' : '') + '" data-luz="' + k.luz + '">' +
        '<div class="kpi-rotulo">' + esc(k.rotulo) + '</div>' +
        '<div class="kpi-valor ' + (k.cor || '') + '">' + esc(k.valor) + '</div>' +
        '<div class="kpi-nota">' + esc(k.nota) + '</div></div>'
    )
    .join('');

  // avisos
  const avisos = [];
  if (resumoGeral.vencido > 0) {
    avisos.push(['ruim', '▲', '<b>' + dinheiro(resumoGeral.vencido) + '</b> em ' + resumoGeral.quantidadeVencida + ' conta(s) já passou do vencimento. Juros e multa correm todo dia — essas vêm antes de qualquer compra nova.']);
  }
  if (resumoGeral.venceHoje > 0) {
    avisos.push(['atencao', '◉', '<b>' + dinheiro(resumoGeral.venceHoje) + '</b> vence <b>hoje</b>. Depois das 20h a maioria dos bancos só agenda para amanhã.']);
  }
  if (!todos.length) {
    avisos.push(['info', '◆', 'Nenhum boleto guardado ainda. Cole a linha digitável no campo abaixo e o valor e o vencimento se preenchem sozinhos — ou digite na mão, se preferir.']);
  }
  $('#alertas-boletos').innerHTML = avisos
    .map((a) => '<div class="aviso ' + a[0] + '"><span class="aviso-icone">' + a[1] + '</span><div>' + a[2] + '</div></div>')
    .join('');

  $('#selo-boletos').textContent = lista.length + ' contas · ' + dinheiro(resumo.total);

  // a lista, agrupada por dia de vencimento
  if (!lista.length) {
    $('#lista-boletos').innerHTML = '<p class="vazio">Nenhuma conta com esses filtros.</p>';
  } else {
    let html = '';
    let diaAtual = null;
    lista.forEach((b) => {
      const venc = b.vencimento || b.data;
      if (venc !== diaAtual) {
        diaAtual = venc;
        const faltam = N.diasEntre(hoje, venc);
        const quando =
          faltam === 0 ? 'hoje' : faltam === 1 ? 'amanhã' : faltam > 0 ? 'em ' + faltam + ' dias' : 'há ' + -faltam + ' dias';
        html += '<div class="dia-grupo"><span>' + esc(N.formatarData(venc)) + ' · ' + esc(quando) + '</span></div>';
      }
      const s = N.situacaoBoleto(b, hoje);
      const inicial = String(b.descricao || '?').trim().charAt(0).toUpperCase();
      const meta = [];
      if (b.parcela) meta.push('parcela ' + b.parcela.n + '/' + b.parcela.de);
      if (b.recorrente) {
        const fixa = estado.recorrentes.find((r) => r.id === b.recorrente);
        meta.push('conta fixa' + (fixa ? ': ' + esc(fixa.descricao) : ''));
      }
      if (b.categoria) meta.push(esc(nomeCategoria(b.categoria)));
      if (b.carteira) meta.push(esc(nomeCarteira(b.carteira)));
      if (b.status === 'realizado' && b.pagoEm) {
        const atraso = N.diasEntre(venc, b.pagoEm);
        meta.push('pago em ' + N.formatarData(b.pagoEm) + (atraso > 0 ? ' (' + atraso + 'd atrasado)' : ''));
      }
      if (b.obs) meta.push(esc(b.obs));

      html +=
        '<div class="boleto ' + s + '" data-luz="' + CORES_SITUACAO[s] + '">' +
        '<div class="boleto-icone">' + esc(inicial) + '</div>' +
        '<div class="boleto-corpo">' +
        '<div class="boleto-nome">' + esc(b.descricao) + '</div>' +
        '<div class="boleto-meta"><span class="selo ' + CORES_SITUACAO[s] + '">' + ROTULOS_SITUACAO[s] + '</span>' +
        (meta.length ? '<span>' + meta.join(' · ') + '</span>' : '') +
        (b.linha ? '<span class="chave">' + esc(N.soDigitos(b.linha).slice(0, 6)) + '…</span>' : '') +
        '</div></div>' +
        '<div class="boleto-valor">' + esc(dinheiro(b.valor)) + '</div>' +
        '<div class="boleto-acoes">' +
        (b.linha ? '<button class="btn-icone" data-acao="copiar-linha" data-id="' + esc(b.id) + '" title="Copiar linha digitável">⧉</button>' : '') +
        '<button class="btn-icone" data-acao="editar-boleto" data-id="' + esc(b.id) + '" title="Editar">✎</button>' +
        '<button class="btn-icone perigo" data-acao="apagar-boleto" data-id="' + esc(b.id) + '" title="Apagar">✕</button>' +
        '<button class="switch' + (s === 'pago' ? ' ligado' : '') + '" data-acao="pagar-boleto" data-id="' + esc(b.id) +
        '" title="' + (s === 'pago' ? 'Desmarcar pagamento' : 'Marcar como pago') + '" aria-pressed="' + (s === 'pago') + '"></button>' +
        '</div></div>';
    });
    $('#lista-boletos').innerHTML = html;
  }

  pintarBoletosVersusCaixa();
}

/** O mes que vem cabe no caixa? Compara o que vence com o que a curva projeta. */
function pintarBoletosVersusCaixa() {
  const hoje = N.hojeIso();
  const proximo = N.mesDe(N.somarMeses(hoje, 1));
  const ate = N.diaDoMes(proximo, 31);
  const horizonte = Math.max(1, (N.diasEntre(hoje, ate) || 30) + 1);

  const doProximo = boletosDe().filter((b) => N.mesDe(b.vencimento || b.data) === proximo);
  const r = N.resumoBoletos(doProximo, hoje);
  const proj = projecao(horizonte);
  const folga = proj.menorSaldo - proj.piso;

  if (!doProximo.length) {
    $('#boletos-versus-caixa').innerHTML =
      '<p class="vazio">Nenhuma conta lançada para ' + esc(N.formatarMes(proximo)) + ' ainda. Guarde os boletos assim que eles chegarem — é o que transforma susto em agenda.</p>';
    return;
  }

  const pct = r.total > 0 ? r.pago / r.total : 0;
  $('#boletos-versus-caixa').innerHTML =
    '<div class="linha" style="justify-content:space-between;align-items:baseline">' +
    '<b>' + esc(N.formatarMes(proximo)) + '</b>' +
    '<span class="fraco">' + esc(dinheiro(r.pago)) + ' pago de ' + esc(dinheiro(r.total)) + '</span></div>' +
    '<div class="barra-fundo" style="height:12px;margin-top:8px"><div class="barra-cheia ok" style="width:' + (pct * 100).toFixed(1) + '%"></div></div>' +
    '<table style="margin-top:14px"><tbody>' +
    '<tr><td>Vence em ' + esc(N.formatarMes(proximo)) + '</td><td class="dir">' + esc(dinheiro(r.total)) + '</td></tr>' +
    '<tr><td>Ainda em aberto</td><td class="dir vermelho">' + esc(dinheiro(r.aberto)) + '</td></tr>' +
    '<tr><td>Menor saldo projetado até lá</td><td class="dir ' + (proj.menorSaldo < proj.piso ? 'vermelho' : 'verde') + '">' + esc(dinheiro(proj.menorSaldo)) + '</td></tr>' +
    '</tbody></table>' +
    '<div class="aviso ' + (folga >= 0 ? 'bom' : 'ruim') + '" style="margin-top:12px"><span class="aviso-icone">' + (folga >= 0 ? '✓' : '▲') + '</span><div>' +
    (folga >= 0
      ? 'Cabe: com essas contas dentro da conta, o pior dia ainda fica <b>' + esc(dinheiro(folga)) + '</b> acima do piso de segurança.'
      : 'Não cabe. Com essas contas, o caixa fura o piso em <b>' + esc(N.formatarData(proj.dataFuraPiso || proj.dataMenorSaldo)) + '</b>, faltando <b>' + esc(dinheiro(-folga)) + '</b>. Dá para negociar prazo de alguma delas, antecipar recebimento ou segurar compra.') +
    '</div>';
}

function limparFormBoleto() {
  vista.editandoBoleto = null;
  $('#form-boleto').reset();
  $('#b-linha').value = '';
  $('#b-parcelas').value = 1;
  $('#b-vencimento').value = '';
  $('#campo-pago-em').hidden = true;
  $('#selo-leitura').hidden = true;
  $('#btn-cancelar-boleto').hidden = true;
  $('#b-parcelas').disabled = false;
  pintarBoletos();
}

function editarBoleto(id) {
  const b = acharLanc(id);
  if (!b) return;
  vista.editandoBoleto = id;
  $('#b-beneficiario').value = b.descricao || '';
  $('#b-valor').value = (b.valor / 100).toFixed(2).replace('.', ',');
  $('#b-vencimento').value = b.vencimento || b.data;
  $('#b-categoria').value = b.categoria || '';
  $('#b-carteira').value = b.carteira || '';
  $('#b-obs').value = b.obs || '';
  $('#b-linha').value = b.linha || '';
  $('#b-recorrente').value = b.recorrente || '';
  $('#b-pago').checked = b.status === 'realizado';
  $('#b-pago-em').value = b.pagoEm || N.hojeIso();
  $('#campo-pago-em').hidden = b.status !== 'realizado';
  $('#b-parcelas').value = 1;
  $('#b-parcelas').disabled = true; // editar nao re-parcela
  $('#btn-cancelar-boleto').hidden = false;
  trocarAba('boletos');
  $('#b-beneficiario').focus();
}

/* ================================================= TELA: LANCAMENTOS ==== */

function opcoesCategoria(tipo, selecionada, incluirVazio) {
  const lista = estado.categorias.filter((c) => !tipo || c.tipo === tipo);
  return (
    (incluirVazio ? '<option value="">' + esc(incluirVazio) + '</option>' : '') +
    lista
      .map((c) => '<option value="' + esc(c.id) + '"' + (c.id === selecionada ? ' selected' : '') + '>' + esc(c.nome) + '</option>')
      .join('')
  );
}

function opcoesCarteira(selecionada, incluirVazio) {
  return (
    (incluirVazio ? '<option value="">' + esc(incluirVazio) + '</option>' : '') +
    estado.carteiras
      .map((c) => '<option value="' + esc(c.id) + '"' + (c.id === selecionada ? ' selected' : '') + '>' + esc(c.nome) + '</option>')
      .join('')
  );
}

function mesesComLancamento() {
  const vistos = {};
  estado.lancamentos.forEach((l) => (vistos[N.mesDe(l.data)] = true));
  return Object.keys(vistos).sort().reverse();
}

function pintarFormLancamento() {
  const tipo = $('#l-tipo').value;
  const transf = tipo === 'transferencia';
  $('#campo-destino').hidden = !transf;
  $('#rot-carteira').textContent = transf ? 'De qual carteira' : 'Carteira';
  $('#l-categoria').disabled = transf;
  $('#l-categoria').innerHTML = opcoesCategoria(transf ? null : tipo, $('#l-categoria').value, transf ? 'não se aplica' : 'sem categoria');
  $('#l-carteira').innerHTML = opcoesCarteira($('#l-carteira').value, 'sem carteira');
  $('#l-destino').innerHTML = opcoesCarteira($('#l-destino').value, 'escolha');
}

function pintarLancamentos() {
  // filtros
  const selMes = $('#f-mes');
  const meses = mesesComLancamento();
  selMes.innerHTML = '<option value="">Todos os meses</option>' + meses.map((m) => '<option value="' + m + '"' + (m === vista.filtros.mes ? ' selected' : '') + '>' + esc(N.formatarMes(m)) + '</option>').join('');
  $('#f-categoria').innerHTML = '<option value="">Todas</option>' + estado.categorias.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === vista.filtros.categoria ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('');
  $('#f-carteira').innerHTML = '<option value="">Todas</option>' + estado.carteiras.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === vista.filtros.carteira ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('');

  const f = vista.filtros;
  const busca = f.busca.trim().toLowerCase();
  const lista = estado.lancamentos
    .filter((l) => (!f.mes || N.mesDe(l.data) === f.mes) && (!f.tipo || l.tipo === f.tipo) && (!f.categoria || l.categoria === f.categoria))
    .filter((l) => !f.carteira || l.carteira === f.carteira || l.carteiraDestino === f.carteira)
    .filter((l) => !busca || String(l.descricao || '').toLowerCase().indexOf(busca) >= 0)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  const entradas = lista.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
  const saidas = lista.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0);
  $('#selo-lanc-total').textContent = lista.length + ' lançamentos · sobra ' + dinheiro(entradas - saidas);

  $('#tabela-lancamentos').innerHTML = lista.length
    ? '<table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Carteira</th><th class="dir">Valor</th><th class="meio">Situação</th><th></th></tr></thead><tbody>' +
      lista
        .map(
          (l) =>
            '<tr><td class="num">' + esc(N.formatarData(l.data)) + '</td>' +
            '<td>' + esc(l.descricao) +
            (l.pessoal ? ' <span class="selo amarelo">pessoal</span>' : '') +
            (l.estimado ? ' <span class="selo">estimado</span>' : '') +
            (l.exemplo ? ' <span class="selo">exemplo</span>' : '') + '</td>' +
            '<td class="fraco">' + (l.tipo === 'transferencia' ? '—' : esc(nomeCategoria(l.categoria))) + '</td>' +
            '<td class="fraco">' + esc(nomeCarteira(l.carteira)) + (l.tipo === 'transferencia' ? ' → ' + esc(nomeCarteira(l.carteiraDestino)) : '') + '</td>' +
            '<td class="dir">' + valorColorido(l.valor, l.tipo) + '</td>' +
            '<td class="meio">' + (l.status === 'realizado' ? '<span class="selo verde">feito</span>' : '<span class="selo azul">previsto</span>') + '</td>' +
            '<td class="dir" style="white-space:nowrap">' +
            (l.status === 'previsto' ? '<button class="btn-icone" data-acao="realizar" data-id="' + esc(l.id) + '" title="Marcar como realizado">✓</button>' : '') +
            '<button class="btn-icone" data-acao="editar" data-id="' + esc(l.id) + '" title="Editar">✎</button>' +
            '<button class="btn-icone perigo" data-acao="apagar" data-id="' + esc(l.id) + '" title="Apagar">✕</button>' +
            '</td></tr>'
        )
        .join('') +
      '</tbody></table>'
    : '<p class="vazio">Nenhum lançamento com esses filtros.</p>';
}

/* ======================================================= TELA: AGENDA === */

function pintarAgenda() {
  $('#r-categoria').innerHTML = opcoesCategoria($('#r-tipo').value, $('#r-categoria').value, 'sem categoria');
  $('#r-carteira').innerHTML = opcoesCarteira($('#r-carteira').value, 'sem carteira');

  const fixas = estado.recorrentes;
  const soma = fixas.filter((r) => r.ativo !== false && (r.tipo || 'saida') === 'saida').reduce((s, r) => s + r.valor, 0);
  $('#selo-fixas').textContent = fixas.length + ' contas · ' + dinheiro(soma) + '/mês de saída';

  $('#tabela-recorrentes').innerHTML = fixas.length
    ? '<table><thead><tr><th class="meio">Dia</th><th>Descrição</th><th>Categoria</th><th>Carteira</th><th class="dir">Valor</th><th class="meio">Ativa</th><th></th></tr></thead><tbody>' +
      fixas
        .slice()
        .sort((a, b) => (a.dia || 0) - (b.dia || 0))
        .map(
          (r) =>
            '<tr><td class="meio num">' + esc(r.dia) + '</td>' +
            '<td>' + esc(r.descricao) + '</td>' +
            '<td class="fraco">' + esc(nomeCategoria(r.categoria)) + '</td>' +
            '<td class="fraco">' + esc(nomeCarteira(r.carteira)) + '</td>' +
            '<td class="dir">' + valorColorido(r.valor, r.tipo || 'saida') + '</td>' +
            '<td class="meio"><input type="checkbox" data-rec="' + esc(r.id) + '"' + (r.ativo === false ? '' : ' checked') + '></td>' +
            '<td class="dir"><button class="btn-icone perigo" data-acao="apagar-rec" data-id="' + esc(r.id) + '" title="Apagar">✕</button></td></tr>'
        )
        .join('') +
      '</tbody><tfoot><tr><td></td><td>Custo fixo mensal</td><td></td><td></td><td class="dir">' + esc(dinheiro(soma)) + '</td><td></td><td></td></tr></tfoot></table>'
    : '<p class="vazio">Nenhuma conta fixa. Pró-labore, imposto e contador moram aqui.</p>';

  const hoje = N.hojeIso();
  const previstos = estado.lancamentos.filter((l) => l.status === 'previsto').sort((a, b) => (a.data < b.data ? -1 : 1));
  const atrasados = previstos.filter((l) => l.data < hoje);
  $('#selo-compromissos').textContent = previstos.length + ' marcados' + (atrasados.length ? ' · ' + atrasados.length + ' com data vencida' : '');

  $('#tabela-agenda').innerHTML = previstos.length
    ? '<table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="dir">Valor</th><th></th></tr></thead><tbody>' +
      previstos
        .map(
          (l) =>
            '<tr><td class="num">' + esc(N.formatarData(l.data)) + (l.data < hoje ? ' <span class="selo vermelho">venceu</span>' : '') + '</td>' +
            '<td>' + esc(l.descricao) + '</td>' +
            '<td class="fraco">' + esc(nomeCategoria(l.categoria)) + '</td>' +
            '<td class="dir">' + valorColorido(l.valor, l.tipo) + '</td>' +
            '<td class="dir" style="white-space:nowrap">' +
            '<button class="btn-icone" data-acao="realizar" data-id="' + esc(l.id) + '" title="Marcar como realizado">✓</button>' +
            '<button class="btn-icone" data-acao="editar" data-id="' + esc(l.id) + '" title="Editar">✎</button>' +
            '<button class="btn-icone perigo" data-acao="apagar" data-id="' + esc(l.id) + '" title="Apagar">✕</button>' +
            '</td></tr>'
        )
        .join('') +
      '</tbody></table>'
    : '<p class="vazio">Nenhum compromisso marcado. Lance com situação “ainda vai acontecer”.</p>';
}

/* ==================================================== TELA: ORCAMENTO === */

function pintarOrcamento() {
  const o = orcamentoAtual();
  const r = o.resultado;

  $('#o-modo').value = estado.orcamento.modo;
  $('#campo-base-manual').hidden = estado.orcamento.modo !== 'manual';
  if (document.activeElement !== $('#o-base')) $('#o-base').value = estado.orcamento.base ? (estado.orcamento.base / 100).toFixed(2).replace('.', ',') : '';

  $('#selo-base').textContent = N.formatarMes(o.mes) + ' · base ' + dinheiro(r.base);
  $('#explica-base').innerHTML =
    '<p class="conta">entradas do mês <b>' + esc(dinheiro(o.detalhe.entradas)) + '</b><br>' +
    '− contas fixas do mês <b>' + esc(dinheiro(o.detalhe.fixas)) + '</b><br>' +
    '− outras saídas obrigatórias <b>' + esc(dinheiro(o.detalhe.avulsas)) + '</b><br>' +
    '= base para dividir <b class="' + (o.detalhe.base > 0 ? 'verde' : 'vermelho') + '">' + esc(dinheiro(o.detalhe.base)) + '</b></p>' +
    (estado.orcamento.modo === 'manual' ? '<p class="ajuda">Modo manual: o app está usando o valor que você digitou, não essa conta.</p>' : '');

  $('#selo-pct').className = 'selo ' + (r.pctValida ? 'verde' : 'amarelo');
  $('#selo-pct').textContent = 'soma dos percentuais: ' + r.somaPct.toFixed(0) + '%';

  $('#lista-envelopes').innerHTML = r.envelopes
    .map((e) => {
      const teto = e.planejado + e.acumulado;
      const usado = teto > 0 ? Math.min(1, e.gasto / teto) : 0;
      const classe = e.estourou ? 'estourou' : usado > 0.85 ? 'quase' : '';
      return (
        '<div class="envelope">' +
        '<div class="envelope-topo">' +
        '<span style="width:9px;height:9px;border-radius:3px;background:' + (e.cor || 'var(--verde)') + '"></span>' +
        '<strong>' + esc(e.nome) + '</strong>' +
        '<span class="envelope-valor ' + (e.estourou ? 'vermelho' : '') + '">' + esc(dinheiro(e.disponivel)) + '</span>' +
        '</div>' +
        '<div class="barra-fundo"><div class="barra-cheia ' + classe + '" style="width:' + (usado * 100).toFixed(1) + '%"></div></div>' +
        '<div class="envelope-linha"><span>gasto ' + esc(dinheiro(e.gasto)) + '</span><span>de ' + esc(dinheiro(teto)) + '</span></div>' +
        (e.acumulado ? '<div class="envelope-linha"><span>acumulado de antes</span><span>' + esc(dinheiro(e.acumulado)) + '</span></div>' : '') +
        '<div class="linha" style="margin-top:10px;gap:6px">' +
        '<label style="flex:0 0 78px"><span class="rotulo">%</span><input class="direita" type="number" min="0" max="100" step="1" value="' + e.pct + '" data-env-pct="' + esc(e.id) + '"></label>' +
        '<label class="cresce"><span class="rotulo">acumulado</span><input class="direita" type="text" inputmode="decimal" value="' + (e.acumulado ? (e.acumulado / 100).toFixed(2).replace('.', ',') : '') + '" data-env-acum="' + esc(e.id) + '" placeholder="0,00"></label>' +
        '<button class="btn-icone perigo" type="button" data-acao="apagar-env" data-id="' + esc(e.id) + '" title="Apagar envelope" style="align-self:end;margin-bottom:6px">✕</button>' +
        '</div></div>'
      );
    })
    .join('');

  // reserva
  const res = reservaAtual();
  $('#res-meses').value = estado.reserva.metaMeses;
  $('#selo-reserva').className = 'selo ' + (res.completa ? 'verde' : res.progresso !== null && res.progresso > 0.5 ? 'amarelo' : 'vermelho');
  $('#selo-reserva').textContent = res.meta ? N.pct(res.progresso, 0) + ' da meta' : 'sem meta definida';

  $('#painel-reserva').innerHTML =
    '<div class="barra-fundo" style="height:12px"><div class="barra-cheia' + (res.completa ? '' : ' quase') + '" style="width:' + ((res.progresso || 0) * 100).toFixed(1) + '%"></div></div>' +
    '<div class="envelope-linha" style="font-size:13px"><span>guardado <b class="' + (res.completa ? 'verde' : '') + '">' + esc(dinheiro(res.saldo)) + '</b></span>' +
    '<span>meta ' + esc(dinheiro(res.meta)) + '</span></div>' +
    '<p class="ajuda">' +
    (res.meta === 0
      ? 'Defina a meta em meses. Com custo fixo de ' + esc(dinheiro(custoFixoMensal())) + '/mês, 3 meses seriam ' + esc(dinheiro(custoFixoMensal() * 3)) + '.'
      : res.completa
      ? 'Reserva completa: cobre ' + (res.mesesCobertos || 0).toFixed(1) + ' meses de custo fixo. Daqui para frente, o percentual da reserva pode ir para estoque ou produto novo.'
      : 'Faltam <b>' + esc(dinheiro(res.falta)) + '</b>. Hoje a reserva cobre ' + (res.mesesCobertos || 0).toFixed(1) + ' meses de custo fixo.') +
    '</p>';
}

/* ===================================================== TELA: INVESTIR === */

function pintarInvestir() {
  const soma = N.somarCarteiras(estado.carteiras, estado.lancamentos);
  const compromissos = N.compromissosAte(estado.lancamentos, estado.recorrentes, N.hojeIso(), 30);
  const poder = N.poderDeCompra({
    disponivel: soma.disponivel,
    compromissos: compromissos,
    reserva: soma.reserva,
    colchao: estado.premissas.colchao || 0,
  });

  const linhas = [
    ['Disponível hoje em todas as carteiras', poder.disponivel, ''],
    ['− Contas dos próximos 30 dias', -poder.compromissos, 'vermelho'],
    ['− Reserva de emergência (não se toca)', -poder.reserva, 'vermelho'],
    ['− Colchão de segurança', -poder.colchao, 'vermelho'],
  ];

  const orc = orcamentoAtual().resultado;
  const envNovos = orc.envelopes.find((e) => e.id === 'novos');
  const envEstoque = orc.envelopes.find((e) => e.id === 'estoque');

  $('#poder-compra').innerHTML =
    '<table><tbody>' +
    linhas.map((l) => '<tr><td>' + esc(l[0]) + '</td><td class="dir ' + l[2] + '">' + esc(dinheiro(l[1])) + '</td></tr>').join('') +
    '</tbody><tfoot><tr><td><b>Poder de compra livre</b></td><td class="dir"><b class="' + (poder.livre > 0 ? 'verde' : 'vermelho') + '" style="font-size:17px">' + esc(dinheiro(poder.livre)) + '</b></td></tr></tfoot></table>' +
    (poder.livre > 0
      ? '<div class="aviso bom" style="margin-top:12px"><span class="aviso-icone">✓</span><div>Dá para comprometer até <b>' + esc(dinheiro(poder.livre)) + '</b> hoje sem encostar na reserva. Pelo orçamento, o envelope de produtos novos tem <b>' + esc(dinheiro(envNovos ? envNovos.disponivel : 0)) + '</b> e o de estoque <b>' + esc(dinheiro(envEstoque ? envEstoque.disponivel : 0)) + '</b> — o menor dos dois é o seu limite real.</div></div>'
      : '<div class="aviso ruim" style="margin-top:12px"><span class="aviso-icone">▲</span><div>Não há compra para fazer hoje: o disponível já está comprometido com contas, reserva e colchão. Antes de comprar, é preciso girar o estoque que já existe.</div></div>');

  // semaforo
  const proj = projecao();
  const res = reservaAtual();
  const fechado = N.fecharMes(estado.lancamentos, N.mesDe(N.hojeIso()));
  const itens = [
    {
      nome: 'Caixa aguenta o horizonte',
      ok: !proj.negativa && !proj.furaPiso,
      meio: !proj.negativa && proj.furaPiso,
      detalhe: 'menor saldo ' + dinheiro(proj.menorSaldo) + ' em ' + N.formatarData(proj.dataMenorSaldo),
    },
    { nome: 'Reserva de emergência formada', ok: res.completa, meio: (res.progresso || 0) >= 0.5, detalhe: res.meta ? N.pct(res.progresso, 0) + ' da meta' : 'sem meta' },
    { nome: 'Sobra de caixa no mês', ok: fechado.resultado > 0, meio: fechado.resultado === 0, detalhe: dinheiro(fechado.resultado) },
    { nome: 'Envelope de produtos novos com saldo', ok: !!envNovos && envNovos.disponivel > 0, meio: false, detalhe: dinheiro(envNovos ? envNovos.disponivel : 0) },
    { nome: 'Sem gasto pessoal pela empresa no mês', ok: fechado.pessoais === 0, meio: fechado.pessoais > 0 && fechado.pessoais < 50000, detalhe: dinheiro(fechado.pessoais) },
  ];

  const verdes = itens.filter((i) => i.ok).length;
  $('#semaforo').innerHTML =
    '<table><tbody>' +
    itens
      .map(
        (i) =>
          '<tr><td style="width:28px" class="meio">' + (i.ok ? '<span class="verde">●</span>' : i.meio ? '<span class="amarelo">●</span>' : '<span class="vermelho">●</span>') + '</td>' +
          '<td>' + esc(i.nome) + '</td><td class="dir fraco">' + esc(i.detalhe) + '</td></tr>'
      )
      .join('') +
    '</tbody></table>' +
    '<div class="aviso ' + (verdes >= 4 ? 'bom' : verdes >= 2 ? 'atencao' : 'ruim') + '" style="margin-top:12px"><span class="aviso-icone">' + (verdes >= 4 ? '✓' : '▲') + '</span><div>' +
    verdes + ' de ' + itens.length + ' sinais verdes. ' +
    (verdes >= 4
      ? 'É um bom momento para investir em produto novo — com o valor que couber no poder de compra livre.'
      : verdes >= 2
      ? 'Momento de cautela: dá para comprar reposição do que gira, mas aposta nova aumenta o risco.'
      : 'Não é momento de investir em produto novo. Primeiro: girar o estoque parado e formar a reserva.') +
    '</div></div>';
}

/* =================================================== TELA: RELATORIOS === */

function pintarRelatorios() {
  const serie = N.serieMensal(estado.lancamentos, vista.mesesRelatorio);
  const comMovimento = serie.filter((s) => s.quantidade > 0);
  const mediaEntradas = comMovimento.length ? Math.round(comMovimento.reduce((s, m) => s + m.entradas, 0) / comMovimento.length) : 0;
  const mediaSaidas = comMovimento.length ? Math.round(comMovimento.reduce((s, m) => s + m.saidas, 0) / comMovimento.length) : 0;
  const totalPessoal = serie.reduce((s, m) => s + m.pessoais, 0);
  const soma = N.somarCarteiras(estado.carteiras, estado.lancamentos);

  const kpis = [
    { rotulo: 'Entrada média por mês', valor: dinheiro(mediaEntradas), nota: comMovimento.length + ' meses com movimento' },
    { rotulo: 'Saída média por mês', valor: dinheiro(mediaSaidas), nota: 'tudo que saiu, inclusive estoque' },
    { rotulo: 'Sobra média', valor: dinheiro(mediaEntradas - mediaSaidas, { comMais: true }), nota: 'caixa, não lucro', cor: mediaEntradas - mediaSaidas >= 0 ? 'verde' : 'vermelho' },
    { rotulo: 'Vazamento pessoal no período', valor: dinheiro(totalPessoal), nota: 'gasto pessoal pago pela empresa', cor: totalPessoal > 0 ? 'amarelo' : 'verde' },
    { rotulo: 'Caixa hoje', valor: dinheiro(soma.total), nota: 'disponível + a liberar' },
  ];
  $('#kpis-rel').innerHTML = kpis
    .map(
      (k) =>
        '<div class="kpi"><div class="kpi-rotulo">' + esc(k.rotulo) + '</div>' +
        '<div class="kpi-valor ' + (k.cor || '') + '">' + esc(k.valor) + '</div>' +
        '<div class="kpi-nota">' + esc(k.nota) + '</div></div>'
    )
    .join('');

  $('#grafico-mensal').innerHTML = graficoMensal(serie);
  $$('#pilulas-meses .pilula').forEach((b) => b.classList.toggle('ativa', +b.dataset.meses === vista.mesesRelatorio));

  // categorias do periodo
  const saidas = {};
  const entradas = {};
  serie.forEach((m) => {
    Object.keys(m.porCategoria).forEach((k) => {
      const alvo = k[0] === '+' ? entradas : saidas;
      const id = k.slice(1);
      alvo[id] = (alvo[id] || 0) + m.porCategoria[k];
    });
  });

  const tabelaDe = (mapa, total) => {
    const itens = Object.keys(mapa)
      .map((id) => ({ id: id, valor: mapa[id] }))
      .sort((a, b) => b.valor - a.valor);
    if (!itens.length) return '<p class="vazio">Sem movimento no período.</p>';
    return (
      '<table><thead><tr><th>Categoria</th><th class="dir">Valor</th><th class="dir">% </th><th style="width:90px"></th></tr></thead><tbody>' +
      itens
        .map((i) => {
          const parte = total > 0 ? i.valor / total : 0;
          return (
            '<tr><td>' + esc(nomeCategoria(i.id)) + '</td>' +
            '<td class="dir">' + esc(dinheiro(i.valor)) + '</td>' +
            '<td class="dir fraco">' + esc(N.pct(parte, 0)) + '</td>' +
            '<td><div class="barra-fundo"><div class="barra-cheia" style="width:' + (parte * 100).toFixed(1) + '%"></div></div></td></tr>'
          );
        })
        .join('') +
      '</tbody><tfoot><tr><td>Total</td><td class="dir">' + esc(dinheiro(total)) + '</td><td></td><td></td></tr></tfoot></table>'
    );
  };

  const totalSaidas = Object.keys(saidas).reduce((s, k) => s + saidas[k], 0);
  const totalEntradas = Object.keys(entradas).reduce((s, k) => s + entradas[k], 0);
  $('#selo-cat-mes').textContent = 'últimos ' + vista.mesesRelatorio + ' meses';
  $('#tabela-categorias').innerHTML = tabelaDe(saidas, totalSaidas);
  $('#tabela-origens').innerHTML = tabelaDe(entradas, totalEntradas);

  // pessoal mes a mes
  $('#tabela-pessoal').innerHTML =
    '<table><thead><tr><th>Mês</th><th class="dir">Gasto pessoal</th><th class="dir">% das saídas</th><th class="dir">Pró-labore (combinado)</th></tr></thead><tbody>' +
    serie
      .map((m) => {
        const prolabore = m.porCategoria['-prolabore'] || 0;
        return (
          '<tr><td>' + esc(N.formatarMes(m.mes)) + '</td>' +
          '<td class="dir ' + (m.pessoais > 0 ? 'amarelo' : 'fraco') + '">' + esc(dinheiro(m.pessoais)) + '</td>' +
          '<td class="dir fraco">' + esc(m.pctPessoal === null ? '—' : N.pct(m.pctPessoal)) + '</td>' +
          '<td class="dir fraco">' + esc(dinheiro(prolabore)) + '</td></tr>'
        );
      })
      .join('') +
    '</tbody><tfoot><tr><td>Total</td><td class="dir">' + esc(dinheiro(totalPessoal)) + '</td><td></td><td class="dir">' +
    esc(dinheiro(serie.reduce((s, m) => s + (m.porCategoria['-prolabore'] || 0), 0))) + '</td></tr></tfoot></table>';

  // mes a mes
  $('#tabela-mensal').innerHTML =
    '<table><thead><tr><th>Mês</th><th class="dir">Entradas</th><th class="dir">Saídas</th><th class="dir">Sobra</th><th class="dir">Transferências</th><th class="dir">Lançamentos</th></tr></thead><tbody>' +
    serie
      .map(
        (m) =>
          '<tr><td>' + esc(N.formatarMes(m.mes)) + '</td>' +
          '<td class="dir verde">' + esc(dinheiro(m.entradas)) + '</td>' +
          '<td class="dir vermelho">' + esc(dinheiro(m.saidas)) + '</td>' +
          '<td class="dir ' + (m.resultado >= 0 ? 'verde' : 'vermelho') + '"><b>' + esc(dinheiro(m.resultado)) + '</b></td>' +
          '<td class="dir fraco">' + esc(dinheiro(m.transferencias)) + '</td>' +
          '<td class="dir fraco">' + m.quantidade + '</td></tr>'
      )
      .join('') +
    '</tbody></table>';
}

/* ==================================================== TELA: IMPORTAR === */

function pintarImportar() {
  $('#imp-carteira').innerHTML = opcoesCarteira($('#imp-carteira').value, 'sem carteira');
  $('#rg-categoria').innerHTML = opcoesCategoria(null, $('#rg-categoria').value, 'sem categoria');

  $('#selo-regras').textContent = estado.regras.length + ' regras';
  $('#tabela-regras').innerHTML = estado.regras.length
    ? '<table><thead><tr><th class="meio">Ordem</th><th>Contém</th><th>Tipo</th><th>Categoria</th><th class="meio">Pessoal</th><th></th></tr></thead><tbody>' +
      estado.regras
        .map(
          (r, i) =>
            '<tr><td class="meio fraco num">' + (i + 1) + '</td>' +
            '<td><code>' + esc(r.contem) + '</code></td>' +
            '<td class="fraco">' + esc(r.tipo || 'mantém') + '</td>' +
            '<td class="fraco">' + esc(r.categoria ? nomeCategoria(r.categoria) : '—') + '</td>' +
            '<td class="meio">' + (r.pessoal ? '<span class="selo amarelo">sim</span>' : '<span class="fraco">—</span>') + '</td>' +
            '<td class="dir" style="white-space:nowrap">' +
            (i > 0 ? '<button class="btn-icone" data-acao="subir-regra" data-id="' + esc(r.id) + '" title="Subir">↑</button>' : '') +
            '<button class="btn-icone perigo" data-acao="apagar-regra" data-id="' + esc(r.id) + '" title="Apagar">✕</button>' +
            '</td></tr>'
        )
        .join('') +
      '</tbody></table>'
    : '<p class="vazio">Sem regras. Toda linha importada vai cair sem categoria.</p>';
}

function lerExtrato() {
  const texto = $('#imp-texto').value;
  if (!texto.trim()) {
    toast('Cole o conteúdo do extrato ou escolha um arquivo CSV.', true);
    return;
  }
  const lido = N.lerCsv(texto);
  if (!lido.linhas.length) {
    toast('Não achei nenhuma linha nesse texto.', true);
    return;
  }
  const temCabecalho = $('#imp-cabecalho').checked;
  // extrato costuma vir com linhas de preambulo antes dos titulos
  const cabecalhoEm = temCabecalho ? N.acharCabecalho(lido.linhas) : -1;
  const mapa = temCabecalho ? N.adivinharColunas(lido.linhas[cabecalhoEm]) : { data: 0, descricao: 1, valor: 2, entrada: -1, saida: -1 };
  vista.importacao = { linhas: lido.linhas, mapa: mapa, temCabecalho: temCabecalho, cabecalhoEm: cabecalhoEm, candidatos: null };

  $('#selo-csv').textContent =
    lido.linhas.length + ' linhas · separador "' + (lido.separador === '\t' ? 'tab' : lido.separador) + '"' +
    (cabecalhoEm > 0 ? ' · títulos na linha ' + (cabecalhoEm + 1) : '');
  const base = lido.linhas[Math.max(0, cabecalhoEm)];
  const colunas = (temCabecalho ? base : base.map((_, i) => 'coluna ' + (i + 1))).map((c, i) => ({ i: i, nome: c || 'coluna ' + (i + 1) }));
  const seletor = (campo, rotulo, valor) =>
    '<label class="cresce"><span class="rotulo">' + rotulo + '</span><select data-mapa="' + campo + '">' +
    '<option value="-1">— não tem —</option>' +
    colunas.map((c) => '<option value="' + c.i + '"' + (c.i === valor ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') +
    '</select></label>';

  $('#mapa-colunas').innerHTML =
    seletor('data', 'Data', mapa.data) +
    seletor('descricao', 'Descrição', mapa.descricao) +
    seletor('valor', 'Valor (+ entra, − sai)', mapa.valor) +
    seletor('entrada', 'ou coluna de crédito', mapa.entrada) +
    seletor('saida', 'e coluna de débito', mapa.saida);

  $('#cartao-colunas').hidden = false;
  $('#cartao-previa').hidden = true;
  $('#cartao-colunas').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function processarExtrato() {
  const imp = vista.importacao;
  if (!imp) return;
  $$('#mapa-colunas select').forEach((s) => (imp.mapa[s.dataset.mapa] = +s.value));

  const mapeado = N.mapearLinhas(imp.linhas, imp.mapa, { temCabecalho: imp.temCabecalho, cabecalhoEm: imp.cabecalhoEm });
  const classificado = N.classificarLote(mapeado.candidatos, estado.regras);
  const separado = N.separarNovos(classificado, estado.lancamentos);
  const destino = $('#imp-carteira').value;

  // o extrato chama de "PAGAMENTO BOLETO 34191" o que aqui se chama "Energia
  // eletrica": mesmo dinheiro, nome diferente. Esses chegam desmarcados.
  const comParecidos = N.marcarParecidos(separado.novos, estado.lancamentos);
  imp.candidatos = comParecidos.map((c) =>
    Object.assign({}, c, { carteira: c.carteira || destino, marcado: c.marcado !== false, chave: novoId() })
  );
  imp.repetidos = separado.repetidos;
  imp.recusados = mapeado.recusados;

  const semCategoria = imp.candidatos.filter((c) => !c.categoria && c.tipo !== 'transferencia').length;
  $('#selo-previa').textContent = imp.candidatos.length + ' novos · ' + separado.repetidos.length + ' repetidos';

  const avisos = [];
  if (separado.repetidos.length) avisos.push(['info', '◇', '<b>' + separado.repetidos.length + '</b> linhas já estavam lançadas (mesma data, valor e descrição) e foram deixadas de fora.']);
  if (mapeado.recusados.length) avisos.push(['atencao', '▲', '<b>' + mapeado.recusados.length + '</b> linhas não deram para ler (data ou valor ilegível) — normalmente são cabeçalho, rodapé ou linha de saldo.']);
  if (semCategoria) avisos.push(['atencao', '◉', '<b>' + semCategoria + '</b> lançamentos vão entrar <b>sem categoria</b>. Dá para escolher na própria tabela, ou criar uma regra e ler o extrato de novo.']);

  const parecidos = imp.candidatos.filter((c) => c.parecido);
  if (parecidos.length) {
    const abertos = parecidos.filter((c) => c.parecido.aberto);
    avisos.push([
      'atencao',
      '◈',
      '<b>' + parecidos.length + '</b> linha(s) parecem ser pagamento de algo que já está aqui — mesmo valor, data próxima, nome diferente. Vieram <b>desmarcadas</b> para não descontar o mesmo dinheiro duas vezes.' +
        (abertos.length ? ' Em ' + abertos.length + ' delas o que já existe é um <b>boleto em aberto</b>: o certo é marcar o boleto como pago na aba Boletos, não importar a linha.' : ''),
    ]);
  }
  if (!imp.candidatos.length) avisos.push(['info', '◆', 'Nada novo para importar.']);
  $('#avisos-previa').innerHTML = avisos.map((a) => '<div class="aviso ' + a[0] + '"><span class="aviso-icone">' + a[1] + '</span><div>' + a[2] + '</div></div>').join('');

  pintarPrevia();
  $('#cartao-previa').hidden = false;
  $('#cartao-previa').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function pintarPrevia() {
  const imp = vista.importacao;
  if (!imp || !imp.candidatos) return;

  $('#tabela-previa').innerHTML = imp.candidatos.length
    ? '<table><thead><tr><th class="meio"><input type="checkbox" id="prev-todos" checked></th><th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th class="dir">Valor</th><th class="meio">Pessoal</th></tr></thead><tbody>' +
      imp.candidatos
        .map(
          (c) =>
            '<tr><td class="meio"><input type="checkbox" data-prev="' + c.chave + '"' + (c.marcado ? ' checked' : '') + '></td>' +
            '<td class="num">' + esc(N.formatarData(c.data)) + '</td>' +
            '<td>' + esc(c.descricao) +
            (c.parecido
              ? '<div class="ajuda">parece ' + (c.parecido.aberto ? 'o boleto em aberto' : 'o lançamento') + ' <b>' + esc(c.parecido.descricao) + '</b> de ' + esc(N.formatarData(c.parecido.data)) + '</div>'
              : '') +
            '</td>' +
            '<td><select data-prev-tipo="' + c.chave + '">' +
            ['entrada', 'saida', 'transferencia']
              .map((t) => '<option value="' + t + '"' + (t === c.tipo ? ' selected' : '') + '>' + (t === 'saida' ? 'saída' : t === 'transferencia' ? 'transf.' : 'entrada') + '</option>')
              .join('') +
            '</select></td>' +
            '<td>' +
            (c.tipo === 'transferencia'
              ? '<select data-prev-dest="' + c.chave + '">' + opcoesCarteira(c.destino, 'para qual carteira?') + '</select>'
              : '<select data-prev-cat="' + c.chave + '">' + opcoesCategoria(c.tipo, c.categoria, 'sem categoria') + '</select>') +
            '</td>' +
            '<td class="dir">' + esc(dinheiro(c.valor)) + '</td>' +
            '<td class="meio"><input type="checkbox" data-prev-pessoal="' + c.chave + '"' + (c.pessoal ? ' checked' : '') + '></td></tr>'
        )
        .join('') +
      '</tbody></table>'
    : '<p class="vazio">Nada novo para importar.</p>';
}

/* ====================================================== TELA: AJUSTES === */

function pintarAjustes() {
  const p = estado.premissas;
  const porCentavos = (c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

  if (document.activeElement.tagName !== 'INPUT') {
    $('#p-entrada').value = porCentavos(p.entradaDiaria);
    $('#p-recompra').value = porCentavos(p.recompraMensal);
    $('#p-dia-recompra').value = p.diaRecompra || 10;
    $('#p-colchao').value = porCentavos(p.colchao);
    $('#p-custofixo').value = porCentavos(p.custoFixoMensal);
  }
  $('#p-usar-entrada').checked = p.usarEntradaDiaria !== false;

  const soma = N.somarCarteiras(estado.carteiras, estado.lancamentos);
  $('#selo-carteiras').textContent = estado.carteiras.length + ' carteiras · ' + dinheiro(soma.total);

  $('#tabela-carteiras').innerHTML = estado.carteiras.length
    ? '<table><thead><tr><th>Nome</th><th class="dir">Saldo conferido</th><th class="dir">Hoje</th><th class="dir">A liberar</th><th class="meio">Dias p/ liberar</th><th class="meio">Reserva</th><th></th></tr></thead><tbody>' +
      estado.carteiras
        .map(
          (c) =>
            '<tr><td><input type="text" value="' + esc(c.nome) + '" data-cart="nome" data-id="' + esc(c.id) + '"></td>' +
            '<td class="dir"><input class="direita" type="text" inputmode="decimal" value="' + porCentavos(c.disponivel) + '" data-cart="disponivel" data-id="' + esc(c.id) + '" placeholder="0,00">' +
            '<div class="ajuda" style="text-align:right;margin:2px 0 0">' + (c.conferidoEm ? 'em ' + esc(N.formatarData(c.conferidoEm)) : 'sem data') + '</div></td>' +
            '<td class="dir"><b>' + esc(dinheiro(N.saldoDaCarteira(c, estado.lancamentos))) + '</b></td>' +
            '<td class="dir"><input class="direita" type="text" inputmode="decimal" value="' + porCentavos(c.aLiberar) + '" data-cart="aLiberar" data-id="' + esc(c.id) + '" placeholder="0,00"></td>' +
            '<td class="meio"><input class="direita" type="number" min="0" max="120" value="' + (c.diasLiberacao || 0) + '" data-cart="diasLiberacao" data-id="' + esc(c.id) + '"></td>' +
            '<td class="meio"><input type="checkbox" data-cart="reserva" data-id="' + esc(c.id) + '"' + (c.reserva ? ' checked' : '') + '></td>' +
            '<td class="dir"><button class="btn-icone perigo" data-acao="apagar-cart" data-id="' + esc(c.id) + '" title="Apagar">✕</button></td></tr>'
        )
        .join('') +
      '</tbody></table>'
    : '<p class="vazio">Nenhuma carteira. Adicione o banco, a reserva e cada marketplace.</p>';

  // categorias
  $('#cat-envelope').innerHTML = '<option value="">— nenhum —</option>' + estado.orcamento.envelopes.map((e) => '<option value="' + esc(e.id) + '">' + esc(e.nome) + '</option>').join('');
  $('#selo-categorias').textContent = estado.categorias.length + ' categorias';

  $('#tabela-categorias-cfg').innerHTML =
    '<table><thead><tr><th>Categoria</th><th>Tipo</th><th>Envelope</th><th class="meio">Obrigatória</th><th></th></tr></thead><tbody>' +
    estado.categorias
      .map(
        (c) =>
          '<tr><td>' + esc(c.nome) + '</td>' +
          '<td class="fraco">' + (c.tipo === 'entrada' ? 'entrada' : 'saída') + '</td>' +
          '<td>' + (c.tipo === 'entrada' ? '<span class="fraco">—</span>' :
            '<select data-cat-env="' + esc(c.id) + '"><option value="">— nenhum —</option>' +
            estado.orcamento.envelopes.map((e) => '<option value="' + esc(e.id) + '"' + (e.id === c.envelope ? ' selected' : '') + '>' + esc(e.nome) + '</option>').join('') +
            '</select>') + '</td>' +
          '<td class="meio">' + (c.tipo === 'entrada' ? '<span class="fraco">—</span>' : '<input type="checkbox" data-cat-obr="' + esc(c.id) + '"' + (c.obrigatoria ? ' checked' : '') + '>') + '</td>' +
          '<td class="dir"><button class="btn-icone perigo" data-acao="apagar-cat" data-id="' + esc(c.id) + '" title="Apagar">✕</button></td></tr>'
      )
      .join('') +
    '</tbody></table>';

  pintarSeloSalvo();
}

/* ========================================================== PINTAR ====== */

function pintar() {
  pintarPainel();
  pintarBoletos();
  pintarFormLancamento();
  pintarLancamentos();
  pintarAgenda();
  pintarOrcamento();
  pintarInvestir();
  pintarRelatorios();
  pintarImportar();
  pintarAjustes();
}

/* ========================================================== EVENTOS ==== */

function trocarAba(nome) {
  $$('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === nome));
  $$('.painel').forEach((p) => p.classList.toggle('ativo', p.id === 'painel-' + nome));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function aplicarTema(tema) {
  estado.tema = tema;
  document.documentElement.setAttribute('data-tema', tema === 'claro' ? 'claro' : 'escuro');
}

function acharLanc(id) {
  return estado.lancamentos.find((l) => l.id === id);
}

function editarLancamento(id) {
  const l = acharLanc(id);
  if (!l) return;
  vista.editando = id;
  $('#l-tipo').value = l.tipo;
  pintarFormLancamento();
  $('#l-data').value = l.data;
  $('#l-descricao').value = l.descricao || '';
  $('#l-valor').value = (l.valor / 100).toFixed(2).replace('.', ',');
  $('#l-categoria').value = l.categoria || '';
  $('#l-carteira').value = l.carteira || '';
  $('#l-destino').value = l.carteiraDestino || '';
  $('#l-status').value = l.status || 'realizado';
  $('#l-pessoal').checked = !!l.pessoal;
  $('#l-estimado').checked = !!l.estimado;
  $('#titulo-form-lanc').textContent = 'Editando lançamento';
  $('#selo-editando').hidden = false;
  $('#btn-cancelar-lanc').hidden = false;
  trocarAba('lancamentos');
}

function limparFormLancamento() {
  vista.editando = null;
  $('#form-lanc').reset();
  $('#l-data').value = N.hojeIso();
  $('#titulo-form-lanc').textContent = 'Novo lançamento';
  $('#selo-editando').hidden = true;
  $('#btn-cancelar-lanc').hidden = true;
  pintarFormLancamento();
}

function ligarEventos() {
  $$('.aba').forEach((b) => b.addEventListener('click', () => trocarAba(b.dataset.aba)));

  $('#btn-tema').addEventListener('click', () => {
    aplicarTema(estado.tema === 'claro' ? 'escuro' : 'claro');
    salvar();
  });

  /* ---------- painel ---------- */

  $$('#pilulas-horizonte .pilula').forEach((b) =>
    b.addEventListener('click', () => {
      estado.horizonte = +b.dataset.horizonte;
      salvar();
      pintarPainel();
    })
  );

  const mexeuCenario = () => {
    vista.cenario.vendas = +$('#cen-vendas').value / 100;
    vista.cenario.atrasoLiberacao = +$('#cen-atraso').value;
    pintarPainel();
  };
  $('#cen-vendas').addEventListener('input', mexeuCenario);
  $('#cen-atraso').addEventListener('input', mexeuCenario);
  $('#btn-zera-cenario').addEventListener('click', () => {
    $('#cen-vendas').value = 0;
    $('#cen-atraso').value = 0;
    mexeuCenario();
  });

  $('#btn-simular').addEventListener('click', () => {
    const valor = N.paraCentavos($('#sim-valor').value);
    const data = $('#sim-data').value || N.hojeIso();
    if (!valor || valor <= 0) {
      toast('Digite o valor do pagamento.', true);
      return;
    }
    const proj = projecao();
    const sim = N.simularPagamento(proj, valor, data);
    if (sim.cabe === null) {
      $('#resultado-simulacao').innerHTML = '<div class="aviso atencao"><span class="aviso-icone">▲</span><div>Essa data está fora do horizonte de ' + proj.horizonte + ' dias. Aumente o horizonte no gráfico.</div></div>';
      return;
    }
    const quando = N.quandoPosso(proj, valor);
    $('#resultado-simulacao').innerHTML =
      '<div class="aviso ' + (sim.cabe ? 'bom' : sim.negativa ? 'ruim' : 'atencao') + '"><span class="aviso-icone">' + (sim.cabe ? '✓' : '▲') + '</span><div>' +
      (sim.cabe
        ? 'Cabe. Pagando <b>' + esc(dinheiro(valor)) + '</b> em ' + esc(N.formatarData(data)) + ', o menor saldo do período fica em <b>' + esc(dinheiro(sim.menorSaldo)) + '</b> — folga de ' + esc(dinheiro(sim.folga)) + ' sobre o piso.'
        : 'Não cabe nessa data: o menor saldo iria para <b>' + esc(dinheiro(sim.menorSaldo)) + '</b>' + (sim.negativa ? ', <b>negativo</b>' : ', abaixo do piso de ' + esc(dinheiro(proj.piso))) + '. ' +
          (quando.data
            ? 'A primeira data em que esse pagamento cabe é <b>' + esc(N.formatarData(quando.data)) + '</b> (em ' + quando.emDias + ' dias).'
            : 'Dentro de ' + proj.horizonte + ' dias não existe data em que ele caiba — esse valor é grande demais para o caixa atual.')) +
      '</div></div>';
  });

  /* ---------- boletos ---------- */

  $('#btn-ler-linha').addEventListener('click', () => {
    const lido = N.lerLinhaDigitavel($('#b-linha').value, N.hojeIso());
    const selo = $('#selo-leitura');
    selo.hidden = false;

    if (!lido.valido) {
      selo.className = 'selo vermelho';
      selo.textContent = 'não consegui ler';
      toast('Código inválido: ' + lido.motivo, true);
      return;
    }

    const partes = [];
    if (lido.valor) {
      $('#b-valor').value = (lido.valor / 100).toFixed(2).replace('.', ',');
      partes.push('valor ' + dinheiro(lido.valor));
    }
    if (lido.vencimento) {
      $('#b-vencimento').value = lido.vencimento;
      partes.push('vence ' + N.formatarData(lido.vencimento));
    }
    $('#b-linha').value = N.formatarLinhaDigitavel($('#b-linha').value);

    selo.className = 'selo ' + (partes.length ? 'verde' : 'amarelo');
    selo.textContent = lido.tipo === 'arrecadacao' ? 'conta de consumo' : 'boleto banco ' + lido.banco;

    if (!partes.length) {
      toast('Li o código, mas ele não traz valor nem vencimento. Preencha na mão.', true);
      return;
    }
    toast('Li do código: ' + partes.join(' · ') + '. Confira antes de salvar.');
  });

  $('#btn-cancelar-boleto').addEventListener('click', limparFormBoleto);

  $('#b-pago').addEventListener('change', () => {
    const marcado = $('#b-pago').checked;
    $('#campo-pago-em').hidden = !marcado;
    if (marcado && !$('#b-pago-em').value) $('#b-pago-em').value = N.hojeIso();
  });

  $('#btn-trazer-fixas').addEventListener('click', () => {
    const j = janelaBoletos();
    const mes = j.mes || N.mesDe(N.hojeIso());
    const fixas = estado.recorrentes.filter((r) => r.ativo !== false && (r.tipo || 'saida') === 'saida');
    if (!fixas.length) {
      toast('Você ainda não tem contas fixas. Cadastre em Agenda.', true);
      return;
    }

    const jaTem = {};
    boletosDe().forEach((b) => {
      if (b.recorrente && N.mesDe(b.vencimento || b.data) === mes) jaTem[b.recorrente] = true;
    });
    const novas = fixas.filter((r) => !jaTem[r.id]);
    if (!novas.length) {
      toast('As contas fixas de ' + N.formatarMes(mes) + ' já estão na lista.');
      return;
    }
    if (!confirm('Criar ' + novas.length + ' boleto(s) de ' + N.formatarMes(mes) + ' a partir das suas contas fixas?')) return;

    const agora = new Date().toISOString();
    novas.forEach((r) => {
      estado.lancamentos.push({
        id: novoId(),
        criadoEm: agora,
        boleto: true,
        tipo: 'saida',
        descricao: r.descricao,
        valor: r.valor || 0,
        vencimento: N.diaDoMes(mes, r.dia || 1),
        data: N.diaDoMes(mes, r.dia || 1),
        categoria: r.categoria || '',
        carteira: r.carteira || '',
        recorrente: r.id,
        status: 'previsto',
        pagoEm: null,
      });
    });
    salvar();
    pintar();
    toast(novas.length + ' conta(s) de ' + N.formatarMes(mes) + ' na lista. Confira o valor de cada uma.');
  });

  $('#form-boleto').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const valor = N.paraCentavos($('#b-valor').value);
    const vencimento = $('#b-vencimento').value;
    if (!valor || valor <= 0) {
      toast('Valor inválido.', true);
      return;
    }
    if (!vencimento) {
      toast('Falta o vencimento.', true);
      return;
    }

    const pago = $('#b-pago').checked;
    const pagoEm = pago ? $('#b-pago-em').value || N.hojeIso() : null;
    const base = {
      boleto: true,
      tipo: 'saida',
      descricao: $('#b-beneficiario').value.trim(),
      valor: valor,
      vencimento: vencimento,
      categoria: $('#b-categoria').value,
      carteira: $('#b-carteira').value,
      recorrente: $('#b-recorrente').value || null,
      obs: $('#b-obs').value.trim(),
      linha: N.soDigitos($('#b-linha').value) || '',
    };

    if (vista.editandoBoleto) {
      const b = acharLanc(vista.editandoBoleto);
      const virouPago = pago && b.status !== 'realizado';
      Object.assign(b, base, {
        status: pago ? 'realizado' : 'previsto',
        pagoEm: pago ? pagoEm : null,
      });
      b.data = pago ? b.pagoEm : vencimento;
      if (virouPago) b.realizadoEmTs = new Date().toISOString();
      toast('Boleto atualizado.');
    } else {
      const quantas = Math.max(1, Math.min(60, +$('#b-parcelas').value || 1));
      const parcelas = N.gerarParcelas(base, quantas);
      parcelas.forEach((p) => {
        const estePago = pago && p.parcela === null; // so a conta unica entra ja paga
        estado.lancamentos.push(
          Object.assign({}, p, {
            id: novoId(),
            criadoEm: new Date().toISOString(),
            realizadoEmTs: estePago ? new Date().toISOString() : null,
            status: estePago ? 'realizado' : 'previsto',
            pagoEm: estePago ? pagoEm : null,
            data: estePago ? pagoEm : p.vencimento,
            descricao: p.parcela ? p.descricao + ' (' + p.parcela.n + '/' + p.parcela.de + ')' : p.descricao,
          })
        );
      });
      toast(quantas > 1 ? quantas + ' parcelas guardadas.' : 'Boleto guardado.');
    }

    limparFormBoleto();
    salvar();
    pintar();
  });

  $$('#pilulas-mes-boleto .pilula').forEach((b) =>
    b.addEventListener('click', () => {
      vista.boletos.quando = b.dataset.quando;
      $$('#pilulas-mes-boleto .pilula').forEach((x) => x.classList.toggle('ativa', x === b));
      pintarBoletos();
    })
  );

  $$('#pilulas-status-boleto .pilula').forEach((b) =>
    b.addEventListener('click', () => {
      vista.boletos.status = b.dataset.status;
      $$('#pilulas-status-boleto .pilula').forEach((x) => x.classList.toggle('ativa', x === b));
      pintarBoletos();
    })
  );

  $('#b-busca').addEventListener('input', () => {
    vista.boletos.busca = $('#b-busca').value;
    pintarBoletos();
  });

  /* ---------- lancamentos ---------- */

  $('#l-tipo').addEventListener('change', pintarFormLancamento);
  $('#btn-cancelar-lanc').addEventListener('click', limparFormLancamento);

  $('#form-lanc').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const tipo = $('#l-tipo').value;
    const valor = N.paraCentavos($('#l-valor').value);
    if (!valor || valor <= 0) {
      toast('Valor inválido.', true);
      return;
    }
    if (tipo === 'transferencia' && (!$('#l-carteira').value || !$('#l-destino').value)) {
      toast('Transferência precisa das duas carteiras: de onde sai e para onde vai.', true);
      return;
    }
    if (tipo === 'transferencia' && $('#l-carteira').value === $('#l-destino').value) {
      toast('Transferência para a mesma carteira não move nada.', true);
      return;
    }

    const dados = {
      data: $('#l-data').value,
      tipo: tipo,
      descricao: $('#l-descricao').value.trim(),
      valor: valor,
      categoria: tipo === 'transferencia' ? '' : $('#l-categoria').value,
      carteira: $('#l-carteira').value,
      carteiraDestino: tipo === 'transferencia' ? $('#l-destino').value : '',
      status: $('#l-status').value,
      pessoal: $('#l-pessoal').checked,
      estimado: $('#l-estimado').checked,
    };

    if (vista.editando) {
      const l = acharLanc(vista.editando);
      Object.assign(l, dados);
      toast('Lançamento atualizado.');
    } else {
      estado.lancamentos.push(Object.assign({ id: novoId(), criadoEm: new Date().toISOString() }, dados));
      toast('Lançamento salvo.');
    }
    limparFormLancamento();
    salvar();
    pintar();
  });

  ['f-mes', 'f-tipo', 'f-categoria', 'f-carteira'].forEach((id) =>
    $('#' + id).addEventListener('change', () => {
      vista.filtros[id.slice(2)] = $('#' + id).value;
      pintarLancamentos();
    })
  );
  $('#f-busca').addEventListener('input', () => {
    vista.filtros.busca = $('#f-busca').value;
    pintarLancamentos();
  });

  /* ---------- agenda ---------- */

  $('#r-tipo').addEventListener('change', pintarAgenda);

  $('#form-rec').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const valor = N.paraCentavos($('#r-valor').value);
    if (!valor || valor <= 0) {
      toast('Valor inválido.', true);
      return;
    }
    estado.recorrentes.push({
      id: novoId(),
      descricao: $('#r-descricao').value.trim(),
      valor: valor,
      dia: Math.min(31, Math.max(1, +$('#r-dia').value || 1)),
      tipo: $('#r-tipo').value,
      categoria: $('#r-categoria').value,
      carteira: $('#r-carteira').value,
      ativo: true,
    });
    $('#form-rec').reset();
    $('#r-dia').value = 5;
    salvar();
    pintar();
    toast('Conta fixa adicionada.');
  });

  /* ---------- orcamento ---------- */

  $('#o-modo').addEventListener('change', () => {
    estado.orcamento.modo = $('#o-modo').value;
    salvar();
    pintarOrcamento();
    pintarInvestir();
  });
  $('#o-base').addEventListener('change', () => {
    estado.orcamento.base = N.paraCentavos($('#o-base').value) || 0;
    salvar();
    pintarOrcamento();
    pintarInvestir();
  });
  $('#res-meses').addEventListener('change', () => {
    estado.reserva.metaMeses = Math.max(0, +$('#res-meses').value || 0);
    salvar();
    pintarOrcamento();
    pintarPainel();
    pintarInvestir();
  });

  $('#btn-add-envelope').addEventListener('click', () => {
    const nome = prompt('Nome do novo envelope:');
    if (!nome) return;
    estado.orcamento.envelopes.push({ id: novoId(), nome: nome.trim(), pct: 0, cor: 'var(--texto-2)' });
    salvar();
    pintarOrcamento();
    pintarAjustes();
  });

  $('#btn-virar-mes').addEventListener('click', () => {
    // fecha o mes ANTERIOR, que e o que ja terminou — fechar o mes corrente
    // acumularia envelopes que ainda nem foram usados
    const mes = N.mesDe(N.somarMeses(N.hojeIso(), -1));
    if (estado.orcamento.viradoAte && estado.orcamento.viradoAte >= mes) {
      toast(N.formatarMes(mes) + ' já foi fechado. Fechar de novo somaria a sobra duas vezes.', true);
      return;
    }
    const calc = baseDoMes(mes);
    const base = estado.orcamento.modo === 'manual' ? estado.orcamento.base || 0 : calc.base;
    const r = N.calcularOrcamento({ base: base, envelopes: estado.orcamento.envelopes }, gastoPorEnvelope(mes));
    if (!confirm('Fechar ' + N.formatarMes(mes) + ': o que sobrou em cada envelope naquele mês passa a ficar acumulado. Confirma?')) return;
    r.envelopes.forEach((e) => {
      const alvo = estado.orcamento.envelopes.find((x) => x.id === e.id);
      if (alvo) alvo.acumulado = Math.max(0, e.disponivel);
    });
    estado.orcamento.viradoAte = mes;
    salvar();
    pintarOrcamento();
    toast(N.formatarMes(mes) + ' fechado: sobras acumuladas.');
  });

  /* ---------- investir ---------- */

  $('#btn-quando').addEventListener('click', () => {
    const valor = N.paraCentavos($('#inv-valor').value);
    if (!valor || valor <= 0) {
      toast('Digite o valor da compra.', true);
      return;
    }
    const proj = projecao(Math.max(estado.horizonte, 180));
    const q = N.quandoPosso(proj, valor);
    const orc = orcamentoAtual().resultado;
    const env = orc.envelopes.find((e) => e.id === 'novos');
    $('#resultado-quando').innerHTML =
      '<div class="aviso ' + (q.emDias === 0 ? 'bom' : q.data ? 'atencao' : 'ruim') + '"><span class="aviso-icone">' + (q.emDias === 0 ? '✓' : '▲') + '</span><div>' +
      (q.data
        ? q.emDias === 0
          ? 'Cabe <b>hoje</b>: pagando ' + esc(dinheiro(valor)) + ' agora, o caixa ainda fica ' + esc(dinheiro(q.folga)) + ' acima do piso no pior dia.'
          : 'Cabe a partir de <b>' + esc(N.formatarData(q.data)) + '</b> — em ' + q.emDias + ' dias. Antes disso, esse pagamento fura o piso de segurança.'
        : 'Dentro de 180 dias não existe data em que ' + esc(dinheiro(valor)) + ' caiba sem furar o piso. Ou o valor é grande demais, ou a projeção precisa de premissas mais realistas.') +
      (env ? ' <br>Envelope de produtos novos: <b>' + esc(dinheiro(env.disponivel)) + '</b> disponível' + (env.disponivel < valor ? ' — <b>menos que a compra</b>, então ela comeria verba de outro envelope.' : '.') : '') +
      '</div></div>';
  });

  $('#btn-payback').addEventListener('click', () => {
    const investido = N.paraCentavos($('#pb-investido').value) || 0;
    const unidades = +$('#pb-unidades').value || 0;
    const margem = N.paraCentavos($('#pb-margem').value) || 0;
    const giro = N.lerNumero($('#pb-giro').value) || 0;
    if (!investido || !unidades || !giro) {
      toast('Preencha valor investido, unidades e venda por dia.', true);
      return;
    }
    const p = N.paybackCompra({ investido: investido, unidades: unidades, margemUnitaria: margem, vendaDiaria: giro });
    const dias = p.diasParaVender;
    const classe = dias <= 45 ? 'bom' : dias <= 90 ? 'atencao' : 'ruim';
    $('#resultado-payback').innerHTML =
      '<div class="aviso ' + classe + '"><span class="aviso-icone">' + (dias <= 45 ? '✓' : '▲') + '</span><div>' +
      'Esse lote leva <b>' + dias.toFixed(0) + ' dias</b> para vender inteiro (' + unidades + ' unidades a ' + giro + '/dia). ' +
      'Retorno total de <b>' + esc(dinheiro(p.retorno)) + '</b>' + (p.sobre ? ' — ' + esc(N.pct(p.sobre, 0)) + ' sobre o investido' : '') + '. ' +
      (p.diasParaEmpatar ? 'O dinheiro investido empata em <b>' + p.diasParaEmpatar.toFixed(0) + ' dias</b>. ' : '') +
      (dias <= 45
        ? 'Giro rápido: o mesmo dinheiro dá cerca de ' + (365 / dias).toFixed(1) + ' voltas por ano.'
        : dias <= 90
        ? 'Giro aceitável, mas já é bastante caixa parado. Compre menos e repita.'
        : 'Giro lento: ' + dias.toFixed(0) + ' dias é dinheiro congelado em prateleira. Compre um lote menor para testar.') +
      '</div></div>';
  });

  /* ---------- relatorios ---------- */

  $$('#pilulas-meses .pilula').forEach((b) =>
    b.addEventListener('click', () => {
      vista.mesesRelatorio = +b.dataset.meses;
      pintarRelatorios();
    })
  );

  /* ---------- importar ---------- */

  $('#imp-arquivo').addEventListener('change', (ev) => {
    const arq = ev.target.files && ev.target.files[0];
    if (!arq) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      // extrato de banco brasileiro ainda sai muito em Windows-1252; o caractere
      // de substituicao denuncia que o UTF-8 nao era a leitura certa
      if (String(leitor.result).indexOf('�') >= 0) {
        const outro = new FileReader();
        outro.onload = () => {
          $('#imp-texto').value = outro.result;
          toast('Arquivo carregado (acentos lidos como Windows-1252). Clique em “Ler extrato”.');
        };
        outro.readAsText(arq, 'windows-1252');
        return;
      }
      $('#imp-texto').value = leitor.result;
      toast('Arquivo carregado. Agora clique em “Ler extrato”.');
    };
    leitor.onerror = () => toast('Não consegui ler o arquivo.', true);
    leitor.readAsText(arq, 'utf-8');
  });

  $('#btn-ler-csv').addEventListener('click', lerExtrato);
  $('#btn-processar').addEventListener('click', processarExtrato);
  $('#btn-cancelar-imp').addEventListener('click', () => {
    vista.importacao = null;
    $('#cartao-previa').hidden = true;
    $('#cartao-colunas').hidden = true;
  });

  $('#btn-confirmar-imp').addEventListener('click', () => {
    const imp = vista.importacao;
    if (!imp || !imp.candidatos) return;
    const marcados = imp.candidatos.filter((c) => c.marcado);
    if (!marcados.length) {
      toast('Nenhuma linha marcada.', true);
      return;
    }
    marcados.forEach((c) => {
      estado.lancamentos.push({
        id: novoId(),
        data: c.data,
        tipo: c.tipo,
        descricao: c.descricao,
        valor: c.valor,
        categoria: c.tipo === 'transferencia' ? '' : c.categoria || '',
        carteira: c.carteira || '',
        carteiraDestino: c.tipo === 'transferencia' ? c.destino || '' : '',
        status: 'realizado',
        pessoal: !!c.pessoal,
        importado: true,
      });
    });
    vista.importacao = null;
    $('#cartao-previa').hidden = true;
    $('#cartao-colunas').hidden = true;
    $('#imp-texto').value = '';
    salvar();
    pintar();
    toast(marcados.length + ' lançamentos importados.');
  });

  $('#form-regra').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const contem = $('#rg-contem').value.trim();
    if (!contem) return;
    estado.regras.unshift({
      id: novoId(),
      contem: contem,
      tipo: $('#rg-tipo').value || '',
      categoria: $('#rg-categoria').value || '',
      pessoal: $('#rg-pessoal').checked,
    });
    $('#form-regra').reset();
    salvar();
    pintarImportar();
    toast('Regra adicionada no topo da lista.');
  });

  /* ---------- ajustes ---------- */

  $('#form-carteira').addEventListener('submit', (ev) => {
    ev.preventDefault();
    estado.carteiras.push({
      id: novoId(),
      nome: $('#c-nome').value.trim(),
      disponivel: N.paraCentavos($('#c-disponivel').value) || 0,
      conferidoEm: N.hojeIso(),
      conferidoEmTs: new Date().toISOString(),
      aLiberar: N.paraCentavos($('#c-liberar').value) || 0,
      diasLiberacao: Math.max(0, +$('#c-dias').value || 0),
      reserva: $('#c-reserva').checked,
    });
    $('#form-carteira').reset();
    $('#c-dias').value = 0;
    salvar();
    pintar();
    toast('Carteira adicionada.');
  });

  $('#form-categoria').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nome = $('#cat-nome').value.trim();
    if (!nome) return;
    estado.categorias.push({
      id: novoId(),
      nome: nome,
      tipo: $('#cat-tipo').value,
      envelope: $('#cat-envelope').value || null,
      obrigatoria: $('#cat-obrigatoria').checked,
    });
    $('#form-categoria').reset();
    salvar();
    pintar();
    toast('Categoria criada.');
  });

  const premissasMudaram = () => {
    estado.premissas.entradaDiaria = N.paraCentavos($('#p-entrada').value) || 0;
    estado.premissas.recompraMensal = N.paraCentavos($('#p-recompra').value) || 0;
    estado.premissas.diaRecompra = Math.min(28, Math.max(1, +$('#p-dia-recompra').value || 10));
    estado.premissas.colchao = N.paraCentavos($('#p-colchao').value) || 0;
    estado.premissas.custoFixoMensal = N.paraCentavos($('#p-custofixo').value) || null;
    estado.premissas.usarEntradaDiaria = $('#p-usar-entrada').checked;
    salvar();
    pintarPainel();
    pintarInvestir();
    pintarOrcamento();
  };
  ['p-entrada', 'p-recompra', 'p-dia-recompra', 'p-colchao', 'p-custofixo'].forEach((id) => $('#' + id).addEventListener('change', premissasMudaram));
  $('#p-usar-entrada').addEventListener('change', premissasMudaram);

  /* ---------- backup ---------- */

  $('#btn-exportar').addEventListener('click', () => {
    estado.backupEm = new Date().toISOString();
    salvar();
    baixar('caixa-empresa-backup-' + N.hojeIso() + '.json', JSON.stringify(estado, null, 2), 'application/json');
    toast('Backup baixado. Guarde fora do computador.');
    pintarAjustes();
  });

  $('#btn-exportar-csv').addEventListener('click', () => {
    const cab = 'data;tipo;descricao;categoria;carteira;valor;status;pessoal';
    const linhas = estado.lancamentos
      .slice()
      .sort((a, b) => (a.data < b.data ? -1 : 1))
      .map((l) =>
        [
          l.data,
          l.tipo,
          '"' + String(l.descricao || '').replace(/"/g, '""') + '"',
          nomeCategoria(l.categoria),
          nomeCarteira(l.carteira),
          (l.valor / 100).toFixed(2).replace('.', ','),
          l.status,
          l.pessoal ? 'sim' : '',
        ].join(';')
      );
    baixar('lancamentos-' + N.hojeIso() + '.csv', '﻿' + [cab].concat(linhas).join('\r\n'), 'text/csv');
  });

  $('#arq-importar').addEventListener('change', (ev) => {
    const arq = ev.target.files && ev.target.files[0];
    if (!arq) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const dados = JSON.parse(leitor.result);
        if (!dados || !Array.isArray(dados.lancamentos)) throw new Error('formato');
        if (!confirm('Restaurar o backup substitui TUDO que está no app agora (' + estado.lancamentos.length + ' lançamentos). Confirma?')) return;
        estado = Object.assign(estadoPadrao(), dados);
        aplicarTema(estado.tema);
        salvar();
        pintar();
        toast('Backup restaurado: ' + estado.lancamentos.length + ' lançamentos.');
      } catch (erro) {
        toast('Esse arquivo não é um backup válido do app.', true);
      }
    };
    leitor.readAsText(arq, 'utf-8');
    ev.target.value = '';
  });

  $('#btn-exemplos').addEventListener('click', () => {
    if (estado.lancamentos.length && !confirm('Isso adiciona lançamentos de exemplo junto com os seus. Dá para apagar só os exemplos depois. Continuar?')) return;
    const ex = window.dadosExemplo(N.hojeIso());
    ex.carteiras.forEach((c) => {
      if (!carteira(c.id)) estado.carteiras.push(Object.assign({ exemplo: true }, c));
    });
    ex.recorrentes.forEach((r) => {
      if (!estado.recorrentes.find((x) => x.id === r.id)) estado.recorrentes.push(Object.assign({ exemplo: true }, r));
    });
    ex.lancamentos.forEach((l) => estado.lancamentos.push(Object.assign({ id: novoId(), exemplo: true }, l)));
    estado.premissas.entradaDiaria = estado.premissas.entradaDiaria || 80000;
    estado.premissas.recompraMensal = estado.premissas.recompraMensal || 1200000;
    estado.premissas.colchao = estado.premissas.colchao || 100000;
    salvar();
    pintar();
    toast('Dados de exemplo carregados. São fictícios.');
  });

  $('#btn-apagar-exemplos').addEventListener('click', () => {
    const antes = estado.lancamentos.length;
    estado.lancamentos = estado.lancamentos.filter((l) => !l.exemplo);
    estado.recorrentes = estado.recorrentes.filter((r) => !r.exemplo);
    estado.carteiras = estado.carteiras.filter((c) => !c.exemplo);
    salvar();
    pintar();
    toast(antes - estado.lancamentos.length + ' lançamentos de exemplo apagados.');
  });

  $('#btn-zerar').addEventListener('click', () => {
    if (!confirm('Apagar TUDO: lançamentos, carteiras, contas fixas e orçamento. Isso não tem volta — tem backup?')) return;
    if (!confirm('Confirma de novo: apagar tudo e começar do zero?')) return;
    const tema = estado.tema;
    estado = estadoPadrao();
    estado.tema = tema;
    salvar();
    pintar();
    toast('App zerado.');
  });

  /* ---------- cliques e trocas dentro das tabelas ---------- */

  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-acao]');
    if (!btn) return;
    const id = btn.dataset.id;
    const acao = btn.dataset.acao;

    if (acao === 'editar') editarLancamento(id);

    if (acao === 'editar-boleto') editarBoleto(id);

    if (acao === 'pagar-boleto') {
      const b = acharLanc(id);
      if (!b) return;
      if (b.status === 'realizado') {
        b.status = 'previsto';
        b.pagoEm = null;
        b.data = b.vencimento || b.data;
        toast('Pagamento desfeito: a conta voltou para em aberto.');
      } else {
        b.status = 'realizado';
        b.pagoEm = N.hojeIso();
        b.data = b.pagoEm;
        // a hora do pagamento e o que faz o saldo da carteira se mexer hoje
        b.realizadoEmTs = new Date().toISOString();
        const atraso = N.diasEntre(b.vencimento || b.data, b.pagoEm);
        toast('Pago: ' + b.descricao + ' · ' + dinheiro(b.valor) + (atraso > 0 ? ' (com ' + atraso + ' dia(s) de atraso)' : ''));
      }
      salvar();
      pintar();
    }

    if (acao === 'apagar-boleto') {
      const b = acharLanc(id);
      if (!b) return;
      if (!confirm('Apagar o boleto “' + b.descricao + '” de ' + dinheiro(b.valor) + '?')) return;
      estado.lancamentos = estado.lancamentos.filter((x) => x.id !== id);
      if (vista.editandoBoleto === id) limparFormBoleto();
      salvar();
      pintar();
      toast('Boleto apagado.');
    }

    if (acao === 'copiar-linha') {
      const b = acharLanc(id);
      if (!b || !b.linha) return;
      const texto = N.soDigitos(b.linha);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(
          () => toast('Linha digitável copiada.'),
          () => toast('Não consegui copiar. O código é ' + texto, true)
        );
      } else {
        toast('Linha digitável: ' + texto);
      }
    }

    if (acao === 'apagar') {
      const l = acharLanc(id);
      if (!l) return;
      if (!confirm('Apagar “' + l.descricao + '” de ' + dinheiro(l.valor) + '?')) return;
      estado.lancamentos = estado.lancamentos.filter((x) => x.id !== id);
      if (vista.editando === id) limparFormLancamento();
      salvar();
      pintar();
      toast('Lançamento apagado.');
    }

    if (acao === 'realizar') {
      const l = acharLanc(id);
      if (!l) return;
      const eraOutroDia = l.data !== N.hojeIso();
      // o dinheiro andou AGORA: a data vira hoje e fica a hora, senao a conta
      // atrasada sumiria da projecao sem nunca sair do saldo
      if (!l.vencimento && eraOutroDia) l.vencimento = l.data;
      l.status = 'realizado';
      l.data = N.hojeIso();
      l.pagoEm = l.data;
      l.realizadoEmTs = new Date().toISOString();
      salvar();
      pintar();
      toast(eraOutroDia ? 'Marcado como pago hoje. Se o dinheiro saiu em outro dia, edite a data.' : 'Marcado como realizado.');
    }

    if (acao === 'apagar-rec') {
      estado.recorrentes = estado.recorrentes.filter((r) => r.id !== id);
      salvar();
      pintar();
    }

    if (acao === 'apagar-cart') {
      const usos = estado.lancamentos.filter((l) => l.carteira === id || l.carteiraDestino === id).length;
      if (usos && !confirm(usos + ' lançamentos usam essa carteira. Eles ficam sem carteira. Continuar?')) return;
      estado.carteiras = estado.carteiras.filter((c) => c.id !== id);
      salvar();
      pintar();
    }

    if (acao === 'apagar-cat') {
      const usos = estado.lancamentos.filter((l) => l.categoria === id).length;
      if (usos && !confirm(usos + ' lançamentos usam essa categoria. Eles ficam sem categoria. Continuar?')) return;
      estado.categorias = estado.categorias.filter((c) => c.id !== id);
      salvar();
      pintar();
    }

    if (acao === 'apagar-env') {
      estado.orcamento.envelopes = estado.orcamento.envelopes.filter((e) => e.id !== id);
      estado.categorias.forEach((c) => {
        if (c.envelope === id) c.envelope = null;
      });
      salvar();
      pintar();
    }

    if (acao === 'apagar-regra') {
      estado.regras = estado.regras.filter((r) => r.id !== id);
      salvar();
      pintarImportar();
    }

    if (acao === 'subir-regra') {
      const i = estado.regras.findIndex((r) => r.id === id);
      if (i > 0) {
        const t = estado.regras[i - 1];
        estado.regras[i - 1] = estado.regras[i];
        estado.regras[i] = t;
        salvar();
        pintarImportar();
      }
    }
  });

  document.addEventListener('change', (ev) => {
    const alvo = ev.target;

    // carteira editada direto na tabela
    if (alvo.dataset.cart) {
      const c = carteira(alvo.dataset.id);
      if (!c) return;
      const campo = alvo.dataset.cart;
      if (campo === 'nome') c.nome = alvo.value.trim();
      else if (campo === 'reserva') c.reserva = alvo.checked;
      else if (campo === 'diasLiberacao') c.diasLiberacao = Math.max(0, +alvo.value || 0);
      else {
        c[campo] = N.paraCentavos(alvo.value) || 0;
        // saldo digitado e sempre "conferido hoje": dali para frente ele anda
        // sozinho com os lancamentos
        if (campo === 'disponivel') {
          c.conferidoEm = N.hojeIso();
          c.conferidoEmTs = new Date().toISOString();
        }
      }
      salvar();
      pintar();
      return;
    }

    if (alvo.dataset.rec) {
      const r = estado.recorrentes.find((x) => x.id === alvo.dataset.rec);
      if (r) {
        r.ativo = alvo.checked;
        salvar();
        pintarPainel();
        pintarAgenda();
      }
      return;
    }

    if (alvo.dataset.envPct) {
      const e = estado.orcamento.envelopes.find((x) => x.id === alvo.dataset.envPct);
      if (e) {
        e.pct = Math.max(0, Math.min(100, +alvo.value || 0));
        salvar();
        pintarOrcamento();
        pintarInvestir();
      }
      return;
    }

    if (alvo.dataset.envAcum) {
      const e = estado.orcamento.envelopes.find((x) => x.id === alvo.dataset.envAcum);
      if (e) {
        e.acumulado = N.paraCentavos(alvo.value) || 0;
        salvar();
        pintarOrcamento();
        pintarInvestir();
      }
      return;
    }

    if (alvo.dataset.catEnv) {
      const c = categoria(alvo.dataset.catEnv);
      if (c) {
        c.envelope = alvo.value || null;
        salvar();
        pintarOrcamento();
      }
      return;
    }

    if (alvo.dataset.catObr) {
      const c = categoria(alvo.dataset.catObr);
      if (c) {
        c.obrigatoria = alvo.checked;
        salvar();
        pintarOrcamento();
        pintarInvestir();
      }
      return;
    }

    // previa da importacao
    if (alvo.id === 'prev-todos') {
      const marcar = alvo.checked;
      (vista.importacao.candidatos || []).forEach((c) => (c.marcado = marcar));
      pintarPrevia();
      return;
    }
    const achaCand = (chave) => (vista.importacao && vista.importacao.candidatos || []).find((c) => c.chave === chave);
    if (alvo.dataset.prev) {
      const c = achaCand(alvo.dataset.prev);
      if (c) c.marcado = alvo.checked;
      return;
    }
    if (alvo.dataset.prevTipo) {
      const c = achaCand(alvo.dataset.prevTipo);
      if (c) {
        c.tipo = alvo.value;
        if (c.tipo === 'transferencia') c.categoria = '';
        pintarPrevia();
      }
      return;
    }
    if (alvo.dataset.prevCat) {
      const c = achaCand(alvo.dataset.prevCat);
      if (c) c.categoria = alvo.value;
      return;
    }
    if (alvo.dataset.prevDest) {
      const c = achaCand(alvo.dataset.prevDest);
      if (c) c.destino = alvo.value;
      return;
    }
    if (alvo.dataset.prevPessoal) {
      const c = achaCand(alvo.dataset.prevPessoal);
      if (c) c.pessoal = alvo.checked;
    }
  });
}

function baixar(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================ INICIO === */

function iniciar() {
  carregar();
  aplicarTema(estado.tema);
  $('#l-data').value = N.hojeIso();
  $('#sim-data').value = N.hojeIso();
  // o navegador restaura o valor dos sliders ao recarregar; o cenario comeca no normal
  $('#cen-vendas').value = 0;
  $('#cen-atraso').value = 0;
  ligarEventos();
  pintar();
}

if (typeof document !== 'undefined') iniciar();
