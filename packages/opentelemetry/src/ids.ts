import { hexFromBytes } from './hexFromBytes.ts'

export const mintIdentityId = (): string => {
  const cryptoObj = globalThis.crypto
  if (typeof cryptoObj?.randomUUID === 'function') return cryptoObj.randomUUID()
  const bytes = cryptoObj.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 15) | 64
  bytes[8] = (bytes[8]! & 63) | 128
  const hex = hexFromBytes(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
