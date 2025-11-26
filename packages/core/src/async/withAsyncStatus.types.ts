
export interface AsyncStatusNeverPending {
  isPending: false
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: false
  isEverSettled: false
}

export interface AsyncStatusFirstPending {
  isPending: true
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: true
  isEverPending: true
  isEverSettled: false
}

export interface AsyncStatusFirstAborted {
  isPending: false
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: true
  isEverSettled: false
}

export interface AsyncStatusAbortedPending {
  isPending: true
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: true
  isEverSettled: boolean
}

export interface AsyncStatusAbortedFulfill {
  isPending: false
  isFulfilled: true
  isRejected: false
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true
}

export interface AsyncStatusAbortedReject {
  isPending: false
  isFulfilled: false
  isRejected: true
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true
}

export type AsyncStatusAbortedSettle =
  | AsyncStatusAbortedFulfill
  | AsyncStatusAbortedReject

export interface AsyncStatusFulfilled {
  isPending: false
  isFulfilled: true
  isRejected: false
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true
}

export interface AsyncStatusRejected {
  isPending: false
  isFulfilled: false
  isRejected: true
  isSettled: true

  isFirstPending: false
  isEverPending: true
  isEverSettled: true
}

export interface AsyncStatusAnotherPending {
  isPending: true
  isFulfilled: false
  isRejected: false
  isSettled: false

  isFirstPending: false
  isEverPending: true
  isEverSettled: true
}

export type AsyncStatusPending =
  | AsyncStatusFirstPending
  | AsyncStatusAbortedPending
  | AsyncStatusAnotherPending

export type AsyncStatus =
  | AsyncStatusNeverPending
  | AsyncStatusFirstAborted
  | AsyncStatusPending
  | AsyncStatusFulfilled
  | AsyncStatusRejected
  | AsyncStatusAbortedSettle
