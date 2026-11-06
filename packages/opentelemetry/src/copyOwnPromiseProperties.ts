// `then` stays the derived promise's own, so callers still observe it.
export const copyOwnPromiseProperties = (
  source: Promise<unknown>,
  target: Promise<unknown>,
) => {
  for (const key of Reflect.ownKeys(source)) {
    if (key === 'then') continue
    const descriptor = Object.getOwnPropertyDescriptor(source, key)
    if (descriptor) Object.defineProperty(target, key, descriptor)
  }
}
