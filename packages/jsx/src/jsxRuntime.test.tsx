/** @jsxImportSource @reatom/jsx */
import { atom, context, isConnected, sleep, wrap } from '@reatom/core'
import { expect, test } from 'vitest'

import { mount } from '.'

const html = (element: Node) => {
  const host = document.createElement('div')
  host.append(element)
  return host.innerHTML
}

test('compiled automatic JSX renders elements, fragments and nested arrays', () =>
  context.start(() => {
    const items = ['a', 'b']
    expect(
      html(
        <>
          <br />
          <p id="a">
            text<b>bold</b>
          </p>
        </>,
      ),
    ).toBe('<!----><br><p id="a">text<b>bold</b></p><!---->')
    expect(
      html(
        <ul>
          {items.map((item) => (
            <li>{item}</li>
          ))}
        </ul>,
      ),
    ).toBe('<ul><li>a</li><li>b</li></ul>')
  }))

test('compiled JSX keeps explicit and nested component children unwrapped', () =>
  context.start(() => {
    const received: unknown[] = []
    const Probe = (props: { children?: unknown; key?: unknown }) => {
      received.push(props.children)
      return <i />
    }
    const nodes = [
      <Probe />,
      <Probe children="explicit" />,
      <Probe>one</Probe>,
      <Probe>{['a', 'b']}</Probe>,
      <Probe>
        a<b>b</b>
      </Probe>,
    ]
    expect(nodes).toHaveLength(5)
    expect(received.slice(0, 4)).toEqual([
      undefined,
      'explicit',
      'one',
      ['a', 'b'],
    ])
    const multiple = received[4]
    expect(Array.isArray(multiple)).toBe(true)
    if (!Array.isArray(multiple)) throw new Error('expected static children')
    expect(multiple[0]).toBe('a')
    expect(html(multiple[1])).toBe('<b>b</b>')
  }))

test('compiled key/spread ordering works for elements and components', () =>
  context.start(() => {
    const spread = { key: 'spread', children: 'spread child' }
    expect(html(<p key="early" {...spread} />)).toBe(
      '<p key="spread">spread child</p>',
    )
    // This emits createElement from @reatom/jsx, not jsx from jsx-runtime.
    expect(html(<p {...spread} key="late" />)).toBe(
      '<p key="late">spread child</p>',
    )
    const keys: unknown[] = []
    const Probe = (props: { key?: unknown; children?: unknown }) => {
      keys.push(props.key)
      return <i />
    }
    const nodes = [
      <Probe key="early" {...spread} />,
      <Probe {...spread} key="late" />,
    ]
    expect(nodes).toHaveLength(2)
    expect(keys).toEqual(['spread', 'late'])
  }))

test('compiled reactive attributes, children and mount cleanup work', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  try {
    await context.start(async () => {
      const value = atom('one')
      const dispose = mount(
        host,
        <p attr:data-value={value}>{value}</p>,
      ).unmount
      await wrap(sleep())
      expect(isConnected(value)).toBe(true)
      expect(host.textContent).toBe('one')
      value.set('two')
      await wrap(sleep())
      expect(host.querySelector('p')?.getAttribute('data-value')).toBe('two')
      expect(host.textContent).toBe('two')
      dispose()
      expect(isConnected(value)).toBe(false)
      expect(host.textContent).toBe('')
    })
  } finally {
    host.remove()
  }
})
