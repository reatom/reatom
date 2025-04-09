import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightLinksValidator from 'starlight-links-validator'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import starlightUtils from '@lorenzo_lewis/starlight-utils'

// https://astro.build/config
export default defineConfig({
  site: 'https://www.reatom.dev',
  output: 'static',
  redirects: {
    '/core': '/package/core',
  },
  integrations: [
    starlight({
      plugins: [
        starlightLinksValidator(),
        starlightUtils({
          multiSidebar: {
            switcherStyle: 'hidden',
          },
          navLinks: {
            leading: { useSidebarLabelled: "leadingNavLinks" }
          }
        }),
      ],
      title: 'Reatom',
      logo: {
        src: './src/assets/logo_light.svg',
      },
      social: {
        github: 'https://github.com/artalar/reatom',
        twitter: 'https://twitter.com/reatomjs',
        youtube:
          'https://www.youtube.com/playlist?list=PLXObawgXpIfxERCN8Lqd89wdsXeUHm9XU',
      },
      editLink: {
        baseUrl: 'https://github.com/artalar/reatom/edit/v3/docs/',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'leadingNavLinks',
          items: [
            {
              label: 'Guide',
              link: 'guide',
            },
            {
              label: 'Recipes',
              link: 'recipes',
            },
            {
              label: 'Reference',
              link: 'reference',
            },
          ],
        },
        {
          label: 'Getting Started',
          autogenerate: {
            directory: 'guide',
          },
        },
        {
          label: 'Recipes',
          autogenerate: {
            directory: 'recipes',
          },
        },
        {
          label: 'Packages',
          autogenerate: {
            directory: 'package',
          },
        },
      ],
      components: {
        Header: './src/components/Header.astro',
        MobileMenuFooter: './src/components/MobileMenuFooter.astro',
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
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          contentProperties: { className: ['external-link-icon'] },
          content: (node) => {
            const imgChild = node.children.find((c) => c.tagName === 'img')

            return imgChild
              ? undefined
              : {
                  type: 'text',
                  value: '↗',
                }
          },
          target: '_blank',
        },
      ],
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          properties: { class: 'anchor-link' },
          behavior: 'after',
          content: () => [{ type: 'text', value: '#' }],
          group: ({ tagName }) => ({
            type: 'element',
            tagName: 'div',
            properties: {
              class: `heading-wrapper level-${tagName}`,
            },
          }),
        },
      ],
    ],
  },
})
