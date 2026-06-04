import { describe, expect, test } from 'vitest'

import { parseImageMeta } from './header'

describe('parseImageMeta fallback detection', () => {
  test('detects SVG when PNG magic parser fails', async () => {
    const svgText = '<svg width="120" height="80"></svg>'
    const prefix = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02, 0x03])
    const svgBytes = new TextEncoder().encode(svgText)
    const bytes = new Uint8Array(prefix.length + svgBytes.length)
    bytes.set(prefix, 0)
    bytes.set(svgBytes, prefix.length)

    const blob = new Blob([bytes], { type: 'image/svg+xml' })
    const meta = await parseImageMeta(blob)

    expect(meta).toMatchObject({
      format: 'svg',
      width: 120,
      height: 80,
    })
  })

  test('returns null for unrecognizable bytes without safe fallback', async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xde, 0xad])])
    expect(await parseImageMeta(blob)).toBeNull()
  })
})
