# RJ Bank — simulador de crédito

App que montei para praticar e testar cenários de crédito pessoal fora do ambiente de trabalho: cadastro de clientes, simulação Price/SAC, geração de contrato e pagamento de parcelas com encargos de atraso.

**Demo:** https://cliente-app-1a979.web.app (use dados fictícios)

## O que dá pra fazer

- **Clientes** – cadastro com validação de CPF (dígitos verificadores), máscara de CPF/telefone, busca e bloqueio de CPF duplicado.
- **Simulador** – Price ou SAC, IOF de pessoa física (0,0082% a.d. + 0,38%), CET mensal/anual e cronograma completo.
- **Contratos** – a simulação vira contrato; cada parcela pode ser paga numa data escolhida, com multa de 2% e juros de mora de 1% a.m. pro rata.
- **Visão geral** – saldo da carteira, parcelas vencidas e próximos vencimentos.

As fórmulas são as de mercado. Não reproduzem regra de nenhuma instituição.

## Stack

React 19, Vite, React Router, Firebase (Firestore, Auth anônimo, Hosting), Vitest, ESLint e Prettier.

Cada visitante entra com login anônimo e só enxerga os próprios dados — quem garante isso são as regras em `firestore.rules`, não o front.

## Rodando local

```bash
npm install
npm run dev
```

Sem `.env.local` o app salva tudo no `localStorage`, o que já basta pra testar. Para usar o Firestore, copie `.env.example` para `.env.local` e preencha com a config do seu projeto Firebase (precisa do Firestore e do login anônimo ativos).

```bash
npm test          # testes de cálculo e validação
npm run lint
npm run build
npx firebase-tools deploy   # hosting + regras do Firestore
```

## Organização

```text
src/
  lib/         regras de crédito, validações, formatação, acesso a dados
  hooks/       useCollection (CRUD em memória + store)
  context/     dados compartilhados entre as telas
  components/  peças reutilizáveis (Field, tabela de parcelas, toast…)
  pages/       Visão geral, Clientes, Simulador, Contratos
```

## Próximos passos

- [ ] Renegociação de contrato em atraso
- [ ] Antecipação de parcelas com desconto de juros
- [ ] Exportar cronograma em CSV
- [ ] Testes de interface (Playwright)
