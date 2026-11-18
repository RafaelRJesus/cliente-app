// Firestore em memória com o pedaço da API do firebase-admin que a API de massa usa.
// Serve para os testes rodarem sem emulador; no CI os mesmos testes rodam
// também contra o emulador do Firestore (npm run test:emulador).

const clonar = (v) => (v === undefined ? undefined : structuredClone(v))

const campo = (dados, caminho) =>
  caminho.split('.').reduce((acc, parte) => (acc == null ? undefined : acc[parte]), dados)

const OPERADORES = {
  '==': (a, b) => a === b,
  '>=': (a, b) => a != null && a >= b,
  '<=': (a, b) => a != null && a <= b,
  '>': (a, b) => a != null && a > b,
  '<': (a, b) => a != null && a < b,
  in: (a, b) => b.includes(a),
}

let sequenciaId = 0
const novoId = () =>
  `auto${String(++sequenciaId).padStart(8, '0')}${Math.random().toString(36).slice(2, 8)}`

function snapshot(ref, dados) {
  return {
    id: ref.id,
    ref,
    exists: dados !== undefined,
    data: () => clonar(dados),
  }
}

export function criarFirestoreMemoria() {
  const colecoes = new Map()
  const tabela = (nome) => {
    if (!colecoes.has(nome)) colecoes.set(nome, new Map())
    return colecoes.get(nome)
  }

  function docRef(nomeColecao, id = novoId()) {
    const ref = {
      id,
      path: `${nomeColecao}/${id}`,
      _colecao: nomeColecao,
      async get() {
        return snapshot(ref, tabela(nomeColecao).get(id))
      },
      async set(dados) {
        tabela(nomeColecao).set(id, clonar(dados))
      },
      async create(dados) {
        if (tabela(nomeColecao).has(id)) {
          throw Object.assign(new Error(`ALREADY_EXISTS: ${ref.path}`), { code: 6 })
        }
        tabela(nomeColecao).set(id, clonar(dados))
      },
      async update(alteracoes) {
        const atual = tabela(nomeColecao).get(id)
        if (atual === undefined) {
          throw Object.assign(new Error(`NOT_FOUND: ${ref.path}`), { code: 5 })
        }
        tabela(nomeColecao).set(id, { ...atual, ...clonar(alteracoes) })
      },
      async delete() {
        tabela(nomeColecao).delete(id)
      },
    }
    return ref
  }

  function consulta(nomeColecao, filtros = [], limite = Infinity) {
    return {
      where: (caminho, op, valor) =>
        consulta(nomeColecao, [...filtros, { caminho, op, valor }], limite),
      limit: (n) => consulta(nomeColecao, filtros, n),
      async get() {
        const docs = [...tabela(nomeColecao).entries()]
          .filter(([, dados]) =>
            filtros.every((f) => OPERADORES[f.op](campo(dados, f.caminho), f.valor)),
          )
          .slice(0, limite)
          .map(([id, dados]) => snapshot(docRef(nomeColecao, id), dados))
        return { docs, empty: docs.length === 0, size: docs.length }
      },
    }
  }

  const db = {
    collection(nome) {
      return { ...consulta(nome), doc: (id) => docRef(nome, id) }
    },

    // Transação simplificada: as escritas só valem no fim, como no Firestore.
    async runTransaction(fn) {
      const escritas = []
      const tx = {
        get: (alvo) => alvo.get(),
        set: (ref, dados) => escritas.push(() => ref.set(dados)),
        create: (ref, dados) => escritas.push(() => ref.create(dados)),
        update: (ref, dados) => escritas.push(() => ref.update(dados)),
        delete: (ref) => escritas.push(() => ref.delete()),
      }
      const resultado = await fn(tx)
      const backup = new Map([...colecoes].map(([k, v]) => [k, new Map(v)]))
      try {
        for (const escrever of escritas) await escrever()
      } catch (err) {
        colecoes.clear()
        for (const [k, v] of backup) colecoes.set(k, v)
        throw err
      }
      return resultado
    },

    batch() {
      const operacoes = []
      return {
        delete: (ref) => operacoes.push(() => ref.delete()),
        set: (ref, dados) => operacoes.push(() => ref.set(dados)),
        update: (ref, dados) => operacoes.push(() => ref.update(dados)),
        commit: async () => {
          for (const op of operacoes) await op()
        },
      }
    },

    // só para os testes olharem o estado
    _dump: (nome) => Object.fromEntries(tabela(nome)),
  }

  return db
}
