import { clearStack, context } from '@reatom/core'

clearStack()

export const rootFrame = context.start()
