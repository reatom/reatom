export interface AsyncStatusNeverPending<State = never, InitState = State> {
  isPending: false
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: false
  isEverSettled: false

  isSWR: boolean

  data: [State] extends [never] ? never : InitState
}

export interface AsyncStatusFirstPending<State = never, InitState = State> {
  isPending: true
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: true
  isEverPending: true
  isEverSettled: false

  isSWR: boolean

  data: [State] extends [never] ? never : InitState
}

export interface AsyncStatusFirstAborted<State = never, InitState = State> {
  isPending: false
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: true
  isEverSettled: false

  isSWR: boolean

  data: [State] extends [never] ? never : InitState
}

export interface AsyncStatusAbortedPending<State = never, InitState = State> {
  isPending: true
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: true
  isEverSettled: boolean

  isSWR: boolean

  data: [State] extends [never] ? never : InitState | State
}

export interface AsyncStatusAbortedFulfill<State = never, _InitState = State> {
  isPending: false
  isFulfilled: true
  isRejected: false
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true

  isSWR: boolean

  data: [State] extends [never] ? never : State
}

export interface AsyncStatusAbortedReject<State = never, _InitState = State> {
  isPending: false
  isFulfilled: false
  isRejected: true
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true

  isSWR: boolean

  data: [State] extends [never] ? never : State
}

export type AsyncStatusAbortedSettle<State = never, InitState = State> =
  | AsyncStatusAbortedFulfill<State, InitState>
  | AsyncStatusAbortedReject<State, InitState>

export interface AsyncStatusFulfilled<State = never, _InitState = State> {
  isPending: false
  isFulfilled: true
  isRejected: false
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true

  isSWR: boolean

  data: [State] extends [never] ? never : State
}

export interface AsyncStatusRejected<State = never, _InitState = State> {
  isPending: false
  isFulfilled: false
  isRejected: true
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true

  isSWR: boolean

  data: [State] extends [never] ? never : State
}

export interface AsyncStatusAnotherPending<State = never, _InitState = State> {
  isPending: true
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: true
  isEverSettled: true

  isSWR: boolean

  data: [State] extends [never] ? never : State
}

export type AsyncStatusPending<State = never, InitState = State> =
  | AsyncStatusFirstPending<State, InitState>
  | AsyncStatusAbortedPending<State, InitState>
  | AsyncStatusAnotherPending<State, InitState>

export type AsyncStatus<State = never, InitState = State> =
  | AsyncStatusNeverPending<State, InitState>
  | AsyncStatusFirstAborted<State, InitState>
  | AsyncStatusPending<State, InitState>
  | AsyncStatusFulfilled<State, InitState>
  | AsyncStatusRejected<State, InitState>
  | AsyncStatusAbortedSettle<State, InitState>
