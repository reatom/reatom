// Test code for Deopt Explorer
// run `dexnode deopt.js`

import { atom, notify } from './build/index.mjs'

const name = 'diamonds'
const a1 = atom(0, `${name}.a1`)
const a2 = atom(() => {
  return a1() + a1() - a1()
}, `${name}.a2`)
const a3 = atom(() => {
  return a1()
}, `${name}.a3`)
const a4 = atom(() => {
  return a2() + a3()
}, `${name}.a4`)
const a5 = atom(() => {
  return a2() + a3()
}, `${name}.a5`)
const a6 = atom(() => {
  return a4() + a5()
}, `${name}.a6`)

a6.subscribe()

let i = 1000
while (i--) {
  a1(i)
  notify()
}
