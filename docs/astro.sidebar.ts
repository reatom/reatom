import type { StarlightIcon } from '@astrojs/starlight/types'

import { group } from './config/sidebar'


export const sidebar = [
  group('Start', {
    badge: icon('rocket'),
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
    badge: icon('open-book'),
    items: [
      'handbook/history',
      'handbook/atomization',
      'handbook/extensions',
      'handbook/async-context',
      'handbook/async',
      'handbook/lifecycle',
      'handbook/forms',
      'handbook/routing',
      'handbook/sampling',
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
      {
        label: "@reatom/core",
        link: "/reference/core",
      },
      {
        label: "@reatom/react",
        link: "/reference/react",
      },
      {
        label: "@reatom/vue",
        link: "/reference/vue",
      },
      {
        label: "@reatom/lit",
        link: "/reference/lit",
      },
      {
        label: "@reatom/preact",
        link: "/reference/preact",
      }
    ]
  }),
]
function icon(iconName: StarlightIcon) {
  return iconName
}
