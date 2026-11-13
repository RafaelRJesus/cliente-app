# Cadastro de Clientes

Aplicação web em **React + Vite** para cadastrar, listar e remover clientes, com persistência no **Cloud Firestore** e publicação no **Firebase Hosting**.

> Projeto de estudo/portfólio. Use apenas dados fictícios.

## Funcionalidades

- Cadastro com validação de campos obrigatórios (nome, e-mail, telefone) e formato de e-mail
- Listagem ordenada do mais recente para o mais antigo
- Remoção de clientes
- Persistência no Firestore com **login anônimo**: cada visitante enxerga só os próprios cadastros
- **Regras de segurança** no Firestore validando dono, campos permitidos e tamanhos
- Modo offline/local: sem o Firebase configurado, os dados ficam no `localStorage` do navegador

## Tecnologias

React 19 · Vite · Firebase (Firestore, Authentication, Hosting) · ESLint

## Estrutura

```text
src/
├── App.jsx                         # Tela, formulário e validações
└── services/
    ├── firebase.js                 # Inicialização do Firebase e login anônimo
    └── clientesRepository.js       # Acesso a dados (Firestore ou localStorage)
firestore.rules                     # Regras de segurança do banco
firestore.indexes.json              # Índices do Firestore (nenhum necessário)
firebase.json                       # Configuração do Hosting e do Firestore
```

## Como rodar localmente

```bash
npm install
npm run dev
```

Sem configuração, o app já funciona salvando no navegador.

### Conectando ao Firebase

1. Crie um projeto no [Console do Firebase](https://console.firebase.google.com/).
2. Ative o **Cloud Firestore** e, em **Authentication > Sign-in method**, ative o provedor **Anônimo**.
3. Registre um app Web e copie a configuração do SDK.
4. Copie `.env.example` para `.env.local` e preencha as variáveis.
5. Rode `npm run dev` de novo. O selo no topo da tela muda para "Salvando no Firestore".

## Deploy

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # escolha o projeto criado
npm run build
firebase deploy               # publica o Hosting, as regras e os índices
```

## Scripts

| Comando           | Descrição                         |
| ----------------- | --------------------------------- |
| `npm run dev`     | Servidor de desenvolvimento       |
| `npm run build`   | Build de produção em `dist/`      |
| `npm run preview` | Visualiza o build localmente      |
| `npm run lint`    | Análise estática com ESLint       |
