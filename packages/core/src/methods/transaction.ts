import {
  Action,
  action,
  ActionState,
  AtomLike,
  bind,
  GenericExt,
  isAction,
  top,
} from '../core'
import { Variable, variable } from './variable'
import { Fn, isAbort } from '../utils'
import { AsyncExt } from '../async'
import { withCallHook } from '../mixins'
import { isCausedBy } from './isCausedBy'

type Rollbacks = Array<Fn>

interface TransactionVariable extends Variable<[Rollbacks?], Rollbacks> {
  /**
   * Extension to follow rollback context.
   * For atoms it adds prev state restoration when relative `rollback()` appears.
   * For actions it adds error handling and call `rollback()` automatically.
   */
  // TODO `onRollback` callback for state transformation mapping. Especially needed for cases when the current state is ahead of used state during rollback schedule.
  withRollback(): GenericExt

  /**
   * Executes all collected rollback functions in the current transaction (if exists).
   */
  rollback: Action<[error?: any], void>
}

/**
 * Creates a transaction variable with rollback capabilities.
 * This variable stores a list of rollback functions that can be executed
 * to revert state changes made within a transaction.
 *
 * @returns A transaction variable with `withRollback` middleware and a `rollback` action.
 */
export let reatomTransaction = (): TransactionVariable => {
  let transactionVar = Object.assign(
    variable((rollbacks: Array<Fn> = []) => rollbacks),
    {
      withRollback:
        (): GenericExt =>
        <T extends AtomLike>(target: T): T => {
          if (isAction(target)) {
            if ('onReject' in target) {
              ;(target.onReject as AsyncExt['onReject']).extend(
                withCallHook(({ error }) => transactionVar.rollback(error)),
              )
            } else {
              target.__reatom.middlewares.push(function withRollback(
                next,
                ...params
              ) {
                try {
                  let result = next(...params) as ActionState
                  let call = result[result.length - 1]
                  if (call?.payload instanceof Promise) {
                    call.payload.catch(
                      bind((error) => {
                        if (!isAbort(error)) transactionVar.rollback(error)
                      }),
                    )
                  }
                  return result
                } catch (error) {
                  if (!isAbort(error)) transactionVar.rollback(error)
                  throw error
                }
              })
            }
          } else {
            target.__reatom.middlewares.push(function withRollback(
              next,
              ...params
            ) {
              let prevState = top().state
              let nextState = next(...params)
              if (
                !Object.is(prevState, nextState) &&
                !isCausedBy(transactionVar.rollback)
              ) {
                let rollbacks = transactionVar.set(transactionVar.find())
                rollbacks.push(() => target(prevState))
              }
              return nextState
            })
          }

          return target
        },

      rollback: action<[error?: any], void>(() => {
        transactionVar
          .find()
          ?.splice(0)
          .reverse()
          .forEach((rollback) => rollback())
      }, 'transactionVar.rollback'),
    },
  )

  return transactionVar
}

export let transactionVar = reatomTransaction()
export let { withRollback, rollback } = transactionVar
