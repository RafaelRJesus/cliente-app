# Respawn — simulador de crédito

O nome vem dos games: *respawn* é voltar ao jogo depois de perder uma vida. Aqui, é crédito pra recomeçar, com cada parcela à vista.

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
- **Backoffice do admin** – tela **Usuários** (todos os perfis, papel, CPF vinculado, bloquear/desbloquear), carteira de **contratos por contrato ou por cliente** e **ficha do cliente** com cadastro, acesso ao app e todos os contratos.
- **Acesso por papel** – login por e-mail e senha (com confirmação do e-mail) ou com Google:

  | Papel | Quem é | O que faz |
  | --- | --- | --- |
  | Admin | o dono do app (criado à mão no console), só entra com Google | tudo, e é o único que cadastra gestores |
  | Gestor | e-mail liberado pelo admin | vê toda a carteira, cadastra clientes, contrata, registra pagamento |
  | Cliente | cria a própria conta | vê só o próprio cadastro e contratos, simula e paga parcelas |

  O cliente que já foi cadastrado pela equipe se liga ao cadastro quando o CPF e o e-mail da conta batem. Se o CPF não existe, ele mesmo preenche os dados.

As fórmulas são as de mercado. Não reproduzem regra de nenhuma instituição.

## Documentação das APIs (Swagger)

Todas as chamadas HTTP do app estão descritas em OpenAPI 3.1 em
[`public/api-docs/openapi.yaml`](public/api-docs/openapi.yaml): login no Firebase Authentication,
cada coleção do Firestore com o que cada perfil pode fazer, as transações que numeram cliente e
contrato, e as APIs externas abaixo.

- **Navegando:** https://cliente-app-1a979.web.app/api-docs/ (ou `/api-docs/` no `npm run dev`)
- **Validando:** `npm run docs:api` (Redocly; roda também no CI)

O Swagger UI vem do pacote `swagger-ui-dist` e é copiado para `public/api-docs/vendor/` antes do
`dev` e do `build`, sem depender de CDN.

## APIs públicas usadas

| Para quê | API |
| --- | --- |
| Endereço pelo CEP | [BrasilAPI](https://brasilapi.com.br), com [ViaCEP](https://viacep.com.br) de reserva |
| Valor FIPE do veículo | [FIPE API (parallelum)](https://deividfortuna.github.io/fipe/) |
| Taxas médias de mercado | [Banco Central – Olinda](https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/aplicacao) |

Todas são gratuitas e sem chave, chamadas direto do navegador. Respostas da FIPE e do BC ficam em cache no `localStorage`.

Não existe API pública gratuita que consulte os dados de um veículo pela placa (esses dados são do Detran/Senatran), então a placa é validada só pelo formato.

## Stack

React 19, Vite, React Router, Firebase (Firestore, Auth por e-mail e senha, Hosting), Vitest, ESLint e Prettier.

Quem garante o que cada papel vê são as regras em `firestore.rules`, não o front: o perfil fica em `usuarios/{uid}`, o cadastro do cliente usa o CPF como id (um cadastro por CPF) e tudo que depende de e-mail exige e-mail confirmado. As regras são testadas no emulador do Firestore (`npm run test:regras`, precisa de Java).

As regras também limitam tamanho e formato de cada campo. Os cálculos do contrato (parcelas, IOF, CET, encargos) rodam no navegador: o banco valida estrutura e dono, não refaz as contas. Para um sistema real esse cálculo iria para o servidor (ex.: Cloud Functions).

## Rodando local

```bash
npm install
npm run dev
```

Sem `.env.local` o app salva tudo no `localStorage`, o que já basta pra testar. Nesse modo existe um admin de exemplo: **admin@rjbank.test / admin123** (não existe com Firebase).

Para usar o Firestore, copie `.env.example` para `.env.local` e preencha com a config do seu projeto Firebase. No console:

1. Authentication → Sign-in method: ative **E-mail/senha** e **Google**.
2. Entre no app com **Entrar com Google** (o admin só é aceito assim) e anote o UID (Authentication → Users).
3. Firestore → coleção `usuarios`, documento com id = seu UID, campos `papel: "admin"`, `email` (o seu, em minúsculas), `nome` e `criadoEm` (texto).

```bash
npm test          # testes de cálculo e validação (Vitest)
npm run test:e2e  # testes de tela (Playwright), com as APIs externas simuladas
npm run test:regras  # regras do Firestore no emulador (precisa de Java)
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

E a cada push no GitHub, o CI roda lint, unitários, as regras no emulador, os
testes de tela deste repositório e as suítes de interface da automação de QA.

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
