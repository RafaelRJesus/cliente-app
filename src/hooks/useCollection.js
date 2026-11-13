import { useCallback, useEffect, useState } from 'react'

export function useCollection(store) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    store
      .list()
      .then((data) => active && setItems(data))
      .catch((err) => {
        console.error(err)
        if (active) setError('Não foi possível carregar os dados.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [store])

  const add = useCallback(
    async (item) => {
      const created = await store.add(item)
      setItems((current) => [created, ...current])
      return created
    },
    [store],
  )

  const update = useCallback(
    async (id, changes) => {
      await store.update(id, changes)
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
      )
    },
    [store],
  )

  const remove = useCallback(
    async (id) => {
      await store.remove(id)
      setItems((current) => current.filter((item) => item.id !== id))
    },
    [store],
  )

  return { items, loading, error, add, update, remove }
}
