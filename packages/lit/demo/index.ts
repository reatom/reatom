import { atom, computed } from '@reatom/core'
import { ReatomLitElement, html } from '@reatom/lit'
import { css } from 'lit'
import { repeat } from 'lit/directives/repeat.js'

const textAtom = atom(0, 'performance.text')
const rAFTimestampAtom = atom(0, 'performance.rAFTimestamp')

const transformAtom = computed(() => {
  const t = rAFTimestampAtom() / 1000
  const cycle = t % 10
  const scale = 1 + (cycle > 5 ? 10 - cycle : cycle) / 10
  return `transform: scale(${scale / 2.1}, 0.7) translateZ(0.1px)`
}, 'performance.transform')

interface CircleItem {
  top: number
  left: number
}

function generateSierpinskiTriangle(size: number): CircleItem[] {
  const target = 25

  function SierpinskiTriangle(
    item: { left: number; top: number; size: number },
  ): CircleItem[] {
    if (item.size < target) {
      return [
        { left: item.left - target / 2, top: item.top - target / 2 },
      ]
    }
    const newSize = item.size / 2
    return [
      ...SierpinskiTriangle({
        left: item.left,
        top: item.top - newSize / 2,
        size: newSize,
      }),
      ...SierpinskiTriangle({
        left: item.left - newSize,
        top: item.top + newSize / 2,
        size: newSize,
      }),
      ...SierpinskiTriangle({
        left: item.left + newSize,
        top: item.top + newSize / 2,
        size: newSize,
      }),
    ]
  }

  return SierpinskiTriangle({ left: 0, top: 0, size })
}

const TRIANGLE_SIZE = 1000
const circleItems = generateSierpinskiTriangle(TRIANGLE_SIZE)

const circlePositions = circleItems.map((item) => {
  return `top:${item.top}px;left:${item.left}px;`
})

export class PerformanceDemoElement extends ReatomLitElement {
  static override styles = css`
    .test-block {
      position: relative;
      display: block;
      transform-origin: 0 0;
      left: 50%;
      margin-top: 400px;
      width: 600px;
      height: 600px;
      transition: none;
    }

    .circle {
      position: absolute;
      background: #61dafb;
      font: normal 15px sans-serif;
      text-align: center;
      cursor: pointer;
      width: 32.5px;
      height: 32.5px;
      border-radius: 16.25px;
      line-height: 32.5px;
      transition: background-color 0.1s;
    }

    .circle::before,
    .circle::after {
      content: '';
    }

    .circle:hover {
      background-color: #faaf0f;
    }

    .circle:hover::before,
    .circle:hover::after {
      content: '*';
    }
  `

  private rAFId: number | null = null

  override connectedCallback() {
    super.connectedCallback()

    const animate = () => {
      textAtom.set((v) => (v >= 9 ? 0 : v + 1))
      rAFTimestampAtom.set(performance.now())
      this.rAFId = requestAnimationFrame(animate)
    }
    animate()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    if (this.rAFId) {
      cancelAnimationFrame(this.rAFId)
      this.rAFId = null
    }
  }

  override render() {
    return html`
      <div class="test-block" style="${transformAtom}">
        ${repeat(
          circleItems,
          (_, index) => index,
          (_, index) => html`
            <div class="circle" style="${circlePositions[index]}">
              ${textAtom}
            </div>
          `,
        )}
      </div>
    `
  }
}

customElements.define('demo-element', PerformanceDemoElement)
