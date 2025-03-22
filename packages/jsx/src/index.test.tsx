import { test, expect, vi } from 'vitest'
import {
  type Fn,
  atom,
  clearStack,
  isConnected,
  mockRandom,
  notify,
  reatomLinkedList,
  root,
  sleep,
  withInit,
  wrap,
} from '@reatom/core'

import { h, hf, mount, Bind, DEBUG, type JSX } from '.'

clearStack()

DEBUG.mix(withInit(() => false))

const parent = atom<HTMLElement>(null as any, 'parent').mix(
  withInit(() => {
    const div = <div />
    window.document.body.appendChild(div)

    return div
  }),
)

test('static props & children', () =>
  root.start(async () => {
    const element = <div id="some-id">Hello, world!</div>

    mount(parent(), element)
    await wrap(sleep())

    expect(element.tagName).toBe('DIV')
    expect(element.id).toBe('some-id')
    expect(element.childNodes.length).toBe(1)
    expect(element.textContent).toBe('Hello, world!')
  }))

test('dynamic props', () =>
  root.start(async () => {
    const val = atom('val', 'val')
    const prp = atom('prp', 'prp')
    const atr = atom('atr', 'atr')

    const element = <div id={val} prop:prp={prp} attr:atr={atr} />

    mount(parent(), element)
    await wrap(sleep())

    expect(element.id).toBe('val')
    expect((element as any).prp).toBe('prp')
    expect(element.getAttribute('atr')).toBe('atr')

    val('val1')
    prp('prp1')
    atr('atr1')

    await wrap(sleep())
    expect(element.id).toBe('val1')
    expect((element as any).prp).toBe('prp1')
    expect(element.getAttribute('atr')).toBe('atr1')
  }))

test('children updates', () =>
  root.start(async () => {
    const val = atom('foo', 'val')

    const route = atom('a', 'route')
    const a = window.document.createElement('div')
    const b = window.document.createElement('div')

    const element = (
      <div>
        Static one. {val}
        {atom(() => (route() === 'a' ? a : b))}
      </div>
    )

    mount(parent(), element)
    await wrap(sleep())

    expect(element.childNodes.length).toBe(7)
    expect(element.childNodes[2]?.textContent).toBe('foo')
    expect(element.childNodes[5]).toBe(a)

    val('bar')
    await wrap(sleep())
    expect(element.childNodes[2]?.textContent).toBe('bar')

    expect(element.childNodes[5]).toBe(a)
    route('b')
    await wrap(sleep())
    expect(element.childNodes[5]).toBe(b)
  }))

test('dynamic children', () =>
  root.start(async () => {
    const children = atom(<div />)

    const element = <div>{children}</div>

    mount(parent(), element)
    await wrap(sleep())

    expect(element.childNodes.length).toBe(3)

    children(<div>Hello, world!</div>)
    await wrap(sleep())
    expect(element.childNodes[1]?.textContent).toBe('Hello, world!')

    const inner = <span>inner</span>
    children(<div>{inner}</div>)
    await wrap(sleep())
    expect(element.childNodes[1]?.childNodes[0]).toBe(inner)

    const before = atom('before', 'before')
    const after = atom('after', 'after')
    children(
      <div>
        {before}
        {inner}
        {after}
      </div>,
    )
    // TODO since the element is not mounted, then on the next tick the unsubscribe from the atom occurs. See `unlink`.
    // await wrap(sleep())
    notify()
    expect((element as HTMLDivElement).innerText).toBe('beforeinnerafter')

    before('before...')
    await wrap(sleep())
    expect((element as HTMLDivElement).innerText).toBe('before...innerafter')
  }))

test('spreads', () =>
  root.start(() => {
    const clickTrack = vi.fn()
    const props = atom({
      id: '1',
      'attr:b': '2',
      'on:click': clickTrack as Fn,
    })

    const element = (<div $spread={props} />) as HTMLDivElement

    mount(parent(), element)

    expect(element.id).toBe('1')
    expect(element.getAttribute('b')).toBe('2')
    expect(clickTrack.mock.calls.length).toBe(0)
    element.click()
    expect(clickTrack.mock.calls.length).toBe(1)
  }))

test('multiple renden shared element', () =>
  root.start(async () => {
    const valueAtom = atom('abc', 'value')
    const element = <p>{valueAtom}</p>

    const Component = () => (
      <>
        <div id="1">{element}</div>
        <div id="2">{element}</div>
      </>
    )

    const childAtom = atom<JSX.Element | undefined>(
      <Component></Component>,
      'child',
    )
    const app = <div>{childAtom}</div>

    mount(parent(), app)
    await wrap(sleep())
    expect(app.innerHTML).toBe(
      '<!--child--><!----><div id="1"></div><div id="2"><p><!--value-->abc<!--value--></p></div><!----><!--child-->',
    )

    valueAtom('def')
    await wrap(sleep())
    expect(app.innerHTML).toBe(
      '<!--child--><!----><div id="1"></div><div id="2"><p><!--value-->def<!--value--></p></div><!----><!--child-->',
    )

    childAtom(undefined)
    await wrap(sleep())
    expect(app.innerHTML).toBe('<!--child--><!--child-->')

    childAtom(<Component></Component>)
    valueAtom('ghi')
    await wrap(sleep())
    expect(app.innerHTML).toBe(
      '<!--child--><!----><div id="1"></div><div id="2"><p><!--value-->def<!--value--></p></div><!----><!--child-->',
    )
  }))

test('fragment as child', () =>
  root.start(async () => {
    const child = (
      <>
        <div>foo</div>
        <>
          <div>bar</div>
        </>
      </>
    )
    mount(parent(), child)
    await wrap(sleep())

    expect(parent().childNodes.length).toBe(6)
    expect(parent().textContent).toBe('foobar')
  }))

test('array children', () =>
  root.start(async () => {
    const n = atom(1)
    const list = atom(() => (
      <>{...Array.from({ length: n() }, (_, i) => <li>{i + 1}</li>)}</>
    ))

    const element = (
      <ul>
        {list}
        <br />
      </ul>
    )

    mount(parent(), element)
    await wrap(sleep())

    expect(element.childNodes.length).toBe(6)
    expect(element.textContent).toBe('1')

    n(2)
    await wrap(sleep())
    expect(element.childNodes.length).toBe(7)
    expect(element.textContent).toBe('12')
  }))

test('linked list', () =>
  root.start(async () => {
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

test('boolean as child', () =>
  root.start(async () => {
    const trueAtom = atom(true, 'true')
    const trueValue = true
    const falseAtom = atom(false, 'false')
    const falseValue = false

    const element = (
      <div>
        {trueAtom}
        {trueValue}
        {falseAtom}
        {falseValue}
      </div>
    )

    await wrap(sleep())
    expect(element.childNodes.length).toBe(4)
    expect(element.innerHTML).toBe(
      '<!--true--><!--true--><!--false--><!--false-->',
    )
    expect(element.textContent).toBe('')
  }))

test('null as child', () =>
  root.start(async () => {
    const nullAtom = atom(null, 'null')
    const nullValue = null

    const element = (
      <div>
        {nullAtom}
        {nullValue}
      </div>
    )

    await wrap(sleep())
    expect(element.childNodes.length).toBe(2)
    expect(element.innerHTML).toBe('<!--null--><!--null-->')
    expect(element.textContent).toBe('')
  }))

test('undefined as child', () =>
  root.start(async () => {
    const undefinedAtom = atom(undefined, 'undefined')
    const undefinedValue = undefined

    const element = (
      <div>
        {undefinedAtom}
        {undefinedValue}
      </div>
    )

    await wrap(sleep())
    expect(element.childNodes.length).toBe(2)
    expect(element.innerHTML).toBe('<!--undefined--><!--undefined-->')
    expect(element.textContent).toBe('')
  }))

test('empty string as child', () =>
  root.start(async () => {
    const emptyStringAtom = atom('', 'emptyString')
    const emptyStringValue = ''

    const element = (
      <div>
        {emptyStringAtom}
        {emptyStringValue}
      </div>
    )

    await wrap(sleep())
    expect(element.childNodes.length).toBe(2)
    expect(element.innerHTML).toBe('<!--emptyString--><!--emptyString-->')
    expect(element.textContent).toBe('')
  }))

test('update skipped atom', () =>
  root.start(async () => {
    const valueAtom = atom<number | undefined>(undefined, 'value')

    const element = <div>{valueAtom}</div>

    mount(parent(), element)
    await wrap(sleep())

    expect(parent().childNodes.length).toBe(1)
    expect(parent().textContent).toBe('')

    valueAtom(123)

    await wrap(sleep())
    expect(parent().childNodes.length).toBe(1)
    expect(parent().textContent).toBe('123')
  }))

test('render HTMLElement atom', () =>
  root.start(async () => {
    const htmlAtom = atom(<div>div</div>, 'html')

    const element = <div>{htmlAtom}</div>

    await wrap(sleep())
    expect(element.innerHTML).toBe('<!--html--><div>div</div><!--html-->')
  }))

test('render SVGElement atom', () =>
  root.start(async () => {
    const svgAtom = atom(<svg:svg>svg</svg:svg>, 'svg')

    const element = <div>{svgAtom}</div>

    await wrap(sleep())
    expect(element.innerHTML).toBe('<!--svg--><svg>svg</svg><!--svg-->')
  }))

test('custom component', () =>
  root.start(async () => {
    const Component = (props: JSX.HTMLAttributes) => <div {...props} />

    await wrap(sleep())
    expect(<Component />).toBeInstanceOf(window.HTMLElement)
    expect(((<Component draggable="true" />) as HTMLElement).draggable).toBe(
      true,
    )
    expect(((<Component>123</Component>) as HTMLElement).innerText).toBe('123')
  }))

test('ref unmount callback', () =>
  root.start(async () => {
    const Component = (props: JSX.HTMLAttributes) => <div {...props} />

    let ref: null | HTMLElement = null

    const component = (
      <Component
        ref={(el) => {
          ref = el
          return () => {
            ref = null
          }
        }}
      />
    )

    mount(parent(), component)
    await wrap(sleep())
    expect(ref).toBeInstanceOf(window.HTMLElement)

    parent().remove()
    await wrap(sleep())
    expect(ref).toBe(null)
  }))

test('child ref unmount callback', () =>
  root.start(async () => {
    const Component = (props: JSX.HTMLAttributes) => <div {...props} />

    let ref: null | HTMLElement = null

    const component = (
      <Component
        ref={(el) => {
          ref = el
          return () => {
            ref = null
          }
        }}
      />
    )

    mount(parent(), component)
    await wrap(sleep())
    expect(ref).toBeInstanceOf(window.HTMLElement)

    ref!.remove()
    await wrap(sleep())
    expect(ref).toBe(null)
  }))

test('same arguments in ref mount and unmount hooks', () =>
  root.start(async () => {
    let mountElement: HTMLElement
    let unmountElement: HTMLElement

    let ref: null | HTMLElement = null

    const component = (
      <div
        ref={(el) => {
          mountElement = el
          ref = el
          return (el) => {
            unmountElement = el
            ref = null
          }
        }}
      />
    )

    mount(parent(), component)
    await wrap(sleep())
    expect(ref).toBeInstanceOf(window.HTMLElement)

    ref!.remove()
    await wrap(sleep())
    expect(ref).toBe(null)
    expect(mountElement!).toBe(component)
    expect(unmountElement!).toBe(component)
  }))

test('css property and class attribute', () =>
  root.start(async () => {
    const cls = 'class'
    const css = 'color: red;'

    const ref1 = <div css={css} class={cls}></div>
    const ref2 = <div class={cls} css={css}></div>

    const component = (
      <div>
        {ref1}
        {ref2}
      </div>
    )

    mount(parent(), component)
    expect(ref1).toBeInstanceOf(window.HTMLElement)
    expect(ref2).toBeInstanceOf(window.HTMLElement)
    await wrap(sleep())

    expect(ref1.className).toBe(cls)
    expect(ref1.dataset['reatomStyle']).toBeTruthy()

    expect(ref2.className).toBe(cls)
    expect(ref2.dataset['reatomStyle']).toBeTruthy()

    expect(ref1.dataset['reatomStyle']).toBe(ref2.dataset['reatomStyle'])
  }))

test('css property generate class name', () =>
  root.start(async () => {
    const First = () => <div css="color: red;"></div> // same
    const Second = () => <div css="color: red;"></div> // same
    const Third = () => <div css="color: blue;"></div>

    DEBUG(true)

    const first = <First></First>
    const second = <Second></Second>
    const third = <Third></Third>

    const component = (
      <div>
        {first}
        {second}
        {third}
      </div>
    )

    mount(parent(), component)
    await wrap(sleep())

    expect({ ...first.dataset }).toEqual({
      reatomName: 'First',
      reatomStyle: '1', // same
    })
    expect({ ...second.dataset }).toEqual({
      reatomName: 'Second',
      reatomStyle: '1', // same
    })
    expect({ ...third.dataset }).toEqual({
      reatomName: 'Third',
      reatomStyle: '2',
    })
  }))

test('css custom property', () =>
  root.start(async () => {
    const colorAtom = atom('red' as string | undefined)

    const component = (
      <div css:first-property={colorAtom} css:secondProperty={colorAtom}></div>
    )

    mount(parent(), component)
    await wrap(sleep())

    expect(component.style.getPropertyValue('--first-property')).toBe('red')
    expect(component.style.getPropertyValue('--secondProperty')).toBe('red')

    colorAtom('green')

    await wrap(sleep())
    expect(component.style.getPropertyValue('--first-property')).toBe('green')
    expect(component.style.getPropertyValue('--secondProperty')).toBe('green')

    colorAtom(undefined)

    await wrap(sleep())
    expect(component.style.getPropertyValue('--first-property')).toBe('')
    expect(component.style.getPropertyValue('--secondProperty')).toBe('')
  }))

test('class and className attribute', () =>
  root.start(async () => {
    const classAtom = atom('' as string | undefined)

    const ref1 = <div class={classAtom}></div>
    const ref2 = <div className={classAtom}></div>

    const component = (
      <div>
        {ref1}
        {ref2}
      </div>
    )

    mount(parent(), component)
    await wrap(sleep())

    expect(ref1.hasAttribute('class')).toBe(true)
    expect(ref2.hasAttribute('class')).toBe(true)

    classAtom('cls')
    await wrap(sleep())
    expect(ref1.className).toBe('cls')
    expect(ref2.className).toBe('cls')
    expect(ref1.hasAttribute('class')).toBe(true)
    expect(ref2.hasAttribute('class')).toBe(true)

    classAtom(undefined)
    await wrap(sleep())
    expect(ref1.className).toBe('')
    expect(ref2.className).toBe('')
    expect(ref1.hasAttribute('class')).toBe(true)
    expect(ref2.hasAttribute('class')).toBe(true)
  }))

test('ref mount and unmount callbacks order', () =>
  root.start(async () => {
    const order: number[] = []

    const createRef = (index: number) => {
      return () => {
        order.push(index)
        return () => {
          order.push(index)
        }
      }
    }

    const component = (
      <div ref={createRef(0)}>
        <div ref={createRef(1)}>
          <div ref={createRef(2)}></div>
        </div>
      </div>
    )

    mount(parent(), component)
    await wrap(sleep())
    parent().remove()
    await wrap(sleep())

    expect(order).toStrictEqual([2, 1, 0, 0, 1, 2])
  }))

test('style object update', () =>
  root.start(async () => {
    const styleTopAtom = atom<JSX.StyleProperties['top']>('0')
    const styleRightAtom = atom<JSX.StyleProperties['right']>(undefined)
    const styleBottomAtom = atom<JSX.StyleProperties['bottom']>(null)
    const styleLeftAtom = atom<JSX.StyleProperties['left']>('0')
    const styleAtom = atom<JSX.StyleProperties>(() => ({
      top: styleTopAtom(),
      right: styleRightAtom(),
      bottom: styleBottomAtom(),
      left: styleLeftAtom(),
    }))

    const firstEl = <div style={styleAtom}></div>
    const secondEl = (
      <div
        style:top={styleTopAtom}
        style:right={styleRightAtom}
        style:bottom={styleBottomAtom}
        style:left={styleLeftAtom}
      ></div>
    )

    const component = (
      <div>
        {firstEl}
        {secondEl}
      </div>
    )

    mount(parent(), component)

    await wrap(sleep())
    expect(firstEl.getAttribute('style')).toBe('top: 0px; left: 0px;')
    expect(secondEl.getAttribute('style')).toBe('top: 0px; left: 0px;')

    styleTopAtom(undefined)
    styleBottomAtom(0)

    await wrap(sleep())
    expect(firstEl.getAttribute('style')).toBe('left: 0px; bottom: 0px;')
    expect(secondEl.getAttribute('style')).toBe('left: 0px; bottom: 0px;')
  }))

test('render atom fragments', () =>
  root.start(async () => {
    const bool1Atom = atom(false)
    const bool2Atom = atom(false)

    const element = (
      <div>
        <p>0</p>
        {atom(
          () =>
            bool1Atom() ? (
              <>
                <p>1</p>
                {atom(
                  () =>
                    bool2Atom() ? (
                      <>
                        <p>2</p>
                        <p>3</p>
                      </>
                    ) : undefined,
                  '2',
                )}
                <p>4</p>
              </>
            ) : undefined,
          '1',
        )}
        <p>5</p>
      </div>
    )

    mount(parent(), element)

    await wrap(sleep())

    const expect1 = '<p>0</p><!--1--><!--1--><p>5</p>'
    const expect2 =
      '<p>0</p><!--1--><!----><p>1</p><!--2--><!--2--><p>4</p><!----><!--1--><p>5</p>'
    const expect3 =
      '<p>0</p><!--1--><!----><p>1</p><!--2--><!----><p>2</p><p>3</p><!----><!--2--><p>4</p><!----><!--1--><p>5</p>'

    bool1Atom(false)
    bool2Atom(false)
    await wrap(sleep())
    expect(element.innerHTML).toBe(expect1)

    bool1Atom(false)
    bool2Atom(true)
    await wrap(sleep())
    expect(element.innerHTML).toBe(expect1)

    bool1Atom(true)
    bool2Atom(false)
    await wrap(sleep())
    expect(element.innerHTML).toBe(expect2)

    bool1Atom(true)
    bool2Atom(true)
    await wrap(sleep())
    expect(element.innerHTML).toBe(expect3)

    bool1Atom(true)
    bool2Atom(false)
    await wrap(sleep())
    expect(element.innerHTML).toBe(expect2)

    bool1Atom(true)
    bool2Atom(true)
    await wrap(sleep())
    expect(element.innerHTML).toBe(expect3)

    bool1Atom(false)
    bool2Atom(true)
    await wrap(sleep())
    expect(element.innerHTML).toBe(expect1)

    bool1Atom(false)
    bool2Atom(false)
    await wrap(sleep())
    expect(element.innerHTML).toBe(expect1)
  }))

test('Bind', () =>
  root.start(async () => {
    const div = (<div />) as HTMLDivElement
    const input = (<input />) as HTMLInputElement
    const svg = (<svg:svg />) as SVGSVGElement

    const inputState = atom('42')

    const testDiv = (
      <Bind
        element={div}
        // @ts-expect-error there should be an error here
        value={inputState}
      />
    )
    const testInput = (
      <Bind
        element={input}
        value={inputState}
        on:input={(e) => inputState(e.currentTarget.value)}
      />
    )
    const testSvg = (
      <Bind element={svg}>
        <svg:path d="M 10 10 H 100" />
      </Bind>
    )

    mount(
      parent(),
      <main>
        {testDiv}
        {testInput}
        {testSvg}
      </main>,
    )

    await wrap(sleep())

    inputState('43')

    await wrap(sleep())
    expect(input.value).toBe('43')
    expect(testSvg.innerHTML).toBe('<path d="M 10 10 H 100"></path>')
  }))

test('dynamic atom fragment', () =>
  root.start(async () => {
    const child = atom<JSX.HTMLAttributes['children']>(<span />, 'test')

    const container = <div>{child}</div>
    mount(parent(), container)

    await wrap(sleep())
    expect(container.outerHTML).toBe(
      '<div><!--test--><span></span><!--test--></div>',
    )

    child(() => atom('child atom', 'test.child'))
    await wrap(sleep())
    expect(container.outerHTML).toBe(
      '<div><!--test--><!--test.child-->child atom<!--test.child--><!--test--></div>',
    )
  }))

test('linked list', () =>
  root.start(async () => {
    const a = atom(true)
    const list = reatomLinkedList((value: string) => (
      <>
        <span>{value}</span>
        {atom(() => (a() ? <a /> : <br />), 'test')}
      </>
    ))
    list.create('1')

    const container = <div>{list}</div>
    mount(parent(), container)

    await wrap(sleep())
    expect(container.outerHTML).toBe(
      '<div><!----><span>1</span><!--test--><a></a><!--test--><!----></div>',
    )

    a(false)
    await wrap(sleep())
    expect(container.outerHTML).toBe(
      '<div><!----><span>1</span><!--test--><br><!--test--><!----></div>',
    )

    const node = list.create('2')
    await wrap(sleep())
    expect(container.outerHTML).toBe(
      '<div><!----><span>1</span><!--test--><br><!--test--><!----><!----><span>2</span><!--test--><br><!--test--><!----></div>',
    )

    list.remove(node)
    await wrap(sleep())
    expect(container.outerHTML).toBe(
      '<div><!----><span>1</span><!--test--><br><!--test--><!----></div>',
    )
  }))

const expectHtmlElementProperty = <
  Tag extends keyof JSX.HTMLElementTags,
  Property extends keyof JSX.HTMLElementTags[Tag],
  Value extends JSX.HTMLElementTags[Tag][Property],
  Expected extends Tag extends keyof HTMLElementTagNameMap
    ? Property extends keyof HTMLElementTagNameMap[Tag]
      ? HTMLElementTagNameMap[Tag][Property]
      : never
    : never,
>(
  tag: Tag,
  prop: Property & string,
  value: Value,
  expected: Expected,
  hasAttr: boolean,
  getAttr: null | string,
) => {
  const element = h(tag, { [prop]: value }) as HTMLElement
  expect((element as any)[prop]).toBe(expected)
  expect(element.hasAttribute(prop.toLowerCase())).toBe(hasAttr)
  expect(element.getAttribute(prop.toLowerCase())).toBe(getAttr)
}

test('width property', () =>
  root.start(async () => {
    expectHtmlElementProperty('img', 'width', undefined, 0, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('img', 'width', null, 0, false, null)
    expectHtmlElementProperty('img', 'width', 1, 1, true, '1')
    expectHtmlElementProperty('img', 'width', '1', 1, true, '1')
    expectHtmlElementProperty('img', 'width', -1, 0, true, '-1')
  }))

test('height property', () =>
  root.start(async () => {
    expectHtmlElementProperty('img', 'height', undefined, 0, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('img', 'height', null, 0, false, null)
    expectHtmlElementProperty('img', 'height', 1, 1, true, '1')
    expectHtmlElementProperty('img', 'height', '1', 1, true, '1')
    expectHtmlElementProperty('img', 'height', -1, 0, true, '-1')
  }))

test('download property', () =>
  root.start(async () => {
    expectHtmlElementProperty('a', 'download', undefined, '', false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('a', 'download', null, '', false, null)
    // expectHtmlElementProperty('a', 'download', false, '', false, null)
    // expectHtmlElementProperty('a', 'download', true, '', true, '')
    expectHtmlElementProperty('a', 'download', 'abc', 'abc', true, 'abc')
  }))

test('href property', () =>
  root.start(async () => {
    expectHtmlElementProperty('a', 'href', undefined, '', false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('a', 'href', null, '', false, null)
    expectHtmlElementProperty('a', 'href', 'https://test.com/', 'https://test.com/', true, 'https://test.com/')
  }))

test('list property', () =>
  root.start(async () => {
    const element = <input list="list"></input>
    const list = <datalist id="list"></datalist>
    mount(parent(), <div>{element}{list}</div>)

    expect(element.list).toBe(list)
    expect(element.hasAttribute('list')).toBe(true)
    expect(element.getAttribute('list')).toBe('list')

    expectHtmlElementProperty('input', 'list', undefined, null, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('input', 'list', null, null, false, null)
  }))

test('form property', () =>
  root.start(async () => {
    const element = <input form="form"></input>
    const form = <form id="form"></form>
    mount(parent(), <div>{element}{form}</div>)

    expect(element.form).toBe(form)
    expect(element.hasAttribute('form')).toBe(true)
    expect(element.getAttribute('form')).toBe('form')

    expectHtmlElementProperty('input', 'form', undefined, null, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('input', 'form', null, null, false, null)
  }))

test('tabIndex property', () =>
  root.start(async () => {
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('div', 'tabIndex', undefined, -1, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('div', 'tabIndex', null, -1, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('div', 'tabIndex', 0, 0, true, '0')
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('div', 'tabIndex', '0', 0, true, '0')
  }))

test('rowSpan property', () =>
  root.start(async () => {
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('td', 'rowSpan', undefined, 1, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('td', 'rowSpan', null, 1, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('td', 'rowSpan', 0, 0, true, '0')
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('td', 'rowSpan', -1, 1, true, '-1')
  }))

test('colSpan property', () =>
  root.start(async () => {
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('td', 'colSpan', undefined, 1, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('td', 'colSpan', null, 1, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('td', 'colSpan', 1, 1, true, '1')
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('td', 'colSpan', 0, 1, true, '0')
  }))

test('role property', () =>
  root.start(async () => {
    expectHtmlElementProperty('div', 'role', undefined, null, false, null)
    expectHtmlElementProperty('div', 'role', null, null, false, null)
    expectHtmlElementProperty('div', 'role', 'alert', 'alert', true, 'alert')
  }))

test('popover property', () =>
  root.start(async () => {
    expectHtmlElementProperty('div', 'popover', undefined, null, false, null)
    // @ts-expect-error TODO fix types
    expectHtmlElementProperty('div', 'popover', null, null, false, null)
    expectHtmlElementProperty('div', 'popover', false, null, false, null)
    expectHtmlElementProperty('div', 'popover', true, 'auto', true, '')
    expectHtmlElementProperty('div', 'popover', 'auto', 'auto', true, 'auto')
  }))

test('aria attributes', () =>
  root.start(async () => {
    const expectAttribute = <
      Attr extends keyof JSX.AriaAttributes,
      Value extends JSX.AriaAttributes[Attr],
    >(
      attr: Attr,
      value: Value,
    ) => {
      const element = h('div', { [attr]: value })
      expect(element.hasAttribute(attr)).toBe(value != null)
      expect(element.getAttribute(attr)).toBe(value?.toString() ?? null)
    }

    expectAttribute('aria-checked', undefined)
    expectAttribute('aria-checked', null)
    expectAttribute('aria-checked', false)
    expectAttribute('aria-checked', true)
    expectAttribute('aria-checked', 'false')
    expectAttribute('aria-checked', 'true')
    expectAttribute('aria-colcount', 1)
    expectAttribute('aria-colcount', '1')
  }))
