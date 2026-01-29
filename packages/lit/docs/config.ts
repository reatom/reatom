interface DocSection {
  title: string
  file: string
  description?: string
}

interface DocChapter {
  title: string
  file?: string
  sections?: DocSection[]
}

interface DocPage {
  slug: string
  title: string
  description: string
  chapters: DocChapter[]
}

export const docsConfig: { pages: DocPage[] } = {
  pages: [
    {
      slug: 'index',
      title: 'Integration with Lit',
      description: 'Build reactive Web Components with Reatom and Lit',
      chapters: [
        {
          title: 'Introduction',
          file: 'intro.md',
        },
        {
          title: 'Quick Start',
          file: 'basic/quick-start',
        },
        {
          title: 'How It Works',
          sections: [
            { title: 'ReatomLitElement', file: 'basic/reatom-lit-element' },
            { title: 'watch Directive', file: 'basic/watch-directive' },
            {
              title: 'Automatic Reactivity with html and svg',
              file: 'basic/auto-reactivity',
            },
          ],
        },
      ],
    },
    {
      slug: 'basics',
      title: 'Lit Basics',
      description: 'Basic usage patterns for Reatom with Lit',
      chapters: [
        {
          title: 'Basic Usage',
          sections: [
            {
              title: 'Creating a Reactive Component',
              file: 'basic/reactive-component',
            },
            { title: 'Using Multiple Atoms', file: 'basic/multiple-atoms' },
            { title: 'Passing Atoms as Properties', file: 'basic/passing-atoms' },
          ],
        },
      ],
    },
    {
      slug: 'advanced',
      title: 'Lit Advanced Patterns',
      description: 'Advanced patterns and mixed reactivity in Lit components',
      chapters: [
        {
          title: 'Mixed Reactivity',
          sections: [
            { title: 'When to Use Which', file: 'advanced/when-to-use' },
            {
              title: 'Example: Mixed Reactivity',
              file: 'advanced/mixed-reactivity',
            },
            { title: 'Benefits of Mixed Reactivity', file: 'advanced/benefits' },
          ],
        },
        {
          title: 'Advanced Patterns',
          sections: [
            {
              title: 'Async Operations in Components',
              file: 'advanced/async-operations',
            },
            { title: 'Lifecycle Hooks', file: 'advanced/lifecycle' },
            {
              title: 'Atomization in Lit Components',
              file: 'advanced/atomization',
            },
            {
              title: 'Using withReatomElement Mixin',
              file: 'advanced/mixin',
            },
            {
              title: 'SSR and Hydration',
              file: 'advanced/ssr',
            },
          ],
        },
      ],
    },
    {
      slug: 'examples/todo-app',
      title: 'Todo App Example',
      description: 'Complete Todo Component with Reatom and Lit',
      chapters: [
        {
          title: 'Complete Todo Component',
          file: 'examples/todo-app',
        },
      ],
    },
    {
      slug: 'examples/login-form',
      title: 'Login Form Example',
      description: 'Form with Validation and Async Submit',
      chapters: [
        {
          title: 'Form with Validation and Async Submit',
          file: 'examples/login-form',
        },
      ],
    },
    {
      slug: 'examples/paginated-list',
      title: 'Paginated List Example',
      description: 'List with API Loading and Pagination',
      chapters: [
        {
          title: 'List with API Loading and Pagination',
          file: 'examples/paginated-list',
        },
      ],
    },
    {
      slug: 'examples/component-composition',
      title: 'Component Composition Example',
      description: 'Component Composition with Reatom and Lit',
      chapters: [
        {
          title: 'Component Composition',
          file: 'examples/component-composition',
        },
      ],
    },
    {
      slug: 'examples/orderbook',
      title: 'Real-time Orderbook Example',
      description: 'High-performance WebSocket trading interface',
      chapters: [
        {
          title: 'Bybit Orderbook Demo',
          file: 'examples/orderbook',
        },
      ],
    },
    {
      slug: 'best-practices',
      title: 'Lit Best Practices',
      description: 'Best practices for Reatom with Lit',
      chapters: [
        {
          title: 'Best Practices',
          sections: [
            {
              title: 'Organizing Code and Modularity',
              file: 'best-practices/organization',
            },
            {
              title: 'Element Registration',
              file: 'best-practices/registration',
            },
            { title: 'Memory Management', file: 'best-practices/memory' },
            { title: 'Debugging Tips', file: 'best-practices/debugging' },
            {
              title: 'Performance Considerations',
              file: 'best-practices/performance',
            },
            { title: 'Testing', file: 'best-practices/testing' },
          ],
        },
      ],
    },
  ],
}
