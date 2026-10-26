# Caixa da Empresa

Controle de caixa de uma operação de marketplace: **entra, sai, sobra — e quando dá para investir**.

Não é só um caderno de lançamentos. O app projeta o saldo dia a dia, divide a sobra do mês em
envelopes de orçamento, acompanha a reserva de emergência e responde à pergunta que decide o
crescimento do negócio: *posso comprar produto novo agora, quanto, e em quanto tempo esse dinheiro
volta?*

Site estático, sem build e sem dependências: HTML, CSS e três arquivos de JavaScript.

![testes](https://img.shields.io/badge/testes-156%20passando-brightgreen)
![dependências](https://img.shields.io/badge/depend%C3%AAncias-0-blue)

---

## Os seus dados nunca saem do navegador

Tudo é guardado no **localStorage** deste navegador. Não existe servidor, conta nem login — e por
isso também não existe recuperação automática.

- Limpar os dados do navegador, trocar de computador ou abrir em janela anônima e **os lançamentos
  somem**.
- Em **Ajustes → Backup**, baixe o `.json` com frequência e guarde fora do computador. Ele restaura
  o app inteiro.
- Este repositório é público. Os arquivos de backup (`caixa-empresa-backup-*.json`) e a exportação
  de lançamentos (`lancamentos-*.csv`) estão no `.gitignore` — **não comite nenhum dos dois**.
- Os dados de exemplo em [`assets/exemplo.js`](assets/exemplo.js) são fictícios, para a tela não
  abrir vazia. Dado real nunca entra lá.

---

## As quatro regras que o app leva a sério

**1. Transferência não é entrada nem saída.** Dinheiro que vai da carteira do marketplace para o
banco, ou do banco para a caixinha, já era seu: só mudou de bolso. Lançar isso como entrada faz o
faturamento aparecer dobrado, infla a base do orçamento e aprova compra com dinheiro imaginário. O
app tem um tipo próprio para isso, e ele não entra em nenhum total de entrada ou saída.

**2. Caixa não é lucro.** Aqui tudo é regime de caixa: conta o dia em que o dinheiro andou. Compra
de estoque pesa inteira no mês em que foi paga. No lucro é diferente — a mercadoria só vira custo
quando vende. Por isso o app chama de **sobra de caixa**, nunca de lucro. Quem confunde os dois olha
o banco minguando num mês de recompra forte e conclui que a operação empatou, quando ela só trocou
caixa por estoque. Para lucro, use um DRE.

**3. Caixa da empresa é a soma das carteiras.** Saldo do banco é um pedaço só. O que está na
carteira do marketplace, o que ainda vai ser liberado e o que está na reserva também são caixa — com
datas diferentes, que é justamente o que a projeção resolve.

**4. Dinheiro no banco não é dinheiro livre.** Antes de virar compra, dele saem as contas dos
próximos 30 dias, a reserva de emergência e o colchão de segurança. O que sobra é o **poder de
compra livre**.

---

## O que tem dentro

| Aba | Para que serve |
| --- | --- |
| **Painel** | Caixa total, disponível, a liberar, menor saldo do horizonte, sobrevida sem vender. Projeção dia a dia, simulador de cenário (vendas caem / repasse atrasa) e o “consigo pagar?”. |
| **Lançamentos** | Entradas, saídas e transferências, com filtros, busca e marcação de gasto pessoal pago pela empresa. |
| **Agenda** | Contas fixas do mês (pró-labore, imposto, contador) e compromissos marcados, que alimentam a projeção. |
| **Orçamento** | Divisão da sobra em envelopes (reserva, estoque, produtos novos, insumos, mídia, investimentos), com acumulado entre meses, e a reserva de emergência medida em meses de custo fixo. |
| **Investir** | Poder de compra livre, a primeira data em que uma compra cabe, o retorno do lote e um semáforo de 5 sinais. |
| **Relatórios** | Entrou/saiu/sobrou por mês, para onde foi o dinheiro, de onde veio e o vazamento pessoa física × empresa. |
| **Importar** | CSV do banco ou do marketplace, com detecção de colunas, regras de classificação e descarte de duplicatas. |
| **Ajustes** | Carteiras, premissas da projeção, categorias, envelopes e backup. |
| **Como usar** | O manual, dentro do próprio app. |

---

## As contas

Elas vivem todas em [`assets/nucleo.js`](assets/nucleo.js), que é puro (não toca na tela) e tem
156 testes em [`tools/testar.js`](tools/testar.js).

### Projeção de saldo

```
saldo de hoje   = disponível de todas as carteiras
+ liberações    = o "a liberar" de cada carteira, diluído nos dias que faltam para liberar
+ venda nova    = premissa de entrada diária, só depois do maior prazo de liberação
− contas fixas  = os recorrentes da agenda
− compromissos  = lançamentos previstos no período
− recompra      = reposição de estoque planejada, todo mês
```

Transferência não entra em lugar nenhum dessa conta.

### Saldo das carteiras

O valor digitado em Ajustes é um **saldo conferido numa data** (“no dia X o banco dizia tanto”).
Dali para frente o saldo anda sozinho:

```
saldo de hoje = saldo conferido + lançamentos realizados com data posterior à conferência
```

Entrada soma, saída subtrai, e transferência subtrai da origem e soma no destino — por isso ela
move dinheiro entre carteiras sem mudar o caixa total. Lançamento com data **até** a conferência é
ignorado: ele já está dentro do saldo que o banco mostrou, o que também é o que impede uma
importação de extrato antigo de contar duas vezes. Quando o app divergir do banco, basta digitar o
valor real: a data de conferência se atualiza sozinha.

### Orçamento

```
base do mês            = entradas do mês − contas fixas do mês − outras saídas obrigatórias
envelope               = base × percentual + o que sobrou dos meses anteriores
disponível no envelope = envelope − gasto do mês naquele envelope
```

Categoria **obrigatória** é a conta que não se escolhe pagar (imposto, pró-labore, contador): ela
sai antes da divisão, não de dentro de um envelope. As contas fixas do mês contam mesmo que ainda
não tenham sido pagas — sobra não é sobra enquanto o imposto do mês não estiver descontado.

### Decisão de compra

```
poder de compra livre = disponível hoje − contas de 30 dias − reserva − colchão
```

E, para o retorno: `dias para vender = unidades ÷ venda por dia`. Dois lotes com o mesmo lucro por
unidade não valem o mesmo — ganha o que gira mais rápido, porque o mesmo dinheiro dá mais voltas no
ano.

---

## Rodar

```bash
node tools/servidor.js
```

Abre em `http://localhost:4180`. Abrir o `index.html` direto também funciona (o app não busca nada
de fora), mas alguns navegadores bloqueiam o `localStorage` em `file://` — e sem ele o app não
salva.

Testes:

```bash
npm test
```

---

## Onde a projeção mente

Honestidade antes de confiança:

- **Premissa de venda otimista** derruba tudo. O app projeta o que você disser que vende por dia.
- **Sem lançar a recompra de estoque**, a curva sobe como se o dinheiro ficasse parado. Há um aviso
  no painel enquanto essa premissa estiver zerada.
- **Atraso de repasse** não é previsto sozinho — para isso existe o controle de cenário.
- O **prazo de liberação** é tratado como média linear. Na vida real o repasse vem em blocos, então
  o dia exato pode variar alguns dias para cada lado.
- O **dedupe da importação** usa data + tipo + valor + início da descrição. Duas compras idênticas no
  mesmo dia, com a mesma descrição, são tratadas como uma repetição — nesse caso, lance a segunda na
  mão.

---

## Estrutura

```
index.html          a interface inteira
assets/nucleo.js    as contas, puras e testadas (roda no navegador e no Node)
assets/app.js       estado, telas, gráficos e eventos
assets/exemplo.js   dados fictícios do botão "carregar exemplo"
assets/style.css    tema escuro e claro
tools/testar.js     156 testes das funções puras
tools/servidor.js   servidor estático mínimo
```

Dinheiro é sempre **inteiro em centavos** — `R$ 1.234,56` é `123456`. Soma de centavos não erra;
soma de ponto flutuante erra. Data é sempre o texto `AAAA-MM-DD` tratado como data local, porque
`new Date('2026-10-26')` é lido como UTC e, no Brasil, mostra o dia 25.

## Licença

MIT.
