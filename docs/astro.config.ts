import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import rehypeSlug from 'rehype-slug'
import starlightLlmsTxt from 'starlight-llms-txt'

import { sidebar } from './astro.sidebar'
import { devServerFileWatcher } from './config/integrations/dev-server-file-watcher'
import { markdownBaseLinks } from './config/integrations/markdown-links-base'

// https://astro.build/config
export default defineConfig({
  site: 'https://www.reatom.dev',
  output: 'static',
  integrations: [
    devServerFileWatcher([
      './config/**', // Custom plugins and integrations
      './astro.sidebar.ts', // Sidebar configuration file
      './adapters.config.ts', // References configuration file
    ]),
    starlight({
      sidebar,
      plugins: [
        // TODO
        // starlightLinksValidator(),
        starlightLlmsTxt({
          projectName: 'Reatom',
          description:
            'A state management library for JavaScript with atomic approach, powerful primitives, and framework integrations.',
          details: `**Comprehensive guides available in handbook:**
- [Routing Handbook](/handbook/routing) - Advanced routing patterns, nested routes
- [Computed Factory Handbook](/handbook/computed-factory) - Globally accessible state scoped to a selection/session/page with automatic invalidation and abort of stale work
- [Forms Handbook](/handbook/forms) - Complex form validation, async handling, field dependencies
- [Persistence Handbook](/handbook/persist) - Advanced data persistence strategies
- [Async Context Handbook](/handbook/async-context) - Complex async state management
- [Events Handbook](/handbook/events) - Advanced event handling patterns
- [Lifecycle Handbook](/handbook/lifecycle) - Component lifecycle management
- [Extensions Handbook](/handbook/extensions) - Creating and using extensions
- [Atomization Handbook](/handbook/atomization) - Advanced atom composition patterns
- [Sampling Handbook](/handbook/sampling) - Performance optimization techniques
- [Async Handbook](/handbook/async) - Advanced async patterns and utilities
- [History Handbook](/handbook/history) - Navigation and history management
- [Suspense Handbook](/handbook/suspense) - React Suspense integration`,
          customSets: [
            {
              label: 'Getting Started',
              description: `Quick start documentation for Reatom - basics, actions, extensions, forms, routing, and tooling

For advanced information, see the handbook:
- /handbook/routing - Advanced routing patterns, nested routes
- /handbook/computed-factory - Globally accessible state scoped to a selection/session/page with automatic invalidation and abort of stale work
- /handbook/forms - Complex form validation, async handling, field dependencies
- /handbook/persist - Advanced data persistence strategies
- /handbook/async-context - Complex async state management
- /handbook/events - Advanced event handling patterns
- /handbook/lifecycle - Component lifecycle management
- /handbook/extensions - Creating and using extensions
- /handbook/atomization - Advanced atom composition patterns
- /handbook/sampling - Performance optimization techniques
- /handbook/async - Advanced async patterns and utilities
- /handbook/history - Navigation and history management
- /handbook/suspense - React Suspense integration`,
              paths: ['start/**'],
            },
            {
              label: 'Handbook',
              description:
                'Comprehensive guides and advanced patterns for Reatom',
              paths: ['handbook/**'],
            },
          ],
          // Promote start pages to top of full/small files
          promote: ['index*', 'start/**'],
        }),
      ],
      components: {
        Header: './src/components/starlight/Header.astro',
        MobileMenuFooter: './src/components/starlight/MobileMenuFooter.astro',
        Sidebar: './src/components/starlight/Sidebar.astro',
        PageTitle: './src/components/starlight/PageTitle.astro',
        MarkdownContent: './src/components/MarkdownContent.astro',
      },
      title: 'Reatom',
      logo: {
        src: './src/assets/logo_light.svg',
      },
      customCss: ['./src/styles/custom.css'],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/reatom/reatom/tree/v1001',
        },
        {
          icon: 'twitter',
          label: 'Twitter',
          href: 'https://twitter.com/reatomjs',
        },
        {
          icon: 'youtube',
          label: 'YouTube',
          href: 'https://www.youtube.com/playlist?list=PLXObawgXpIfxERCN8Lqd89wdsXeUHm9XU',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/reatom/reatom/edit/v1001/docs/',
      },
    }),
    markdownBaseLinks(),
  ],
  // Process images with sharp: https://docs.astro.build/en/guides/assets/#using-sharp
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  markdown: {
    rehypePlugins: [rehypeSlug],
  },
})
