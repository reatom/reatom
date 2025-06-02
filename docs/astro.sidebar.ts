import type { StarlightIcon } from '@astrojs/starlight/types'

import { group } from './config/sidebar.ts'
import { makeSidebar } from './config/integrations/package-reference.ts'
import { adapters, packages } from './astro.autogen.ts'

export const sidebar = [
  group('Start', {
    badge: icon('rocket'),
    items: [
      group('Essentials', {
        items: ['start/setup', 'start/atoms', 'start/actions', 'start/async'],
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
    badge: icon('open-book'),
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
    badge: icon('puzzle'),
    autogenerate: {
      directory: 'guides',
    },
  }),

  group('Reference', {
    badge: icon('information'),
    items: [
      ...await makeSidebar(packages, { prefix: 'package' }),
      group('Adapters', {
        items: await makeSidebar(adapters, { prefix: 'package' }),
      }),
    ],
  }),
]

function icon(iconName: StarlightIcon) {
  return iconName
}
