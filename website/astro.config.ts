import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightLinksValidator from 'starlight-links-validator'
import rehypeSlug from 'rehype-slug'
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
      plugins: [starlightLinksValidator()],
      components: {
        Header: './src/components/starlight/Header.astro',
        MobileMenuFooter: './src/components/starlight/MobileMenuFooter.astro',
        Sidebar: './src/components/starlight/Sidebar.astro',
        PageTitle: './src/components/starlight/PageTitle.astro',
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
          href: 'https://github.com/reatom/reatom',
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
        baseUrl: 'https://github.com/artalar/reatom/edit/v3/docs/',
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
