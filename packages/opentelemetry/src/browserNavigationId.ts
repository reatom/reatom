import { mintIdentityId } from './ids.ts'
const key = Symbol.for('@reatom/opentelemetry/navigation-entry-id')
/** Shared document join ID, without persistent storage or analytics identity. */
export const navigationEntryId = (document: Document): string => {
  const host = globalThis as typeof globalThis & {
    [key]?: WeakMap<Document, string>
  }
  const ids = (host[key] ??= new WeakMap())
  let id = ids.get(document)
  if (!id) ids.set(document, (id = mintIdentityId()))
  return id
}
