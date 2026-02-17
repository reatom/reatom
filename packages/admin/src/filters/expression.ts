import { atom } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type { AdminFrame, FilterGroup, FilterTag, FilterTagRef } from '../types'
import {
  type AtomRegistry,
  evaluatePredicate,
  type FrameIndex,
} from './predicates'

export function evaluateExpression(
  frame: AdminFrame,
  expression: FilterGroup,
  tags: FilterTag[],
  atomRegistry: AtomRegistry,
  frameIndex: FrameIndex,
  allFrames?: AdminFrame[],
): boolean {
  const tagById = new Map(tags.map((t) => [t.id, t]))

  function evalChild(child: FilterTagRef | FilterGroup): boolean {
    if ('tagId' in child) {
      const tagRef = child as FilterTagRef
      const tag = tagById.get(tagRef.tagId)
      if (!tag) return false
      const match = tag.predicates.every((p) =>
        evaluatePredicate(frame, p, atomRegistry, frameIndex, allFrames),
      )
      return tagRef.negated ? !match : match
    }
    const group = child as FilterGroup
    return evaluateExpression(
      frame,
      group,
      tags,
      atomRegistry,
      frameIndex,
      allFrames,
    )
  }

  if (expression.operator === 'AND') {
    return expression.children.every(evalChild)
  }
  return expression.children.some(evalChild)
}

const EMPTY_GROUP: FilterGroup = {
  operator: 'AND',
  children: [],
}

export function createExpression() {
  const expression = atom<FilterGroup>(EMPTY_GROUP, '_Admin.filters.expression')

  const setExpression = (value: FilterGroup) => {
    expression.set(value)
  }

  return {
    expression,
    setExpression,
  }
}

export function createExpressionManager() {
  return ADMIN_FRAME.run(() => createExpression())
}
