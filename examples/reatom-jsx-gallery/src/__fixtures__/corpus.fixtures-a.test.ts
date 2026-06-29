import { describe, expect, test } from 'vitest'

import { parseImageMeta } from '../image-engine/header'
import { listFixtures, readFixtureBlob } from './fixtureLoader.node'

describe('tier-a fixtures', () => {
  test('parseImageMeta succeeds for every tier-a file', async () => {
    const entries = listFixtures('tier-a')

    for (const entry of entries) {
      const blob = await readFixtureBlob(entry.tier, entry.dest)
      const meta = await parseImageMeta(blob, {
        filename: entry.dest.split('/').pop(),
      })

      expect(meta, entry.dest).not.toBeNull()
      expect(meta?.format, entry.dest).not.toBe('unknown')
    }
  })
})
