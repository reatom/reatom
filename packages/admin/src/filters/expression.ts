import { atom, withLocalStorage } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type { AdminFrame, FilterGroup, FilterTag, FilterTagRef } from '../types'
import { canPersistToLocalStorage } from './persistence'
import {
  type AtomRegistry,
  evaluatePredicate,
  type FrameIndex,
} from './predicates'

const EXPRESSION_STORAGE_KEY = '_Admin.filters.expression.v1'

function isTagRef(child: FilterTagRef | FilterGroup): child is FilterTagRef {
  return 'tagId' in child
}

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
    if (isTagRef(child)) {
      const tagRef = child
      const tag = tagById.get(tagRef.tagId)
      if (!tag) return false
      const match = tag.predicates.every((p) =>
        evaluatePredicate(frame, p, atomRegistry, frameIndex, allFrames),
      )
      return tagRef.negated ? !match : match
    }
    return evaluateExpression(
      frame,
      child,
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
  const expressionBase = atom<FilterGroup>(
    EMPTY_GROUP,
    '_Admin.filters.expression',
  )
  const expression = canPersistToLocalStorage()
    ? expressionBase.extend(withLocalStorage(EXPRESSION_STORAGE_KEY))
    : expressionBase

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
