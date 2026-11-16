import {
  atom,
  clearStack,
  computed,
  context,
  isConnected,
  reatomLinkedList,
  sleep,
  withInit,
  wrap,
} from '@reatom/core'
import { expect, test } from 'vitest'

// eslint-disable-next-line unused-imports/no-unused-imports
import { DEBUG, h, hf, instance, mount } from '.'

clearStack()

DEBUG.extend(withInit(() => false))

const parent = atom(() => {
  const main = instance(HTMLElement, <main />)
  window.document.body.appendChild(main)

  return main
}, 'parent')

const stripJsxCompilerProps = (value: string) =>
  value.replaceAll(/\s__(?:self|source)="[^"]*"/g, '')

test('linked list', () =>
  context.start(async () => {
    const list = reatomLinkedList((value: any) => atom(value))
    const jsxList = list.reatomMap((n) => <span>{n}</span>)
    const one = list.create(1)
    const two = list.create(2)

    mount(parent(), <div>{jsxList}</div>)

    await wrap(sleep())
    expect(parent().innerText).toBe('12')
    expect(isConnected(list)).toBe(true)
    expect(isConnected(jsxList)).toBe(true)
    expect(isConnected(one)).toBe(true)
    expect(isConnected(two)).toBe(true)
    expect(list.array()).toEqual([one, two])

    list.swap(one, two)
    await wrap(sleep())
    expect(list.array()).toEqual([two, one])
    expect(parent().innerText).toBe('21')

    list.remove(two)
    await wrap(sleep())
    expect(parent().innerText).toBe('1')
    expect(isConnected(one)).toBe(true)
    expect(isConnected(two)).toBe(false)

    list.create(<>3</>)
  }))

test('linked list with fragment', () =>
  context.start(async () => {
    const a = atom(true)
    const list = reatomLinkedList((value: string) => (
      <>
        <span>{value}</span>
        {computed(() => (a() ? <a /> : <br />), 'test')}
      </>
    ))
    list.create('1')

    const container = <div>{list}</div>
    mount(parent(), container)

    await wrap(sleep())
    expect(stripJsxCompilerProps(container.outerHTML)).toBe(
      '<div><!----><span>1</span><!--test--><a></a><!--test--><!----></div>',
    )

    a.set(false)
    await wrap(sleep())
    expect(stripJsxCompilerProps(container.outerHTML)).toBe(
      '<div><!----><span>1</span><!--test--><br><!--test--><!----></div>',
    )

    const node = list.create('2')
    await wrap(sleep())
    expect(stripJsxCompilerProps(container.outerHTML)).toBe(
      '<div><!----><span>1</span><!--test--><br><!--test--><!----><!----><span>2</span><!--test--><br><!--test--><!----></div>',
    )

    list.remove(node)
    await wrap(sleep())
    expect(stripJsxCompilerProps(container.outerHTML)).toBe(
      '<div><!----><span>1</span><!--test--><br><!--test--><!----></div>',
    )
  }))

test('linked list createMany', () =>
  context.start(async () => {
    const list = reatomLinkedList((value: number) => <span>{value}</span>)

    const container = <div>{list}</div>
    mount(parent(), container)

    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe('')

    const nodes = list.createMany([[1], [2], [3]])
    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe(
      '<span>1</span><span>2</span><span>3</span>',
    )
    expect(list.array()).toEqual(nodes)

    list.createMany([[4], [5]])
    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe(
      '<span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>',
    )
  }))

test('linked list render keeps changes payload for sibling subscribers', () =>
  context.start(async () => {
    const list = reatomLinkedList((value: number) => <span>{value}</span>)

    const container = <div>{list}</div>
    mount(parent(), container)
    await wrap(sleep())

    // A sibling consumer applying the same incremental contract as the
    // renderer (e.g. analytics or scroll-into-view of new rows). It
    // subscribes after the renderer, so its notification runs later.
    const seen: number[] = []
    const unsubscribe = list.subscribe((state) => {
      for (const change of state.changes) {
        if (change.kind === 'insert') {
          for (const node of change.nodes) {
            seen.push(Number(node.textContent))
          }
        }
      }
    })

    list.createMany([[1], [2], [3]])
    await wrap(sleep())

    expect(stripJsxCompilerProps(container.innerHTML)).toBe(
      '<span>1</span><span>2</span><span>3</span>',
    )
    expect(seen).toEqual([1, 2, 3])

    unsubscribe()
  }))

test('linked list move to head', () =>
  context.start(async () => {
    const list = reatomLinkedList((value: number) => <span>{value}</span>)
    const nodes = list.createMany([[1], [2], [3]])
    const [one, two, three] = nodes

    if (!one || !two || !three) {
      throw new Error('Expected linked list nodes to be created')
    }

    const container = <div>{list}</div>
    mount(parent(), container)

    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe(
      '<span>1</span><span>2</span><span>3</span>',
    )

    list.move(three, null)
    await wrap(sleep())
    expect(list.array()).toEqual([three, one, two])
    expect(stripJsxCompilerProps(container.innerHTML)).toBe(
      '<span>3</span><span>1</span><span>2</span>',
    )

    list.move(one, two)
    await wrap(sleep())
    expect(list.array()).toEqual([three, two, one])
    expect(stripJsxCompilerProps(container.innerHTML)).toBe(
      '<span>3</span><span>2</span><span>1</span>',
    )
  }))

test('linked list removeMany', () =>
  context.start(async () => {
    const list = reatomLinkedList((value: number) => <span>{value}</span>)
    const [one, two, three, four] = list.createMany([[1], [2], [3], [4]])

    const container = <div>{list}</div>
    mount(parent(), container)

    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe(
      '<span>1</span><span>2</span><span>3</span><span>4</span>',
    )

    list.removeMany([two!, four!])
    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe(
      '<span>1</span><span>3</span>',
    )

    list.removeMany([one!, three!])
    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe('')
  }))

test('linked list render inside a function child is not tracked', () =>
  context.start(async () => {
    let mapperCalls = 0
    const list = reatomLinkedList((value: number) => ({ value }), 'list')
    list.create(1)

    const container = (
      <div>
        {() => (
          <ul>
            {list.reatomMap((node) => {
              mapperCalls++
              return <li>{node.value}</li>
            }, 'list.views')}
          </ul>
        )}
      </div>
    )
    mount(parent(), container)
    await wrap(sleep())
    expect(mapperCalls).toBe(1)

    // A tracked initial read would make the wrapper computed depend on the
    // list, so this create would recreate the subtree and remap every node.
    list.create(2)
    await wrap(sleep())
    expect(mapperCalls).toBe(2)
    expect(container.querySelectorAll('li').length).toBe(2)
  }))

test('linked list createMany and removeMany with reatomMap', () =>
  context.start(async () => {
    const list = reatomLinkedList((value: number) => atom(value))
    const jsxList = list.reatomMap((n) => <span>{n}</span>)

    const container = <div>{jsxList}</div>
    mount(parent(), container)

    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe('')
    expect(isConnected(list)).toBe(true)
    expect(isConnected(jsxList)).toBe(true)

    const nodes = list.createMany([[1], [2], [3]])
    await wrap(sleep())
    expect(parent().innerText).toBe('123')
    expect(list.array()).toEqual(nodes)

    list.removeMany([nodes[0]!, nodes[2]!])
    await wrap(sleep())
    expect(parent().innerText).toBe('2')
    expect(list.array()).toEqual([nodes[1]])
  }))

test('positional fragment runs keep live bindings and retained input focus', () =>
  context.start(async () => {
    const value = atom('live', 'run.value')
    const rows = reatomLinkedList((id: number) => ({ id }), 'run.rows')
    const views = rows.reatomMap(
      (row) => (
        <>
          <label>{row.id}</label>
          <input value={String(row.id)} />
          {value}
        </>
      ),
      'run.views',
    )
    const [a, b, c] = rows.createMany([[1], [2], [3]])
    const container = <div>{views}</div>
    const { unmount } = mount(parent(), container)
    await wrap(sleep())
    const inputs = container.querySelectorAll('input')
    inputs[1]!.focus()
    inputs[1]!.setSelectionRange(0, 1)
    rows.moveMany([b!, c!], null)
    await wrap(sleep())
    expect(
      [...container.querySelectorAll('label')].map((node) => node.textContent),
    ).toEqual(['2', '3', '1'])
    expect(document.activeElement).toBe(inputs[1])
    expect(inputs[1]!.selectionStart).toBe(0)
    rows.swap(a!, b!)
    rows.insertMany([{ id: 4 }, { id: 5 }], c!)
    await wrap(sleep())
    value.set('updated')
    await wrap(sleep())
    expect(
      [...container.querySelectorAll('label')].map((node) => node.textContent),
    ).toEqual(['1', '3', '4', '5', '2'])
    expect(container.textContent?.match(/updated/g)).toHaveLength(5)
    expect([...container.querySelectorAll('input')]).toContain(inputs[0])
    unmount()
  }))

test('missed versions reconcile live ranges and dispose only removed rows', () =>
  context.start(async () => {
    const value = atom('before', 'reconcile.value')
    const edits = atom(0, 'reconcile.edits')
    const mounted: string[] = [],
      removed: string[] = []
    const list = reatomLinkedList(
      (id: string) => (
        <>
          <label
            ref={() => {
              mounted.push(id)
              return () => {
                removed.push(id)
              }
            }}
          >
            {id}
          </label>
          <input value={id} on:input={() => edits.set((value) => value + 1)} />
          {value}
        </>
      ),
      'reconcile.rows',
    )
    const [a, b, c] = list.createMany([['a'], ['b'], ['c']])
    const container = <div>{list}</div>
    const { unmount } = mount(parent(), container)
    await wrap(sleep())
    const aInput = container.querySelector('input')!
    aInput.focus()
    aInput.setSelectionRange(0, 1)
    list.move(c!, null)
    list.remove(b!)
    list.create('d')
    await wrap(sleep())
    expect(
      [...container.querySelectorAll('label')].map((node) => node.textContent),
    ).toEqual(['c', 'a', 'd'])
    expect(mounted).toEqual(['a', 'b', 'c', 'd'])
    expect(removed).toEqual(['b'])
    expect(document.activeElement).toBe(aInput)
    expect(aInput.selectionEnd).toBe(1)
    aInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(edits()).toBe(1)
    value.set('after')
    await wrap(sleep())
    expect(container.textContent?.match(/after/g)).toHaveLength(3)
    list.remove(a!)
    await wrap(sleep())
    expect(removed).toEqual(['b', 'a'])
    list.clear()
    await wrap(sleep())
    expect(removed).toEqual(['b', 'a', 'c', 'd'])
    expect(isConnected(value)).toBe(false)
    unmount()
  }))

test('linked list replaced before any other change', () =>
  context.start(async () => {
    const list = reatomLinkedList(
      { initState: [<span>1</span>, <span>2</span>] },
      'replaced',
    )

    const container = <div>{list}</div>
    mount(parent(), container)
    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe(
      '<span>1</span><span>2</span>',
    )

    // A new state does not continue the rendered one: the rows are rebuilt.
    list.set(list.initiateFromState([<span>3</span>]))
    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe('<span>3</span>')

    list.set(list.initiateFromState([<span>4</span>, <span>5</span>]))
    await wrap(sleep())
    expect(stripJsxCompilerProps(container.innerHTML)).toBe(
      '<span>4</span><span>5</span>',
    )
  }))
