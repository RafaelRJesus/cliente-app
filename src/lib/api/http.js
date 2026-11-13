export async function getJson(url, { timeout = 10_000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

// Cache simples em localStorage com validade em horas.
export async function cached(key, hours, loader) {
  const storageKey = `rjbank:cache:${key}`
  try {
    const hit = JSON.parse(localStorage.getItem(storageKey))
    if (hit && Date.now() - hit.at < hours * 3_600_000) return hit.data
  } catch {
    // cache corrompido ou indisponível: segue para a API
  }

  const data = await loader()
  try {
    localStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // sem espaço/privado: só não guarda
  }
  return data
}
