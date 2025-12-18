import { join } from 'node:path'

export function resolveBase(path: string): string {
  return join(import.meta.env.BASE_URL, path)
}
