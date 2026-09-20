import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))

test('glass surfaces register explicitly instead of scanning class names', async () => {
  const source = await readFile(join(here, 'glassSurfaces.ts'), 'utf8')
  expect(source).toContain('registerGlassSurface')
  expect(source).not.toContain('.gallery-toolbar')
  expect(source).not.toContain('lightbox-control-layer')
  expect(source).not.toContain('classList')
})
