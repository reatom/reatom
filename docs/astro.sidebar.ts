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
        label: '@reatom/core',
        collapsed: false,
        items: [
          {
            label: 'Overview',
            link: '/reference/core',
          },
          {
            label: 'Classes',
            link: '/reference/core/classes',
          },
          {
            label: 'Functions',
            link: '/reference/core/functions',
          },
          {
            label: 'Variables',
            link: '/reference/core/variables',
          },
          {
            label: 'Type Aliases',
            link: '/reference/core/type-aliases',
          },
          {
            label: 'Interfaces',
            collapsed: true,
            items: [
              { label: 'A-C', link: '/reference/core/interfaces/interfaces-a-c' },
              { label: 'D-F', link: '/reference/core/interfaces/interfaces-d-f' },
              { label: 'G-I', link: '/reference/core/interfaces/interfaces-g-i' },
              { label: 'J-L', link: '/reference/core/interfaces/interfaces-j-l' },
              { label: 'M-O', link: '/reference/core/interfaces/interfaces-m-o' },
              { label: 'P-R', link: '/reference/core/interfaces/interfaces-p-r' },
              { label: 'S-T', link: '/reference/core/interfaces/interfaces-s-t' },
              { label: 'U-Z', link: '/reference/core/interfaces/interfaces-u-z' },
            ],
          },
        ],
      },
      {
        label: '@reatom/react',
        link: '/reference/react',
      },
      {
        label: '@reatom/vue',
        link: '/reference/vue',
      },
      {
        label: '@reatom/lit',
        link: '/reference/lit',
      },
      {
        label: '@reatom/preact',
        link: '/reference/preact',
      },
      {
        label: '@reatom/jsx',
        link: '/reference/jsx',
      },
      {
        label: '@reatom/zod',
        link: '/reference/zod',
      },
    ],
  }),
]
function icon(iconName: StarlightIcon) {
  return iconName
}
