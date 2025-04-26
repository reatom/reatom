import {
  AtomLike,
  createAtom,
  top,
  withParams,
  computed,
  isAtom,
  bind,
  named,
} from '../core'
import { AbortError, noop, toAbortError, Unsubscribe } from '../utils'
import { Variable, variable } from './variable'

export interface AbortMethods {
  throwIfAborted(this: AbortAtom): void
  subscribeAbort(this: AbortAtom, cb: (error: AbortError) => void): Unsubscribe
  getController(this: AbortAtom): LazyAbortController
}

export interface LazyAbortController extends AbortController {
  unsubscribe: Unsubscribe
}

export interface AbortAtom
  extends AtomLike<null | AbortError, [] | [reason: any]>,
    AbortMethods {}

let abortMethods: AbortMethods = {
  throwIfAborted() {
    let error = this()
    if (error != null) throw error
  },
  subscribeAbort(cb) {
    return computed(() => {
      let state = this()
      if (state !== null) cb(state)
    }, `${this.name}._subscribeAbort`).subscribe()
  },
  getController() {
    let controller = Object.assign(new AbortController(), {
      unsubscribe() {
        controller.signal.removeEventListener('abort', listener)
        unsubscribeAtom()
      },
    })

    let listener = noop

    let unsubscribeAtom = computed(
      () => {
        let error = this()
        if (error) {
          controller.abort(error)
        }
      },
      named(`${this.name}._controller`),
    ).subscribe()

    if (controller.signal.aborted) unsubscribeAtom()
    else {
      listener = bind((error: any) => {
        if (error !== this()) this(error)
        controller.unsubscribe()
      })
      controller.signal.addEventListener('abort', listener)
    }

    return controller
  },
}

export interface AbortVar
  extends Variable<[option: string | AbortAtom], AbortAtom> {
  throwIfAborted(): void
  subscribeAbort(cb: (error: AbortError) => void): undefined | Unsubscribe
  getController(): undefined | AbortController
  abort(reason?: unknown): void
}

/** This creates abort atom strongly coupled to the current frame,
 * it is computed from all other abort atoms of the current frame tree */
export let abortVar: AbortVar = Object.assign(
  variable((option: string | AbortAtom): AbortAtom => {
    if (isAtom(option)) return option

    let frame = top()
    return createAtom<null | AbortError>(
      {
        initState: null,
        computed: (state) => {
          if (state !== null) return state

          return (
            abortVar.read((maybeAbortAtom) => maybeAbortAtom?.(), frame) ?? null
          )
        },
      },
      option,
    ).extend(
      withParams((value) => toAbortError(value || `${option} abort`)),
      () => abortMethods,
    )
  }),
  {
    abort(reason?: any) {
      abortVar.read()?.(reason)
    },
    throwIfAborted() {
      abortVar.read()?.throwIfAborted()
    },
    subscribeAbort(cb: (error: AbortError) => void) {
      return abortVar.read()?.subscribeAbort(cb)
    },
    getController() {
      return abortVar.read()?.getController()
    },
  },
)
