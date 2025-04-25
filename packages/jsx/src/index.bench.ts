import { bench, describe } from 'vitest'
import { atom } from '@reatom/core'

describe('Node extend', () => {
  const createNode = () => document.createElement('div')
  const extension = { a: 1, b: 'b', c: {}, d: [], e: () => {} }

  const strategies = {
    'property': {
      assert: (node: any) => '__extends' in node,
      extend: (node: any) => {node.__extends = extension},
      read: (node: any) => node.__extends,
    },
    'symbol': (() => {
      const symbol = Symbol()
      return {
        assert: (node: any) => symbol in node,
        extend: (node: any) => {node[symbol] = extension},
        read: (node: any) => node[symbol],
      }
    })(),
    'Object.assign': {
      assert: (node: any) => '__extends' in node,
      extend: (node: any) => {Object.assign(node, extension)},
      read: (node: any) => node.__extends,
    },
    'WeakMap': (() => {
      const map = new WeakMap<Node, object>()
      return {
        assert: (node: any) => map.has(node),
        extend: (node: any) => {map.set(node, extension)},
        read: (node: any) => map.get(node),
      }
    })(),
  } as const

  describe('assert', () => Object.entries(strategies).forEach(([name, strategy]) => {
    const node = createNode()
    strategy.extend(node)
    bench(name, () => {strategy.assert(node)})
  }))

  describe('extend', () => Object.entries(strategies).forEach(([name, strategy]) => {
    bench(name, () => {strategy.extend(createNode())})
  }))

  describe('read', () => Object.entries(strategies).forEach(([name, strategy]) => {
    const node = createNode()
    strategy.extend(node)
    bench(name, () => {strategy.read(node)})
  }))
})

describe('location to save subscriptions', () => {
  interface NodeWithSubs extends Node {
    __unsubscribes?: (() => void)[]
  }

  const noop = () => {}

  const createNode = (): NodeWithSubs => document.createElement('div') as NodeWithSubs
  const createNodes = () => {
    let parent = createNode()
    parent.__unsubscribes = []
    const list = [parent]

    for (let i = 0; i < 50; i++) {
      const node = createNode()
      parent.appendChild(node)
      parent = node
      list.push(node)
    }

    return list
  }

  const subscribe = (node: NodeWithSubs) => {
    node.__unsubscribes ??= []
    node.__unsubscribes.push(noop)
  }
  const unsubscribe = (node: NodeWithSubs) => {
    node.__unsubscribes?.forEach((un) => un())
    node.__unsubscribes = []
  }

  const strategies = {
    parent: (node: NodeWithSubs) => {
      while (!('__unsubscribes' in node) && node.parentElement) node = node.parentElement
      subscribe(node)
    },
    self: subscribe,
  } as const

  describe('subscribe', () => Object.entries(strategies).forEach(([name, strategy]) => {
    bench(name, () => {
      const nodes = createNodes()
      nodes.forEach(strategy)
    })
  }))

  describe('unsubscribe', () => Object.entries(strategies).forEach(([name, strategy]) => {
    bench(name, () => {
      const nodes = createNodes()
      nodes.forEach(strategy)
      nodes.forEach(unsubscribe)
    })
  }))
})

describe('read value', () => {
  const valueState = 'value'
  const valueAtom = atom(valueState)
  bench('state', () => {valueState})
  bench('atom', () => {valueAtom()})
})

describe('object loops', () => {
  const obj = {
    'aria-label': 'label',
    'on:click': () => {},
    checked: false,
    class: 'hello',
    value: 123,
  }
  const fn = (key: any, value: any) => `${key}: ${value};`

  bench('for..in', () => {
    for (let key in obj) fn(key, obj[key])
  })
  bench('for..of + Object.keys', () => {
    for (let key of Object.keys(obj)) fn(key, obj[key])
  })
  bench('for..of + Object.entries', () => {
    for (let [key, val] of Object.entries(obj)) fn(key, val)
  })
  bench('forEach + Object.keys', () => {
    Object.keys(obj).forEach((key) => fn(key, obj[key]))
  })
  bench('forEach + Object.entries', () => {
    Object.entries(obj).forEach(([key, val]) => fn(key, val))
  })
})
