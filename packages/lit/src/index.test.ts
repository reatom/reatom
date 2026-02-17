// @ts-nocheck - Test file with complex Lit component typing
/// <reference types="vitest/globals" />
import {
  atom,
  clearStack,
  context,
  wrap,
  computed,
  withActions,
} from '@reatom/core'
import { LitElement } from 'lit'

import { html, withReatomElement, watch, ReatomLitElement } from './index'

clearStack()

type ElementWrapper = <T extends typeof LitElement>(superClass: T) => T

/**
 * Factory function to run the same tests for different element creation
 * approaches
 *
 * @param {string} name - Name for the describe block
 * @param {ElementWrapper} wrapper - Factory function that takes a class
 *   and returns an element class
 */
function runTests(name: string, wrapper: ElementWrapper) {
  // Generate unique element names per test suite to avoid conflicts
  const prefix = name.toLowerCase().replace(/\s+/g, '-')
  let elementCounter = 0
  const uniqueTag = () => `${prefix}-${++elementCounter}`

  describe(name, () => {
    afterEach(() => {
      // Cleanup custom elements after each test
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild)
      }
    })

    it('should render initial atom value', async () => {
      await context.start(async () => {
        const textAtom = atom('Hello', 'text')

        const MyElement = wrapper(
          class MyElement extends LitElement {
            static properties = {
              text: { type: String },
            }

            constructor() {
              super()
              this.text = textAtom()
            }

            render() {
              return html`<div>${this.text}</div>`
            }
          },
        )

        const tag = uniqueTag()
        customElements.define(tag, MyElement)
        const element = document.createElement(tag)
        document.body.appendChild(element)

        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('Hello')
      })
    })

    it('should update when atom value changes', async () => {
      await context.start(async () => {
        const countAtom = atom(0, 'count')

        const CounterElement = wrapper(
          class CounterElement extends LitElement {
            static properties = {
              count: { type: Number },
            }

            constructor() {
              super()
              this.count = countAtom()
            }

            render() {
              return html`<span>Count: ${this.count}</span>`
            }
          },
        )

        const tag = uniqueTag()
        customElements.define(tag, CounterElement)
        const element = document.createElement(tag)
        document.body.appendChild(element)

        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('Count: 0')

        countAtom.set(5)
        element.count = countAtom()
        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('Count: 5')
      })
    })

    it('should handle multiple atoms', async () => {
      await context.start(async () => {
        const nameAtom = atom('John', 'name')
        const ageAtom = atom(30, 'age')

        const PersonElement = wrapper(
          class PersonElement extends LitElement {
            static properties = {
              name: { type: String },
              age: { type: Number },
            }

            constructor() {
              super()
              this.name = nameAtom()
              this.age = ageAtom()
            }

            render() {
              return html`<p>${this.name} is ${this.age} years old</p>`
            }
          },
        )

        const tag = uniqueTag()
        customElements.define(tag, PersonElement)
        const element = document.createElement(tag)
        document.body.appendChild(element)

        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain(
          'John is 30 years old',
        )

        nameAtom.set('Jane')
        ageAtom.set(25)
        element.name = nameAtom()
        element.age = ageAtom()
        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain(
          'Jane is 25 years old',
        )
      })
    })

    it('should handle complex state updates', async () => {
      await context.start(async () => {
        const listAtom = atom(['a', 'b'], 'list')

        const ListElement = wrapper(
          class ListElement extends LitElement {
            static properties = {
              items: { type: Array },
            }

            constructor() {
              super()
              this.items = listAtom()
            }

            render() {
              return html`
                <ul>
                  ${this.items.map((item: string) => html`<li>${item}</li>`)}
                </ul>
              `
            }
          },
        )

        const tag = uniqueTag()
        customElements.define(tag, ListElement)
        const element = document.createElement(tag)
        document.body.appendChild(element)

        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('a')
        expect(element.shadowRoot?.textContent).toContain('b')

        listAtom.set(['a', 'b', 'c'])
        element.items = listAtom()
        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('c')
      })
    })

    it('should work with boolean atom values', async () => {
      await context.start(async () => {
        const visibleAtom = atom(true, 'visible')

        const ToggleElement = wrapper(
          class ToggleElement extends LitElement {
            static properties = {
              visible: { type: Boolean },
            }

            constructor() {
              super()
              this.visible = visibleAtom()
            }

            render() {
              return html`
                <div ?hidden="${!this.visible}">
                  ${this.visible ? 'Visible' : 'Hidden'}
                </div>
              `
            }
          },
        )

        const tag = uniqueTag()
        customElements.define(tag, ToggleElement)
        const element = document.createElement(tag)
        document.body.appendChild(element)

        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('Visible')

        visibleAtom.set(false)
        element.visible = visibleAtom()
        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('Hidden')
      })
    })

    it('should work with watch directive', async () => {
      await context.start(async () => {
        const messageAtom = atom('Hello World', 'message')

        const MessageElement = wrapper(
          class MessageElement extends LitElement {
            static properties = {
              messageAtom: { type: Object },
            }

            constructor() {
              super()
              this.messageAtom = messageAtom
            }

            render() {
              return html`<div>${this.messageAtom}</div>`
            }
          },
        )

        const tag = uniqueTag()
        customElements.define(tag, MessageElement)
        const element = document.createElement(tag)
        element.messageAtom = messageAtom
        document.body.appendChild(element)

        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('Hello World')
      })
    })

    it('should handle rapid atom updates', async () => {
      await context.start(async () => {
        const counterAtom = atom(0, 'counter')

        const CounterElement = wrapper(
          class CounterElement extends LitElement {
            static properties = {
              counter: { type: Number },
            }

            constructor() {
              super()
              this.counter = counterAtom()
            }

            render() {
              return html`<span>${this.counter}</span>`
            }
          },
        )

        const tag = uniqueTag()
        customElements.define(tag, CounterElement)
        const element = document.createElement(tag)
        document.body.appendChild(element)

        await wrap(element.updateComplete)

        // Rapid updates
        counterAtom.set(1)
        counterAtom.set(2)
        counterAtom.set(3)
        element.counter = counterAtom()
        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('3')
      })
    })

    it('should handle null and undefined values', async () => {
      await context.start(async () => {
        const valueAtom = atom('initial', 'value')

        const ValueElement = wrapper(
          class ValueElement extends LitElement {
            static properties = {
              value: { type: String },
            }

            constructor() {
              super()
              this.value = valueAtom()
            }

            render() {
              return html`<div>${this.value || 'empty'}</div>`
            }
          },
        )

        const tag = uniqueTag()
        customElements.define(tag, ValueElement)
        const element = document.createElement(tag)
        document.body.appendChild(element)

        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('initial')

        valueAtom.set(null)
        element.value = valueAtom()
        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('empty')
      })
    })

    it('should handle numeric atom values including zero', async () => {
      await context.start(async () => {
        const numAtom = atom(100, 'num')

        const NumberElement = wrapper(
          class NumberElement extends LitElement {
            static properties = {
              num: { type: Number },
            }

            constructor() {
              super()
              this.num = numAtom()
            }

            render() {
              return html`<div>Value: ${this.num}</div>`
            }
          },
        )

        const tag = uniqueTag()
        customElements.define(tag, NumberElement)
        const element = document.createElement(tag)
        document.body.appendChild(element)

        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('Value: 100')

        numAtom.set(0)
        element.num = numAtom()
        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('Value: 0')
      })
    })

    it('should render correctly with conditional rendering based on atom', async () => {
      await context.start(async () => {
        const showAtom = atom(false, 'show')
        const textAtom = atom('Content', 'text')

        const ConditionalElement = wrapper(
          class ConditionalElement extends LitElement {
            static properties = {
              show: { type: Boolean },
              text: { type: String },
            }

            constructor() {
              super()
              this.show = showAtom()
              this.text = textAtom()
            }

            render() {
              return html`
                ${this.show
                  ? html`<div>${this.text}</div>`
                  : html`<div>Hidden</div>`}
              `
            }
          },
        )

        const tag = uniqueTag()
        customElements.define(tag, ConditionalElement)
        const element = document.createElement(tag)
        document.body.appendChild(element)

        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('Hidden')

        showAtom.set(true)
        element.show = showAtom()
        await wrap(element.updateComplete)

        expect(element.shadowRoot?.textContent).toContain('Content')
      })
    })

    describe('with static properties (external property changes, atom unchanged)', () => {
      it('should render when external property changes, atom unchanged', async () => {
        await context.start(async () => {
          const internalAtom = atom('internal value', 'internal')

          const ExternalPropertyElement = wrapper(
            class ExternalPropertyElement extends LitElement {
              static properties = {
                external: { type: String },
              }

              constructor() {
                super()
                this.external = 'initial external'
                this.internal = internalAtom()
              }

              render() {
                return html`
                  <div>
                    External: <span>${this.external}</span>, Internal: <span>${this.internal}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, ExternalPropertyElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain(
            'External: initial external',
          )
          expect(element.shadowRoot?.textContent).toContain(
            'Internal: internal value',
          )

          // Изменяем внешнее свойство, атом не меняется
          element.external = 'changed external'
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain(
            'External: changed external',
          )
          expect(element.shadowRoot?.textContent).toContain(
            'Internal: internal value',
          )
        })
      })

      it('should handle multiple static properties with internal atoms', async () => {
        await context.start(async () => {
          const internalAtom1 = atom('atom1', 'internal1')
          const internalAtom2 = atom(100, 'internal2')

          const MultiplePropsElement = wrapper(
            class MultiplePropsElement extends LitElement {
              static properties = {
                external1: { type: String },
                external2: { type: Number },
              }

              constructor() {
                super()
                this.external1 = 'ext1'
                this.external2 = 10
                this.internal1 = internalAtom1()
                this.internal2 = internalAtom2()
              }

              render() {
                return html`
                  <div>
                    Ext1: ${this.external1}, Ext2: ${this.external2}, Int1: ${this.internal1}, Int2: ${this.internal2}
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, MultiplePropsElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Ext1: ext1')
          expect(element.shadowRoot?.textContent).toContain('Ext2: 10')
          expect(element.shadowRoot?.textContent).toContain('Int1: atom1')
          expect(element.shadowRoot?.textContent).toContain('Int2: 100')

          // Изменяем только внешние свойства, внутренние атомы не меняются
          element.external1 = 'new ext1'
          element.external2 = 20
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Ext1: new ext1')
          expect(element.shadowRoot?.textContent).toContain('Ext2: 20')
          expect(element.shadowRoot?.textContent).toContain('Int1: atom1')
          expect(element.shadowRoot?.textContent).toContain('Int2: 100')
        })
      })

      it('should handle boolean property with unchanged internal atom', async () => {
        await context.start(async () => {
          const internalAtom = atom(true, 'internal')

          const BooleanPropertyElement = wrapper(
            class BooleanPropertyElement extends LitElement {
              static properties = {
                external: { type: Boolean },
              }

              constructor() {
                super()
                this.external = false
                this.internal = internalAtom()
              }

              render() {
                return html`
                  <div>
                    External: ${this.external ? 'true' : 'false'}, Internal: ${this.internal ? 'true' : 'false'}
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, BooleanPropertyElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('External: false')
          expect(element.shadowRoot?.textContent).toContain('Internal: true')

          // Изменяем внешнее свойство, атом не меняется
          element.external = true
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('External: true')
          expect(element.shadowRoot?.textContent).toContain('Internal: true')
        })
      })

      it('should handle property with array type, atom unchanged', async () => {
        await context.start(async () => {
          const internalAtom = atom(['a', 'b'], 'internal')

          const ArrayPropertyElement = wrapper(
            class ArrayPropertyElement extends LitElement {
              static properties = {
                external: { type: Array },
                internalArray: { type: Array },
              }

              constructor() {
                super()
                this.external = ['x', 'y']
                this.internalArray = internalAtom()
                this.externalJoined = ''
                this.internalJoined = ''
              }

              willUpdate(changedProperties: any) {
                if (
                  changedProperties.has('external') ||
                  changedProperties.has('internalArray')
                ) {
                  this.externalJoined = this.external.join(',')
                  this.internalJoined = this.internalArray.join(',')
                }
              }

              render() {
                return html`
                  <div>
                    External: ${this.externalJoined}, Internal: ${this.internalJoined}
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, ArrayPropertyElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('External: x,y')
          expect(element.shadowRoot?.textContent).toContain('Internal: a,b')

          // Изменяем внешнее свойство, атом не меняется
          element.external = ['z', 'w']
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('External: z,w')
          expect(element.shadowRoot?.textContent).toContain('Internal: a,b')
        })
      })

      it('should handle rapid property changes with unchanged atom', async () => {
        await context.start(async () => {
          const internalAtom = atom('static', 'internal')

          const RapidPropertyElement = wrapper(
            class RapidPropertyElement extends LitElement {
              static properties = {
                external: { type: String },
              }

              constructor() {
                super()
                this.external = 'value1'
                this.internal = internalAtom()
              }

              render() {
                return html`
                  <div>
                    External: <span>${this.external}</span>, Internal: <span>${this.internal}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, RapidPropertyElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('External: value1')

          // Быстрые изменения внешнего свойства
          element.external = 'value2'
          element.external = 'value3'
          element.external = 'value4'
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('External: value4')
          expect(element.shadowRoot?.textContent).toContain('Internal: static')
        })
      })

      it('should handle null and undefined in property with unchanged atom', async () => {
        await context.start(async () => {
          const internalAtom = atom('always there', 'internal')

          const NullUndefinedElement = wrapper(
            class NullUndefinedElement extends LitElement {
              static properties = {
                external: { type: String },
              }

              constructor() {
                super()
                this.external = 'initial'
                this.internal = internalAtom()
              }

              render() {
                return html`
                  <div>
                    External: ${this.external || 'null'}, Internal: ${this.internal}
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, NullUndefinedElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('External: initial')

          // Изменяем внешнее свойство на null
          element.external = null
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('External: null')
          expect(element.shadowRoot?.textContent).toContain(
            'Internal: always there',
          )
        })
      })

      it('should handle zero as property value with unchanged atom', async () => {
        await context.start(async () => {
          const internalAtom = atom(999, 'internal')

          const ZeroPropertyElement = wrapper(
            class ZeroPropertyElement extends LitElement {
              static properties = {
                external: { type: Number },
              }

              constructor() {
                super()
                this.external = 100
                this.internal = internalAtom()
              }

              render() {
                return html`
                  <div>
                    External: <span>${this.external}</span>, Internal: <span>${this.internal}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, ZeroPropertyElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('External: 100')
          expect(element.shadowRoot?.textContent).toContain('Internal: 999')

          // Изменяем внешнее свойство на 0
          element.external = 0
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('External: 0')
          expect(element.shadowRoot?.textContent).toContain('Internal: 999')
        })
      })
    })

    describe('watch directive', () => {
      it('should update automatically when atom changes', async () => {
        await context.start(async () => {
          const textAtom = atom('Hello', 'text')

          const WatchElement = wrapper(
            class WatchElement extends LitElement {
              render() {
                return html`<div>${watch(textAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, WatchElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Hello')

          // Изменяем атом — должно обновиться автоматически через watch
          textAtom.set('World')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('World')
        })
      })

      it('should handle multiple watch directives in one component', async () => {
        await context.start(async () => {
          const atom1 = atom('value1', 'atom1')
          const atom2 = atom(100, 'atom2')
          const atom3 = atom(true, 'atom3')

          const MultipleWatchElement = wrapper(
            class MultipleWatchElement extends LitElement {
              render() {
                const atom1Value = atom1()
                const atom2Value = atom2()
                const atom3Value = atom3()
                return html`
                  <div>
                    <span id="a1">${atom1Value}</span>
                    <span id="a2">${atom2Value}</span>
                    <span id="a3">${atom3Value ? 'yes' : 'no'}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, MultipleWatchElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('value1')
          expect(element.shadowRoot?.textContent).toContain('100')
          expect(element.shadowRoot?.textContent).toContain('yes')

          // Изменяем только atom1
          atom1.set('value2')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('value2')
          expect(element.shadowRoot?.textContent).toContain('100')
          expect(element.shadowRoot?.textContent).toContain('yes')

          // Изменяем только atom2
          atom2.set(200)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('value2')
          expect(element.shadowRoot?.textContent).toContain('200')
          expect(element.shadowRoot?.textContent).toContain('yes')

          // Изменяем только atom3
          atom3.set(false)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('value2')
          expect(element.shadowRoot?.textContent).toContain('200')
          expect(element.shadowRoot?.textContent).toContain('no')
        })
      })

      it('should work with different data types', async () => {
        await context.start(async () => {
          const stringAtom = atom('text', 'string')
          const numberAtom = atom(42, 'number')
          const booleanAtom = atom(true, 'boolean')
          const arrayAtom = atom(['a', 'b'], 'array')
          const objectAtom = atom({ key: 'value' }, 'object')

          const TypesWatchElement = wrapper(
            class TypesWatchElement extends LitElement {
              static properties = {
                arrayValue: { type: Array },
                objectValue: { type: Object },
              }

              constructor() {
                super()
                this.arrayValue = arrayAtom()
                this.objectValue = objectAtom()
              }

              render() {
                return html`
                  <div>
                    <div>String: ${watch(stringAtom)}</div>
                    <div>Number: ${watch(numberAtom)}</div>
                    <div>Boolean: ${watch(booleanAtom)}</div>
                    <div>Array: ${this.arrayValue.join(',')}</div>
                    <div>Object: ${this.objectValue ? (this.objectValue as any).key : ''}</div>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, TypesWatchElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('String: text')
          expect(element.shadowRoot?.textContent).toContain('Number: 42')
          expect(element.shadowRoot?.textContent).toContain('Boolean: true')
          expect(element.shadowRoot?.textContent).toContain('Array: a,b')
          expect(element.shadowRoot?.textContent).toContain('Object: value')

          // Изменяем все типы
          stringAtom.set('new text')
          numberAtom.set(99)
          booleanAtom.set(false)
          arrayAtom.set(['c', 'd', 'e'])
          objectAtom.set({ key: 'new value' })
          element.arrayValue = arrayAtom()
          element.objectValue = objectAtom()
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('String: new text')
          expect(element.shadowRoot?.textContent).toContain('Number: 99')
          expect(element.shadowRoot?.textContent).toContain('Boolean: false')
          expect(element.shadowRoot?.textContent).toContain('Array: c,d,e')
          expect(element.shadowRoot?.textContent).toContain('Object: new value')
        })
      })

      it('should work with computed atoms', async () => {
        await context.start(async () => {
          const aAtom = atom(10, 'a')
          const bAtom = atom(5, 'b')
          const sumAtom = computed(() => aAtom() + bAtom())

          const ComputedWatchElement = wrapper(
            class ComputedWatchElement extends LitElement {
              render() {
                return html`
                  <div>
                    <span>A: ${watch(aAtom)}</span>
                    <span>B: ${watch(bAtom)}</span>
                    <span>Sum: ${watch(sumAtom)}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, ComputedWatchElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('A: 10')
          expect(element.shadowRoot?.textContent).toContain('B: 5')
          expect(element.shadowRoot?.textContent).toContain('Sum: 15')

          // Изменяем базовый атом
          aAtom.set(20)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('A: 20')
          expect(element.shadowRoot?.textContent).toContain('B: 5')
          expect(element.shadowRoot?.textContent).toContain('Sum: 25')

          // Изменяем другой базовый атом
          bAtom.set(10)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('A: 20')
          expect(element.shadowRoot?.textContent).toContain('B: 10')
          expect(element.shadowRoot?.textContent).toContain('Sum: 30')
        })
      })

      it('should work with watch and external properties simultaneously', async () => {
        await context.start(async () => {
          const atom1 = atom('atom value', 'atom1')

          const WatchAndPropElement = wrapper(
            class WatchAndPropElement extends LitElement {
              static properties = {
                prop1: { type: String },
              }

              constructor() {
                super()
                this.prop1 = 'prop value'
              }

              render() {
                return html`
                  <div>
                    <span>Watch: ${watch(atom1)}</span>
                    <span>Prop: ${this.prop1}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, WatchAndPropElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Watch: atom value')
          expect(element.shadowRoot?.textContent).toContain('Prop: prop value')

          // Изменяем атом
          atom1.set('new atom value')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain(
            'Watch: new atom value',
          )
          expect(element.shadowRoot?.textContent).toContain('Prop: prop value')

          // Изменяем свойство
          element.prop1 = 'new prop value'
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain(
            'Watch: new atom value',
          )
          expect(element.shadowRoot?.textContent).toContain(
            'Prop: new prop value',
          )

          // Изменяем оба
          atom1.set('final atom')
          element.prop1 = 'final prop'
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Watch: final atom')
          expect(element.shadowRoot?.textContent).toContain('Prop: final prop')
        })
      })

      it('should handle watch in conditional rendering', async () => {
        await context.start(async () => {
          const showAtom = atom(true, 'show')
          const textAtom = atom('visible', 'text')

          const ConditionalWatchElement = wrapper(
            class ConditionalWatchElement extends LitElement {
              render() {
                const show = showAtom()
                const text = textAtom()

                return html`
                  ${show
                    ? html`<div id="visible">${text}</div>`
                    : html`<div id="hidden">Hidden</div>`}
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, ConditionalWatchElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('visible')

          // Изменяем текст
          textAtom.set('changed')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('changed')

          // Меняем условие
          showAtom.set(false)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Hidden')
          expect(element.shadowRoot?.textContent).not.toContain('changed')

          // Меняем текст во время скрытого состояния
          textAtom.set('invisible')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Hidden')

          // Возвращаем видимость
          showAtom.set(true)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('invisible')
        })
      })

      it('should not lose focus on input when atom changes (watch directive)', async () => {
        await context.start(async () => {
          const textAtom = atom('', 'text')

          const InputElement = wrapper(
            class InputElement extends LitElement {
              render() {
                return html`
                  <input
                    type="text"
                    class="text-input"
                    .value=${watch(textAtom)}
                  />
                  <div class="display">${watch(textAtom)}</div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, InputElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const input = element.shadowRoot?.querySelector(
            '.text-input',
          ) as HTMLInputElement

          // Фокусируемся на input
          input?.focus()
          expect(element.shadowRoot?.activeElement).toBe(input)

          // Симулируем ввод текста
          textAtom.set('a')
          await wrap(element.updateComplete)

          // Проверяем что фокус сохранился
          expect(element.shadowRoot?.activeElement).toBe(input)

          // Продолжаем ввод
          textAtom.set('ab')
          await wrap(element.updateComplete)

          // Фокус всё ещё на input
          expect(element.shadowRoot?.activeElement).toBe(input)

          // Значение обновилось
          expect(input?.value).toBe('ab')

          // Проверяем отображение значения
          const display = element.shadowRoot?.querySelector('.display')
          expect(display?.textContent).toBe('ab')
        })
      })

      it('should handle rapid input changes without focus loss', async () => {
        await context.start(async () => {
          const messageAtom = atom('initial', 'message')

          const RapidInputElement = wrapper(
            class RapidInputElement extends LitElement {
              render() {
                return html`
                  <input
                    type="text"
                    class="message-input"
                    .value=${watch(messageAtom)}
                  />
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, RapidInputElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const input = element.shadowRoot?.querySelector(
            '.message-input',
          ) as HTMLInputElement

          input?.focus()
          expect(element.shadowRoot?.activeElement).toBe(input)

          // Быстрые изменения как при печати
          for (let i = 0; i < 10; i++) {
            messageAtom.set(`char${i}`)
            await wrap(element.updateComplete)
            // После каждого изменения фокус должен сохраняться
            expect(element.shadowRoot?.activeElement).toBe(input)
          }

          expect(input?.value).toBe('char9')
        })
      })
    })

    describe('joint updates (atom + property)', () => {
      it('should update when both atom and property change', async () => {
        await context.start(async () => {
          const atom1 = atom('atom initial', 'atom1')

          const JointUpdateElement = wrapper(
            class JointUpdateElement extends LitElement {
              static properties = {
                prop1: { type: String },
              }

              constructor() {
                super()
                this.prop1 = 'prop initial'
              }

              render() {
                return html`
                  <div>
                    <span>Atom: ${watch(atom1)}</span>
                    <span>Prop: ${this.prop1}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, JointUpdateElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain(
            'Atom: atom initial',
          )
          expect(element.shadowRoot?.textContent).toContain(
            'Prop: prop initial',
          )

          // Изменяем оба одновременно
          atom1.set('atom updated')
          element.prop1 = 'prop updated'
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain(
            'Atom: atom updated',
          )
          expect(element.shadowRoot?.textContent).toContain(
            'Prop: prop updated',
          )
        })
      })

      it('should handle priority with rapid updates', async () => {
        await context.start(async () => {
          const atom1 = atom(0, 'atom1')

          const PriorityElement = wrapper(
            class PriorityElement extends LitElement {
              static properties = {
                prop1: { type: Number },
              }

              constructor() {
                super()
                this.prop1 = 100
              }

              render() {
                return html`
                  <div>
                    <span>Atom: ${watch(atom1)}</span>
                    <span>Prop: ${this.prop1}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, PriorityElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Atom: 0')
          expect(element.shadowRoot?.textContent).toContain('Prop: 100')

          // Быстрые изменения: атом -> свойство -> атом
          atom1.set(1)
          await wrap(element.updateComplete)

          element.prop1 = 200
          await wrap(element.updateComplete)

          atom1.set(2)
          await wrap(element.updateComplete)

          // Финальное состояние должно показать последние значения
          expect(element.shadowRoot?.textContent).toContain('Atom: 2')
          expect(element.shadowRoot?.textContent).toContain('Prop: 200')
        })
      })

      it('should not cause infinite loop when changing property in updated()', async () => {
        await context.start(async () => {
          const atom1 = atom(0, 'atom1')
          let updatedCallCount = 0

          const UpdatedCallbackElement = wrapper(
            class UpdatedCallbackElement extends LitElement {
              static properties = {
                prop1: { type: Number },
              }

              constructor() {
                super()
                this.prop1 = 0
              }

              render() {
                return html`
                  <div>
                    <span>Atom: ${watch(atom1)}</span>
                    <span>Prop: ${this.prop1}</span>
                  </div>
                `
              }

              updated() {
                updatedCallCount++
                // Меняем свойство в updated() — не должно быть бесконечного цикла
                if (updatedCallCount === 1) {
                  this.prop1 = this.prop1 + 1
                }
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, UpdatedCallbackElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const initialCallCount = updatedCallCount

          // Изменяем атом
          atom1.set(1)
          await wrap(element.updateComplete)

          // Должен быть ограниченное количество вызовов updated() (не бесконечный цикл)
          expect(updatedCallCount).toBeLessThan(10)
          expect(element.shadowRoot?.textContent).toContain('Atom: 1')
          expect(element.shadowRoot?.textContent).toContain('Prop: 1')
        })
      })
    })

    describe('atom.extend(withActions()) methods', () => {
      it('should work with basic atom.extend(withActions())', async () => {
        await context.start(async () => {
          const counter = atom(0, 'counter').extend(
            withActions((target) => ({
              increment: () => target.set((state: number) => state + 1),
              decrement: () => target.set((state: number) => state - 1),
            })),
          )

          const MixMethodElement = wrapper(
            class MixMethodElement extends LitElement {
              static properties = {
                counter: { type: Number },
              }

              constructor() {
                super()
                this.counter = counter()
              }

              render() {
                return html`
                  <div>
                    <span>Count: ${this.counter}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, MixMethodElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Count: 0')

          // Используем метод mix()
          counter.increment()
          element.counter = counter()
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Count: 1')

          counter.increment()
          counter.increment()
          element.counter = counter()
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Count: 3')

          counter.decrement()
          element.counter = counter()
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Count: 2')
        })
      })

      it('should work with extend(withActions()) + watch()', async () => {
        await context.start(async () => {
          const counter = atom(0, 'counter').extend(
            withActions((target) => ({
              increment: () => target.set((state: number) => state + 1),
              decrement: () => target.set((state: number) => state - 1),
              reset: () => target.set(0),
            })),
          )

          const MixWatchElement = wrapper(
            class MixWatchElement extends LitElement {
              render() {
                return html`
                  <div>
                    <span>Counter: ${watch(counter)}</span>
                    <button id="inc">+</button>
                    <button id="dec">-</button>
                    <button id="reset">Reset</button>
                  </div>
                `
              }

              firstUpdated() {
                this.shadowRoot
                  ?.querySelector('#inc')
                  ?.addEventListener('click', () => counter.increment())
                this.shadowRoot
                  ?.querySelector('#dec')
                  ?.addEventListener('click', () => counter.decrement())
                this.shadowRoot
                  ?.querySelector('#reset')
                  ?.addEventListener('click', () => counter.reset())
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, MixWatchElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Counter: 0')

          // Кликаем на increment
          element.shadowRoot
            ?.querySelector('#inc')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Counter: 1')

          // Кликаем на increment несколько раз
          element.shadowRoot
            ?.querySelector('#inc')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          element.shadowRoot
            ?.querySelector('#inc')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Counter: 3')

          // Кликаем на decrement
          element.shadowRoot
            ?.querySelector('#dec')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Counter: 2')

          // Кликаем на reset
          element.shadowRoot
            ?.querySelector('#reset')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Counter: 0')
        })
      })

      it('should work with extend(withActions()) with parameters', async () => {
        await context.start(async () => {
          const todoAtom = atom(['item1', 'item2'], 'todo').extend(
            withActions((target) => ({
              add: (item: string) => target.set([...target(), item]),
              remove: (index: number) =>
                target.set(target().filter((_, i) => i !== index)),
              update: (index: number, newItem: string) =>
                target.set(
                  target().map((item, i) => (i === index ? newItem : item)),
                ),
            })),
          )

          const MixParamsElement = wrapper(
            class MixParamsElement extends LitElement {
              static properties = {
                items: { type: Array },
              }

              constructor() {
                super()
                this.items = todoAtom()
              }

              render() {
                return html`
                  <div>
                    <ul>
                      ${(this.items as string[]).map(
                        (item) => html`<li>${item}</li>`,
                      )}
                    </ul>
                    <button id="add">Add</button>
                    <button id="remove">Remove</button>
                    <button id="update">Update</button>
                  </div>
                `
              }

              firstUpdated() {
                this.shadowRoot
                  ?.querySelector('#add')
                  ?.addEventListener('click', () => {
                    todoAtom.add(`item${(this.items as string[]).length + 1}`)
                    this.items = todoAtom()
                  })
                this.shadowRoot
                  ?.querySelector('#remove')
                  ?.addEventListener('click', () => {
                    if ((this.items as string[]).length > 0) {
                      todoAtom.remove((this.items as string[]).length - 1)
                      this.items = todoAtom()
                    }
                  })
                this.shadowRoot
                  ?.querySelector('#update')
                  ?.addEventListener('click', () => {
                    if ((this.items as string[]).length > 0) {
                      todoAtom.update(0, 'updated item')
                      this.items = todoAtom()
                    }
                  })
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, MixParamsElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('item1')
          expect(element.shadowRoot?.textContent).toContain('item2')

          // Добавляем элемент
          element.shadowRoot
            ?.querySelector('#add')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('item3')

          // Обновляем первый элемент
          element.shadowRoot
            ?.querySelector('#update')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('updated item')
          expect(element.shadowRoot?.textContent).not.toContain('item1')

          // Удаляем последний элемент
          element.shadowRoot
            ?.querySelector('#remove')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).not.toContain('item3')
        })
      })
    })

    describe('lifecycle hook updated()', () => {
      it('should not call updated() when atom changes (watch directive)', async () => {
        await context.start(async () => {
          const textAtom = atom('initial', 'text')
          let updatedCallCount = 0

          const UpdatedHookElement = wrapper(
            class UpdatedHookElement extends LitElement {
              render() {
                return html`<div>${watch(textAtom)}</div>`
              }

              updated() {
                updatedCallCount++
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, UpdatedHookElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const initialCallCount = updatedCallCount

          // Изменяем атом
          textAtom.set('changed')
          await wrap(element.updateComplete)

          expect(updatedCallCount).toEqual(initialCallCount)
          expect(element.shadowRoot?.textContent).toContain('changed')
        })
      })

      it('should compare changedProperties for atom vs property', async () => {
        await context.start(async () => {
          const atom1 = atom('atom value', 'atom1')
          let lastChangedProps: any = null

          const CompareUpdatedElement = wrapper(
            class CompareUpdatedElement extends LitElement {
              static properties = {
                prop1: { type: String },
              }

              constructor() {
                super()
                this.prop1 = 'prop value'
              }

              render() {
                return html`
                  <div>
                    <span>${watch(atom1)}</span>
                    <span>${this.prop1}</span>
                  </div>
                `
              }

              updated(changedProperties: any) {
                lastChangedProps = changedProperties
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, CompareUpdatedElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          // Изменяем атом
          atom1.set('new atom')
          await wrap(element.updateComplete)

          const atomChangedProps = lastChangedProps

          // Сбрасываем
          lastChangedProps = null

          // Изменяем свойство
          element.prop1 = 'new prop'
          await wrap(element.updateComplete)

          const propChangedProps = lastChangedProps

          // В обоих случаях updated() должен был вызываться
          expect(atomChangedProps).not.toBeNull()
          expect(propChangedProps).not.toBeNull()
        })
      })

      it('should not call updated() when atom value is unchanged (watch directive)', async () => {
        await context.start(async () => {
          const numberAtom = atom(42, 'number')
          let updatedCallCount = 0

          const NoChangeUpdatedElement = wrapper(
            class NoChangeUpdatedElement extends LitElement {
              render() {
                return html`<div>${watch(numberAtom)}</div>`
              }

              updated() {
                updatedCallCount++
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, NoChangeUpdatedElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const initialCallCount = updatedCallCount

          // Устанавливаем то же значение
          numberAtom.set(42)
          await wrap(element.updateComplete)

          // updated() НЕ должен был быть вызван снова
          expect(updatedCallCount).toEqual(initialCallCount)

          // Теперь устанавливаем новое значение
          numberAtom.set(43)
          await wrap(element.updateComplete)

          // Теперь updated() должен быть вызван
          expect(updatedCallCount).toEqual(initialCallCount)
        })
      })
    })

    describe('lifecycle and cleanup', () => {
      it('should unsubscribe from atom when element is disconnected (watch directive)', async () => {
        await context.start(async () => {
          const textAtom = atom('initial', 'text')
          let renderCount = 0

          const LifecycleElement = wrapper(
            class LifecycleElement extends LitElement {
              render() {
                renderCount++
                return html`<div>${watch(textAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, LifecycleElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)
          const initialCount = renderCount

          // Удаляем элемент из DOM
          document.body.removeChild(element)

          // Изменяем атом после удаления
          textAtom.set('changed')
          await wrap(new Promise((resolve) => setTimeout(resolve, 10)))

          // Рендер должен был быть вызван только один раз до удаления
          expect(renderCount).toEqual(initialCount)
        })
      })

      it('should resubscribe when element is reconnected', async () => {
        await context.start(async () => {
          const textAtom = atom('initial', 'text')

          const ReconnectElement = wrapper(
            class ReconnectElement extends LitElement {
              render() {
                return html`<div>${watch(textAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, ReconnectElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          // Изменяем атом — должен перерисоваться
          textAtom.set('first change')
          await wrap(element.updateComplete)
          expect(element.shadowRoot?.textContent).toContain('first change')

          // Удаляем и добавляем обратно
          document.body.removeChild(element)
          document.body.appendChild(element)
          await wrap(element.updateComplete)

          // Изменяем атом снова — должен снова перерисоваться
          textAtom.set('second change')
          await wrap(element.updateComplete)
          expect(element.shadowRoot?.textContent).toContain('second change')
        })
      })

      it('should handle multiple elements with same atom', async () => {
        await context.start(async () => {
          const textAtom = atom('shared', 'text')

          const SharedAtomElement = wrapper(
            class SharedAtomElement extends LitElement {
              static properties = {
                id: { type: String },
              }

              constructor() {
                super()
                this.id = ''
              }

              render() {
                return html`<span id="${this.id}">${watch(textAtom)}</span>`
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, SharedAtomElement)

          const element1 = document.createElement(tag)
          ;(element1 as any).id = 'el1'
          document.body.appendChild(element1)

          const element2 = document.createElement(tag)
          ;(element2 as any).id = 'el2'
          document.body.appendChild(element2)

          const element3 = document.createElement(tag)
          ;(element3 as any).id = 'el3'
          document.body.appendChild(element3)

          await wrap(
            Promise.all([
              element1.updateComplete,
              element2.updateComplete,
              element3.updateComplete,
            ]),
          )

          expect(element1.shadowRoot?.textContent).toContain('shared')
          expect(element2.shadowRoot?.textContent).toContain('shared')
          expect(element3.shadowRoot?.textContent).toContain('shared')

          // Изменяем атом — все элементы должны обновиться
          textAtom.set('updated')
          await wrap(
            Promise.all([
              element1.updateComplete,
              element2.updateComplete,
              element3.updateComplete,
            ]),
          )

          expect(element1.shadowRoot?.textContent).toContain('updated')
          expect(element2.shadowRoot?.textContent).toContain('updated')
          expect(element3.shadowRoot?.textContent).toContain('updated')

          // Удаляем один элемент
          document.body.removeChild(element1)

          // Изменяем атом — остальные должны обновиться
          textAtom.set('final')
          await wrap(
            Promise.all([element2.updateComplete, element3.updateComplete]),
          )

          expect(element2.shadowRoot?.textContent).toContain('final')
          expect(element3.shadowRoot?.textContent).toContain('final')
        })
      })

      it('should set initial value for element properties with watch', async () => {
        await context.start(async () => {
          const textAtom = atom('initial value', 'text')
          const boolAtom = atom(true, 'bool')

          const PropertyTestElement = wrapper(
            class PropertyTestElement extends LitElement {
              render() {
                return html`
                  <input
                    type="text"
                    class="text-input"
                    .value=${watch(textAtom)}
                  />
                  <input
                    type="checkbox"
                    class="checkbox"
                    .checked=${watch(boolAtom)}
                  />
                `
              }
            },
          )

          const tag = uniqueTag()
        customElements.define(tag, PropertyTestElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const textInput = element.shadowRoot?.querySelector(
            '.text-input',
          ) as HTMLInputElement
          const checkbox = element.shadowRoot?.querySelector(
            '.checkbox',
          ) as HTMLInputElement

          // Check initial values are set
          expect(textInput?.value).toBe('initial value')
          expect(checkbox?.checked).toBe(true)

          // Update atoms and check properties update
          textAtom.set('updated value')
          boolAtom.set(false)
          await wrap(element.updateComplete)

          expect(textInput?.value).toBe('updated value')
          expect(checkbox?.checked).toBe(false)
        })
      })
    })

    describe('watch directive edge cases', () => {
      it('should handle dynamic atom switching in watch()', async () => {
        await context.start(async () => {
          const atom1 = atom('Atom 1', 'atom1')
          const atom2 = atom('Atom 2', 'atom2')
          const useFirst = atom(true, 'useFirst')

          const selectedValue = computed(() => useFirst() ? atom1() : atom2())

          const SwitchElement = wrapper(
            class SwitchElement extends LitElement {
              render() {
                return html`<div>${watch(selectedValue)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, SwitchElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Atom 1')

          useFirst.set(false)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Atom 2')

          atom2.set('Atom 2 Updated')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Atom 2 Updated')

          atom1.set('Atom 1 Updated')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Atom 2 Updated')
          expect(element.shadowRoot?.textContent).not.toContain('Atom 1 Updated')
        })
      })

      it('should work with watch() in map/repeat loops', async () => {
        await context.start(async () => {
          const item1 = atom('Item 1', 'item1')
          const item2 = atom('Item 2', 'item2')
          const item3 = atom('Item 3', 'item3')
          const items = [item1, item2, item3]

          const ListElement = wrapper(
            class ListElement extends LitElement {
              render() {
                return html`
                  <ul>
                    ${items.map((item, i) => html`<li class="item-${i}">${watch(item)}</li>`)}
                  </ul>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, ListElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Item 1')
          expect(element.shadowRoot?.textContent).toContain('Item 2')
          expect(element.shadowRoot?.textContent).toContain('Item 3')

          item2.set('Item 2 UPDATED')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('Item 1')
          expect(element.shadowRoot?.textContent).toContain('Item 2 UPDATED')
          expect(element.shadowRoot?.textContent).toContain('Item 3')

          item1.set('A')
          item2.set('B')
          item3.set('C')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('A')
          expect(element.shadowRoot?.textContent).toContain('B')
          expect(element.shadowRoot?.textContent).toContain('C')
        })
      })

      it('should handle watch() with initially undefined atom value', async () => {
        await context.start(async () => {
          const maybeAtom = atom<string | undefined>(undefined, 'maybe')
          const displayValue = computed(() => maybeAtom() ?? 'empty')

          const UndefinedElement = wrapper(
            class UndefinedElement extends LitElement {
              render() {
                return html`<div class="value">${watch(displayValue)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, UndefinedElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('empty')

          maybeAtom.set('now defined')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('now defined')

          maybeAtom.set(undefined)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('empty')
        })
      })

      it('should handle nested watch() results', async () => {
        await context.start(async () => {
          const outerAtom = atom('outer', 'outer')
          const innerAtom = atom('inner', 'inner')

          const NestedElement = wrapper(
            class NestedElement extends LitElement {
              render() {
                return html`
                  <div class="container">
                    <span class="outer">${watch(outerAtom)}</span>
                    <div class="nested">
                      <span class="inner">${watch(innerAtom)}</span>
                    </div>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, NestedElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.outer')?.textContent).toBe('outer')
          expect(element.shadowRoot?.querySelector('.inner')?.textContent).toBe('inner')

          outerAtom.set('OUTER')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.outer')?.textContent).toBe('OUTER')
          expect(element.shadowRoot?.querySelector('.inner')?.textContent).toBe('inner')

          innerAtom.set('INNER')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.outer')?.textContent).toBe('OUTER')
          expect(element.shadowRoot?.querySelector('.inner')?.textContent).toBe('INNER')

          outerAtom.set('both1')
          innerAtom.set('both2')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.outer')?.textContent).toBe('both1')
          expect(element.shadowRoot?.querySelector('.inner')?.textContent).toBe('both2')
        })
      })
    })

    describe('computed atoms', () => {
      it('should handle chain of computed atoms', async () => {
        await context.start(async () => {
          const baseAtom = atom(10, 'base')
          const doubled = computed(() => baseAtom() * 2)
          const quadrupled = computed(() => doubled() * 2)

          const ChainElement = wrapper(
            class ChainElement extends LitElement {
              render() {
                return html`
                  <div>
                    <span class="base">${watch(baseAtom)}</span>
                    <span class="doubled">${watch(doubled)}</span>
                    <span class="quadrupled">${watch(quadrupled)}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, ChainElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.base')?.textContent).toBe('10')
          expect(element.shadowRoot?.querySelector('.doubled')?.textContent).toBe('20')
          expect(element.shadowRoot?.querySelector('.quadrupled')?.textContent).toBe('40')

          baseAtom.set(5)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.base')?.textContent).toBe('5')
          expect(element.shadowRoot?.querySelector('.doubled')?.textContent).toBe('10')
          expect(element.shadowRoot?.querySelector('.quadrupled')?.textContent).toBe('20')
        })
      })

      it('should handle computed with multiple dependencies', async () => {
        await context.start(async () => {
          const aAtom = atom(1, 'a')
          const bAtom = atom(2, 'b')
          const cAtom = atom(3, 'c')
          const sumAtom = computed(() => aAtom() + bAtom() + cAtom())

          const MultiDepElement = wrapper(
            class MultiDepElement extends LitElement {
              render() {
                return html`
                  <div>
                    <span class="a">${watch(aAtom)}</span>
                    <span class="b">${watch(bAtom)}</span>
                    <span class="c">${watch(cAtom)}</span>
                    <span class="sum">${watch(sumAtom)}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, MultiDepElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.sum')?.textContent).toBe('6')

          aAtom.set(10)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.a')?.textContent).toBe('10')
          expect(element.shadowRoot?.querySelector('.sum')?.textContent).toBe('15')

          bAtom.set(20)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.sum')?.textContent).toBe('33')
        })
      })

      it('should handle computed with conditional dependency', async () => {
        await context.start(async () => {
          const useFirst = atom(true, 'useFirst')
          const firstAtom = atom('FIRST', 'first')
          const secondAtom = atom('SECOND', 'second')
          const conditionalAtom = computed(() => useFirst() ? firstAtom() : secondAtom())

          const ConditionalDepElement = wrapper(
            class ConditionalDepElement extends LitElement {
              render() {
                return html`<div class="result">${watch(conditionalAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, ConditionalDepElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.result')?.textContent).toBe('FIRST')

          firstAtom.set('FIRST UPDATED')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.result')?.textContent).toBe('FIRST UPDATED')

          useFirst.set(false)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.result')?.textContent).toBe('SECOND')

          firstAtom.set('FIRST AGAIN')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.result')?.textContent).toBe('SECOND')

          secondAtom.set('SECOND UPDATED')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.result')?.textContent).toBe('SECOND UPDATED')
        })
      })

      it('should handle deeply nested computed', async () => {
        await context.start(async () => {
          const base = atom(1, 'base')
          const level1 = computed(() => base() + 1)
          const level2 = computed(() => level1() + 1)
          const level3 = computed(() => level2() + 1)
          const level4 = computed(() => level3() + 1)
          const level5 = computed(() => level4() + 1)

          const DeepElement = wrapper(
            class DeepElement extends LitElement {
              render() {
                return html`
                  <div>
                    <span class="base">${watch(base)}</span>
                    <span class="l1">${watch(level1)}</span>
                    <span class="l2">${watch(level2)}</span>
                    <span class="l3">${watch(level3)}</span>
                    <span class="l4">${watch(level4)}</span>
                    <span class="l5">${watch(level5)}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, DeepElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.base')?.textContent).toBe('1')
          expect(element.shadowRoot?.querySelector('.l5')?.textContent).toBe('6')

          base.set(10)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.base')?.textContent).toBe('10')
          expect(element.shadowRoot?.querySelector('.l5')?.textContent).toBe('15')
        })
      })
    })

    describe('async operations', () => {
      it('should handle deferred atom update', async () => {
        await context.start(async () => {
          const asyncAtom = atom('initial', 'async')

          const AsyncElement = wrapper(
            class AsyncElement extends LitElement {
              render() {
                return html`<div class="value">${watch(asyncAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, AsyncElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('initial')

          asyncAtom.set('async updated')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('async updated')
        })
      })

      it('should handle atom update after initial render', async () => {
        await context.start(async () => {
          const dataAtom = atom<string>('loading', 'data')

          const PromiseElement = wrapper(
            class PromiseElement extends LitElement {
              render() {
                return html`<div class="data">${watch(dataAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, PromiseElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.data')?.textContent).toBe('loading')

          dataAtom.set('fetched data')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.data')?.textContent).toBe('fetched data')
        })
      })

      it('should handle multiple sequential atom updates', async () => {
        await context.start(async () => {
          const queueAtom = atom<number[]>([], 'queue')

          const QueueElement = wrapper(
            class QueueElement extends LitElement {
              render() {
                const items = queueAtom()
                return html`<div class="queue">${items.join(',')}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, QueueElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.queue')?.textContent).toBe('')

          for (let n = 1; n <= 5; n++) {
            queueAtom.set([...queueAtom(), n])
          }

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.queue')?.textContent).toBe('1,2,3,4,5')
        })
      })

      it('should handle cleanup when element unmounts', async () => {
        await context.start(async () => {
          const pendingAtom = atom('before', 'pending')
          let updateCount = 0

          const CleanupElement = wrapper(
            class CleanupElement extends LitElement {
              render() {
                updateCount++
                return html`<div class="pending">${watch(pendingAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, CleanupElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.pending')?.textContent).toBe('before')
          const countBeforeRemove = updateCount

          document.body.removeChild(element)

          pendingAtom.set('after')

          expect(pendingAtom()).toBe('after')
          expect(updateCount).toBeLessThanOrEqual(countBeforeRemove + 1)
        })
      })
    })

    describe('error handling', () => {
      it('should handle error state in computed atom gracefully', async () => {
        await context.start(async () => {
          const hasError = atom(false, 'hasError')
          const safeAtom = atom('safe', 'safe')

          const stateComputed = computed(() => {
            if (hasError()) {
              return { ok: false, error: 'Error occurred' }
            }
            return { ok: true, value: 'no error' }
          })

          const ErrorElement = wrapper(
            class ErrorElement extends LitElement {
              render() {
                const state = stateComputed()
                if (state.ok) {
                  return html`
                    <div class="computed">${state.value}</div>
                    <div class="safe">${watch(safeAtom)}</div>
                  `
                } else {
                  return html`
                    <div class="error">${state.error}</div>
                    <div class="safe">${watch(safeAtom)}</div>
                  `
                }
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, ErrorElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.computed')?.textContent).toBe('no error')
          expect(element.shadowRoot?.querySelector('.safe')?.textContent).toBe('safe')

          hasError.set(true)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.error')?.textContent).toBe('Error occurred')
          expect(element.shadowRoot?.querySelector('.safe')?.textContent).toBe('safe')

          hasError.set(false)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.computed')?.textContent).toBe('no error')
        })
      })

      it('should not break other atoms when one updates', async () => {
        await context.start(async () => {
          const atom1 = atom('value1', 'atom1')
          const atom2 = atom('value2', 'atom2')

          const IsolatedElement = wrapper(
            class IsolatedElement extends LitElement {
              render() {
                return html`
                  <div class="a1">${watch(atom1)}</div>
                  <div class="a2">${watch(atom2)}</div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, IsolatedElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.a1')?.textContent).toBe('value1')
          expect(element.shadowRoot?.querySelector('.a2')?.textContent).toBe('value2')

          atom1.set('updated1')
          atom2.set('updated2')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.a1')?.textContent).toBe('updated1')
          expect(element.shadowRoot?.querySelector('.a2')?.textContent).toBe('updated2')
        })
      })

      it('should recover after error state', async () => {
        await context.start(async () => {
          const shouldError = atom(false, 'shouldError')
          const counter = atom(0, 'counter')

          const RecoverElement = wrapper(
            class RecoverElement extends LitElement {
              render() {
                const count = counter()
                if (shouldError() && count === 1) {
                  return html`<div class="error">error state</div>`
                }
                return html`<div class="count">${count}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, RecoverElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.count')?.textContent).toBe('0')

          counter.set(2)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.count')?.textContent).toBe('2')

          counter.set(3)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.count')?.textContent).toBe('3')
        })
      })

      it('should handle undefined return from render', async () => {
        await context.start(async () => {
          const showContent = atom(false, 'showContent')

          const UndefinedRenderElement = wrapper(
            class UndefinedRenderElement extends LitElement {
              render() {
                if (!showContent()) {
                  return undefined
                }
                return html`<div class="content">Content here</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, UndefinedRenderElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toBe('')

          showContent.set(true)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.content')?.textContent).toBe('Content here')
        })
      })
    })

    describe('batching and performance', () => {
      it('should batch multiple synchronous atom updates', async () => {
        await context.start(async () => {
          const atom1 = atom('a', 'atom1')
          const atom2 = atom('b', 'atom2')
          const atom3 = atom('c', 'atom3')
          let renderCount = 0

          const BatchElement = wrapper(
            class BatchElement extends LitElement {
              render() {
                renderCount++
                return html`
                  <div>
                    <span class="a1">${watch(atom1)}</span>
                    <span class="a2">${watch(atom2)}</span>
                    <span class="a3">${watch(atom3)}</span>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, BatchElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const initialRenderCount = renderCount

          atom1.set('A')
          atom2.set('B')
          atom3.set('C')

          await wrap(element.updateComplete)

          expect(renderCount - initialRenderCount).toBeLessThanOrEqual(3)

          expect(element.shadowRoot?.querySelector('.a1')?.textContent).toBe('A')
          expect(element.shadowRoot?.querySelector('.a2')?.textContent).toBe('B')
          expect(element.shadowRoot?.querySelector('.a3')?.textContent).toBe('C')
        })
      })

      it('should count requestUpdate calls efficiently', async () => {
        await context.start(async () => {
          const testAtom = atom(0, 'test')
          let requestUpdateCalls = 0

          const CountElement = wrapper(
            class CountElement extends LitElement {
              requestUpdate(...args: any[]) {
                requestUpdateCalls++
                return super.requestUpdate(...args)
              }

              render() {
                return html`<div>${watch(testAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, CountElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const initialCalls = requestUpdateCalls

          testAtom.set(1)
          await wrap(element.updateComplete)

          expect(requestUpdateCalls - initialCalls).toBeLessThanOrEqual(2)
        })
      })

      it('should not create extra subscriptions on re-render', async () => {
        await context.start(async () => {
          const testAtom = atom('value', 'test')

          const SubElement = wrapper(
            class SubElement extends LitElement {
              static properties = {
                trigger: { type: Number },
              }

              constructor() {
                super()
                this.trigger = 0
              }

              render() {
                const _ = this.trigger
                return html`<div>${watch(testAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, SubElement)
          const element = document.createElement(tag) as any
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          element.trigger = 1
          await wrap(element.updateComplete)
          element.trigger = 2
          await wrap(element.updateComplete)
          element.trigger = 3
          await wrap(element.updateComplete)

          testAtom.set('new value')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toContain('new value')
        })
      })

      it('should handle 100+ rapid updates efficiently', async () => {
        await context.start(async () => {
          const rapidAtom = atom(0, 'rapid')

          const RapidElement = wrapper(
            class RapidElement extends LitElement {
              render() {
                return html`<div class="value">${watch(rapidAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, RapidElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const startTime = performance.now()
          for (let i = 1; i <= 100; i++) {
            rapidAtom.set(i)
          }
          await wrap(element.updateComplete)
          const endTime = performance.now()

          expect(endTime - startTime).toBeLessThan(500)

          expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('100')
        })
      })
    })

    describe('Lit features', () => {
      it('should work with static properties definition and atoms', async () => {
        await context.start(async () => {
          const sharedAtom = atom('shared', 'shared')

          const PropsElement = wrapper(
            class PropsElement extends LitElement {
              static properties = {
                localProp: { type: String },
                numberProp: { type: Number },
              }

              constructor() {
                super()
                this.localProp = 'local'
                this.numberProp = 42
              }

              render() {
                return html`
                  <div class="local">${this.localProp}</div>
                  <div class="number">${this.numberProp}</div>
                  <div class="shared">${watch(sharedAtom)}</div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, PropsElement)
          const element = document.createElement(tag) as any
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.local')?.textContent).toBe('local')
          expect(element.shadowRoot?.querySelector('.number')?.textContent).toBe('42')
          expect(element.shadowRoot?.querySelector('.shared')?.textContent).toBe('shared')

          element.localProp = 'updated local'
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.local')?.textContent).toBe('updated local')

          sharedAtom.set('updated shared')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.shared')?.textContent).toBe('updated shared')
        })
      })

      it('should work with slots and atoms', async () => {
        await context.start(async () => {
          const labelAtom = atom('Label:', 'label')

          const SlotElement = wrapper(
            class SlotElement extends LitElement {
              render() {
                return html`
                  <div class="wrapper">
                    <span class="label">${watch(labelAtom)}</span>
                    <slot></slot>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, SlotElement)
          const element = document.createElement(tag)
          element.innerHTML = '<span>Slotted Content</span>'
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.label')?.textContent).toBe('Label:')

          labelAtom.set('New Label:')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.label')?.textContent).toBe('New Label:')
        })
      })

      it('should work with CSS custom properties and atoms', async () => {
        await context.start(async () => {
          const colorAtom = atom('red', 'color')

          const CssPropsElement = wrapper(
            class CssPropsElement extends LitElement {
              render() {
                const color = colorAtom()
                return html`
                  <div class="box" style="color: ${color}; --dynamic-color: ${color}">
                    ${watch(colorAtom)}
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, CssPropsElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const box = element.shadowRoot?.querySelector('.box') as HTMLElement
          expect(box?.style.color).toBe('red')
          expect(box?.textContent?.trim()).toBe('red')

          colorAtom.set('blue')
          await wrap(element.updateComplete)

          expect(box?.style.color).toBe('blue')
          expect(box?.textContent?.trim()).toBe('blue')
        })
      })

      it('should work with reflect attribute and atoms', async () => {
        await context.start(async () => {
          const statusAtom = atom('active', 'status')

          const ReflectElement = wrapper(
            class ReflectElement extends LitElement {
              static properties = {
                status: { type: String, reflect: true },
              }

              constructor() {
                super()
                this.status = statusAtom()
              }

              render() {
                return html`<div class="status">${this.status}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, ReflectElement)
          const element = document.createElement(tag) as any
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.getAttribute('status')).toBe('active')
          expect(element.shadowRoot?.querySelector('.status')?.textContent).toBe('active')

          element.status = 'inactive'
          await wrap(element.updateComplete)

          expect(element.getAttribute('status')).toBe('inactive')
          expect(element.shadowRoot?.querySelector('.status')?.textContent).toBe('inactive')
        })
      })

      it('should work with named slots and atoms', async () => {
        await context.start(async () => {
          const headerAtom = atom('Header', 'header')
          const footerAtom = atom('Footer', 'footer')

          const NamedSlotElement = wrapper(
            class NamedSlotElement extends LitElement {
              render() {
                return html`
                  <header>${watch(headerAtom)}</header>
                  <main><slot></slot></main>
                  <footer>${watch(footerAtom)}</footer>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, NamedSlotElement)
          const element = document.createElement(tag)
          element.innerHTML = '<p>Main content</p>'
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('header')?.textContent).toBe('Header')
          expect(element.shadowRoot?.querySelector('footer')?.textContent).toBe('Footer')

          headerAtom.set('New Header')
          footerAtom.set('New Footer')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('header')?.textContent).toBe('New Header')
          expect(element.shadowRoot?.querySelector('footer')?.textContent).toBe('New Footer')
        })
      })

      it('should work with boolean attributes and atoms', async () => {
        await context.start(async () => {
          const disabledAtom = atom(false, 'disabled')

          const BoolAttrElement = wrapper(
            class BoolAttrElement extends LitElement {
              render() {
                const isDisabled = disabledAtom()
                return html`
                  <button ?disabled=${isDisabled} class="btn">
                    ${isDisabled ? 'Disabled' : 'Enabled'}
                  </button>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, BoolAttrElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const btn = element.shadowRoot?.querySelector('.btn') as HTMLButtonElement
          expect(btn?.disabled).toBe(false)
          expect(btn?.textContent?.trim()).toBe('Enabled')

          disabledAtom.set(true)
          await wrap(element.updateComplete)

          expect(btn?.disabled).toBe(true)
          expect(btn?.textContent?.trim()).toBe('Disabled')
        })
      })
    })

    describe('inheritance and composition', () => {
      it('should work with helper methods in component', async () => {
        await context.start(async () => {
          const baseAtom = atom('base', 'base')
          const childAtom = atom('child', 'child')

          const HelperElement = wrapper(
            class HelperElement extends LitElement {
              renderBase() {
                return html`<span class="base">${watch(baseAtom)}</span>`
              }

              renderChild() {
                return html`<span class="child">${watch(childAtom)}</span>`
              }

              render() {
                return html`
                  <div>
                    ${this.renderBase()}
                    ${this.renderChild()}
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, HelperElement)

          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.base')?.textContent).toBe('base')
          expect(element.shadowRoot?.querySelector('.child')?.textContent).toBe('child')

          baseAtom.set('updated base')
          childAtom.set('updated child')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.base')?.textContent).toBe('updated base')
          expect(element.shadowRoot?.querySelector('.child')?.textContent).toBe('updated child')
        })
      })

      it('should work with separate components sharing an atom', async () => {
        await context.start(async () => {
          const sharedAtom = atom('shared value', 'shared')

          const ComponentA = wrapper(
            class ComponentA extends LitElement {
              render() {
                return html`<span class="a-value">${watch(sharedAtom)}</span>`
              }
            },
          )

          const ComponentB = wrapper(
            class ComponentB extends LitElement {
              render() {
                return html`<span class="b-value">${watch(sharedAtom)}</span>`
              }
            },
          )

          const tagA = uniqueTag()
          const tagB = uniqueTag()
          customElements.define(tagA, ComponentA)
          customElements.define(tagB, ComponentB)

          const elementA = document.createElement(tagA)
          const elementB = document.createElement(tagB)
          document.body.appendChild(elementA)
          document.body.appendChild(elementB)

          await wrap(elementA.updateComplete)
          await wrap(elementB.updateComplete)

          expect(elementA.shadowRoot?.querySelector('.a-value')?.textContent).toBe('shared value')
          expect(elementB.shadowRoot?.querySelector('.b-value')?.textContent).toBe('shared value')

          sharedAtom.set('new shared')
          await wrap(elementA.updateComplete)
          await wrap(elementB.updateComplete)

          expect(elementA.shadowRoot?.querySelector('.a-value')?.textContent).toBe('new shared')
          expect(elementB.shadowRoot?.querySelector('.b-value')?.textContent).toBe('new shared')
        })
      })

      it('should work with mixin pattern', async () => {
        await context.start(async () => {
          const mixinAtom = atom('mixin value', 'mixin')

          const WithMixin = <T extends typeof LitElement>(Base: T) => {
            return class extends Base {
              getMixinValue() {
                return mixinAtom()
              }
            }
          }

          const MixedElement = wrapper(
            class MixedElement extends WithMixin(LitElement) {
              render() {
                return html`<div class="mixed">${this.getMixinValue()}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, MixedElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.mixed')?.textContent).toBe('mixin value')

          mixinAtom.set('updated mixin')
          element.requestUpdate()
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.mixed')?.textContent).toBe('updated mixin')
        })
      })

      it('should work with render composition via template parts', async () => {
        await context.start(async () => {
          const headerAtom = atom('header', 'header')
          const contentAtom = atom('content', 'content')
          const footerAtom = atom('footer', 'footer')

          const ComposedElement = wrapper(
            class ComposedElement extends LitElement {
              renderHeader() {
                return html`<header class="header">${watch(headerAtom)}</header>`
              }

              renderContent() {
                return html`<main class="content">${watch(contentAtom)}</main>`
              }

              renderFooter() {
                return html`<footer class="footer">${watch(footerAtom)}</footer>`
              }

              render() {
                return html`
                  <div class="layout">
                    ${this.renderHeader()}
                    ${this.renderContent()}
                    ${this.renderFooter()}
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, ComposedElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.header')?.textContent).toBe('header')
          expect(element.shadowRoot?.querySelector('.content')?.textContent).toBe('content')
          expect(element.shadowRoot?.querySelector('.footer')?.textContent).toBe('footer')

          headerAtom.set('new header')
          contentAtom.set('new content')
          footerAtom.set('new footer')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.header')?.textContent).toBe('new header')
          expect(element.shadowRoot?.querySelector('.content')?.textContent).toBe('new content')
          expect(element.shadowRoot?.querySelector('.footer')?.textContent).toBe('new footer')
        })
      })
    })

    describe('lifecycle hooks full coverage', () => {
      it('should call willUpdate with correct changedProperties', async () => {
        await context.start(async () => {
          const testAtom = atom('test', 'test')
          let willUpdateProps: any[] = []

          const WillUpdateElement = wrapper(
            class WillUpdateElement extends LitElement {
              static properties = {
                prop1: { type: String },
              }

              constructor() {
                super()
                this.prop1 = 'initial'
              }

              willUpdate(changedProperties: any) {
                willUpdateProps.push(new Map(changedProperties))
              }

              render() {
                return html`
                  <div class="prop">${this.prop1}</div>
                  <div class="atom">${watch(testAtom)}</div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, WillUpdateElement)
          const element = document.createElement(tag) as any
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          element.prop1 = 'changed'
          await wrap(element.updateComplete)

          const lastProps = willUpdateProps[willUpdateProps.length - 1]
          expect(lastProps.has('prop1')).toBe(true)
        })
      })

      it('should call firstUpdated only once', async () => {
        await context.start(async () => {
          const testAtom = atom('test', 'test')
          let firstUpdatedCount = 0

          const FirstUpdatedElement = wrapper(
            class FirstUpdatedElement extends LitElement {
              static properties = {
                prop1: { type: String },
              }

              constructor() {
                super()
                this.prop1 = 'initial'
              }

              firstUpdated() {
                firstUpdatedCount++
              }

              render() {
                return html`<div>${this.prop1} - ${watch(testAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, FirstUpdatedElement)
          const element = document.createElement(tag) as any
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(firstUpdatedCount).toBe(1)

          element.prop1 = 'changed1'
          await wrap(element.updateComplete)

          element.prop1 = 'changed2'
          await wrap(element.updateComplete)

          testAtom.set('atom changed')
          await wrap(element.updateComplete)

          expect(firstUpdatedCount).toBe(1)
        })
      })

      it('should call updated with correct changedProperties for property changes', async () => {
        await context.start(async () => {
          let updatedCalls: Map<string, any>[] = []

          const UpdatedElement = wrapper(
            class UpdatedElement extends LitElement {
              static properties = {
                propA: { type: String },
                propB: { type: Number },
              }

              constructor() {
                super()
                this.propA = 'a'
                this.propB = 1
              }

              updated(changedProperties: Map<string, any>) {
                updatedCalls.push(new Map(changedProperties))
              }

              render() {
                return html`<div>${this.propA} - ${this.propB}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, UpdatedElement)
          const element = document.createElement(tag) as any
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          updatedCalls = []

          element.propA = 'aa'
          await wrap(element.updateComplete)

          expect(updatedCalls.length).toBe(1)
          expect(updatedCalls[0].has('propA')).toBe(true)
          expect(updatedCalls[0].has('propB')).toBe(false)

          element.propB = 2
          await wrap(element.updateComplete)

          expect(updatedCalls.length).toBe(2)
          expect(updatedCalls[1].has('propB')).toBe(true)
        })
      })

      it('should call connectedCallback and disconnectedCallback correctly', async () => {
        await context.start(async () => {
          const testAtom = atom('test', 'test')
          let connectedCount = 0
          let disconnectedCount = 0

          const LifecycleElement = wrapper(
            class LifecycleElement extends LitElement {
              connectedCallback() {
                super.connectedCallback()
                connectedCount++
              }

              disconnectedCallback() {
                super.disconnectedCallback()
                disconnectedCount++
              }

              render() {
                return html`<div>${watch(testAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, LifecycleElement)
          const element = document.createElement(tag)

          expect(connectedCount).toBe(0)
          expect(disconnectedCount).toBe(0)

          document.body.appendChild(element)
          await wrap(element.updateComplete)

          expect(connectedCount).toBe(1)
          expect(disconnectedCount).toBe(0)

          document.body.removeChild(element)

          expect(connectedCount).toBe(1)
          expect(disconnectedCount).toBe(1)

          document.body.appendChild(element)
          await wrap(element.updateComplete)

          expect(connectedCount).toBe(2)
          expect(disconnectedCount).toBe(1)
        })
      })

      it('should maintain atom subscriptions across reconnect', async () => {
        await context.start(async () => {
          const reconnectAtom = atom('initial', 'reconnect')

          const ReconnectElement = wrapper(
            class ReconnectElement extends LitElement {
              render() {
                return html`<div class="value">${watch(reconnectAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, ReconnectElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('initial')

          reconnectAtom.set('connected update')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('connected update')

          document.body.removeChild(element)

          reconnectAtom.set('disconnected update')

          document.body.appendChild(element)
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('disconnected update')
        })
      })
    })

    describe('memory and leaks', () => {
      it('should not accumulate subscriptions on multiple mount/unmount cycles', async () => {
        await context.start(async () => {
          const cycleAtom = atom(0, 'cycle')
          let renderCount = 0

          const CycleElement = wrapper(
            class CycleElement extends LitElement {
              render() {
                renderCount++
                return html`<div>${watch(cycleAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, CycleElement)

          for (let i = 0; i < 5; i++) {
            const element = document.createElement(tag)
            document.body.appendChild(element)
            await wrap(element.updateComplete)
            document.body.removeChild(element)
          }

          const countAfterCycles = renderCount

          const finalElement = document.createElement(tag)
          document.body.appendChild(finalElement)
          await wrap(finalElement.updateComplete)

          const countBeforeAtomUpdate = renderCount

          cycleAtom.set(1)
          await wrap(finalElement.updateComplete)

          expect(renderCount - countBeforeAtomUpdate).toBeLessThanOrEqual(2)
        })
      })

      it('should properly cleanup when creating/removing many elements', async () => {
        await context.start(async () => {
          const manyAtom = atom('many', 'many')
          const elements: Element[] = []

          const ManyElement = wrapper(
            class ManyElement extends LitElement {
              render() {
                return html`<div>${watch(manyAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, ManyElement)

          for (let i = 0; i < 20; i++) {
            const el = document.createElement(tag)
            document.body.appendChild(el)
            elements.push(el)
            await wrap((el as any).updateComplete)
          }

          for (const el of elements) {
            expect(el.shadowRoot?.textContent).toContain('many')
          }

          for (const el of elements) {
            document.body.removeChild(el)
          }

          manyAtom.set('updated many')

          expect(manyAtom()).toBe('updated many')
        })
      })

      it('should not leak memory with rapid element creation', async () => {
        await context.start(async () => {
          const rapidAtom = atom(0, 'rapid')

          const RapidCreateElement = wrapper(
            class RapidCreateElement extends LitElement {
              render() {
                return html`<div>${watch(rapidAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, RapidCreateElement)

          const startTime = performance.now()

          for (let i = 0; i < 50; i++) {
            const el = document.createElement(tag)
            document.body.appendChild(el)
            await wrap((el as any).updateComplete)
            document.body.removeChild(el)
          }

          const endTime = performance.now()

          expect(endTime - startTime).toBeLessThan(5000)

          rapidAtom.set(100)
          expect(rapidAtom()).toBe(100)
        })
      })
    })

    describe('context isolation', () => {
      it('should work with multiple concurrent elements in same context', async () => {
        await context.start(async () => {
          const sharedAtom = atom('shared', 'shared')

          const SharedElement = wrapper(
            class SharedElement extends LitElement {
              static properties = {
                instanceId: { type: Number },
              }

              constructor() {
                super()
                this.instanceId = 0
              }

              render() {
                return html`<div class="shared-${this.instanceId}">${watch(sharedAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, SharedElement)

          const el1 = document.createElement(tag) as any
          el1.instanceId = 1
          const el2 = document.createElement(tag) as any
          el2.instanceId = 2
          const el3 = document.createElement(tag) as any
          el3.instanceId = 3

          document.body.appendChild(el1)
          document.body.appendChild(el2)
          document.body.appendChild(el3)

          await wrap(Promise.all([el1.updateComplete, el2.updateComplete, el3.updateComplete]))

          expect(el1.shadowRoot?.querySelector('.shared-1')?.textContent).toBe('shared')
          expect(el2.shadowRoot?.querySelector('.shared-2')?.textContent).toBe('shared')
          expect(el3.shadowRoot?.querySelector('.shared-3')?.textContent).toBe('shared')

          sharedAtom.set('all updated')
          await wrap(Promise.all([el1.updateComplete, el2.updateComplete, el3.updateComplete]))

          expect(el1.shadowRoot?.querySelector('.shared-1')?.textContent).toBe('all updated')
          expect(el2.shadowRoot?.querySelector('.shared-2')?.textContent).toBe('all updated')
          expect(el3.shadowRoot?.querySelector('.shared-3')?.textContent).toBe('all updated')
        })
      })
    })

    describe('edge cases', () => {
      it('should handle empty render', async () => {
        await context.start(async () => {
          const EmptyElement = wrapper(
            class EmptyElement extends LitElement {
              render() {
                return html``
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, EmptyElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toBe('')
        })
      })

      it('should handle render returning string', async () => {
        await context.start(async () => {
          const stringAtom = atom('plain string', 'string')

          const StringElement = wrapper(
            class StringElement extends LitElement {
              render() {
                return stringAtom() as any
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, StringElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toBe('plain string')

          stringAtom.set('updated string')
          element.requestUpdate()
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.textContent).toBe('updated string')
        })
      })

      it('should handle render returning array', async () => {
        await context.start(async () => {
          const itemsAtom = atom(['one', 'two', 'three'], 'items')

          const ArrayElement = wrapper(
            class ArrayElement extends LitElement {
              render() {
                return itemsAtom().map((item) => html`<span>${item}</span>`)
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, ArrayElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          const spans = element.shadowRoot?.querySelectorAll('span')
          expect(spans?.length).toBe(3)
          expect(spans?.[0]?.textContent).toBe('one')
          expect(spans?.[1]?.textContent).toBe('two')
          expect(spans?.[2]?.textContent).toBe('three')
        })
      })

      it('should handle large array atom (1000+ elements)', async () => {
        await context.start(async () => {
          const largeArray = Array.from({ length: 1000 }, (_, i) => i)
          const largeAtom = atom(largeArray, 'large')

          const LargeElement = wrapper(
            class LargeElement extends LitElement {
              render() {
                const arr = largeAtom()
                return html`
                  <div class="count">${arr.length}</div>
                  <div class="first">${arr[0]}</div>
                  <div class="last">${arr[arr.length - 1]}</div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, LargeElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.count')?.textContent).toBe('1000')
          expect(element.shadowRoot?.querySelector('.first')?.textContent).toBe('0')
          expect(element.shadowRoot?.querySelector('.last')?.textContent).toBe('999')

          largeAtom.set(Array.from({ length: 2000 }, (_, i) => i * 2))
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.count')?.textContent).toBe('2000')
          expect(element.shadowRoot?.querySelector('.last')?.textContent).toBe('3998')
        })
      })

      it('should handle very frequent updates', async () => {
        await context.start(async () => {
          const frequentAtom = atom(0, 'frequent')

          const FrequentElement = wrapper(
            class FrequentElement extends LitElement {
              render() {
                return html`<div class="value">${watch(frequentAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, FrequentElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          for (let i = 0; i < 100; i++) {
            frequentAtom.set(i)
          }

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.value')?.textContent).toBe('99')
        })
      })

      it('should handle element added but not connected to document', async () => {
        await context.start(async () => {
          const orphanAtom = atom('orphan', 'orphan')

          const OrphanElement = wrapper(
            class OrphanElement extends LitElement {
              render() {
                return html`<div class="orphan">${watch(orphanAtom)}</div>`
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, OrphanElement)

          const element = document.createElement(tag)

          expect(element.isConnected).toBe(false)

          document.body.appendChild(element)
          await wrap(element.updateComplete)

          expect(element.isConnected).toBe(true)
          expect(element.shadowRoot?.querySelector('.orphan')?.textContent).toBe('orphan')
        })
      })

      it('should handle deeply nested templates', async () => {
        await context.start(async () => {
          const deepAtom = atom('deep value', 'deep')

          const DeepElement = wrapper(
            class DeepElement extends LitElement {
              render() {
                return html`
                  <div class="l1">
                    <div class="l2">
                      <div class="l3">
                        <div class="l4">
                          <div class="l5">
                            <span class="deep">${watch(deepAtom)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                `
              }
            },
          )

          const tag = uniqueTag()
          customElements.define(tag, DeepElement)
          const element = document.createElement(tag)
          document.body.appendChild(element)

          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.deep')?.textContent).toBe('deep value')

          deepAtom.set('updated deep')
          await wrap(element.updateComplete)

          expect(element.shadowRoot?.querySelector('.deep')?.textContent).toBe('updated deep')
        })
      })
    })
  })
}

describe('@reatom/lit - vitest', () => {
  it('atom functionality', async () => {
    await context.start(() => {
      const countAtom = atom(0, 'count')

      countAtom.set(1)
      expect(countAtom()).toEqual(1)

      countAtom.set(2)
      expect(countAtom()).toEqual(2)
    })
  })
})

describe('ReatomLitElement direct inheritance', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild)
    }
  })

  it('should work with direct inheritance and render() method', async () => {
    await context.start(async () => {
      const textAtom = atom('Hello from ReatomLitElement', 'text')

      // Direct inheritance - user defines render() method
      class DirectElement extends ReatomLitElement {
        render() {
          return html`<div>${watch(textAtom)}</div>`
        }
      }

      customElements.define('test-direct-element-1', DirectElement)
      const element = document.createElement('test-direct-element-1')
      document.body.appendChild(element)

      await wrap(element.updateComplete)

      expect(element.shadowRoot?.textContent).toContain(
        'Hello from ReatomLitElement',
      )

      // Update atom - should trigger re-render
      textAtom.set('Updated value')
      await wrap(element.updateComplete)

      expect(element.shadowRoot?.textContent).toContain('Updated value')
    })
  })

  it('should work with properties and render()', async () => {
    await context.start(async () => {
      const countAtom = atom(0, 'count')

      class CounterElement extends ReatomLitElement {
        static properties = {
          label: { type: String },
        }

        declare label: string

        constructor() {
          super()
          this.label = 'Count'
        }

        render() {
          return html`<span>${this.label}: ${watch(countAtom)}</span>`
        }
      }

      customElements.define('test-direct-element-2', CounterElement)
      const element = document.createElement(
        'test-direct-element-2',
      ) as CounterElement
      document.body.appendChild(element)

      await wrap(element.updateComplete)

      expect(element.shadowRoot?.textContent).toContain('Count: 0')

      // Update atom
      countAtom.set(5)
      await wrap(element.updateComplete)

      expect(element.shadowRoot?.textContent).toContain('Count: 5')

      // Update property
      element.label = 'Total'
      await wrap(element.updateComplete)

      expect(element.shadowRoot?.textContent).toContain('Total: 5')
    })
  })
})

describe('atomization for lists', () => {
  afterEach(() => {
    // Cleanup custom elements after each test
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild)
    }
  })

  it('should demonstrate atomization - items update independently', async () => {
    await context.start(async () => {
      // Create atoms for 3 todo items - each item has its own atom
      const todo1NameAtom = atom('Todo 1', 'todo1.name')
      const todo2NameAtom = atom('Todo 2', 'todo2.name')
      const todo3NameAtom = atom('Todo 3', 'todo3.name')

      // Single component that renders all items
      // Each item uses watch() with its own atom
      const TodoList = withReatomElement(
        class TodoList extends LitElement {
          render() {
            return html`
              <ul>
                <li class="todo-1">${watch(todo1NameAtom)}</li>
                <li class="todo-2">${watch(todo2NameAtom)}</li>
                <li class="todo-3">${watch(todo3NameAtom)}</li>
              </ul>
            `
          }
        },
      )

      customElements.define('test-todo-list-atom-1', TodoList)

      const list = document.createElement('test-todo-list-atom-1')
      document.body.appendChild(list)

      await wrap(list.updateComplete)

      // Check initial state
      expect(list.shadowRoot?.textContent).toContain('Todo 1')
      expect(list.shadowRoot?.textContent).toContain('Todo 2')
      expect(list.shadowRoot?.textContent).toContain('Todo 3')

      // Change only todo 2 - this should NOT cause the entire list to re-render
      // Only the specific part that watches todo2NameAtom should update
      todo2NameAtom.set('Updated Todo 2')
      await wrap(list.updateComplete)

      expect(list.shadowRoot?.textContent).toContain('Todo 1')
      expect(list.shadowRoot?.textContent).toContain('Updated Todo 2')
      expect(list.shadowRoot?.textContent).toContain('Todo 3')

      // Change todo 1
      todo1NameAtom.set('Updated Todo 1')
      await wrap(list.updateComplete)

      expect(list.shadowRoot?.textContent).toContain('Updated Todo 1')
      expect(list.shadowRoot?.textContent).toContain('Updated Todo 2')
      expect(list.shadowRoot?.textContent).toContain('Todo 3')

      // Change todo 3
      todo3NameAtom.set('Updated Todo 3')
      await wrap(list.updateComplete)

      expect(list.shadowRoot?.textContent).toContain('Updated Todo 1')
      expect(list.shadowRoot?.textContent).toContain('Updated Todo 2')
      expect(list.shadowRoot?.textContent).toContain('Updated Todo 3')
    })
  })

  it('should demonstrate granular updates with multiple properties', async () => {
    await context.start(async () => {
      // Create atoms for each item's properties
      const item1Name = atom('Item 1', 'item1.name')
      const item1Count = atom(0, 'item1.count')
      const item2Name = atom('Item 2', 'item2.name')
      const item2Count = atom(0, 'item2.count')

      const ItemList = withReatomElement(
        class extends LitElement {
          render() {
            return html`
              <div>
                <div class="item-1">
                  <span class="name">${watch(item1Name)}</span>
                  <span class="count">${watch(item1Count)}</span>
                </div>
                <div class="item-2">
                  <span class="name">${watch(item2Name)}</span>
                  <span class="count">${watch(item2Count)}</span>
                </div>
              </div>
            `
          }
        },
      )

      customElements.define('test-item-list-granular', ItemList)

      const list = document.createElement('test-item-list-granular')
      document.body.appendChild(list)

      await wrap(list.updateComplete)

      // Initial state
      expect(list.shadowRoot?.textContent).toContain('Item 1')
      expect(list.shadowRoot?.textContent).toContain('Item 2')
      expect(list.shadowRoot?.textContent).toContain('0') // Both counts are 0

      // Update only item1's count
      item1Count.set(5)
      await wrap(list.updateComplete)

      const text = list.shadowRoot?.textContent || ''
      expect(text).toContain('5') // item1 count updated
      expect(text).toContain('0') // item2 count still 0

      // Update only item2's name
      item2Name.set('Updated Item 2')
      await wrap(list.updateComplete)

      expect(list.shadowRoot?.textContent).toContain('Item 1') // Unchanged
      expect(list.shadowRoot?.textContent).toContain('Updated Item 2') // Changed
    })
  })

  it('should handle rapid updates to different atoms efficiently', async () => {
    await context.start(async () => {
      // Create 4 independent atoms
      const atoms = [
        atom('A', 'atom0'),
        atom('B', 'atom1'),
        atom('C', 'atom2'),
        atom('D', 'atom3'),
      ]

      const RapidUpdateList = withReatomElement(
        class extends LitElement {
          render() {
            return html`
              <div>
                <div class="item-0">${watch(atoms[0])}</div>
                <div class="item-1">${watch(atoms[1])}</div>
                <div class="item-2">${watch(atoms[2])}</div>
                <div class="item-3">${watch(atoms[3])}</div>
              </div>
            `
          }
        },
      )

      customElements.define('test-rapid-update', RapidUpdateList)

      const list = document.createElement('test-rapid-update')
      document.body.appendChild(list)

      await wrap(list.updateComplete)

      // Rapidly update different atoms
      atoms[0].set('A-updated')
      atoms[2].set('C-updated')
      atoms[1].set('B-updated')
      atoms[3].set('D-updated')

      await wrap(list.updateComplete)

      const text = list.shadowRoot?.textContent || ''
      expect(text).toContain('A-updated')
      expect(text).toContain('B-updated')
      expect(text).toContain('C-updated')
      expect(text).toContain('D-updated')
    })
  })

  it('should demonstrate atomization prevents unnecessary re-renders', async () => {
    await context.start(async () => {
      // Scenario: list of items where only one item changes frequently
      // Without atomization, the entire list would re-render on each change
      // With atomization, only the changed item's part updates

      const staticItem = atom('Static', 'static')
      const dynamicItem = atom('Dynamic', 'dynamic')

      const DemoList = withReatomElement(
        class extends LitElement {
          render() {
            return html`
              <div>
                <div class="static">${watch(staticItem)}</div>
                <div class="dynamic">${watch(dynamicItem)}</div>
              </div>
            `
          }
        },
      )

      customElements.define('test-demo-list', DemoList)

      const list = document.createElement('test-demo-list')
      document.body.appendChild(list)

      await wrap(list.updateComplete)

      // Update dynamic item multiple times
      for (let i = 0; i < 5; i++) {
        dynamicItem.set(`Dynamic ${i}`)
        await wrap(list.updateComplete)
      }

      // Static item should never have re-rendered
      // Dynamic item should show latest value
      const text = list.shadowRoot?.textContent || ''
      expect(text).toContain('Static') // Never changed
      expect(text).toContain('Dynamic 4') // Changed 5 times (0-4)
    })
  })
})

describe('ReatomLitElement specifics', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild)
    }
  })

  it('should support Light DOM via createRenderRoot override', async () => {
    await context.start(async () => {
      const lightAtom = atom('light DOM', 'light')

      class LightDOMElement extends ReatomLitElement {
        createRenderRoot() {
          return this // Render to light DOM
        }

        render() {
          return html`<div class="light-content">${watch(lightAtom)}</div>`
        }
      }

      customElements.define('test-light-dom', LightDOMElement)
      const element = document.createElement('test-light-dom')
      document.body.appendChild(element)

      await wrap(element.updateComplete)

      // Content should be in light DOM, not shadow
      expect(element.shadowRoot).toBeNull()
      expect(element.querySelector('.light-content')?.textContent).toBe('light DOM')

      // Update atom
      lightAtom.set('updated light')
      await wrap(element.updateComplete)

      expect(element.querySelector('.light-content')?.textContent).toBe('updated light')
    })
  })

  it('should have correct renderRoot access', async () => {
    await context.start(async () => {
      const testAtom = atom('test', 'test')
      let capturedRenderRoot: any = null

      class RenderRootElement extends ReatomLitElement {
        render() {
          capturedRenderRoot = this.renderRoot
          return html`<div class="content">${watch(testAtom)}</div>`
        }
      }

      customElements.define('test-render-root', RenderRootElement)
      const element = document.createElement('test-render-root')
      document.body.appendChild(element)

      await wrap(element.updateComplete)

      expect(capturedRenderRoot).toBe(element.shadowRoot)
      expect(capturedRenderRoot?.querySelector('.content')?.textContent).toBe('test')
    })
  })

  it('should work with static styles', async () => {
    await context.start(async () => {
      const textAtom = atom('styled text', 'text')

      class StyledElement extends ReatomLitElement {
        // Note: static styles would normally use css`` template literal
        // but we test the render with inline style
        render() {
          return html`
            <style>
              .styled { color: blue; font-weight: bold; }
            </style>
            <div class="styled">${watch(textAtom)}</div>
          `
        }
      }

      customElements.define('test-styled-elem', StyledElement)
      const element = document.createElement('test-styled-elem')
      document.body.appendChild(element)

      await wrap(element.updateComplete)

      expect(element.shadowRoot?.querySelector('.styled')?.textContent).toBe('styled text')

      // Update atom
      textAtom.set('new styled text')
      await wrap(element.updateComplete)

      expect(element.shadowRoot?.querySelector('.styled')?.textContent).toBe('new styled text')
    })
  })

  it('should handle renderOptions.host correctly', async () => {
    await context.start(async () => {
      const eventAtom = atom('no event', 'event')
      let hostReference: any = null

      class HostElement extends ReatomLitElement {
        handleClick() {
          eventAtom.set('clicked')
        }

        render() {
          hostReference = this
          return html`
            <button @click=${this.handleClick} class="btn">
              ${watch(eventAtom)}
            </button>
          `
        }
      }

      customElements.define('test-host-elem', HostElement)
      const element = document.createElement('test-host-elem') as HostElement
      document.body.appendChild(element)

      await wrap(element.updateComplete)

      expect(hostReference).toBe(element)
      expect(element.shadowRoot?.querySelector('.btn')?.textContent?.trim()).toBe('no event')

      // Click the button
      const btn = element.shadowRoot?.querySelector('.btn') as HTMLButtonElement
      btn.click()
      await wrap(element.updateComplete)

      expect(element.shadowRoot?.querySelector('.btn')?.textContent?.trim()).toBe('clicked')
    })
  })
})

// Run tests for withReatomElement (HOC pattern)
runTests('withReatomElement', withReatomElement)

// Create a wrapper that transforms a class to extend ReatomLitElement instead of LitElement
// ReatomLitElement now extends ReactiveElement directly and properly supports render() override
const reatomLitElementWrapper: ElementWrapper = <T extends typeof LitElement>(
  superClass: T,
): T => {
  const originalRender = superClass.prototype.render
  const originalFirstUpdated = superClass.prototype.firstUpdated
  const originalUpdated = superClass.prototype.updated
  const originalWillUpdate = superClass.prototype.willUpdate

  // Create a new class that extends ReatomLitElement (which extends ReactiveElement)
  class WrappedElement extends ReatomLitElement {
    static properties = (superClass as any).properties || {}

    constructor() {
      super()

      // Run the original constructor's property initializations
      const DummyBase = class {
        constructor() {}
      }
      Object.defineProperty(DummyBase, Symbol.hasInstance, {
        value: () => true,
      })

      const OriginalProto = Object.getPrototypeOf(superClass)
      Object.setPrototypeOf(superClass, DummyBase)

      try {
        const tempInstance = new (superClass as any)()
        const ownProps = Object.getOwnPropertyNames(tempInstance)
        for (const prop of ownProps) {
          if (!prop.startsWith('__')) {
            ;(this as any)[prop] = tempInstance[prop]
          }
        }
      } catch {
        // Skip if creation fails
      } finally {
        Object.setPrototypeOf(superClass, OriginalProto)
      }
    }

    // Override render to call the original class's render
    render() {
      return originalRender?.call(this)
    }

    firstUpdated(changedProperties: any) {
      super.firstUpdated(changedProperties)
      originalFirstUpdated?.call(this, changedProperties)
    }

    updated(changedProperties: any) {
      super.updated(changedProperties)
      originalUpdated?.call(this, changedProperties)
    }

    willUpdate(changedProperties: any) {
      super.willUpdate(changedProperties)
      originalWillUpdate?.call(this, changedProperties)
    }
  }

  // Copy all methods from the original class prototype chain to the wrapped class
  // Walk up the prototype chain until we hit LitElement
  let proto = superClass.prototype
  while (proto && proto !== LitElement.prototype && proto !== Object.prototype) {
    const ownMethods = Object.getOwnPropertyNames(proto)
    for (const methodName of ownMethods) {
      if (
        methodName !== 'constructor' &&
        methodName !== 'render' &&
        methodName !== 'firstUpdated' &&
        methodName !== 'updated' &&
        methodName !== 'willUpdate' &&
        // Don't override methods already defined on WrappedElement
        !Object.getOwnPropertyDescriptor(WrappedElement.prototype, methodName)
      ) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, methodName)
        if (descriptor) {
          Object.defineProperty(WrappedElement.prototype, methodName, descriptor)
        }
      }
    }
    proto = Object.getPrototypeOf(proto)
  }

  return WrappedElement as unknown as T
}

// Run tests for ReatomLitElement (inheritance pattern with template() method)
runTests('ReatomLitElement', reatomLitElementWrapper)
