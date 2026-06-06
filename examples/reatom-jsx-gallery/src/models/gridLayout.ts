import { atom, computed, context, reatomObservable } from '@reatom/core'

import { GRID_GAP_VALUES } from '../types'
import { gridColumns, gridGap } from './view'

const AUTO_COLUMN_MIN_SIZE = 200

export const imageGrid = atom<HTMLElement | null>(null, 'imageGrid').extend(
  (target) => {
    const width = reatomObservable(
      () => ({
        initState: 0,
        getState: () => {
          const element = target()
          return element ? Math.ceil(element.getBoundingClientRect().width) : 0
        },
        subscribe: (notify) => {
          let observer: ResizeObserver | undefined

          const readWidth = () => {
            const element = target()
            return element
              ? Math.ceil(element.getBoundingClientRect().width)
              : 0
          }

          const observeElement = () => {
            observer?.disconnect()
            observer = undefined

            const element = target()
            if (!element) return

            notify(readWidth())
            observer = new ResizeObserver(() => notify(readWidth()))
            observer.observe(element)
          }

          observeElement()
          const stopElementSubscription = target.subscribe(observeElement)

          return () => {
            stopElementSubscription()
            observer?.disconnect()
          }
        },
      }),
      `${target.name}._width`,
    )

    const itemSize = computed(() => {
      const gridWidth = width()
      const gap = GRID_GAP_VALUES[gridGap()]
      const configuredColumns = gridColumns()
      const columns =
        configuredColumns === 0
          ? Math.max(
              1,
              Math.floor((gridWidth + gap) / (AUTO_COLUMN_MIN_SIZE + gap)),
            )
          : configuredColumns

      return Math.max(0, Math.ceil((gridWidth - gap * (columns - 1)) / columns))
    }, `${target.name}._itemSize`)

    return {
      width,
      itemSize,
      ref: (element: HTMLElement) => {
        context.start(() => target.set(element))
        return () => context.start(() => target.set(null))
      },
    }
  },
)
