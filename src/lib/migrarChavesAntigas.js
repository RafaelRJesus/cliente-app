// O banco se chamava RJ Bank e o modo local guardava tudo em chaves "rjbank:".
// Este módulo roda antes de todos (é o primeiro import do main.jsx) e passa o
// que existir para "respawn:", trocando também o e-mail do admin de exemplo.

const ANTIGO = 'rjbank:'
const NOVO = 'respawn:'
const ADMIN_ANTIGO = 'admin@rjbank.test'
const ADMIN_NOVO = 'admin@respawn.test'

export function migrarChavesAntigas(storage) {
  const antigas = []
  for (let i = 0; i < storage.length; i++) {
    const chave = storage.key(i)
    if (chave?.startsWith(ANTIGO)) antigas.push(chave)
  }
  for (const chave of antigas) {
    const nova = NOVO + chave.slice(ANTIGO.length)
    if (storage.getItem(nova) === null) storage.setItem(nova, storage.getItem(chave))
    storage.removeItem(chave)
  }

  const contas = JSON.parse(storage.getItem(`${NOVO}contas`) ?? 'null')
  if (Array.isArray(contas) && contas.some((c) => c.email === ADMIN_ANTIGO)) {
    const semDuplicar = contas.filter((c) => c.email !== ADMIN_NOVO)
    storage.setItem(
      `${NOVO}contas`,
      JSON.stringify(
        semDuplicar.map((c) =>
          c.email === ADMIN_ANTIGO ? { ...c, email: ADMIN_NOVO } : c,
        ),
      ),
    )
  }
  const usuarios = JSON.parse(storage.getItem(`${NOVO}usuarios`) ?? 'null')
  if (usuarios?.['admin-local']?.email === ADMIN_ANTIGO) {
    usuarios['admin-local'].email = ADMIN_NOVO
    storage.setItem(`${NOVO}usuarios`, JSON.stringify(usuarios))
  }
}

try {
  if (typeof localStorage !== 'undefined') migrarChavesAntigas(localStorage)
} catch {
  // localStorage indisponível (modo privado, por exemplo): não há o que migrar
}
