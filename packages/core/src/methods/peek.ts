import { context, ContextFrame } from '../core'

export let peek: ContextFrame['run'] = (cb, ...params) => context().run(cb, ...params)
