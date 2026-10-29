import { setImmediate } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { Rolldown } from 'tsdown'
import { expect, test } from 'vitest'

import type * as Core from '../index'

test('minified withAbort releases discarded contexts', async () => {
  const gc = global.gc
  if (!gc) throw new Error('Run this test with --expose-gc')

  const { output } = await Rolldown.build({
    input: fileURLToPath(new URL('../index.ts', import.meta.url)),
    platform: 'node',
    checks: { invalidAnnotation: false },
    write: false,
    output: { format: 'esm', minify: true, codeSplitting: false },
  })
  const chunk = output.find((item) => item.type === 'chunk')
  if (!chunk) throw new Error('Expected a minified JavaScript bundle')

  const {
    action,
    abortVar,
    clearStack,
    context,
    notify,
    withAbort,
  }: typeof Core = await import(
    `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
  )

  clearStack()
  const subscribe = action(
    () => abortVar.subscribe(),
    'minified.subscribe',
  ).extend(withAbort())
  const refs = Array.from({ length: 5 }, () => {
    const root = context.start()
    root.run(subscribe)
    root.run(notify)
    return new WeakRef(root)
  })

  for (let attempt = 0; attempt < 10; attempt++) {
    await setImmediate()
    gc()
  }

  expect(refs.filter((ref) => ref.deref()).length).toBe(0)
})
