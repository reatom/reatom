import { bench, describe } from 'vitest'

describe('Node extend', () => {
  const createNode = () => document.createElement('div')
  const createExtends = () => ({ a: 1, b: 'b', c: {}, d: [], e: () => {} })

  const strategies = {
    'direct assingment': {
      assert: (node: any) => '__extends' in node,
      create: () => {
        const node = createNode()
        // @ts-expect-error
        node.__extends = createExtends()
        return node
      },
      read: (node: any) => node.__extends,
    },
    'Object.assign': {
      assert: (node: any) => '__extends' in node,
      create: () => Object.assign(createNode(), createExtends()),
      read: (node: any) => node.__extends,
    },
    'WeakMap': (() => {
      const map = new WeakMap<Node, object>()
      return {
        assert: (node: any) => map.has(node),
        create: () => {
          const node = createNode()
          map.set(node, createExtends())
          return node
        },
        read: (node: any) => map.get(node),
      }
    })(),
  } as const

  describe('assert', () => Object.entries(strategies).forEach(([name, strategy]) => {
    let node: Node
    bench(
      name,
      () => {strategy.assert(node)},
      {setup: () => {node = strategy.create()}},
    )
  }))

  describe('create', () => Object.entries(strategies).forEach(([name, strategy]) => {
    bench(name, () => {strategy.create()})
  }))

  describe('read', () => Object.entries(strategies).forEach(([name, strategy]) => {
    let node: Node
    bench(
      name,
      () => {strategy.read(node)},
      {setup: () => {node = strategy.create()}},
    )
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

    for (let i = 0; i < 10; i++) {
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
    let nodes: NodeWithSubs[]
    bench(
      name,
      () => nodes.forEach(strategy),
      {setup: () => {nodes = createNodes()}}
    )
  }))

  describe('unsubscribe', () => Object.entries(strategies).forEach(([name, strategy]) => {
    let nodes: NodeWithSubs[]
    bench(
      name,
      () => nodes.forEach((node) => unsubscribe(node)),
      {setup: () => {nodes = createNodes();nodes.forEach(strategy)}},
    )
  }))
})