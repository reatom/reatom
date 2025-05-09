#!/usr/bin/env node

import { $, tmpdir, fs } from 'zx'

const docsTmp = tmpdir()
try {
  await $`typedoc --out ${docsTmp}`
  
  await $`rm ${docsTmp}/README.md`
  await $`concat-md --decrease-title-levels --dir-name-as-title ${docsTmp} > REFERENCE.md`
  await fs.remove(docsTmp)
} catch (e) {
  console.warn(`Partial output in ${docsTmp}`)
  throw e
}
