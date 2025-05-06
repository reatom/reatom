import { group } from './config/sidebar'
import { makeSidebar } from './config/integrations/package-reference'

import { adapters } from './adapters.config'

export const sidebar = [
    group('Start', {
      items: [
        'start/setup',
        'start/atoms',
        'start/actions',
        'start/async',
        'start/forms',
        'start/persist',
        'start/routing',
        'start/tooling',
      ],
    }),

    group('Handbook', {
      items: [
        'handbook/history',
        'handbook/extensions',
        'handbook/lifecycle',
        'handbook/async-context',
      ],
    }),

    group('Guides', {
      items: [
        'guides/concurrency',
        'guides/atomization',
        'guides/optimistic',
        'guides/pooling',
        'guides/dynamic-forms',
        'guides/route-block',
        'guides/SSR',
        'guides/undo-redo',
        'guides/sampling',
        'guides/events',
        'guides/transactions',
      ],
    }),

    group('Adapters', {
      items: [
        'adapters/react',
        'adapters/vue',
        'adapters/svelte',
        'adapters/solid',
        'adapters/lit',
        'adapters/preact',
      ],
    }),

    group('Blog', {
      autogenerate: {
        directory: 'blog',
      },
    }),

    group('Reference', {
      items: await makeSidebar(adapters, { prefix: 'reference' }),
    }),
  ]
}
