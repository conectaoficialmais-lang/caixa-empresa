/**
 * Nucleo do Caixa da Empresa: so contas, nada de interface.
 *
 * Duas regras que valem para todo o arquivo:
 *   1. DINHEIRO E SEMPRE INTEIRO, EM CENTAVOS. Nunca float para valor.
 *      R$ 1.234,56 vira 123456. Soma de centavos nunca erra; soma de float erra.
 *   2. DATA E SEMPRE TEXTO 'AAAA-MM-DD', tratada como data local.
 *      new Date('2026-10-26') e lido como UTC e, no Brasil, mostra dia 25.
 *      Por isso aqui ninguem usa new Date(texto) — usa partesData()/montarData().
 *
 * Roda no navegador (window.Nucleo) e no Node (module.exports), para os testes.
 */

/* ========================================================== NUMEROS ===== */

/**
 * Le numero em formato brasileiro ou solto. Mesma funcao do app Preco Justo,
 * que ja esta testada: "1.234,56", "R$ 737.734,00", "2,5mi", "-13.132".
 * Devolve null quando nao da para ler (campo vazio, "#N/A", texto).
 */
function lerNumero(txt) {
  if (txt === null || txt === undefined) return null;
  let s = String(txt).trim().toLowerCase();
  if (!s) return null;

  let escala = 1;
  const sufixo = s.match(/(bi|bilh(?:ao|ão|oes|ões)|mi|milh(?:ao|ão|oes|ões)|mil|k)\.?$/);
  if (sufixo) {
    const u = sufixo[1];
    escala = u.startsWith('bi') ? 1e9 : u.startsWith('mi') && u !== 'mil' ? 1e6 : 1e3;
    s = s.slice(0, sufixo.index).trim();
  }

  s = s.replace(/r\$/g, '').replace(/%/g, '').replace(/[\s ]/g, '');

  // parentese = negativo, como em extrato contabil: (1.234,56)
  let negativoPorParentese = false;
  if (s.length > 2 && s[0] === '(' && s[s.length - 1] === ')') {
    negativoPorParentese = true;
    s = s.slice(1, -1);
  }
  if (!s || s === '-') return null;

  const temPonto = s.includes('.');
  const temVirgula = s.includes(',');

  if (temPonto && temVirgula) {
    // formato brasileiro cheio: ponto e milhar, virgula e decimal
    s = s.split('.').join('').replace(',', '.');
  } else if (temVirgula) {
    s = s.replace(',', '.');
  } else if (temPonto) {
    // so ponto: milhar se vier em grupos de 3 (1.234.567), senao decimal (1.5)
    const partes = s.replace('-', '').split('.');
    const milhar = partes.length > 1 && partes.slice(1).every((p) => p.length === 3);
    if (milhar) s = partes.join('') * (s.startsWith('-') ? -1 : 1) + '';
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return (negativoPorParentese ? -1 : 1) * n * escala;
}

/** Texto ou numero -> centavos inteiros. "1.234,56" -> 123456. */
function paraCentavos(valor) {
  const n = typeof valor === 'number' ? valor : lerNumero(valor);
  if (n === null || !Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Centavos -> "R$ 1.234,56". */
function formatarBRL(centavos, opcoes) {
  const o = opcoes || {};
  const n = (centavos || 0) / 100;
  const txt = Math.abs(n).toLocaleString('pt-BR', {
    minimumFractionDigits: o.semCentavos ? 0 : 2,
    maximumFractionDigits: o.semCentavos ? 0 : 2,
  });
  const sinal = n < 0 ? '-' : o.comMais && n > 0 ? '+' : '';
  return sinal + 'R$ ' + txt;
}

/** Centavos -> "R$ 12,3 mil", para KPI e eixo de grafico. */
function moedaCurta(centavos) {
  const n = (centavos || 0) / 100;
  const abs = Math.abs(n);
  const sinal = n < 0 ? '-' : '';
  if (abs >= 1e6) return sinal + 'R$ ' + (abs / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
  if (abs >= 1000) return sinal + 'R$ ' + (abs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
  return sinal + 'R$ ' + abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function pct(fracao, casas) {
  if (fracao === null || fracao === undefined || !Number.isFinite(fracao)) return '—';
  const c = casas === undefined ? 1 : casas;
  return (fracao * 100).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }) + '%';
}

/* ============================================================ DATAS ===== */

function partesData(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { ano: +m[1], mes: +m[2], dia: +m[3] };
}

/** 'AAAA-MM-DD' -> Date local ao meio-dia, para nao escorregar por fuso. */
function montarData(iso) {
  const p = partesData(iso);
  if (!p) return null;
  return new Date(p.ano, p.mes - 1, p.dia, 12, 0, 0);
}

function paraIso(data) {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return a + '-' + m + '-' + d;
}

function hojeIso(agora) {
  return paraIso(agora || new Date());
}

function somarDias(iso, n) {
  const d = montarData(iso);
  if (!d) return null;
  d.setDate(d.getDate() + n);
  return paraIso(d);
}

function somarMeses(iso, n) {
  const p = partesData(iso);
  if (!p) return null;
  const d = new Date(p.ano, p.mes - 1 + n, 1, 12, 0, 0);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(p.dia, ultimo));
  return paraIso(d);
}

function diasEntre(de, ate) {
  const a = montarData(de);
  const b = montarData(ate);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}

/** 'AAAA-MM-DD' -> 'AAAA-MM' (o mes, a competencia). */
function mesDe(iso) {
  return String(iso || '').slice(0, 7);
}

function formatarData(iso, opcoes) {
  const p = partesData(iso);
  if (!p) return '—';
  const o = opcoes || {};
  const dia = String(p.dia).padStart(2, '0');
  const mes = String(p.mes).padStart(2, '0');
  if (o.curta) return dia + '/' + mes;
  return dia + '/' + mes + '/' + p.ano;
}

const MESES_BR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatarMes(mes) {
  const m = String(mes || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return '—';
  return MESES_BR[+m[2] - 1] + '/' + m[1].slice(2);
}

/** Dia 31 em mes de 30 cai no ultimo dia, nao vaza para o mes seguinte. */
function diaDoMes(mes, dia) {
  const m = String(mes).match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const ultimo = new Date(+m[1], +m[2], 0).getDate();
  return m[1] + '-' + m[2] + '-' + String(Math.min(Math.max(1, dia), ultimo)).padStart(2, '0');
}

/** Le data de extrato: 26/10/2026, 26-10-2026, 2026-10-26, 26/10/26. */
function lerData(txt) {
  const s = String(txt || '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + String(+m[2]).padStart(2, '0') + '-' + String(+m[3]).padStart(2, '0');
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let ano = +m[3];
    if (ano < 100) ano += 2000;
    return ano + '-' + String(+m[2]).padStart(2, '0') + '-' + String(+m[1]).padStart(2, '0');
  }
  return null;
}

/* ====================================================== CARTEIRAS ======= */

/**
 * Soma das carteiras. "disponivel" e o que da para gastar hoje; "aLiberar" e
 * venda feita que o marketplace ainda nao soltou.
 * CAIXA DA EMPRESA = os dois somados, nunca so o saldo do banco.
 */
function somarCarteiras(carteiras) {
  const lista = carteiras || [];
  const disponivel = lista.reduce((s, c) => s + (c.disponivel || 0), 0);
  const aLiberar = lista.reduce((s, c) => s + (c.aLiberar || 0), 0);
  const reserva = lista.filter((c) => c.reserva).reduce((s, c) => s + (c.disponivel || 0), 0);
  return { disponivel: disponivel, aLiberar: aLiberar, total: disponivel + aLiberar, reserva: reserva, livre: disponivel - reserva };
}

/* ====================================================== RECORRENTES ===== */

/**
 * Transforma contas fixas em lancamentos de um periodo.
 * Cada recorrente vale do mes de inicio ao mes de fim (quando tem).
 */
function expandirRecorrentes(recorrentes, de, ate) {
  const saida = [];
  if (!de || !ate || de > ate) return saida;
  const mesFim = mesDe(ate);
  let mes = mesDe(de);
  let guarda = 0;
  while (mes <= mesFim && guarda++ < 600) {
    (recorrentes || []).forEach((r) => {
      if (r.ativo === false) return;
      if (r.inicio && mes < mesDe(r.inicio)) return;
      if (r.fim && mes > mesDe(r.fim)) return;
      const data = diaDoMes(mes, r.dia || 1);
      if (!data || data < de || data > ate) return;
      saida.push({
        id: 'rec:' + r.id + ':' + mes,
        data: data,
        tipo: r.tipo || 'saida',
        descricao: r.descricao,
        valor: r.valor || 0,
        categoria: r.categoria || '',
        carteira: r.carteira || '',
        status: 'previsto',
        recorrente: r.id,
      });
    });
    mes = mesDe(somarMeses(mes + '-01', 1));
  }
  return saida.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

/* ======================================================= PROJECAO ======= */

/**
 * Projecao de caixa dia a dia.
 *
 * Como a curva e montada:
 *   saldo inicial  = disponivel de todas as carteiras
 *   + liberacoes   = o "aLiberar" de cada carteira, diluido nos dias que faltam
 *                    para liberar (atrasoLiberacao empurra esses dias)
 *   + entrada diaria estimada = premissa de venda nova, so DEPOIS do maior prazo
 *                    de liberacao (antes disso o dinheiro ja esta no aLiberar),
 *                    ajustada pelo cenario de vendas
 *   - contas fixas (recorrentes)
 *   - lancamentos previstos com data no futuro
 *   - recompra de estoque planejada (premissa) — sem isso a curva sobe demais,
 *     porque na vida real o fornecedor e recomprado todo mes
 *
 * TRANSFERENCIA NAO ENTRA. Mandar dinheiro do Mercado Pago para o Inter nao
 * cria nem destroi caixa; so muda de bolso. Contar como entrada infla tudo.
 */
function projetar(opcoes) {
  const o = opcoes || {};
  const carteiras = o.carteiras || [];
  const hoje = o.hoje || hojeIso();
  const horizonte = Math.max(1, Math.min(365, o.horizonte || 90));
  const fim = somarDias(hoje, horizonte - 1);
  const premissas = o.premissas || {};
  const cenario = o.cenario || {};

  const fatorVendas = Math.max(0, 1 + (cenario.vendas || 0));
  const atraso = Math.max(0, cenario.atrasoLiberacao || 0);

  const soma = somarCarteiras(carteiras);

  const porDia = {};
  const empurra = (data, valor) => {
    if (!data || data < hoje || data > fim) return;
    porDia[data] = (porDia[data] || 0) + valor;
  };

  // liberacao do pendente de cada carteira, diluida dia a dia
  let maiorPrazo = 0;
  carteiras.forEach((c) => {
    const pendente = c.aLiberar || 0;
    if (!pendente) return;
    const dias = Math.max(1, (c.diasLiberacao || 1) + atraso);
    maiorPrazo = Math.max(maiorPrazo, dias);
    const fatia = Math.floor(pendente / dias);
    let sobra = pendente - fatia * dias;
    for (let i = 1; i <= dias; i++) {
      let v = fatia;
      if (sobra > 0) {
        v += 1; // centavo que sobra vai nos primeiros dias
        sobra -= 1;
      }
      empurra(somarDias(hoje, i), v);
    }
  });

  // venda nova estimada, so depois do maior prazo de liberacao
  const entradaDiaria = premissas.usarEntradaDiaria === false ? 0 : Math.round((premissas.entradaDiaria || 0) * fatorVendas);
  if (entradaDiaria > 0) {
    for (let i = maiorPrazo + 1; i <= horizonte - 1; i++) empurra(somarDias(hoje, i), entradaDiaria);
  }

  // contas fixas + lancamentos previstos
  const eventos = []
    .concat(expandirRecorrentes(o.recorrentes, somarDias(hoje, 1), fim))
    .concat((o.lancamentos || []).filter((l) => l.data > hoje && l.data <= fim && l.status !== 'realizado'));

  eventos.forEach((l) => {
    if (l.tipo === 'transferencia') return;
    const v = l.valor || 0;
    const ajustado = l.tipo === 'entrada' && l.estimado ? Math.round(v * fatorVendas) : v;
    empurra(l.data, l.tipo === 'entrada' ? ajustado : -ajustado);
  });

  // recompra de estoque planejada (o furo conhecido de toda projecao de caixa)
  const recompra = premissas.recompraMensal || 0;
  if (recompra > 0) {
    const dia = Math.min(28, Math.max(1, premissas.diaRecompra || 10));
    let mes = mesDe(hoje);
    for (let i = 0; i < 14; i++) {
      const data = diaDoMes(mes, dia);
      if (data > hoje && data <= fim) empurra(data, -recompra);
      mes = mesDe(somarMeses(mes + '-01', 1));
    }
  }

  // a curva
  const dias = [];
  let saldo = soma.disponivel;
  let menor = { saldo: saldo, data: hoje };
  for (let i = 0; i < horizonte; i++) {
    const data = somarDias(hoje, i);
    const mov = porDia[data] || 0;
    saldo += mov;
    dias.push({ data: data, movimento: mov, saldo: saldo });
    if (saldo < menor.saldo) menor = { saldo: saldo, data: data };
  }

  // menor saldo daqui para frente, por dia (usado por quandoPosso/simular)
  const minimoDaqui = new Array(dias.length);
  let acc = Infinity;
  for (let i = dias.length - 1; i >= 0; i--) {
    acc = Math.min(acc, dias[i].saldo);
    minimoDaqui[i] = acc;
  }

  const piso = o.piso || 0;
  const diaFura = dias.find((d) => d.saldo < piso);

  return {
    hoje: hoje,
    horizonte: horizonte,
    dias: dias,
    saldoInicial: soma.disponivel,
    saldoFinal: dias.length ? dias[dias.length - 1].saldo : soma.disponivel,
    menorSaldo: menor.saldo,
    dataMenorSaldo: menor.data,
    minimoDaqui: minimoDaqui,
    piso: piso,
    furaPiso: !!diaFura,
    dataFuraPiso: diaFura ? diaFura.data : null,
    negativa: menor.saldo < 0,
    entradasPrevistas: dias.reduce((s, d) => s + (d.movimento > 0 ? d.movimento : 0), 0),
    saidasPrevistas: dias.reduce((s, d) => s + (d.movimento < 0 ? -d.movimento : 0), 0),
  };
}

/** "Consigo pagar X no dia D?" — olha o menor saldo com o pagamento dentro. */
function simularPagamento(projecao, valor, data) {
  const dias = projecao.dias || [];
  const i = dias.findIndex((d) => d.data >= data);
  if (i < 0) return { cabe: null, motivo: 'fora do horizonte' };
  const menorDepois = (projecao.minimoDaqui[i] || 0) - valor;
  const menorAntes = i === 0 ? Infinity : Math.min.apply(null, dias.slice(0, i).map((d) => d.saldo));
  const menor = Math.min(menorAntes, menorDepois);
  return {
    cabe: menor >= projecao.piso,
    menorSaldo: menor,
    folga: menor - projecao.piso,
    negativa: menor < 0,
    data: dias[i].data,
  };
}

/**
 * "Quando eu consigo pagar X sem furar o piso?"
 * Primeira data do horizonte em que o pagamento cabe.
 */
function quandoPosso(projecao, valor) {
  const dias = projecao.dias || [];
  for (let i = 0; i < dias.length; i++) {
    const folga = (projecao.minimoDaqui[i] || 0) - valor - projecao.piso;
    if (folga >= 0) return { data: dias[i].data, emDias: i, folga: folga };
  }
  return { data: null, emDias: null, folga: null };
}

/* ======================================================= ORCAMENTO ====== */

/**
 * Divide a sobra do mes em envelopes (%) e compara com o que foi gasto.
 * base = o que sobra depois das contas obrigatorias. Sem base, sem orcamento.
 */
function calcularOrcamento(orcamento, gastoPorEnvelope) {
  const o = orcamento || {};
  const base = o.base || 0;
  const envelopes = (o.envelopes || []).map((e) => {
    const planejado = Math.round((base * (e.pct || 0)) / 100);
    const gasto = (gastoPorEnvelope || {})[e.id] || 0;
    const acumulado = e.acumulado || 0;
    const teto = planejado + acumulado;
    return {
      id: e.id,
      nome: e.nome,
      cor: e.cor,
      pct: e.pct || 0,
      planejado: planejado,
      acumulado: acumulado,
      gasto: gasto,
      disponivel: teto - gasto,
      usado: teto > 0 ? gasto / teto : null,
      estourou: teto - gasto < 0,
    };
  });
  const somaPct = envelopes.reduce((s, e) => s + e.pct, 0);
  const planejado = envelopes.reduce((s, e) => s + e.planejado, 0);
  return {
    base: base,
    envelopes: envelopes,
    somaPct: somaPct,
    pctValida: Math.abs(somaPct - 100) < 0.01,
    planejado: planejado,
    gasto: envelopes.reduce((s, e) => s + e.gasto, 0),
    naoAlocado: base - planejado,
  };
}

/** Reserva de emergencia: meta = N meses de custo fixo. */
function calcularReserva(reserva, custoFixoMensal, saldoReserva) {
  const meses = (reserva || {}).metaMeses || 0;
  const meta = Math.round((custoFixoMensal || 0) * meses);
  const saldo = saldoReserva || 0;
  return {
    metaMeses: meses,
    meta: meta,
    saldo: saldo,
    falta: Math.max(0, meta - saldo),
    progresso: meta > 0 ? Math.min(1, saldo / meta) : null,
    mesesCobertos: custoFixoMensal > 0 ? saldo / custoFixoMensal : null,
    completa: meta > 0 && saldo >= meta,
  };
}

/* ====================================================== INDICADORES ==== */

/**
 * Fecha um mes em regime de CAIXA (conta o dia em que o dinheiro andou).
 * ATENCAO: "resultado" aqui NAO e lucro. Compra de estoque e saida de caixa no
 * mes em que foi paga; no lucro ela so aparece quando a mercadoria vende.
 * Para lucro, use o DRE.
 */
function fecharMes(lancamentos, mes, opcoes) {
  const o = opcoes || {};
  const soRealizado = o.soRealizado !== false;
  const lista = (lancamentos || []).filter((l) => mesDe(l.data) === mes && (!soRealizado || l.status === 'realizado'));

  let entradas = 0;
  let saidas = 0;
  let pessoais = 0;
  let transferencias = 0;
  const porCategoria = {};
  const porCarteira = {};

  lista.forEach((l) => {
    const v = l.valor || 0;
    if (l.tipo === 'transferencia') {
      transferencias += v;
      return;
    }
    if (l.tipo === 'entrada') entradas += v;
    else {
      saidas += v;
      if (l.pessoal) pessoais += v;
    }
    const chave = (l.tipo === 'entrada' ? '+' : '-') + (l.categoria || 'sem-categoria');
    porCategoria[chave] = (porCategoria[chave] || 0) + v;
    if (l.carteira) porCarteira[l.carteira] = (porCarteira[l.carteira] || 0) + (l.tipo === 'entrada' ? v : -v);
  });

  return {
    mes: mes,
    entradas: entradas,
    saidas: saidas,
    resultado: entradas - saidas,
    pessoais: pessoais,
    pctPessoal: saidas > 0 ? pessoais / saidas : null,
    transferencias: transferencias,
    porCategoria: porCategoria,
    porCarteira: porCarteira,
    quantidade: lista.length,
  };
}

/** Serie de meses fechados, do mais antigo para o mais novo. */
function serieMensal(lancamentos, meses, ateMes, opcoes) {
  const fim = ateMes || mesDe(hojeIso());
  const saida = [];
  for (let i = Math.max(1, meses) - 1; i >= 0; i--) {
    saida.push(fecharMes(lancamentos, mesDe(somarMeses(fim + '-01', -i)), opcoes));
  }
  return saida;
}

/**
 * Quantos meses a empresa sobrevive sem vender nada: caixa / custo fixo mensal.
 * Numero de susto, de proposito.
 */
function calcularRunway(caixaTotal, custoFixoMensal) {
  if (!custoFixoMensal || custoFixoMensal <= 0) return null;
  return caixaTotal / custoFixoMensal;
}

/**
 * Poder de compra livre: o que da para comprometer em produto novo HOJE sem
 * encostar na reserva nem no colchao de seguranca.
 */
function poderDeCompra(opcoes) {
  const o = opcoes || {};
  const disponivel = o.disponivel || 0;
  const compromissos = o.compromissos || 0;
  const reserva = o.reserva || 0;
  const colchao = o.colchao || 0;
  const livre = disponivel - compromissos - reserva - colchao;
  return {
    disponivel: disponivel,
    compromissos: compromissos,
    reserva: reserva,
    colchao: colchao,
    livre: livre,
    podeComprar: livre > 0,
  };
}

/** Soma o que ja esta comprometido entre hoje e N dias (contas + fixas). */
function compromissosAte(lancamentos, recorrentes, hoje, dias) {
  const fim = somarDias(hoje, dias);
  const previstos = (lancamentos || []).filter(
    (l) => l.tipo === 'saida' && l.status !== 'realizado' && l.data >= hoje && l.data <= fim
  );
  const fixas = expandirRecorrentes(recorrentes, hoje, fim).filter((l) => l.tipo === 'saida');
  return previstos.concat(fixas).reduce((s, l) => s + (l.valor || 0), 0);
}

/**
 * Payback de uma compra de estoque: em quantos dias o dinheiro volta.
 * margemUnitaria = o que sobra por unidade depois de TODOS os custos de venda.
 */
function paybackCompra(opcoes) {
  const o = opcoes || {};
  const investido = o.investido || 0;
  const unidades = o.unidades || 0;
  const margem = o.margemUnitaria || 0;
  const vendaDiaria = o.vendaDiaria || 0;
  if (!unidades || vendaDiaria <= 0) return { diasParaVender: null, diasParaEmpatar: null, retorno: null, sobre: null };
  const diasParaVender = unidades / vendaDiaria;
  const retorno = unidades * margem;
  return {
    diasParaVender: diasParaVender,
    diasParaEmpatar: margem > 0 ? investido / (margem * vendaDiaria) : null,
    retorno: retorno,
    sobre: investido > 0 ? retorno / investido : null,
  };
}

/* ============================================================= CSV ====== */

/** Divide CSV respeitando aspas. Detecta ; ou , ou tab como separador. */
function lerCsv(texto) {
  const limpo = String(texto || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!limpo.trim()) return { separador: ';', linhas: [] };

  const primeira = limpo.split('\n').find((l) => l.trim()) || '';
  const contar = (s) => primeira.split(s).length - 1;
  const separador = [';', ',', '\t'].sort((a, b) => contar(b) - contar(a))[0];

  const linhas = [];
  let campo = '';
  let linha = [];
  let dentroAspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (dentroAspas) {
      if (c === '"' && limpo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') dentroAspas = false;
      else campo += c;
    } else if (c === '"') dentroAspas = true;
    else if (c === separador) {
      linha.push(campo.trim());
      campo = '';
    } else if (c === '\n') {
      linha.push(campo.trim());
      linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += c;
  }
  if (campo !== '' || linha.length) {
    linha.push(campo.trim());
    linhas.push(linha);
  }

  return { separador: separador, linhas: linhas.filter((l) => l.some((c) => c !== '')) };
}

/**
 * Adivinha pelo cabecalho qual coluna e data / descricao / valor.
 * Extrato de banco quase sempre tem esses nomes; quando nao tem, quem importa
 * escolhe na mao na tela de importacao.
 */
function adivinharColunas(cabecalho) {
  const nomes = (cabecalho || []).map((c) => String(c || '').toLowerCase());
  const achar = (termos) => nomes.findIndex((n) => termos.some((t) => n.includes(t)));
  return {
    data: achar(['data', 'date', 'dt_', 'dia']),
    descricao: achar(['descri', 'hist', 'lanc', 'lanç', 'detalhe', 'memo', 'titulo', 'identifica']),
    valor: achar(['valor', 'value', 'amount', 'montante', 'vlr']),
    saldo: achar(['saldo', 'balance']),
    entrada: achar(['credito', 'crédito', 'entrada']),
    saida: achar(['debito', 'débito', 'saida', 'saída']),
  };
}

/**
 * Linhas de CSV -> lancamentos candidatos.
 * Valor negativo vira saida, positivo vira entrada (padrao de extrato).
 * Quando o extrato tem colunas separadas de credito e debito, usa as duas.
 */
function mapearLinhas(linhas, mapa, opcoes) {
  const o = opcoes || {};
  const m = mapa || {};
  const temCabecalho = o.temCabecalho !== false;
  const corpo = temCabecalho ? (linhas || []).slice(1) : linhas || [];
  const candidatos = [];
  const recusados = [];

  corpo.forEach((linha, i) => {
    const numeroLinha = i + (temCabecalho ? 2 : 1);
    const data = lerData(linha[m.data]);
    let centavos = null;

    if (m.valor >= 0) centavos = paraCentavos(linha[m.valor]);
    if ((centavos === null || centavos === 0) && m.entrada >= 0) {
      const e = paraCentavos(linha[m.entrada]);
      const s = m.saida >= 0 ? paraCentavos(linha[m.saida]) : null;
      if (e) centavos = Math.abs(e);
      else if (s) centavos = -Math.abs(s);
    }

    const descricao = String(linha[m.descricao] || '').trim();

    if (!data || centavos === null || centavos === 0) {
      recusados.push({ linha: numeroLinha, motivo: !data ? 'data' : 'valor', bruto: linha.join(' | ').slice(0, 120) });
      return;
    }

    candidatos.push({
      data: data,
      descricao: descricao || '(sem descricao)',
      valor: Math.abs(centavos),
      tipo: centavos < 0 ? 'saida' : 'entrada',
      status: 'realizado',
    });
  });

  return { candidatos: candidatos, recusados: recusados };
}

/** Chave de duplicata: mesma data, mesmo tipo, mesmo valor, descricao parecida. */
function chaveLancamento(l) {
  const desc = String(l.descricao || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24);
  return [l.data, l.tipo, l.valor, desc].join('|');
}

/** Separa o que e novo do que ja esta lancado. */
function separarNovos(candidatos, existentes) {
  const vistos = {};
  (existentes || []).forEach((l) => {
    vistos[chaveLancamento(l)] = true;
  });
  const novos = [];
  const repetidos = [];
  (candidatos || []).forEach((c) => {
    const k = chaveLancamento(c);
    if (vistos[k]) {
      repetidos.push(c);
      return;
    }
    vistos[k] = true;
    novos.push(c);
  });
  return { novos: novos, repetidos: repetidos };
}

/**
 * Regras de classificacao por pedaco da descricao. Cada regra pode marcar
 * categoria, se e transferencia e se e gasto pessoal pago pela empresa.
 * A primeira que casar ganha — por isso a ordem da lista importa.
 */
function aplicarRegras(descricao, regras) {
  const d = String(descricao || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const lista = regras || [];
  for (let i = 0; i < lista.length; i++) {
    const termo = String(lista[i].contem || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
    if (!termo) continue;
    if (d.includes(termo)) return lista[i];
  }
  return null;
}

/** Classifica uma lista inteira de candidatos. */
function classificarLote(candidatos, regras) {
  return (candidatos || []).map((c) => {
    const r = aplicarRegras(c.descricao, regras);
    if (!r) return Object.assign({}, c, { categoria: '', classificado: false });
    return Object.assign({}, c, {
      categoria: r.categoria || '',
      tipo: r.tipo || c.tipo,
      pessoal: !!r.pessoal,
      carteira: r.carteira || c.carteira,
      classificado: true,
    });
  });
}

/* ========================================================= EXPORTA ====== */

const Nucleo = {
  lerNumero: lerNumero,
  paraCentavos: paraCentavos,
  formatarBRL: formatarBRL,
  moedaCurta: moedaCurta,
  pct: pct,
  partesData: partesData,
  montarData: montarData,
  paraIso: paraIso,
  hojeIso: hojeIso,
  somarDias: somarDias,
  somarMeses: somarMeses,
  diasEntre: diasEntre,
  mesDe: mesDe,
  formatarData: formatarData,
  formatarMes: formatarMes,
  diaDoMes: diaDoMes,
  lerData: lerData,
  MESES_BR: MESES_BR,
  somarCarteiras: somarCarteiras,
  expandirRecorrentes: expandirRecorrentes,
  projetar: projetar,
  simularPagamento: simularPagamento,
  quandoPosso: quandoPosso,
  calcularOrcamento: calcularOrcamento,
  calcularReserva: calcularReserva,
  fecharMes: fecharMes,
  serieMensal: serieMensal,
  calcularRunway: calcularRunway,
  poderDeCompra: poderDeCompra,
  compromissosAte: compromissosAte,
  paybackCompra: paybackCompra,
  lerCsv: lerCsv,
  adivinharColunas: adivinharColunas,
  mapearLinhas: mapearLinhas,
  chaveLancamento: chaveLancamento,
  separarNovos: separarNovos,
  aplicarRegras: aplicarRegras,
  classificarLote: classificarLote,
};

if (typeof module !== 'undefined' && module.exports) module.exports = Nucleo;
if (typeof window !== 'undefined') window.Nucleo = Nucleo;
