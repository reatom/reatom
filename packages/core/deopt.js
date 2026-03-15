// Test code for Deopt Explorer
// run `dexnode deopt.js`

import { atom, computed, notify } from './dist/index.js'

const name = 'diamonds'
const a1 = atom(0, `${name}.a1`)
const a2 = computed(() => {
  return a1() + a1() + a1()
}, `${name}.a2`)
const a3 = computed(() => {
  return a1()
}, `${name}.a3`)
const a4 = computed(() => {
  return a2() + a3()
}, `${name}.a4`)
const a5 = computed(() => {
  return a2() + a3()
}, `${name}.a5`)
const a6 = computed(() => {
  return a4() + a5()
}, `${name}.a6`)

a6.subscribe()

let i = 1000
while (i--) {
  a1.set(i)
  notify()
}

// TODO why not end automatically?
// eslint-disable-next-line no-undef
process.exit(0)
