import { top, type AtomLike } from '@reatom/core'

import { OTEL } from './diag.ts'

const readNodeEnv = (): string | undefined =>
  (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV

const readBundlerDev = (): boolean | undefined => {
  try {
    const dev = (import.meta as { env?: { DEV?: unknown } }).env?.DEV
    return typeof dev === 'boolean' ? dev : undefined
  } catch {
    return undefined
  }
}

/**
 * Development when `NODE_ENV` is `development` or `test`. When `NODE_ENV` is
 * unset, follow the bundler's `import.meta.env.DEV`. `production`, and a bundle
 * where both signals are missing, stay quiet.
 */
export const developmentFromSignals = (
  nodeEnv: string | undefined,
  bundlerDev: boolean | undefined,
): boolean => {
  if (nodeEnv === 'production') return false
  if (nodeEnv === 'development' || nodeEnv === 'test') return true
  return bundlerDev === true
}

export const isDevelopment = (): boolean =>
  developmentFromSignals(readNodeEnv(), readBundlerDev())

export const defaultWarnContextLoss = isDevelopment

const isOutsideReatomFrame = (): boolean => {
  try {
    const frame = top()
    const cause = frame.pubs[0]
    return !cause || cause === frame.root.frame
  } catch {
    return true
  }
}

export const createContextLossWarner = (enabled: () => boolean) => {
  const warnedTargets = new WeakSet<object>()
  let hadFallbackThisTask = false
  let lastFallbackTarget: AtomLike | undefined
  let clearScheduled = false

  return (target: AtomLike, name: string) => {
    if (!enabled()) return
    if (!isOutsideReatomFrame()) return
    if (
      hadFallbackThisTask &&
      lastFallbackTarget !== undefined &&
      lastFallbackTarget !== target &&
      !warnedTargets.has(target)
    ) {
      warnedTargets.add(target)
      console.warn(`${OTEL}"${name}" missing wrap`)
    }
    hadFallbackThisTask = true
    lastFallbackTarget = target
    if (!clearScheduled) {
      clearScheduled = true
      setTimeout(() => {
        hadFallbackThisTask = false
        lastFallbackTarget = undefined
        clearScheduled = false
      }, 0)
    }
  }
}
