export interface AsyncStatusNeverPending<
  State = never,
  InitState = State,
  _Err = Error,
> {
  isPending: false
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: false
  isEverSettled: false

  isSWR: boolean

  data: [State] extends [never] ? never : InitState
  error: undefined
}

export interface AsyncStatusFirstPending<
  State = never,
  InitState = State,
  _Err = Error,
> {
  isPending: true
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: true
  isEverPending: true
  isEverSettled: false

  isSWR: boolean

  data: [State] extends [never] ? never : InitState
  error: undefined
}

export interface AsyncStatusFirstAborted<
  State = never,
  InitState = State,
  _Err = Error,
> {
  isPending: false
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: true
  isEverSettled: false

  isSWR: boolean

  data: [State] extends [never] ? never : InitState
  error: undefined
}

export interface AsyncStatusAbortedPending<
  State = never,
  InitState = State,
  _Err = Error,
> {
  isPending: true
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: true
  isEverSettled: boolean

  isSWR: boolean

  data: [State] extends [never] ? never : InitState | State
  error: undefined
}

export interface AsyncStatusAbortedFulfill<
  State = never,
  _InitState = State,
  _Err = Error,
> {
  isPending: false
  isFulfilled: true
  isRejected: false
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true

  isSWR: boolean

  data: [State] extends [never] ? never : State
  error: undefined
}

export interface AsyncStatusAbortedReject<
  State = never,
  _InitState = State,
  Err = Error,
> {
  isPending: false
  isFulfilled: false
  isRejected: true
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true

  isSWR: boolean

  data: [State] extends [never] ? never : State
  error: Err
}

export type AsyncStatusAbortedSettle<
  State = never,
  InitState = State,
  Err = Error,
> =
  | AsyncStatusAbortedFulfill<State, InitState, Err>
  | AsyncStatusAbortedReject<State, InitState, Err>

export interface AsyncStatusFulfilled<
  State = never,
  _InitState = State,
  _Err = Error,
> {
  isPending: false
  isFulfilled: true
  isRejected: false
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true

  isSWR: boolean

  data: [State] extends [never] ? never : State
  error: undefined
}

export interface AsyncStatusRejected<
  State = never,
  _InitState = State,
  Err = Error,
> {
  isPending: false
  isFulfilled: false
  isRejected: true
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true

  isSWR: boolean

  data: [State] extends [never] ? never : State
  error: Err
}

export interface AsyncStatusAnotherPending<
  State = never,
  _InitState = State,
  Err = Error,
> {
  isPending: true
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: true
  isEverSettled: true

  isSWR: boolean

  data: [State] extends [never] ? never : State
  error: undefined | Err
}

export type AsyncStatusPending<State = never, InitState = State, Err = Error> =
  | AsyncStatusFirstPending<State, InitState, Err>
  | AsyncStatusAbortedPending<State, InitState, Err>
  | AsyncStatusAnotherPending<State, InitState, Err>

export type AsyncStatus<State = never, InitState = State, Err = Error> =
  | AsyncStatusNeverPending<State, InitState, Err>
  | AsyncStatusFirstAborted<State, InitState, Err>
  | AsyncStatusPending<State, InitState, Err>
  | AsyncStatusFulfilled<State, InitState, Err>
  | AsyncStatusRejected<State, InitState, Err>
  | AsyncStatusAbortedSettle<State, InitState, Err>
