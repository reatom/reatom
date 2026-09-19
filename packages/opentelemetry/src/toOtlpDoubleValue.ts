import { nonFiniteString } from './nonFiniteString.ts'

export type OtlpDoubleValue = {
  doubleValue: number | 'NaN' | 'Infinity' | '-Infinity'
}

export const toOtlpDoubleValue = (value: number): OtlpDoubleValue => ({
  doubleValue: nonFiniteString(value) ?? value,
})
