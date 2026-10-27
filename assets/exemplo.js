/**
 * Dados de EXEMPLO — ficticios, so para a tela nao abrir vazia.
 *
 * Nada aqui e dado real de ninguem: fornecedor e "Fornecedor A", os valores sao
 * redondos e as datas sao relativas ao dia em que o exemplo e carregado.
 * Todo registro vem com exemplo:true, e o botao "Apagar exemplos" nos Ajustes
 * remove exatamente esses.
 *
 * DADO REAL NUNCA ENTRA NESTE ARQUIVO. Ele vai para o navegador (localStorage)
 * e para o backup .json, que esta no .gitignore. Este repositorio e publico.
 */

function dadosExemplo(hoje) {
  const N = typeof window !== 'undefined' ? window.Nucleo : require('./nucleo.js');
  const h = hoje || N.hojeIso();
  const d = (n) => N.somarDias(h, n);
  const mesAtual = N.mesDe(h);
  const mesPassado = N.mesDe(N.somarMeses(h, -1));
  const doMes = (mes, dia) => N.diaDoMes(mes, dia);

  const lancamentos = [
    // mes passado, fechado
    { data: doMes(mesPassado, 3), tipo: 'entrada', descricao: 'Repasse marketplace A', valor: 1180000, categoria: 'venda-ml', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesPassado, 12), tipo: 'entrada', descricao: 'Repasse marketplace A', valor: 940000, categoria: 'venda-ml', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesPassado, 18), tipo: 'entrada', descricao: 'Repasse marketplace B', valor: 420000, categoria: 'venda-shopee', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesPassado, 24), tipo: 'entrada', descricao: 'Repasse marketplace A', valor: 1020000, categoria: 'venda-ml', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesPassado, 6), tipo: 'saida', descricao: 'Fornecedor A — reposicao de cabos', valor: 1250000, categoria: 'estoque', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesPassado, 14), tipo: 'saida', descricao: 'Fornecedor B — linha nova (teste)', valor: 480000, categoria: 'produto-novo', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesPassado, 9), tipo: 'saida', descricao: 'Embalagem e etiqueta', valor: 95000, categoria: 'insumos', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesPassado, 15), tipo: 'saida', descricao: 'Anuncios patrocinados', valor: 170000, categoria: 'ads', carteira: 'mp', status: 'realizado' },
    { data: doMes(mesPassado, 8), tipo: 'saida', descricao: 'Delivery (gasto pessoal na conta da empresa)', valor: 18000, categoria: 'pessoal', carteira: 'inter', status: 'realizado', pessoal: true },
    { data: doMes(mesPassado, 22), tipo: 'saida', descricao: 'Combustivel (gasto pessoal na conta da empresa)', valor: 25000, categoria: 'pessoal', carteira: 'inter', status: 'realizado', pessoal: true },
    { data: doMes(mesPassado, 10), tipo: 'transferencia', descricao: 'Marketplace A -> banco', valor: 800000, categoria: '', carteira: 'mp', carteiraDestino: 'inter', status: 'realizado' },

    // mes corrente, parte realizada
    { data: doMes(mesAtual, 2), tipo: 'entrada', descricao: 'Repasse marketplace A', valor: 1310000, categoria: 'venda-ml', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesAtual, 9), tipo: 'entrada', descricao: 'Repasse marketplace B', valor: 390000, categoria: 'venda-shopee', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesAtual, 5), tipo: 'saida', descricao: 'Fornecedor A — reposicao de cabos', valor: 1180000, categoria: 'estoque', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesAtual, 11), tipo: 'saida', descricao: 'Embalagem e etiqueta', valor: 88000, categoria: 'insumos', carteira: 'inter', status: 'realizado' },
    { data: doMes(mesAtual, 7), tipo: 'saida', descricao: 'Devolucao de pedido', valor: 42000, categoria: 'devolucao', carteira: 'mp', status: 'realizado' },

    // o que ainda vai acontecer
    { data: d(4), tipo: 'saida', descricao: 'Fornecedor A — pedido em negociacao', valor: 950000, categoria: 'estoque', carteira: 'inter', status: 'previsto' },
    { data: d(12), tipo: 'entrada', descricao: 'Venda estimada marketplace B', valor: 300000, categoria: 'venda-shopee', carteira: 'shopee', status: 'previsto', estimado: true },
    { data: d(18), tipo: 'saida', descricao: 'Fornecedor C — compra de teste', valor: 350000, categoria: 'produto-novo', carteira: 'inter', status: 'previsto' },
  ];

  // boletos de exemplo: um atrasado, um vencendo logo, um ja pago e um
  // parcelado — para a aba mostrar todas as situacoes de uma vez
  const boletos = [
    { descricao: 'Energia elétrica', valor: 46500, vencimento: d(-3), categoria: 'outra-saida', carteira: 'inter', status: 'previsto' },
    { descricao: 'Internet e telefone', valor: 19900, vencimento: d(2), categoria: 'software', carteira: 'inter', status: 'previsto' },
    { descricao: 'Fornecedor A — nota 4471', valor: 620000, vencimento: d(9), categoria: 'estoque', carteira: 'inter', status: 'previsto' },
    { descricao: 'Contador', valor: 25000, vencimento: d(-8), categoria: 'contador', carteira: 'inter', status: 'realizado', pagoEm: d(-8), recorrente: 'contador' },
    { descricao: 'Fornecedor C — maquinário (1/3)', valor: 116667, vencimento: d(14), categoria: 'investimento', carteira: 'inter', status: 'previsto', parcela: { n: 1, de: 3 } },
    { descricao: 'Fornecedor C — maquinário (2/3)', valor: 116667, vencimento: N.somarMeses(d(14), 1), categoria: 'investimento', carteira: 'inter', status: 'previsto', parcela: { n: 2, de: 3 } },
    { descricao: 'Fornecedor C — maquinário (3/3)', valor: 116666, vencimento: N.somarMeses(d(14), 2), categoria: 'investimento', carteira: 'inter', status: 'previsto', parcela: { n: 3, de: 3 } },
    { descricao: 'Aluguel do depósito', valor: 180000, vencimento: doMes(N.mesDe(N.somarMeses(h, 1)), 5), categoria: 'outra-saida', carteira: 'inter', status: 'previsto' },
    { descricao: 'Imposto do próximo mês', valor: 190000, vencimento: doMes(N.mesDe(N.somarMeses(h, 1)), 20), categoria: 'imposto', carteira: 'inter', status: 'previsto', recorrente: 'imposto' },
  ].map((b) =>
    Object.assign({ boleto: true, tipo: 'saida' }, b, { data: b.status === 'realizado' ? b.pagoEm : b.vencimento })
  );

  const recorrentes = [
    { id: 'prolabore', descricao: 'Pro-labore', valor: 400000, dia: 5, tipo: 'saida', categoria: 'prolabore', carteira: 'inter', ativo: true },
    { id: 'imposto', descricao: 'Imposto (DAS)', valor: 190000, dia: 20, tipo: 'saida', categoria: 'imposto', carteira: 'inter', ativo: true },
    { id: 'ads', descricao: 'Anuncios patrocinados', valor: 170000, dia: 15, tipo: 'saida', categoria: 'ads', carteira: 'mp', ativo: true },
    { id: 'contador', descricao: 'Contador', valor: 25000, dia: 10, tipo: 'saida', categoria: 'contador', carteira: 'inter', ativo: true },
    { id: 'software', descricao: 'Softwares e assinaturas', valor: 21000, dia: 8, tipo: 'saida', categoria: 'software', carteira: 'mp', ativo: true },
  ];

  // conferidoEm = hoje: os lancamentos de exemplo sao todos anteriores, entao
  // eles ja estao dentro desses saldos (nao contam duas vezes)
  const carteiras = [
    { id: 'inter', nome: 'Banco (conta corrente)', disponivel: 60000, aLiberar: 0, diasLiberacao: 0, reserva: false, conferidoEm: h, conferidoEmTs: new Date(h + 'T00:00:00').toISOString(), ordem: 1 },
    { id: 'reserva', nome: 'Reserva (CDB / caixinha)', disponivel: 250000, aLiberar: 0, diasLiberacao: 1, reserva: true, conferidoEm: h, conferidoEmTs: new Date(h + 'T00:00:00').toISOString(), ordem: 2 },
    { id: 'mp', nome: 'Carteira marketplace A', disponivel: 610000, aLiberar: 1200000, diasLiberacao: 14, reserva: false, conferidoEm: h, conferidoEmTs: new Date(h + 'T00:00:00').toISOString(), ordem: 3 },
    { id: 'shopee', nome: 'Carteira marketplace B', disponivel: 75000, aLiberar: 256000, diasLiberacao: 20, reserva: false, conferidoEm: h, conferidoEmTs: new Date(h + 'T00:00:00').toISOString(), ordem: 4 },
  ];

  return { lancamentos: lancamentos.concat(boletos), recorrentes: recorrentes, carteiras: carteiras };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { dadosExemplo: dadosExemplo };
if (typeof window !== 'undefined') window.dadosExemplo = dadosExemplo;
