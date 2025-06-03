import { group } from './config/sidebar'
import { makeSidebar } from './config/integrations/package-reference'

import { adapters } from './adapters.config'

export const sidebar = [
  group('Start', {
    items: [
      'start/base',
      'start/actions',
      'start/extensions',
      'start/forms',
      'start/routing',
      'start/tooling',
    ],
  }),

  group('Handbook', {
    items: [
      'handbook/history',
      'handbook/atomization',
      'handbook/extensions',
      'handbook/async',
      'handbook/lifecycle',
      'handbook/forms',
      'handbook/routing',
      'handbook/sampling',
      'handbook/async-context',
    ],
  }),

  group('Guides', {
    autogenerate: {
      directory: 'guides',
    },
  }),

  group('Adapters', {
    items: await makeSidebar(adapters, { prefix: 'adapters' }),
  }),
]
