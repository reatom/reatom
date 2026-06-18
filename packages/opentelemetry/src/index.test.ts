import { test, expect } from 'vitest'
import { reatomOpentelemetry } from './with-otel'
import { action } from '@reatom/core'

test('opentelemetry extension initializes', () => {
  const withOTel = reatomOpentelemetry({ endpoint: 'http://localhost/traces' })
  expect(typeof withOTel).toBe('function')

  const myAction = action(() => 123, 'myAction').extend(withOTel({ kind: 'client' }))
  
  const res = myAction()
  expect(res).toBe(123)
})
