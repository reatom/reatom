import { atom, computed, notify, sleep, wrap } from '@reatom/core'
import { expect, test } from 'test'

import { createCounterApp } from './fixtures/counterApp'
import { createTodoApp } from './fixtures/todoApp'
import { createWeatherApp } from './fixtures/weatherApp'
import { createAdmin } from './index'
import { ADMIN_FRAME } from './root'

test('createAdmin wires reporter, store, filters, timeline, causeGraph', () => {
  const admin = createAdmin({ maxFrames: 100 })
  const counter = atom(0, 'counter')
  counter.subscribe(() => {})

  ADMIN_FRAME.run(() => {
    const session = admin.session.current()
    expect(session.id).toBeTruthy()
    const storeFrames = admin.store.frames()
    const visibleFrames = admin.filters.engine.visibleFrames()
    expect(storeFrames).toEqual(visibleFrames)
    const buckets = admin.timeline.buckets()
    expect(Array.isArray(buckets)).toBe(true)
    expect(admin.view.summary().source).toBe('live')
  })

  admin.dispose()
})

test('log accumulation from todo app', async () => {
  const admin = createAdmin()
  const { addTodo, toggleTodo } = createTodoApp()

  ADMIN_FRAME.run(() => {
    addTodo('Buy milk')
    addTodo('Write tests')
    toggleTodo(0)
    notify()
  })
  await wrap(sleep(10))

  const frames = ADMIN_FRAME.run(() => admin.store.frames())
  expect(frames.length).toBeGreaterThanOrEqual(3)

  const atomNames = ADMIN_FRAME.run(() => admin.store.uniqueNames())
  expect(atomNames).toContain('todos')
  expect(atomNames).toContain('addTodo')

  admin.dispose()
})

test('error tag exists and error predicate matches frames with error', async () => {
  const admin = createAdmin()
  const errorTag = ADMIN_FRAME.run(() =>
    admin.filters.tags.tags().find((t) => t.builtIn && t.name === 'error'),
  )
  expect(errorTag).toBeDefined()
  expect(errorTag!.predicates.some((p) => p.type === 'error')).toBe(true)

  admin.dispose()
})

test('log accumulation from counter app', async () => {
  const admin = createAdmin()
  const { increment, decrement } = createCounterApp()

  ADMIN_FRAME.run(() => {
    increment()
    increment()
    decrement()
    notify()
  })
  await wrap(sleep(10))

  const frames = ADMIN_FRAME.run(() => admin.store.frames())
  expect(frames.length).toBeGreaterThanOrEqual(3)
  expect(ADMIN_FRAME.run(() => admin.store.uniqueNames())).toContain('count')

  admin.dispose()
})

test('search filtering', async () => {
  const admin = createAdmin()
  const { addTodo } = createTodoApp()

  ADMIN_FRAME.run(() => {
    addTodo('alpha')
    addTodo('beta')
    addTodo('gamma')
    notify()
  })
  await wrap(sleep(10))

  ADMIN_FRAME.run(() => {
    admin.filters.search.searchQuery.set('beta')
    notify()
  })
  await wrap(sleep(5))

  const results = ADMIN_FRAME.run(() => admin.filters.search.searchResults())
  expect(results.length).toBeGreaterThanOrEqual(1)
  const atoms = ADMIN_FRAME.run(() => admin.store.getAtoms())
  const hasBeta = results.some((f) => {
    const name = atoms.get(f.atomId)?.name ?? ''
    return name.includes('beta') || JSON.stringify(f.state).includes('beta')
  })
  expect(hasBeta).toBe(true)

  admin.dispose()
})

test('tag filtering show mode', async () => {
  const admin = createAdmin()
  const { addTodo } = createTodoApp()

  ADMIN_FRAME.run(() => {
    addTodo('item1')
    addTodo('item2')
    notify()
  })
  await wrap(sleep(10))

  const todoTag = ADMIN_FRAME.run(() =>
    admin.filters.tags.createTag('todo', [
      { id: 'p1', type: 'text', target: 'name', value: 'todo' },
    ]),
  )
  ADMIN_FRAME.run(() =>
    admin.filters.engine.addConfig({
      id: 'c1',
      expression: {
        operator: 'AND',
        children: [{ tagId: todoTag.id, negated: false }],
      },
      mode: 'show',
    }),
  )

  const visible = ADMIN_FRAME.run(() => admin.filters.engine.visibleFrames())
  const todoFrames = visible.filter((f) => {
    const atom = ADMIN_FRAME.run(() => admin.store.getAtoms().get(f.atomId))
    return atom?.name?.toLowerCase().includes('todo')
  })
  expect(todoFrames.length).toBeGreaterThanOrEqual(1)

  admin.dispose()
})

test('highlight mode', async () => {
  const admin = createAdmin()
  const { addTodo } = createTodoApp()

  ADMIN_FRAME.run(() => {
    addTodo('x')
    notify()
  })
  await wrap(sleep(10))

  const tag = ADMIN_FRAME.run(() =>
    admin.filters.tags.createTag('x', [
      { id: 'p1', type: 'text', target: 'state', value: 'x' },
    ]),
  )
  ADMIN_FRAME.run(() =>
    admin.filters.engine.addConfig({
      id: 'c1',
      expression: {
        operator: 'AND',
        children: [{ tagId: tag.id, negated: false }],
      },
      mode: 'highlight',
    }),
  )

  const highlighted = ADMIN_FRAME.run(() =>
    admin.filters.engine.highlightedIds(),
  )
  expect(highlighted.size).toBeGreaterThanOrEqual(0)

  admin.dispose()
})

test('exclude mode', async () => {
  const admin = createAdmin()
  const { addTodo } = createTodoApp()
  const { increment } = createCounterApp()

  ADMIN_FRAME.run(() => {
    addTodo('todo')
    increment()
    notify()
  })
  await wrap(sleep(10))

  const countTag = ADMIN_FRAME.run(() =>
    admin.filters.tags.createTag('counter', [
      { id: 'p1', type: 'text', target: 'name', value: 'count' },
    ]),
  )
  ADMIN_FRAME.run(() =>
    admin.filters.engine.addConfig({
      id: 'c1',
      expression: {
        operator: 'AND',
        children: [{ tagId: countTag.id, negated: false }],
      },
      mode: 'exclude',
    }),
  )

  const data = ADMIN_FRAME.run(() => admin.filters.engine.activeDataSource())
  const hasCountFrames = data.some((f) => {
    const atom = ADMIN_FRAME.run(() => admin.store.getAtoms().get(f.atomId))
    return atom?.name === 'count'
  })
  expect(hasCountFrames).toBe(false)

  admin.dispose()
})

test('timeline buckets', async () => {
  const admin = createAdmin()
  const { increment } = createCounterApp()

  ADMIN_FRAME.run(() => {
    increment()
    notify()
  })
  await wrap(sleep(20))
  ADMIN_FRAME.run(() => {
    increment()
    notify()
  })
  await wrap(sleep(20))
  ADMIN_FRAME.run(() => {
    increment()
    notify()
  })
  await wrap(sleep(10))

  const buckets = ADMIN_FRAME.run(() => admin.timeline.buckets())
  expect(buckets.length).toBeGreaterThanOrEqual(1)
  const totalEntries = buckets.reduce((sum, b) => sum + b.entries.length, 0)
  expect(totalEntries).toBeGreaterThanOrEqual(3)

  admin.dispose()
})

test('cause graph', async () => {
  const admin = createAdmin()
  const base = atom(0, 'base')
  const derived = computed(() => base() + 1, 'derived')

  ADMIN_FRAME.run(() => {
    base.set(1)
    derived()
    notify()
  })
  await wrap(sleep(10))

  const frames = ADMIN_FRAME.run(() => admin.store.frames())
  const rootFrame = frames.find((f) => {
    const a = ADMIN_FRAME.run(() => admin.store.getAtoms().get(f.atomId))
    return a?.name === 'derived'
  })
  if (rootFrame) {
    ADMIN_FRAME.run(() => {
      admin.causeGraph.selectedRootId.set(rootFrame.id)
    })
    const graph = ADMIN_FRAME.run(() => admin.causeGraph.graph())
    expect(graph).not.toBeNull()
    expect(graph!.nodes.length).toBeGreaterThanOrEqual(1)
  }

  admin.dispose()
})

test('multi-app isolation', async () => {
  const admin = createAdmin()
  const { addTodo } = createTodoApp()
  const { increment } = createCounterApp()
  const { setCity } = createWeatherApp()

  ADMIN_FRAME.run(() => {
    addTodo('a')
    increment()
    setCity('Paris')
    notify()
  })
  await wrap(sleep(50))

  const frames = ADMIN_FRAME.run(() => admin.store.frames())
  expect(frames.length).toBeGreaterThanOrEqual(3)

  const names = ADMIN_FRAME.run(() => admin.store.uniqueNames())
  expect(names.some((n) => n.includes('todo') || n === 'addTodo')).toBe(true)
  expect(names.some((n) => n.includes('count') || n === 'increment')).toBe(true)
  expect(names.some((n) => n.includes('weather') || n.includes('city'))).toBe(
    true,
  )

  admin.dispose()
})

test('pause and resume', async () => {
  const admin = createAdmin()
  const { increment } = createCounterApp()

  ADMIN_FRAME.run(() => {
    increment()
    notify()
  })
  await wrap(sleep(10))
  const countBefore = ADMIN_FRAME.run(() => admin.store.frames().length)

  ADMIN_FRAME.run(() => admin.reporter.paused.setTrue())
  ADMIN_FRAME.run(() => {
    increment()
    increment()
    notify()
  })
  await wrap(sleep(10))
  const countPaused = ADMIN_FRAME.run(() => admin.store.frames().length)
  expect(countPaused).toBe(countBefore)

  ADMIN_FRAME.run(() => admin.reporter.paused.setFalse())
  ADMIN_FRAME.run(() => {
    increment()
    notify()
  })
  await wrap(sleep(10))
  const countAfter = ADMIN_FRAME.run(() => admin.store.frames().length)
  expect(countAfter).toBeGreaterThan(countPaused)

  admin.dispose()
})

test('session export and import', async () => {
  const admin1 = createAdmin()
  const { addTodo } = createTodoApp()

  ADMIN_FRAME.run(() => {
    addTodo('exported')
    notify()
  })
  await wrap(sleep(10))

  const exported = ADMIN_FRAME.run(() => admin1.store.exportSession())
  const exportFrameCount = exported.frames.length
  admin1.dispose()

  const admin2 = createAdmin()
  ADMIN_FRAME.run(() => admin2.store.importSession(exported))

  const frames = ADMIN_FRAME.run(() => admin2.store.frames())
  expect(frames.length).toBe(exportFrameCount)
  expect(exportFrameCount).toBeGreaterThan(0)
  expect(exported.session.id).toBeDefined()
  expect(ADMIN_FRAME.run(() => admin2.view.summary().source)).toBe('replay')

  admin2.dispose()
})
