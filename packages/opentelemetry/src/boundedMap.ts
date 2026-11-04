export const addBounded = <Key>(
  ids: Set<Key>,
  id: Key,
  limit: number,
): void => {
  if (ids.has(id)) return
  if (ids.size >= limit) {
    const oldest = ids.values().next().value
    if (oldest !== undefined) ids.delete(oldest)
  }
  ids.add(id)
}

export const setBounded = <Key, Value>(
  book: Map<Key, Value>,
  key: Key,
  value: Value,
  limit: number,
): void => {
  if (!book.has(key) && book.size >= limit) {
    const oldest = book.keys().next().value
    if (oldest !== undefined) book.delete(oldest)
  }
  book.set(key, value)
}
