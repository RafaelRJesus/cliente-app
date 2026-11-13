# RJ Bank — simulador de crédito

App que montei para praticar e testar cenários de crédito pessoal fora do ambiente de trabalho: cadastro de clientes, simulação Price/SAC, geração de contrato e pagamento de parcelas com encargos de atraso.

**Demo:** https://cliente-app-1a979.web.app (use dados fictícios)

## O que dá pra fazer

- **Clientes** – cadastro com validação de CPF (dígitos verificadores), máscaras, busca, bloqueio de CPF duplicado e endereço preenchido pelo CEP.
- **Simulador** – cinco produtos (crédito pessoal, consignado, garantia de veículo, garantia de imóvel e Pix parcelado), Price ou SAC, IOF de pessoa física (0,0082% a.d. + 0,38%), CET mensal/anual e cronograma completo.
  - taxa sugerida = mediana do mercado publicada pelo Banco Central para a modalidade;
  - consignado respeita margem de 35% da renda;
  - garantia de veículo valida a placa (antiga ou Mercosul), busca o valor na tabela FIPE e libera até 70% dele (veículos de até 15 anos);
  - garantia de imóvel libera até 60% do valor do imóvel, em até 240 meses.
- **Contratos** – a simulação vira contrato; cada parcela pode ser paga numa data escolhida, com multa de 2% e juros de mora de 1% a.m. pro rata.
- **Visão geral** – saldo da carteira, parcelas vencidas e próximos vencimentos.

As fórmulas são as de mercado. Não reproduzem regra de nenhuma instituição.

## APIs públicas usadas

| Para quê | API |
| --- | --- |
| Endereço pelo CEP | [BrasilAPI](https://brasilapi.com.br), com [ViaCEP](https://viacep.com.br) de reserva |
| Valor FIPE do veículo | [FIPE API (parallelum)](https://deividfortuna.github.io/fipe/) |
| Taxas médias de mercado | [Banco Central – Olinda](https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/aplicacao) |

Todas são gratuitas e sem chave, chamadas direto do navegador. Respostas da FIPE e do BC ficam em cache no `localStorage`.

Não existe API pública gratuita que consulte os dados de um veículo pela placa (esses dados são do Detran/Senatran), então a placa é validada só pelo formato.

## Stack

React 19, Vite, React Router, Firebase (Firestore, Auth anônimo, Hosting), Vitest, ESLint e Prettier.

Cada visitante entra com login anônimo e só enxerga os próprios dados — quem garante isso são as regras em `firestore.rules`, não o front.

As regras também limitam tamanho e formato de cada campo. Os cálculos do contrato (parcelas, IOF, CET, encargos) rodam no navegador: o banco valida estrutura e dono, não refaz as contas. Para um sistema real esse cálculo iria para o servidor (ex.: Cloud Functions).

Os dados ficam ligados a este navegador: limpar os dados do site ou trocar de navegador cria outro usuário anônimo, e os cadastros anteriores deixam de aparecer.

## Rodando local

```bash
npm install
npm run dev
```

Sem `.env.local` o app salva tudo no `localStorage`, o que já basta pra testar. Para usar o Firestore, copie `.env.example` para `.env.local` e preencha com a config do seu projeto Firebase (precisa do Firestore e do login anônimo ativos).

```bash
npm test          # testes de cálculo e validação (Vitest)
npm run test:e2e  # testes de tela (Playwright), com as APIs externas simuladas
npm run lint
npm run build
npx firebase-tools deploy   # hosting + regras do Firestore
```

O deploy se protege sozinho (`firebase.json`):

- **antes**: lint, testes unitários e build. Se algo falhar, nada sobe.
- **depois**: o smoke da [automação de QA](https://github.com/RafaelRJesus/rj-bank-qa-automation)
  roda contra o site publicado (`scripts/smoke-producao.sh`). Ele espera o
  repositório da automação ao lado deste, em `../rj-bank-qa-automation`; na
  primeira vez instala as dependências sozinho.

E a cada push no GitHub, o CI roda lint, unitários, os testes de tela deste
repositório e as suítes de interface da automação de QA.

## Organização

```text
src/
  lib/         regras de crédito e dos produtos, validações, formatação, acesso a dados
  lib/api/     clientes HTTP de CEP, FIPE e Banco Central
  hooks/       useCollection (CRUD em memória + store)
  context/     dados compartilhados entre as telas
  components/  peças reutilizáveis (Field, tabela de parcelas, toast…)
  pages/       Visão geral, Clientes, Simulador, Contratos
```

## Próximos passos

- [ ] Renegociação de contrato em atraso
- [ ] Comparar a taxa com a de um banco específico (a API do BC traz por instituição)
- [ ] Antecipação de parcelas com desconto de juros
- [ ] Exportar cronograma em CSV
- [ ] Testes de interface (Playwright)
