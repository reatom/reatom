import type { LinkedListAtom, LLNode, Rec } from '@reatom/core'
import { abortVar, action, atom, named, onEvent } from '@reatom/core'
import type { JSX } from '@reatom/jsx'

const elementsItemsMap = new Map<Element, LLNode>()

export function Draggable<
  Tag extends keyof JSX.HTMLElementTags,
  T extends Rec,
>({
  as,
  list,
  item,
  followX = true,
  followY = true,
  children,
  css,
}: {
  as: Tag
  list: LinkedListAtom<any, T>
  item: LLNode<T>
  followX?: boolean
  followY?: boolean
  children?: JSX.ElementChildren
  css?: string
} & JSX.HTMLElementTags[Tag]) {
  const Tag = as as 'div'
  const xStart = atom(0, '_xStart')
  const yStart = atom(0, '_yStart')
  const isDragging = atom(false, '_isDragging')
  const x = atom(0, '_x')
  const y = atom(0, '_y')

  const handleDragStart = action(
    (e: PointerEvent) => {
      if (followX) xStart.set(e.clientX)
      if (followY) yStart.set(e.clientY)
      x.set(0)
      y.set(0)
      isDragging.set(true)

      const target = e.currentTarget as HTMLElement

      const targetRect = target.getBoundingClientRect()
      const pointerX = e.clientX - targetRect.left
      const pointerY = e.clientY - targetRect.top

      const controller = abortVar.set()

      const handleStop = () => {
        target.releasePointerCapture(e.pointerId)

        xStart.set(0)
        yStart.set(0)
        x.set(0)
        y.set(0)
        isDragging.set(false)

        controller.abort()
      }

      onEvent(document, 'pointerup', handleStop)
      onEvent(document, 'pointercancel', handleStop)
      onEvent(document, 'pointermove', (e) => {
        // prevent selection
        e.preventDefault()

        if (followX) x.set(e.clientX - xStart())
        if (followY) y.set(e.clientY - yStart())

        if (!target.hasPointerCapture(e.pointerId)) {
          target.setPointerCapture(e.pointerId)
          // drop focus for interactive element if the drag was start by click on it
          target.querySelector('input')?.blur()
        } else {
          const dropElement = document
            .elementsFromPoint(e.clientX, e.clientY)
            .find((el) => el !== target && elementsItemsMap.has(el))

          const dropItem = dropElement && elementsItemsMap.get(dropElement)

          if (dropItem) {
            list.move(item, dropItem as LLNode<T>)

            if (followX) xStart.set(e.clientX + pointerX)
            if (followY) yStart.set(e.clientY + pointerY)
            if (followX) x.set(0)
            if (followY) y.set(0)
          }
        }
      })
    },
    named(`${list.name}.handleDragStart`),
  )

  return (
    <Tag
      ref={(el) => {
        elementsItemsMap.set(el, item)
      }}
      on:pointerdown={handleDragStart}
      data-dragging={isDragging}
      css:x={x}
      css:y={y}
      css={`
        translate: calc(var(--x) * 1px) calc(var(--y) * 1px);
        position: relative;

        &[data-dragging='true'] {
          z-index: 10000000000;
          box-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.5);
        }
        transition: box-shadow 0.2s ease-in-out;

        ${css}
      `}
    >
      {children}
    </Tag>
  )
}

