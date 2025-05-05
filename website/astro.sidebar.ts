import { group } from './config/sidebar.ts'
import { makeSidebar } from './config/integrations/package-reference.ts'

import { references } from './references.config.ts'

export const sidebar = [
  group('Start', {
    items: [
      group('Getting started', {
        items: ['guide/getting-started', 'guide/getting-started/quick-start'],
      }),
      group('Essentials', {
        items: [
          'guide/essentials/setup',
          'guide/essentials/primitives',
          'guide/essentials/debugging',
          'guide/essentials/testing',
          'guide/essentials/atomization',
          'guide/essentials/async-atoms',
          'guide/essentials/context-binding',
        ],
      }),
      group('Advanced', {
        autogenerate: {
          directory: '/guide/advanced',
        },
      }),
    ],
  }),

  group('Recipes', {
    autogenerate: {
      directory: 'recipes',
    },
  }),

  group('Reference', {
    items: await makeSidebar(references, { prefix: 'reference' }),
  }),
]
