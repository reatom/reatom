import { printLogs, formatLog, POSITION_KEY } from './bench_utils'

async function testAggregateGrowing(count: number, method: 'push' | 'unshift') {
  const mol_wire_lib = await import('mol_wire_lib')
  const { $mol_wire_atom } = mol_wire_lib.default

  const Reatom = await import('./build')

  const { observable, computed, autorun, configure } = await import('mobx')
  configure({ enforceActions: 'never' })

  const { act } = await import('@artalar/act')

  const molAtoms = [new $mol_wire_atom(`0`, (next: number = 0) => next)]

  const ReatomAtoms = [Reatom.atom(0, `${0}`)]
  const mobxAtoms = [observable.box(0, { name: `${0}` })]
  const actAtoms = [act(0)]

  const molAtom = new $mol_wire_atom(`sum`, () =>
    molAtoms.reduce((sum, atom) => sum + atom.sync(), 0),
  )

  const ReatomAtom = Reatom.computed(
    () => ReatomAtoms.reduce((sum, atom) => sum + atom(), 0),
    `sum`,
  )
  const mobxAtom = computed(
    () => mobxAtoms.reduce((sum, atom) => sum + atom.get(), 0),
    { name: `sum` },
  )
  const actAtom = act(() => actAtoms.reduce((sum, a) => sum + a(), 0))

  Reatom.clearStack()
  const ReatomRoot = Reatom.context.start(() => Reatom.context())

  ReatomRoot.run(ReatomAtom.subscribe)
  molAtom.sync()
  autorun(() => mobxAtom.get())
  actAtom.subscribe(() => {})

  const ReatomLogs = new Array<number>()
  const molLogs = new Array<number>()
  const mobxLogs = new Array<number>()
  const actLogs = new Array<number>()
  let i = 1
  while (i++ < count) {
    const startMol = performance.now()
    molAtoms[method](new $mol_wire_atom(`${i}`, (next: number = i) => next))
    molAtoms.at(-2)!.put(i)
    molAtom.sync()
    molLogs.push(performance.now() - startMol)

    const startMobx = performance.now()
    mobxAtoms[method](observable.box(i, { name: `${i}` }))
    mobxAtoms.at(-2)!.set(i)
    mobxLogs.push(performance.now() - startMobx)

    const startReatom = performance.now()
    ReatomRoot.run(() => {
      ReatomAtoms[method](Reatom.atom(i))
      ReatomAtoms.at(-2)!(i)
      Reatom.notify()
    })
    ReatomLogs.push(performance.now() - startReatom)

    const startAct = performance.now()
    actAtoms[method](act(i))
    actAtoms.at(-2)!(i)
    act.notify()
    actLogs.push(performance.now() - startAct)

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  if (
    new Set([
      molAtom.sync(),
      mobxAtom.get(),
      actAtom(),
      ReatomRoot.run(ReatomAtom),
    ]).size > 1
  ) {
    throw new Error(
      'Mismatch: ' +
        JSON.stringify({
          mol: molAtom.sync(),
          mobx: mobxAtom.get(),
          act: actAtom(),
          Reatom: ReatomRoot.run(ReatomAtom),
        }),
    )
  }

  console.log(
    `Median of sum calc of reactive nodes in list from 1 to ${count} (with "${method}")`,
  )

  return printLogs({
    $mol_wire: formatLog(molLogs),
    mobx: formatLog(mobxLogs),
    act: formatLog(actLogs),
    Reatom: formatLog(ReatomLogs),
  })
}

async function testAggregateShrinking(count: number, method: 'pop' | 'shift') {
  const mol_wire_lib = await import('mol_wire_lib')
  const { $mol_wire_atom } = mol_wire_lib.default

  const Reatom = await import('./build')

  const { observable, computed, autorun, configure } = await import('mobx')
  configure({ enforceActions: 'never' })

  const { act } = await import('@artalar/act')

  const molAtoms = Array.from(
    { length: count },
    (_, i) => new $mol_wire_atom(`${i}`, (next: number = 1) => next),
  )

  const ReatomAtoms = Array.from({ length: count }, (_, i) =>
    Reatom.atom(1, `${i}`),
  )
  const mobxAtoms = Array.from({ length: count }, (_, i) =>
    observable.box(1, { name: `${i}` }),
  )
  const actAtoms = Array.from({ length: count }, (_, i) => act(1))

  const molAtom = new $mol_wire_atom(`sum`, () =>
    molAtoms.reduce((sum, atom) => sum + atom.sync(), 0),
  )

  const ReatomAtom = Reatom.computed(
    () => ReatomAtoms.reduce((sum, atom) => sum + atom(), 0),
    `sum`,
  )
  const mobxAtom = computed(
    () => mobxAtoms.reduce((sum, atom) => sum + atom.get(), 0),
    { name: `sum` },
  )
  const actAtom = act(() => actAtoms.reduce((sum, a) => sum + a(), 0))

  Reatom.clearStack()
  const ReatomRoot = Reatom.context.start(() => Reatom.context())

  ReatomRoot.run(ReatomAtom.subscribe)
  molAtom.sync()
  autorun(() => mobxAtom.get())
  actAtom.subscribe(() => {})

  const ReatomLogs = new Array<number>()
  const molLogs = new Array<number>()
  const mobxLogs = new Array<number>()
  const actLogs = new Array<number>()

  let i = 1
  while (i++ < count) {
    const startReatom = performance.now()
    ReatomRoot.run(() => {
      ReatomAtoms[method]()!(i)
      Reatom.notify()
    })
    ReatomLogs.push(performance.now() - startReatom)

    const startMol = performance.now()
    molAtoms[method]()!.put(i)
    molAtom.sync()
    molLogs.push(performance.now() - startMol)

    const startMobx = performance.now()
    mobxAtoms[method]()!.set(i)
    mobxLogs.push(performance.now() - startMobx)

    const startAct = performance.now()
    actAtoms[method]()!(i)
    act.notify()
    actLogs.push(performance.now() - startAct)

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  if (
    new Set([
      molAtom.sync(),
      ReatomRoot.run(ReatomAtom),
      mobxAtom.get(),
      actAtom(),
    ]).size > 1
  ) {
    throw new Error(
      'Mismatch: ' +
        JSON.stringify({
          mol: molAtom.sync(),
          Reatom: ReatomRoot.run(ReatomAtom),
          mobx: mobxAtom.get(),
          act: actAtom(),
        }),
    )
  }

  console.log(
    `Median of sum calc of reactive nodes in list from ${count} to 1 (with "${method}")`,
  )

  return printLogs({
    $mol_wire: formatLog(molLogs),
    mobx: formatLog(mobxLogs),
    act: formatLog(actLogs),
    Reatom: formatLog(ReatomLogs),
  })
}

async function testParent(count: number) {
  const mol_wire_lib = await import('mol_wire_lib')
  const { $mol_wire_atom } = mol_wire_lib.default

  const Reatom = await import('./build')

  const { observable, computed, autorun, configure } = await import('mobx')
  configure({ enforceActions: 'never' })

  const { act } = await import('@artalar/act')

  const molAtom = new $mol_wire_atom(`0`, (next: number = 0) => next)
  const molAtoms = []
  const ReatomAtom = Reatom.atom(0, `${0}`)
  const mobxAtom = observable.box(0, { name: `${0}` })
  const actAtom = act(0)
  const actAtoms = []

  Reatom.clearStack()
  const ReatomRoot = Reatom.context.start(() => Reatom.context())

  {
    let i = count
    while (i--) {
      const molPubAtom = new $mol_wire_atom(`${i}`, () => molAtom.sync())
      molPubAtom.sync()
      molAtoms.push(molPubAtom)

      const ReatomDepAtom = Reatom.computed(() => ReatomAtom())
      ReatomRoot.run(ReatomDepAtom.subscribe)

      const mobxDepAtom = computed(() => mobxAtom.get())
      autorun(() => mobxDepAtom.get())

      const actDepAtom = act(() => actAtom())
      actDepAtom.subscribe(() => {})
      actAtoms.push(actDepAtom)
    }
  }

  const ReatomLogs = new Array<number>()
  const molLogs = new Array<number>()
  const mobxLogs = new Array<number>()
  const actLogs = new Array<number>()
  let i = count
  while (i--) {
    const startReatom = performance.now()
    ReatomRoot.run(() => {
      ReatomAtom(i)
      Reatom.notify()
    })
    ReatomLogs.push(performance.now() - startReatom)

    const startMol = performance.now()
    molAtom.put(i)
    molAtoms.forEach((atom) => atom.sync())
    molLogs.push(performance.now() - startMol)

    const startMobx = performance.now()
    mobxAtom.set(i)
    mobxLogs.push(performance.now() - startMobx)

    const startAct = performance.now()
    actAtom(i)
    act.notify()
    actLogs.push(performance.now() - startAct)

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  if (
    new Set([
      molAtom.sync(),
      ReatomRoot.run(ReatomAtom),
      mobxAtom.get(),
      actAtom(),
    ]).size > 1
  ) {
    throw new Error(
      'Mismatch: ' +
        JSON.stringify({
          mol: molAtom.sync(),
          Reatom: ReatomRoot.run(ReatomAtom),
          mobx: mobxAtom.get(),
          act: actAtom(),
        }),
    )
  }

  console.log(`Median of update 1 node with ${count} reactive children`)

  return printLogs({
    $mol_wire: formatLog(molLogs),
    mobx: formatLog(mobxLogs),
    act: formatLog(actLogs),
    Reatom: formatLog(ReatomLogs),
  })
}

;(async () => {
  // const subscribers = [20]
  // const subscribers = [2, 2, 2, 2, 4, 8, 16]
  const subscribers = [2, 4, 8, 16, 32, 64, 128]
  // const subscribers = [1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 4, 10]

  let results: any[] = [];
  
  for (const i of subscribers) {
    results = [
      await testAggregateGrowing(i, 'push'),
      await testAggregateGrowing(i, 'unshift'),
      await testAggregateShrinking(i, 'pop'),
      await testAggregateShrinking(i, 'shift'),
      // await testParent(i),
    ]
  }

  console.log('\nAVERAGE for', subscribers.join(','), 'subscribers')

  Object.keys(results[0])
    .map((name) => ({
      name,
      pos:
        results.reduce((acc, log) => +log[name][POSITION_KEY] + acc, 0) /
        results.length,
    }))
    .sort((a, b) => a.pos - b.pos)
    .forEach(({ name, pos }) => console.log(pos, name))

  process.exit()
})()
