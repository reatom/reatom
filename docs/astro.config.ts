import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import rehypeSlug from 'rehype-slug'
import starlightLlmsTxt from 'starlight-llms-txt'

import { sidebar } from './astro.sidebar'
import { devServerFileWatcher } from './config/integrations/dev-server-file-watcher'

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
          // Configure multiple LLM output files
          output: [
            {
              // Small focused file with start docs + references to handbook
              filename: 'llms-start.txt',
              include: ['start/**/*'],
              transformContent: (content, frontmatter, url) => {
                // Add handbook references at the end of start docs
                let transformedContent = content;
                
                // Add reference links to corresponding handbook docs
                if (url.includes('/start/')) {
                  const docName = url.split('/').pop() || 'index';
                  const handbookUrl = url.replace('/start/', '/handbook/');
                  
                  transformedContent += `\n\n📖 **For advanced information, see:** [${frontmatter.title || docName} Handbook](${handbookUrl})\n`;
                  
                  // Add general handbook references
                  transformedContent += `\n**Comprehensive guides available in handbook:**
- [Routing Handbook](/handbook/routing) - Advanced routing patterns, nested routes, computed factory
- [Forms Handbook](/handbook/forms) - Complex form validation, async handling, field dependencies  
- [Persistence Handbook](/handbook/persist) - Advanced data persistence strategies
- [Async Context Handbook](/handbook/async-context) - Complex async state management
- [Events Handbook](/handbook/events) - Advanced event handling patterns
- [Lifecycle Handbook](/handbook/lifecycle) - Component lifecycle management
- [Extensions Handbook](/handbook/extensions) - Creating and using extensions
- [Atomization Handbook](/handbook/atomization) - Advanced atom composition patterns
- [Sampling Handbook](/handbook/sampling) - Performance optimization techniques
- [Async Handbook](/handbook/async) - Advanced async patterns and utilities
- [History Handbook](/handbook/history) - Navigation and history management\n`;
                }
                
                return transformedContent;
              }
            },
            {
              // Complete documentation file (existing behavior)
              filename: 'llms.txt',
              // Include all docs by default (no include/exclude means all)
            }
          ]
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
          href: 'https://github.com/reatom/reatom/tree/v1000',
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
        baseUrl: 'https://github.com/reatom/reatom/edit/v1000/docs/',
      },
    }),
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
