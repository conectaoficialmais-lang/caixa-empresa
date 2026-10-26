#!/usr/bin/env node
/**
 * Testes das funcoes puras de assets/nucleo.js.
 * Uso: node tools/testar.js
 */

const N = require('../assets/nucleo.js');

let passou = 0;
const falhou = [];

function conferir(nome, obtido, esperado) {
  const igual =
    typeof esperado === 'number' && typeof obtido === 'number'
      ? Math.abs(obtido - esperado) < 1e-9
      : JSON.stringify(obtido) === JSON.stringify(esperado);
  if (igual) passou++;
  else falhou.push(nome + ': esperado ' + JSON.stringify(esperado) + ', obtido ' + JSON.stringify(obtido));
}

function conferirPerto(nome, obtido, esperado, tolerancia) {
  if (typeof obtido === 'number' && Math.abs(obtido - esperado) <= tolerancia) passou++;
  else falhou.push(nome + ': esperado ~' + esperado + ' (±' + tolerancia + '), obtido ' + obtido);
}

/* ---------------------------------------------------- numero e dinheiro -- */

conferir('inteiro simples', N.lerNumero('410545'), 410545);
conferir('milhar com ponto', N.lerNumero('1.234.567'), 1234567);
conferir('decimal com virgula', N.lerNumero('1234,56'), 1234.56);
conferir('formato BR cheio', N.lerNumero('1.234.567,89'), 1234567.89);
conferir('com R$', N.lerNumero('R$ 737.734,00'), 737734);
conferir('negativo com milhar', N.lerNumero('-13.132'), -13132);
conferir('parentese e negativo', N.lerNumero('(1.234,56)'), -1234.56);
conferir('sufixo mil', N.lerNumero('30 mil'), 30000);
conferir('texto nao e numero', N.lerNumero('#N/A'), null);
conferir('vazio', N.lerNumero('   '), null);

conferir('centavos de texto BR', N.paraCentavos('1.234,56'), 123456);
conferir('centavos de numero', N.paraCentavos(2500), 250000);
conferir('centavos arredonda', N.paraCentavos('0,005'), 1);
conferir('centavos de vazio', N.paraCentavos(''), null);
conferir('formata centavos', N.formatarBRL(123456), 'R$ 1.234,56');
conferir('formata negativo', N.formatarBRL(-5000), '-R$ 50,00');
conferir('formata zero', N.formatarBRL(0), 'R$ 0,00');
conferir('moeda curta mil', N.moedaCurta(1234500), 'R$ 12,3 mil');
conferir('percentual', N.pct(0.268, 1), '26,8%');

/* ------------------------------------------------------------- datas ---- */

conferir('soma dia', N.somarDias('2026-10-26', 5), '2026-10-31');
conferir('soma dia virando mes', N.somarDias('2026-10-31', 1), '2026-11-01');
conferir('soma dia para tras', N.somarDias('2026-01-01', -1), '2025-12-31');
conferir('soma mes', N.somarMeses('2026-10-26', 2), '2026-12-26');
conferir('soma mes encurta fevereiro', N.somarMeses('2026-01-31', 1), '2026-02-28');
conferir('dias entre', N.diasEntre('2026-10-01', '2026-10-26'), 25);
conferir('mes de', N.mesDe('2026-10-26'), '2026-10');
conferir('dia do mes normal', N.diaDoMes('2026-10', 20), '2026-10-20');
conferir('dia 31 em fevereiro cai no 28', N.diaDoMes('2026-02', 31), '2026-02-28');
conferir('formata data', N.formatarData('2026-10-26'), '26/10/2026');
conferir('formata mes', N.formatarMes('2026-10'), 'out/26');
conferir('le data BR', N.lerData('26/10/2026'), '2026-10-26');
conferir('le data BR ano curto', N.lerData('26/10/26'), '2026-10-26');
conferir('le data ISO', N.lerData('2026-10-26'), '2026-10-26');
conferir('le data com ponto', N.lerData('05.01.2026'), '2026-01-05');
conferir('le data invalida', N.lerData('nao e data'), null);

// o furo classico: new Date('2026-10-26') em fuso negativo mostra dia 25
conferir('data nao escorrega por fuso', N.formatarData(N.paraIso(N.montarData('2026-10-26'))), '26/10/2026');

/* --------------------------------------------------------- carteiras ---- */

const CARTEIRAS = [
  { id: 'inter', nome: 'Inter', disponivel: 60504, aLiberar: 0, diasLiberacao: 0 },
  { id: 'porquinho', nome: 'Porquinho', disponivel: 100000, aLiberar: 0, diasLiberacao: 0, reserva: true },
  { id: 'ml', nome: 'Mercado Pago', disponivel: 609000, aLiberar: 1197300, diasLiberacao: 14 },
  { id: 'shopee', nome: 'Shopee', disponivel: 75732, aLiberar: 256549, diasLiberacao: 20 },
];

const soma = N.somarCarteiras(CARTEIRAS);
conferir('disponivel soma tudo', soma.disponivel, 60504 + 100000 + 609000 + 75732);
conferir('a liberar soma pendentes', soma.aLiberar, 1197300 + 256549);
conferir('caixa total e disponivel + a liberar', soma.total, soma.disponivel + soma.aLiberar);
conferir('reserva so a carteira marcada', soma.reserva, 100000);
conferir('livre e disponivel menos reserva', soma.livre, soma.disponivel - 100000);

/* ------------------------------------------------------- recorrentes ---- */

const RECORRENTES = [
  { id: 'prolabore', descricao: 'Pro-labore', valor: 400000, dia: 5, tipo: 'saida', categoria: 'prolabore' },
  { id: 'das', descricao: 'DAS', valor: 197642, dia: 20, tipo: 'saida', categoria: 'imposto' },
  { id: 'velho', descricao: 'Conta encerrada', valor: 10000, dia: 3, tipo: 'saida', fim: '2026-09-30' },
];

const expandido = N.expandirRecorrentes(RECORRENTES, '2026-10-01', '2026-11-30');
conferir('expande 2 fixas em 2 meses', expandido.length, 4);
conferir('ignora recorrente encerrada', expandido.filter((l) => l.descricao === 'Conta encerrada').length, 0);
conferir('primeira fixa e a do dia 5', expandido[0].data, '2026-10-05');
conferir('expande em ordem de data', expandido.map((l) => l.data).join(','), '2026-10-05,2026-10-20,2026-11-05,2026-11-20');
conferir('recorrente inativa nao expande', N.expandirRecorrentes([{ id: 'x', valor: 100, dia: 1, ativo: false }], '2026-10-01', '2026-10-31').length, 0);

/* ---------------------------------------------------------- projecao ---- */

const proj = N.projetar({
  carteiras: CARTEIRAS,
  recorrentes: RECORRENTES,
  lancamentos: [],
  premissas: { entradaDiaria: 80000, usarEntradaDiaria: true },
  horizonte: 30,
  hoje: '2026-10-26',
});

conferir('projecao tem 30 dias', proj.dias.length, 30);
conferir('projecao comeca no disponivel', proj.saldoInicial, soma.disponivel);
conferir('primeiro dia e hoje', proj.dias[0].data, '2026-10-26');
conferir('ultimo dia fecha o horizonte', proj.dias[29].data, '2026-11-24');

// o pendente tem de ser liberado por inteiro dentro do prazo, sem perder centavo
const projSoLiberacao = N.projetar({
  carteiras: CARTEIRAS,
  recorrentes: [],
  premissas: { usarEntradaDiaria: false },
  horizonte: 30,
  hoje: '2026-10-26',
});
const liberado = projSoLiberacao.dias.reduce((s, d) => s + d.movimento, 0);
conferir('libera o pendente todo, sem perder centavo', liberado, soma.aLiberar);
conferir('depois do prazo nao libera mais nada', projSoLiberacao.dias[25].movimento, 0);
conferir('saldo final sem premissa = caixa total', projSoLiberacao.saldoFinal, soma.total);

// no horizonte de 30 dias a partir de 26/10 so cai 1 pro-labore (05/11) e 1 DAS (20/11)
const fixasNoPeriodo = 400000 + 197642;
const entradaEstimada = 80000 * (30 - 1 - 20); // venda nova so depois do maior prazo (20 dias)

conferirPerto(
  'saldo final = inicial + liberado + venda nova - fixas',
  proj.saldoFinal,
  soma.disponivel + soma.aLiberar + entradaEstimada - fixasNoPeriodo,
  100
);

// TRANSFERENCIA NAO MUDA O CAIXA TOTAL — o teste que protege a regra
const projComTransferencia = N.projetar({
  carteiras: CARTEIRAS,
  recorrentes: RECORRENTES,
  lancamentos: [
    { id: 't1', data: '2026-10-30', tipo: 'transferencia', descricao: 'ML -> Inter', valor: 500000, carteira: 'ml', carteiraDestino: 'inter', status: 'previsto' },
  ],
  premissas: { entradaDiaria: 80000, usarEntradaDiaria: true },
  horizonte: 30,
  hoje: '2026-10-26',
});
conferir('transferencia nao mexe no saldo final', projComTransferencia.saldoFinal, proj.saldoFinal);
conferir('transferencia nao mexe no menor saldo', projComTransferencia.menorSaldo, proj.menorSaldo);

// recompra de estoque tem de derrubar a curva
const projComRecompra = N.projetar({
  carteiras: CARTEIRAS,
  recorrentes: RECORRENTES,
  premissas: { entradaDiaria: 80000, usarEntradaDiaria: true, recompraMensal: 1300000, diaRecompra: 10 },
  horizonte: 30,
  hoje: '2026-10-26',
});
conferir('recompra de estoque derruba o saldo final', projComRecompra.saldoFinal, proj.saldoFinal - 1300000);

// cenario de queda de vendas
const projQueda = N.projetar({
  carteiras: CARTEIRAS,
  recorrentes: RECORRENTES,
  premissas: { entradaDiaria: 80000, usarEntradaDiaria: true },
  cenario: { vendas: -0.3 },
  horizonte: 30,
  hoje: '2026-10-26',
});
conferirPerto('venda -30% tira 30% da entrada estimada', proj.saldoFinal - projQueda.saldoFinal, Math.round(entradaEstimada * 0.3), 100);

// atraso de liberacao nao cria nem destroi dinheiro, so empurra
const projAtraso = N.projetar({
  carteiras: CARTEIRAS,
  recorrentes: [],
  premissas: { usarEntradaDiaria: false },
  cenario: { atrasoLiberacao: 10 },
  horizonte: 60,
  hoje: '2026-10-26',
});
const projSemAtraso = N.projetar({
  carteiras: CARTEIRAS,
  recorrentes: [],
  premissas: { usarEntradaDiaria: false },
  horizonte: 60,
  hoje: '2026-10-26',
});
conferir('atraso nao muda o total liberado', projAtraso.saldoFinal, projSemAtraso.saldoFinal);
conferir('atraso deixa saldo menor no meio do caminho', projAtraso.dias[14].saldo < projSemAtraso.dias[14].saldo, true);

// piso furado
const projPiso = N.projetar({
  carteiras: [{ id: 'inter', disponivel: 100000, aLiberar: 0, diasLiberacao: 0 }],
  recorrentes: [{ id: 'x', descricao: 'Fornecedor', valor: 90000, dia: 28, tipo: 'saida' }],
  premissas: { usarEntradaDiaria: false },
  horizonte: 20,
  hoje: '2026-10-26',
  piso: 50000,
});
conferir('acusa que fura o piso', projPiso.furaPiso, true);
conferir('diz o dia em que fura', projPiso.dataFuraPiso, '2026-10-28');
conferir('nao marca negativo quando so fura o piso', projPiso.negativa, false);

/* -------------------------------------------- simulador e quando posso -- */

const simCabe = N.simularPagamento(projPiso, 5000, '2026-10-26');
conferir('pagamento pequeno nao cabe com piso alto', simCabe.cabe, false);

const projFolgada = N.projetar({
  carteiras: [{ id: 'inter', disponivel: 2000000, aLiberar: 0, diasLiberacao: 0 }],
  recorrentes: [],
  premissas: { entradaDiaria: 50000, usarEntradaDiaria: true },
  horizonte: 30,
  hoje: '2026-10-26',
  piso: 500000,
});
conferir('pagamento que cabe', N.simularPagamento(projFolgada, 1000000, '2026-10-27').cabe, true);
conferir('pagamento que nao cabe', N.simularPagamento(projFolgada, 1900000, '2026-10-27').cabe, false);
conferir('quando posso pagar o que cabe: hoje', N.quandoPosso(projFolgada, 1000000).emDias, 0);

const projCresce = N.projetar({
  carteiras: [{ id: 'inter', disponivel: 100000, aLiberar: 0, diasLiberacao: 0 }],
  recorrentes: [],
  premissas: { entradaDiaria: 50000, usarEntradaDiaria: true },
  horizonte: 60,
  hoje: '2026-10-26',
  piso: 0,
});
const quando = N.quandoPosso(projCresce, 500000);
conferir('quando posso: espera o caixa juntar', quando.emDias, 8);
conferir('quando posso: devolve a data', quando.data, '2026-11-03');
conferir('quando posso: valor fora do alcance devolve nulo', N.quandoPosso(projCresce, 99900000).data, null);

/* --------------------------------------------------------- orcamento ---- */

const ORCAMENTO = {
  base: 800000,
  envelopes: [
    { id: 'reserva', nome: 'Reserva', pct: 20 },
    { id: 'estoque', nome: 'Estoque', pct: 40 },
    { id: 'novos', nome: 'Produtos novos', pct: 20, acumulado: 50000 },
    { id: 'insumos', nome: 'Insumos', pct: 10 },
    { id: 'investimentos', nome: 'Investimentos', pct: 10 },
  ],
};

const orc = N.calcularOrcamento(ORCAMENTO, { estoque: 400000, novos: 230000 });
conferir('soma dos percentuais fecha 100', orc.pctValida, true);
conferir('planejado do estoque', orc.envelopes[1].planejado, 320000);
conferir('estoque estourou', orc.envelopes[1].estourou, true);
conferir('sobra do estoque e negativa', orc.envelopes[1].disponivel, -80000);
conferir('acumulado entra no teto do envelope', orc.envelopes[2].disponivel, 160000 + 50000 - 230000);
conferir('nada fora dos envelopes', orc.naoAlocado, 0);

const orcQuebrado = N.calcularOrcamento({ base: 100000, envelopes: [{ id: 'a', nome: 'A', pct: 70 }] }, {});
conferir('acusa percentual que nao fecha', orcQuebrado.pctValida, false);
conferir('mostra o que ficou sem envelope', orcQuebrado.naoAlocado, 30000);

/* ----------------------------------------------------------- reserva ---- */

const res = N.calcularReserva({ metaMeses: 3 }, 700000, 1000000);
conferir('meta = 3 meses de custo fixo', res.meta, 2100000);
conferir('falta para a meta', res.falta, 1100000);
conferirPerto('meses cobertos', res.mesesCobertos, 1.4285714, 1e-6);
conferir('reserva incompleta', res.completa, false);
conferir('reserva completa', N.calcularReserva({ metaMeses: 3 }, 100000, 400000).completa, true);

/* --------------------------------------------------- fechamento do mes -- */

const LANC = [
  { id: '1', data: '2026-10-02', tipo: 'entrada', descricao: 'Repasse ML', valor: 1500000, categoria: 'venda-ml', carteira: 'inter', status: 'realizado' },
  { id: '2', data: '2026-10-06', tipo: 'saida', descricao: 'Fornecedor cabos', valor: 900000, categoria: 'estoque', carteira: 'inter', status: 'realizado' },
  { id: '3', data: '2026-10-07', tipo: 'transferencia', descricao: 'ML -> Inter', valor: 500000, carteira: 'ml', carteiraDestino: 'inter', status: 'realizado' },
  { id: '4', data: '2026-10-08', tipo: 'saida', descricao: 'Delivery', valor: 12000, categoria: 'pessoal', carteira: 'inter', status: 'realizado', pessoal: true },
  { id: '5', data: '2026-10-30', tipo: 'saida', descricao: 'DAS previsto', valor: 197642, categoria: 'imposto', carteira: 'inter', status: 'previsto' },
  { id: '6', data: '2026-09-15', tipo: 'entrada', descricao: 'Repasse Shopee', valor: 300000, categoria: 'venda-shopee', carteira: 'inter', status: 'realizado' },
];

const out = N.fecharMes(LANC, '2026-10');
conferir('entradas do mes', out.entradas, 1500000);
conferir('saidas do mes (so realizado)', out.saidas, 900000 + 12000);
conferir('resultado de caixa do mes', out.resultado, 1500000 - 912000);
conferir('transferencia fora de entrada e saida', out.transferencias, 500000);
conferir('gasto pessoal separado', out.pessoais, 12000);
conferirPerto('percentual do gasto pessoal', out.pctPessoal, 12000 / 912000, 1e-9);
conferir('previsto nao entra no fechado', out.quantidade, 4);

const outComPrevisto = N.fecharMes(LANC, '2026-10', { soRealizado: false });
conferir('com previsto as saidas sobem', outComPrevisto.saidas, 900000 + 12000 + 197642);

const serie = N.serieMensal(LANC, 2, '2026-10');
conferir('serie tem 2 meses', serie.length, 2);
conferir('serie comeca no mes mais antigo', serie[0].mes, '2026-09');
conferir('setembro so tem a entrada', serie[0].entradas, 300000);

/* ------------------------------------------------- runway e compra ------ */

conferirPerto('runway em meses', N.calcularRunway(2100000, 700000), 3, 1e-9);
conferir('runway sem custo fixo nao existe', N.calcularRunway(100000, 0), null);

const poder = N.poderDeCompra({ disponivel: 2000000, compromissos: 600000, reserva: 500000, colchao: 200000 });
conferir('poder de compra livre', poder.livre, 700000);
conferir('pode comprar', poder.podeComprar, true);
conferir('sem folga nao pode comprar', N.poderDeCompra({ disponivel: 100000, reserva: 500000 }).podeComprar, false);

conferir('compromissos somam previsto + fixas', N.compromissosAte(LANC, RECORRENTES, '2026-10-26', 10), 197642 + 400000);
conferir(
  'compromissos de 30 dias pegam pro-labore e DAS',
  N.compromissosAte(LANC, RECORRENTES, '2026-10-26', 30),
  197642 + 400000 + 197642
);

const pay = N.paybackCompra({ investido: 766000, unidades: 100, margemUnitaria: 600, vendaDiaria: 5 });
conferirPerto('dias para vender o lote', pay.diasParaVender, 20, 1e-9);
conferir('retorno do lote', pay.retorno, 60000);

/* --------------------------------------------------------------- CSV ---- */

const csvInter = [
  'Data;Descricao;Valor;Saldo',
  '01/10/2026;PIX RECEBIDO MERCADO PAGO;1.500,00;2.000,00',
  '02/10/2026;PIX ENVIADO UP CONSERTOS;-9.000,00;-7.000,00',
  '03/10/2026;APLICACAO CDB PORQ OBJ;-500,00;-7.500,00',
  '03/10/2026;99 FOOD DELIVERY;-120,50;-7.620,50',
  'linha podre sem data;;;',
].join('\n');

const lido = N.lerCsv(csvInter);
conferir('detecta ponto e virgula', lido.separador, ';');
conferir('le as linhas uteis', lido.linhas.length, 6);

const colunas = N.adivinharColunas(lido.linhas[0]);
conferir('acha a coluna de data', colunas.data, 0);
conferir('acha a coluna de descricao', colunas.descricao, 1);
conferir('acha a coluna de valor', colunas.valor, 2);

const mapeado = N.mapearLinhas(lido.linhas, colunas);
conferir('mapeia 4 lancamentos', mapeado.candidatos.length, 4);
conferir('recusa a linha podre', mapeado.recusados.length, 1);
conferir('positivo e entrada', mapeado.candidatos[0].tipo, 'entrada');
conferir('negativo e saida', mapeado.candidatos[1].tipo, 'saida');
conferir('valor sempre positivo', mapeado.candidatos[1].valor, 900000);
conferir('data convertida', mapeado.candidatos[0].data, '2026-10-01');

const REGRAS = [
  { contem: 'cdb porq', categoria: '', tipo: 'transferencia' },
  { contem: 'mercado pago', categoria: 'venda-ml', tipo: 'entrada' },
  { contem: 'up conserto', categoria: 'estoque', tipo: 'saida' },
  { contem: '99 food', categoria: 'pessoal', tipo: 'saida', pessoal: true },
];

const classificado = N.classificarLote(mapeado.candidatos, REGRAS);
conferir('classifica repasse como venda', classificado[0].categoria, 'venda-ml');
conferir('classifica fornecedor como estoque', classificado[1].categoria, 'estoque');
conferir('varredura do CDB vira transferencia', classificado[2].tipo, 'transferencia');
conferir('delivery marca gasto pessoal', classificado[3].pessoal, true);
conferir('todos classificados', classificado.every((c) => c.classificado), true);

conferir('regra nao casa devolve nulo', N.aplicarRegras('SEM REGRA AQUI', REGRAS), null);
conferir('regra ignora acento e caixa', (N.aplicarRegras('APLICAÇÃO CDB PORQ OBJ', REGRAS) || {}).tipo, 'transferencia');

const dedupe = N.separarNovos(classificado, [
  { data: '2026-10-01', tipo: 'entrada', valor: 150000, descricao: 'PIX RECEBIDO MERCADO PAGO' },
]);
conferir('acha a duplicata', dedupe.repetidos.length, 1);
conferir('resto e novo', dedupe.novos.length, 3);

const dedupeDentroDoArquivo = N.separarNovos(
  [
    { data: '2026-10-01', tipo: 'saida', valor: 1000, descricao: 'TARIFA' },
    { data: '2026-10-01', tipo: 'saida', valor: 1000, descricao: 'TARIFA' },
  ],
  []
);
conferir('duplicata dentro do proprio arquivo tambem conta', dedupeDentroDoArquivo.repetidos.length, 1);

const csvVirgula = N.lerCsv('date,description,amount\n2026-10-01,"COMPRA, PARCELADA",-1234.56');
conferir('detecta virgula como separador', csvVirgula.separador, ',');
conferir('respeita aspas no meio do campo', csvVirgula.linhas[1][1], 'COMPRA, PARCELADA');

const colunasEn = N.adivinharColunas(csvVirgula.linhas[0]);
const mapeadoEn = N.mapearLinhas(csvVirgula.linhas, colunasEn);
conferir('le decimal com ponto', mapeadoEn.candidatos[0].valor, 123456);

const csvCreditoDebito = N.lerCsv('Data;Historico;Credito;Debito\n05/10/2026;REPASSE;1.000,00;\n06/10/2026;FORNECEDOR;;2.500,00');
const colunasCD = N.adivinharColunas(csvCreditoDebito.linhas[0]);
const mapeadoCD = N.mapearLinhas(csvCreditoDebito.linhas, colunasCD);
conferir('colunas separadas: credito e entrada', mapeadoCD.candidatos[0].tipo, 'entrada');
conferir('colunas separadas: debito e saida', mapeadoCD.candidatos[1].tipo, 'saida');
conferir('colunas separadas: valor do debito', mapeadoCD.candidatos[1].valor, 250000);

/* ------------------------------------------------------------ fim ------ */

console.log('');
if (falhou.length) {
  console.log('FALHOU ' + falhou.length + ' de ' + (passou + falhou.length) + ':');
  falhou.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('OK — ' + passou + ' testes passaram.');
