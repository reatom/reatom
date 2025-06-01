import { group } from './config/sidebar'
import { makeSidebar } from './config/integrations/package-reference'

import { adapters } from './adapters.config'

export const sidebar = [
  group('Start', {
    items: [
      group('Essentials', {
        items: [
          'start/setup',
          'start/atoms',
          'start/actions',
          'start/async',
        ],
      }),
      group('Advanced', {
        items: [
          'start/forms',
          'start/persist',
          'start/routing',
          'start/tooling',
        ],
      }),
    ],
  }),

  group('Handbook', {
    items: [
      'handbook/history',
      'handbook/atomization',
      'handbook/extensions',
      'handbook/lifecycle',
      'handbook/async-context',
      'handbook/sampling',
      'handbook/forms',
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
