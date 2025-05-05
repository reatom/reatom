import { test, expect, vi } from 'test'
import { atom } from '../core'
import { withConnectHook } from '../mixins'
import { onEvent } from './'
import { wrap } from '../methods'
import { sleep } from '../utils'

test('onEvent', async () => {
  const a = atom(null)
  const cb = vi.fn()

  {
    const controller = new AbortController()
    a.extend(
      withConnectHook(() => {
        onEvent(controller.signal, 'abort', cb)
      }),
    )
    const un = a.subscribe(a)
    await wrap(sleep())
    expect(cb).toBeCalledTimes(0)
    controller.abort()
    expect(cb).toBeCalledTimes(1)
    expect(cb.mock.calls[0]?.[0].type).toBe('abort')
    un()
  }

  cb.mockClear()

  {
    const controller = new AbortController()
    a.extend(withConnectHook(() => onEvent(controller.signal, 'abort', cb)))
    const un = a.subscribe(a)
    un()
    await wrap(sleep())
    expect(cb).toBeCalledTimes(0)
    controller.abort()
    expect(cb.mock.calls[0]?.[0].type).toBe('abort')
  }
})
