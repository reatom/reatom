import { describe, expect, test } from 'vitest'

import { parseImageMeta } from '../header'
import { parseAvifMeta } from './bmff'

function typeCode(type: string): number {
  return (
    ((type.charCodeAt(0) << 24) |
      (type.charCodeAt(1) << 16) |
      (type.charCodeAt(2) << 8) |
      type.charCodeAt(3)) >>>
    0
  )
}

function box(type: string, payload: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(8 + payload.length)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, bytes.length)
  view.setUint32(4, typeCode(type))
  bytes.set(payload, 8)
  return bytes
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}

function buildAvifBuffer(width: number, height: number): ArrayBuffer {
  const ftypPayload = new Uint8Array(16)
  const ftypView = new DataView(ftypPayload.buffer)
  ftypView.setUint32(0, typeCode('avif'))
  ftypView.setUint32(4, 0)
  ftypView.setUint32(8, typeCode('mif1'))
  ftypView.setUint32(12, typeCode('avif'))

  const ispePayload = new Uint8Array(12)
  const ispeView = new DataView(ispePayload.buffer)
  ispeView.setUint32(0, 0)
  ispeView.setUint32(4, width)
  ispeView.setUint32(8, height)

  const ipco = box('ipco', box('ispe', ispePayload))
  const iprp = box('iprp', ipco)
  const meta = box('meta', concatBytes(new Uint8Array(4), iprp))
  return concatBytes(box('ftyp', ftypPayload), meta).buffer as ArrayBuffer
}

describe('AVIF BMFF metadata', () => {
  test('parseAvifMeta reads dimensions from ispe property', () => {
    const buffer = buildAvifBuffer(4032, 3024)
    expect(parseAvifMeta(new DataView(buffer))).toEqual({
      width: 4032,
      height: 3024,
      format: 'avif',
    })
  })

  test('parseImageMeta reports AVIF dimensions', async () => {
    const blob = new Blob([buildAvifBuffer(1920, 1080)], {
      type: 'image/avif',
    })
    await expect(
      parseImageMeta(blob, { filename: 'photo.avif' }),
    ).resolves.toMatchObject({
      width: 1920,
      height: 1080,
      format: 'avif',
    })
  })
})
