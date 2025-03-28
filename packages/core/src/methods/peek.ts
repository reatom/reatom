import { root, RootFrame } from '../core'

export let peek: RootFrame['run'] = (cb, ...params) => root().run(cb, ...params)
