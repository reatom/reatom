import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightLinksValidator from 'starlight-links-validator'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import starlightUtils from '@lorenzo_lewis/starlight-utils'
import tailwindcss from '@tailwindcss/vite'
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.reatom.dev',
  output: 'static',
  redirects: {
    '/core': '/package/core',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [starlight({
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
      baseUrl: 'https://github.com/reatom/reatom/edit/docs/',
    },
    customCss: ['./src/styles/tailwind.css'],
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
  }), react()],
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