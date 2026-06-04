## Testing

### Introduction

Storybook 10 (released November 2025) is a powerful tool for developing, documenting, and testing UI components in isolation. It enables full-cycle component testing for the frontend by simulating real user interactions through visible elements, while mocking backend dependencies. This approach ensures tests mimic authentic user flows — clicking buttons, filling forms, navigating — without accessing or relying on implementation details like internal state or class names. Assertions focus on observable rendering outputs: element visibility, text content, UI changes.

Storybook 10's main breaking change is **ESM-only** distribution (no more CommonJS), which reduces install size by 29% on top of Storybook 9's 50% savings. It requires **Node 20.16+, 22.19+, or 24+**. Key testing improvements include **module automocking** via the new `sb.mock()` API and an **experimental test syntax** for attaching tests directly to stories.

This document outlines best practices for Storybook 10 testing, drawing from official documentation. It covers setup, writing tests, mocking, execution, and integration, suitable for team collaboration and integration with LLM agents for automated workflows.

### Project Stack Overview

This project uses the following key technologies for testing:

| Dependency                           | Version      | Purpose                                      |
| ------------------------------------ | ------------ | -------------------------------------------- |
| `storybook` / `@storybook/html-vite` | ^10.2        | Component dev & test framework               |
| `@storybook/addon-vitest`            | ^10.2        | Transforms stories into Vitest browser tests |
| `@storybook/addon-a11y`              | ^10.2        | Accessibility checks (axe-core)              |
| `vitest`                             | ^4.0         | Test runner                                  |
| `@vitest/browser-playwright`         | ^4.0         | Real browser execution (Chromium)            |
| `msw` + `msw-storybook-addon`        | ^2.12 / ^2.0 | Network request mocking                      |
| `@reatom/core` + `@reatom/jsx`       | ^1000        | State management (Reatom v1000)              |
| `playwright`                         | ^1.58        | Browser automation                           |

### Setting Up Storybook for Testing

1. **Install Storybook and the Vitest Addon**:

   Start with a basic Storybook setup using `npx storybook@latest init` (or `npx storybook@latest upgrade` for existing projects).

   The **Vitest addon** (`@storybook/addon-vitest`) is the recommended way to run component tests. It transforms stories into Vitest tests that run in a real browser via Playwright's Chromium. Install it with:

   ```bash
   npx storybook add @storybook/addon-vitest
   ```

   This command automatically:
   - Prompts you to install Playwright browser binaries if needed
   - Sets up browser mode using Playwright's Chromium browser
   - Installs and configures Vitest with sensible defaults
   - Inspects your project's Vite and Vitest setup

   Additional addons for specific testing needs:
   - `@storybook/addon-a11y` — accessibility checks powered by axe-core
   - `msw-storybook-addon` — mocking network requests (requires MSW v2+)

2. **Configure Storybook**:

   In `.storybook/main.ts`, enable addons and configure the framework. Use Component Story Format (CSF) 3 for stories.

   Set up a preview file (`.storybook/preview.ts`) for global mocks, `beforeEach`/`beforeAll` hooks, and shared configuration.

   The Vitest addon setup creates a `.storybook/vitest.setup.ts` file that applies your preview annotations to the test environment:

   ```typescript
   import { setProjectAnnotations } from '@storybook/html-vite'
   import * as previewAnnotations from './preview'

   setProjectAnnotations([previewAnnotations])
   ```

3. **Configure Vitest** (Vitest 4+ with test projects):

   ```typescript
   // vitest.config.ts
   import { dirname, join } from 'node:path'
   import { fileURLToPath } from 'node:url'

   import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
   import { playwright } from '@vitest/browser-playwright'
   import { defineConfig, mergeConfig } from 'vitest/config'

   import viteConfig from './vite.config.js'

   const dir = dirname(fileURLToPath(import.meta.url))

   export default mergeConfig(
     viteConfig,
     defineConfig({
       test: {
         projects: [
           {
             test: {
               name: 'unit',
               include: ['./src/**/*.test.ts'],
               exclude: ['./src/**/*.stories.*', './.storybook/**'],
               environment: 'node',
             },
           },
           {
             extends: true,
             plugins: [
               storybookTest({
                 configDir: join(dir, '.storybook'),
                 storybookScript: 'npm run storybook -- --no-open',
               }),
             ],
             test: {
               name: 'storybook',
               include: ['./src/**/*.stories.@(ts|tsx)'],
               exclude: ['./src/**/*.test.ts'],
               browser: {
                 enabled: true,
                 provider: playwright(),
                 headless: true,
                 instances: [{ browser: 'chromium' }],
               },
               setupFiles: [join(dir, '.storybook/vitest.setup.ts')],
             },
           },
         ],
       },
     }),
   )
   ```

4. **Organize Stories**:

   Group stories by component categories (e.g., `components/Button.stories.ts`). Each story represents a specific state or variant, serving as the base for tests. Use tags to categorize stories for filtering.

### Project Story Organization

Stories in this project follow two distinct levels:

```
src/
├── __fixtures__/              # Mock data (mockData.ts)
├── shared/                   # Test utilities (test.ts, testSetup.ts, StoryWrapper.tsx)
├── integration/               # (reserved for future use)
├── App.stories.tsx           # Integration stories — full App
├── shortcuts.stories.tsx     # Integration stories — keyboard shortcuts
└── components/               # Component-level stories — isolated UI
    ├── BreadcrumbNav.stories.tsx
    ├── FilterPanel.stories.tsx
    ├── FolderTree.stories.tsx
    ├── ImageGrid.stories.tsx
    ├── ImageInfoPanel.stories.tsx
    ├── Lightbox.stories.tsx
    ├── ProgressBar.stories.tsx
    ├── SettingsPanel.stories.tsx
    ├── SortPanel.stories.tsx
    ├── ThemeToggle.stories.tsx
    ├── Toolbar.stories.tsx
    └── ...
```

**Integration stories** (`src/App.stories.tsx`) render the full `App` component. They test complete user journeys including folder loading, lightbox flow, and parsing progress. State is prepared via `loadGalleryState`, `loadEmptyState`, or `loadParsingState` from `shared/testSetup`.

**Component stories** (`src/components/*.stories.tsx`) render individual components in isolation, wrapped in `StoryWrapper` for layout and theming. They use `loadGalleryState` or `loadEmptyState` to set up the model before rendering.

### CSF 3 Story Format

This project uses CSF 3 (Component Story Format). Every story file defines a `meta` object and exports stories with `StoryObj`. Stories use a `render` function that returns JSX (transformed to `@reatom/jsx` via Vite config):

```typescript
import type { Meta, StoryObj } from '@storybook/html'
import { App } from './App'
import { loadGalleryState } from './shared/testSetup'
import { mockFolderTree } from './__fixtures__/mockData'

const meta: Meta = {
  title: 'Integration/Gallery',
  parameters: { layout: 'fullscreen' },
}

export default meta

type Story = StoryObj

export const GalleryLoaded: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return <App />
  },
}
```

### Reatom Integration

This project uses [Reatom](https://reatom.dev) (`@reatom/core@1000`) for state management with [@reatom/jsx](https://reatom.dev/packages/jsx) for rendering. Storybook uses `@storybook/html-vite` and requires special setup to create isolated Reatom contexts per story.

#### Preview Setup

In `.storybook/preview.ts`, each story is mounted into a fresh Reatom context frame using `mount` from `@reatom/jsx`:

```typescript
import { clearStack, context } from '@reatom/core'
import { mount } from '@reatom/jsx'
import type { Preview } from '@storybook/html'

import '../src/setup'

let unmountFn: (() => void) | null = null

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    a11y: { config: {}, options: {}, test: 'todo' },
  },
  decorators: [
    (Story) => {
      unmountFn?.()
      unmountFn = null

      const frame = context.start()
      const container = document.createElement('div')
      container.id = 'storybook-root'
      container.style.cssText = 'width: 100%; height: 100%;'
      document.body.appendChild(container)

      frame.run(() => {
        const element = Story()
        const result = mount(container, element as HTMLElement)
        unmountFn = result.unmount
      })

      return container
    },
  ],
  beforeEach() {
    clearStack()
    return () => {
      unmountFn?.()
      unmountFn = null
    }
  },
}

export default preview
```

Key points:

- **`../src/setup`** is imported at the top to configure the Reatom logger in dev.
- **`clearStack()`** in `beforeEach` resets the global Reatom stack before each story, preventing state leaking.
- **`context.start()`** creates an isolated Reatom "frame" (a fresh reactive context) per story.
- **`mount(container, element)`** from `@reatom/jsx` renders the story's JSX into the DOM. The returned `unmount` function is stored for cleanup when switching stories.

#### Vite JSX Configuration

`.storybook/main.ts` configures Vite to transform JSX to `@reatom/jsx`:

```typescript
esbuild: {
  jsxFactory: 'h',
  jsxFragment: 'hf',
  jsxInject: `import { h, hf } from "@reatom/jsx";`,
},
```

This allows stories to use JSX that compiles to Reatom's `h` and `hf` instead of React.

#### Loading State in Stories

Integration and component stories prepare the model before rendering via `loadGalleryState`, `loadEmptyState`, or `loadParsingState` from `shared/testSetup`:

```typescript
render: () => {
  loadGalleryState({ tree: mockFolderTree })
  return <App />
}
```

Component stories typically wrap content in `StoryWrapper` for theming and layout:

```typescript
render: () => {
  loadGalleryState({ tree: mockFolderTree })
  return (
    <StoryWrapper>
      <div style="padding: 20px;">
        <ImageGrid />
      </div>
    </StoryWrapper>
  )
}
```

### The `createMyself` Test Actor Pattern

This project uses a custom **test actor pattern** (inspired by [CodeceptJS](https://codecept.io/)) defined in `src/shared/test.ts`. Instead of writing raw Testing Library queries inside every test, you build a reusable `I` object that reads like natural language.

#### Base API

`createMyself` produces an actor with built-in methods:

| Method             | Signature                                                              | Description                             |
| ------------------ | ---------------------------------------------------------------------- | --------------------------------------- |
| `I.see`            | `(locator: Locator) => Promise<HTMLElement>`                           | Assert element is in the document       |
| `I.dontSee`        | `(locator: Locator) => Promise<void>`                                  | Assert element is `null`                |
| `I.seeText`        | `(locator: Locator, text: string \| RegExp) => Promise<void>`          | Assert text content                     |
| `I.seeInField`     | `(locator: DefiniteLocator, value: string \| number) => Promise<void>` | Assert input value                      |
| `I.click`          | `(locator: DefiniteLocator) => Promise<void>`                          | Click an element                        |
| `I.fill`           | `(locator: DefiniteLocator, value: string) => Promise<void>`           | Clear + type into input, then blur      |
| `I.clear`          | `(locator: DefiniteLocator) => Promise<void>`                          | Clear an input                          |
| `I.selectOption`   | `(locator: DefiniteLocator, value: string \| RegExp) => Promise<void>` | Open a select and pick an option        |
| `I.resolveLocator` | `<T>(locator: T) => Promise<Awaited<ReturnType<T>>>`                   | Resolve a locator to its DOM element(s) |

#### Locator Types

Locators are functions that receive a Testing Library canvas and return DOM element(s):

```typescript
type Canvas = ReturnType<typeof within>

// May return null (for dontSee assertions)
type Locator = (
  canvas: Canvas,
) => HTMLElement | null | Promise<HTMLElement | null>

// Always returns an element (for click, fill, etc.)
type DefiniteLocator = (canvas: Canvas) => HTMLElement | Promise<HTMLElement>

// Returns an array (for findAll* queries)
type ArrayLocator = (
  canvas: Canvas,
) => Array<HTMLElement> | Promise<Array<HTMLElement>>
```

#### Extending with Page-Specific Actions

Each story file extends `I` with domain-specific verbs:

```typescript
import { createMyself, type Locator } from '#shared/test'

const loc = {
  articlesErrorHeadingAppears: (canvas) =>
    canvas.findByRole('heading', { name: 'Could not load articles' }),
  retryButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Try again' }),
  articlesAlertRegionAppears: (canvas) => canvas.findByRole('alert'),
} satisfies Record<string, Locator>

const I = createMyself((I) => ({
  clickArticle: async (name: string | RegExp) => {
    const pattern = typeof name === 'string' ? new RegExp(name, 'i') : name
    await I.click((canvas) => canvas.findByRole('link', { name: pattern }))
  },
  seeArticleList: async () => {
    await I.see((canvas) =>
      canvas.findByRole('link', { name: /Quarterly report/i }),
    )
    await I.see((canvas) => canvas.findByRole('link', { name: /Hiring plan/i }))
  },
  seeArticlesError: async () => {
    await I.see(loc.articlesErrorHeadingAppears)
    await I.see(loc.articlesAlertRegionAppears)
    await I.see(loc.retryButtonAppears)
  },
}))
```

#### Initialization via Loaders

The actor must be initialized with the story's test context before use. This is done via the `loaders` array in `meta`:

```typescript
const meta: Meta = {
  component: App,
  loaders: [(ctx) => void I.init(ctx)],
}
```

The `ctx` object contains `canvas`, `userEvent`, and `canvasElement` — everything the actor needs to interact with the rendered story.

#### Writing Tests with the Actor

Tests read like user stories via `play` functions:

```typescript
export const Default: Story = {
  name: 'Default',
  play: async () => {
    await I.seeArticleList()
  },
}

export const ArticleDetail: Story = {
  name: 'Article Detail',
  play: async () => {
    await I.clickArticle('Quarterly report')
    await I.seeArticleDetail('Quarterly report')
  },
}
```

### The Locator Dictionary (`loc`) Pattern

Every story file defines a `loc` object that collects all element locators in one place. This separates "how to find elements" from "what to do with them".

```typescript
const loc = {
  dashboardHeadingAppears: (canvas) =>
    canvas.findByRole('heading', { name: 'Dashboard' }),
  dashboardLoadingStateAppears: (canvas) =>
    canvas.findByRole('status', { name: 'Loading dashboard page' }),
  dashboardErrorHeadingAppears: (canvas) =>
    canvas.findByRole('heading', { name: 'Could not load dashboard' }),
  maybeDashboardErrorHeading: (canvas) =>
    canvas.queryByRole('heading', { name: 'Could not load dashboard' }),
  retryButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Try again' }),
} satisfies Record<string, Locator>
```

Naming conventions:

- **`findBy*` locators** (async, throws if not found) — name ends with `Appears` (e.g., `retryButtonAppears`). Used with `I.see()`.
- **`queryBy*` locators** (sync, returns `null` if absent) — name starts with `maybe` (e.g., `maybeDashboardErrorHeading`). Used with `I.dontSee()`.
- Locators that accept parameters are defined as functions returning a `Locator`:

```typescript
const loc = {
  button: (name: string | RegExp) => (canvas) =>
    canvas.findByRole('button', { name }),
  display: (value: string) => (canvas) =>
    canvas.findByText(value, { selector: 'span' }),
} satisfies Record<string, (name: any) => Locator>
```

### Writing Interaction Tests with Play Functions

Interaction tests simulate user flows within stories, treating the component as a black box.

1. **Define Stories with Initial States**:

   Use `args` to pass props that set up the component's initial rendering. Avoid hardcoding implementation-specific details; focus on user-visible props.

2. **Implement Play Functions**:

   Add a `play` function to stories. The play function receives a context object with `canvas`, `userEvent`, `args`, `step`, and `mount`:

   ```typescript
   import type { Meta, StoryObj } from '@storybook/your-framework'
   import { expect, fn } from 'storybook/test'
   import { LoginForm } from './LoginForm'

   const meta = {
     component: LoginForm,
     args: {
       onSubmit: fn(),
     },
   } satisfies Meta<typeof LoginForm>
   export default meta
   type Story = StoryObj<typeof meta>

   export const FilledForm: Story = {
     play: async ({ args, canvas, userEvent }) => {
       await userEvent.type(
         canvas.getByLabelText('Email'),
         'email@provider.com',
       )
       await userEvent.type(
         canvas.getByLabelText('Password'),
         'a-random-password',
       )
       await userEvent.click(canvas.getByRole('button', { name: 'Log in' }))

       await expect(args.onSubmit).toHaveBeenCalled()
     },
   }
   ```

   Key APIs (all imported from `storybook/test`, not `@storybook/test`):
   - `fn()` — creates spy functions for args
   - `expect` — combines Vitest's expect and @testing-library/jest-dom matchers
   - `mocked()` — type-safe wrapper for asserting on automocked functions
   - `userEvent` — provided as a play function parameter, simulates user interactions
   - `canvas` — provided as a play function parameter, scoped Testing Library queries

   **In this project**, tests are written as `play` functions on stories.

3. **Query Elements via Accessible Methods**:

   `canvas` provides Testing Library queries. Priority order (from most to least preferred):
   - `getByRole` / `findByRole` — accessible role (best for real user interaction)
   - `getByLabelText` — form labels
   - `getByPlaceholderText` — placeholder values
   - `getByText` — text content
   - `getByDisplayValue` — current input values
   - `getByAltText` — alt attributes
   - `getByTitle` — title attributes
   - `getByTestId` — last resort only

   Use `findBy*` variants for elements that appear asynchronously. Never use CSS selectors or test IDs unless unavoidable.

4. **Group Interactions with `step`**:

   ```typescript
   export const Submitted: Story = {
     play: async ({ args, canvas, step, userEvent }) => {
       await step('Enter credentials', async () => {
         await userEvent.type(canvas.getByLabelText('Email'), 'hi@example.com')
         await userEvent.type(canvas.getByLabelText('Password'), 'supersecret')
       })

       await step('Submit form', async () => {
         await userEvent.click(canvas.getByRole('button', { name: 'Log in' }))
       })
     },
   }
   ```

5. **Run Code Before Rendering with `mount`**:

   The `mount` function in the play context allows executing setup before the component renders:

   ```typescript
   import MockDate from 'mockdate'

   export const ChristmasUI: Story = {
     async play({ mount }) {
       MockDate.set('2024-12-25')
       await mount()
     },
   }
   ```

   You can also pass a component to `mount` to override the story's render function with dynamic data:

   ```typescript
   export const WithNote: Story = {
     play: async ({ mount, args, userEvent }) => {
       const note = await db.note.create({ data: { title: 'Test note' } });
       const canvas = await mount(<Page {...args} params={{ id: String(note.id) }} />);

       await userEvent.click(await canvas.findByRole('menuitem', { name: /login/i }));
     },
   };
   ```

### Experimental Test Syntax (Storybook 10)

Storybook 10 introduces an experimental `.test()` method that attaches tests directly to stories. Tests can be filtered out of the sidebar using tag exclusion, reducing clutter for non-technical collaborators. This feature is experimental and subject to changes. See the [RFC](https://github.com/storybookjs/storybook/discussions/30119) for discussion.

**This project uses `play` functions** for tests. With the `createMyself` actor, the play function delegates to `I` methods:

```typescript
export const Default: Story = {
  play: async () => {
    await I.see(loc.calculatorHeadingAppears)
  },
}
```

### Lifecycle Hooks

Storybook 10 provides lifecycle hooks at project, component, and story levels:

- **`beforeAll`** (project level in `.storybook/preview.ts`): runs once before any stories. Ideal for bootstrapping. Returns an optional cleanup function that runs before re-running or during teardown.

  ```typescript
  const preview: Preview = {
    async beforeAll() {
      await init()
    },
  }
  ```

- **`beforeEach`** (project, component, or story level): runs before each story renders. Returns an optional cleanup function that runs when the story unmounts or navigates away.

  ```typescript
  const meta = {
    component: Page,
    async beforeEach() {
      MockDate.set('2024-02-14')
      return () => {
        MockDate.reset()
      }
    },
  } satisfies Meta<typeof Page>
  ```

  `fn()` mocks are automatically restored before each story — no manual cleanup needed. See `parameters.test.restoreMocks` API for details.

- **`afterEach`** (project, component, or story level): runs after the story renders and the play function completes. Receives the story context. Do **not** use it to reset state (use `beforeEach`'s cleanup instead, to preserve the end state for debugging).

  ```typescript
  const meta = {
    component: Page,
    async afterEach(context) {
      console.log(`Tested ${context.name}`)
    },
  } satisfies Meta<typeof Page>
  ```

**Project-specific `beforeEach`**: The preview's `beforeEach` hook dynamically resizes the browser viewport to match the story's `globals.viewport` value (see [Responsive Viewport Testing](#responsive-viewport-testing)).

### Mocking Backend and Dependencies

Mocking ensures isolation from real backends, focusing tests on frontend rendering.

#### Network Mocking with MSW (Project Pattern)

MSW is not currently used in this project, but this section is documented for when network mocking is introduced.

Projects using **MSW v2** via `msw-storybook-addon` for network mocking typically initialize MSW in `.storybook/preview.tsx`:

```typescript
import type { Preview } from '@storybook/html'
import { initialize, mswLoader } from 'msw-storybook-addon'

initialize({
  onUnhandledRequest: 'bypass',
  quiet: true,
  serviceWorker: {
    url: `${import.meta.env['BASE_URL']}mockServiceWorker.js`,
  },
})

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    msw: { handlers: handlersArray },
  },
}

export default preview
```

Default handlers (defined in `src/app/mocks/handlers.ts`) aggregate per-entity mock handlers and serve happy-path responses for all API endpoints:

```typescript
import { articleHandlers } from '#entities/article/mocks/handlers'
import { dashboardHandlers } from '#entities/dashboard/mocks/handlers'
// ... etc.

export const handlersArray = [
  ...dashboardHandlers,
  ...articleHandlers,
  ...connectionHandlers,
  ...itemHandlers,
  ...conversationHandlers,
  ...timelineEventHandlers,
] satisfies RequestHandler[]
```

#### Overriding Handlers Per Story

Stories that test error or loading states override handlers via `parameters.msw.handlers`. The **first matching handler wins**, so place the override before the default array:

```typescript
import { http, HttpResponse } from 'msw'
import { handlersArray } from '#app/mocks/handlers'

const to500 = () => new HttpResponse(null, { status: 500 })

export const HandlesServerError: Story = {
  name: 'Server Error',
  parameters: {
    msw: {
      handlers: [http.get(articlesApiUrl, to500), ...handlersArray],
    },
  },
}
```

#### The Three Standard Network Scenarios

Every page with async data should have stories covering all three states:

1. **Success** — uses default handlers (no override needed):

```typescript
export const Default: Story = { name: 'Default' }
```

2. **Server Error** — returns HTTP 500:

```typescript
const to500 = () => new HttpResponse(null, { status: 500 })

export const HandlesServerError: Story = {
  name: 'Load Server Error',
  parameters: {
    msw: {
      handlers: [http.get(apiUrl, to500), ...handlersArray],
    },
  },
}
```

3. **Network Error** — request fails with a network-level error using `HttpResponse.error()` from MSW:

```typescript
const toNetworkError = () => HttpResponse.error()

export const FailsWithNetworkError: Story = {
  name: 'Network Error',
  parameters: {
    msw: {
      handlers: [http.get(apiUrl, toNetworkError), ...handlersArray],
    },
  },
}
```

#### Inline Handler Helpers

Short handler helpers like `to500` and `toNetworkError` are defined inline at the top of the story file, co-located with the stories that use them:

```typescript
const to500 = () => new HttpResponse(null, { status: 500 })
const toNetworkError = () => HttpResponse.error()
```

`HttpResponse.error()` is a built-in MSW v2 helper that produces a network-level failure (equivalent to the browser receiving no response at all — `fetch` rejects with a `TypeError`). This is distinct from an HTTP error response like 500, which still has a status code and body.

#### State Isolation via Reatom Context

This project does not use module-level mocking (`sb.mock()` or `vi.mock()`). Global state is reset between stories by recreating the Reatom context for every story render, as shown in the [Preview Setup](#preview-setup) section. `context.start()` creates a new Reatom context frame so every atom begins from its initial state. `clearStack()` in `beforeEach` flushes any pending effects left over from the previous story, and the cleanup callback unmounts the component tree after each story or test completes.

Network scenarios are controlled exclusively via MSW handlers (see the [MSW Integration](#msw-integration) section above).

<!--
TODO
### Responsive Viewport Testing

This project tests every feature at both desktop and mobile breakpoints. Viewport sizes are defined in `.storybook/viewports.ts` and match **Panda CSS breakpoints**:

| Name  | Width  | Panda rem |
| ----- | ------ | --------- |
| `sm`  | 640px  | 40rem     |
| `md`  | 768px  | 48rem     |
| `lg`  | 1024px | 64rem     |
| `xl`  | 1280px | 80rem     |
| `2xl` | 1536px | 96rem     |

The fallback (desktop) viewport is **1280×720**.

#### Creating Mobile Story Variants

Add a `globals.viewport` to the story:

```typescript
export const DefaultMobile: Story = {
  name: 'Default (Mobile)',
  globals: { viewport: { value: 'sm', isRotated: false } },
}
```

The preview's `beforeEach` hook reads this global and calls `page.viewport(width, height)` from `vitest/browser` to resize the actual browser window before the story renders.

#### Mobile Test Naming Convention

Prefix mobile test descriptions with `[mobile]`:

```typescript
export const DefaultMobile: Story = {
  name: 'Default (Mobile)',
  globals: { viewport: { value: 'sm', isRotated: false } },
  play: async () => {
    await I.seeArticleList()
  },
}
```

-->

### Scoped Detail Testing with `within()`

For pages with master-detail layouts, use `within()` from `storybook/test` to scope queries to a specific region:

```typescript
import { within } from 'storybook/test'

export const ArticleDetail: Story = {
  name: 'Article Detail',
  play: async () => {
    await I.clickArticle('Quarterly report')

    const detail = await I.resolveLocator(loc.detailRegionAppears)
    const detailCanvas = within(detail)
    await detailCanvas.findByRole('heading', { name: 'Quarterly report' })
    await detailCanvas.findByText(/Regional performance remained strongest/)
  },
}
```

The `detailRegionAppears` locator typically targets a landmark like `canvas.findByRole('main')`.

### Complete Story File Template

Putting all patterns together, here is the canonical structure for a new component story in this project:

```typescript
import type { Meta, StoryObj } from '@storybook/html'

import { MyComponent } from './MyComponent'
import { StoryWrapper } from '../shared/StoryWrapper'
import { createMyself, type Locator } from '../shared/test'
import { loadGalleryState } from '../shared/testSetup'
import { mockFolderTree } from '../__fixtures__/mockData'

// 1. Define locator dictionary
const loc = {
  headingAppears: (canvas) =>
    canvas.findByRole('heading', { name: 'My Component' }),
  actionButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Action' }),
} satisfies Record<string, Locator>

// 2. Create actor with page-specific actions
const I = createMyself((I) => ({
  seeContent: async () => {
    await I.see(loc.headingAppears)
  },
  clickAction: async () => {
    await I.click(loc.actionButtonAppears)
  },
}))

// 3. Define meta with actor init
const meta: Meta = {
  title: 'Components/MyComponent',
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

// 4. Success story + tests
export const Default: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return (
      <StoryWrapper>
        <MyComponent />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.seeContent()
  },
}

// 5. Interaction story
export const WithInteraction: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return (
      <StoryWrapper>
        <MyComponent />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.clickAction()
    await I.seeContent()
  },
}
```

### Running Tests

1. **Storybook UI**:

   The testing widget in the sidebar allows running component tests, accessibility tests, and visual tests with a single click. Expand the widget to toggle individual test types. Watch mode (eye icon) automatically re-runs relevant tests on code changes. Status indicators (pass/fail/error) appear next to each story in the sidebar. Click a failing indicator to jump to the Interactions panel debugger.

2. **CLI** (recommended for CI):

   ```json
   {
     "scripts": {
       "test": "vitest",
       "test-storybook": "vitest --project=storybook",
       "test:unit": "vitest --project=unit"
     }
   }
   ```

   ```bash
   npm run test-storybook
   ```

   The `--project=storybook` flag runs only Storybook tests. When `storybookScript` is configured, Vitest watch mode auto-starts Storybook and provides links to failing stories.

3. **Editor Extensions**:

   The Vitest addon integrates with IDE tools like the [VSCode Vitest extension](https://marketplace.visualstudio.com/items?itemName=vitest.explorer). Stories are annotated with test status, and failing tests provide direct links to the story for debugging.

4. **Tag-Based Test Filtering**:

   Use tags to include, exclude, or skip stories from test runs:

   ```typescript
   // In a story file
   const meta = {
     component: Button,
     tags: ['stable'],
   } satisfies Meta<typeof Button>

   export const Experimental: Story = {
     tags: ['!stable', 'experimental'],
   }
   ```

   ```typescript
   // In vitest.config.ts plugin options
   storybookTest({
     tags: {
       include: ['test'],
       exclude: ['experimental'],
       skip: ['flaky'],
     },
   })
   ```

   - `include`: stories with these tags are tested (default: `['test']`)
   - `exclude`: stories with these tags are not tested and not counted
   - `skip`: stories with these tags are not tested but are counted in results

5. **Debugging**:

   The Interactions panel provides a step-by-step debugger for play functions. You can pause, resume, rewind, and step through each interaction. Any test failures show the exact point of failure. Because Storybook is a web app, anyone with the URL can reproduce failures without additional setup.

### Portable Stories for External Test Environments

Reuse stories in Vitest, Jest, or Playwright CT via the Portable Stories API:

```typescript
// test/Button.test.ts
import { composeStories } from '@storybook/your-framework'
import * as stories from '../stories/Button.stories'

const { Primary } = composeStories(stories)

test('Button renders correctly', async () => {
  await Primary.run()
  expect(document.body.firstChild).toMatchSnapshot()
})
```

This is useful for snapshot testing, error assertion, or running stories in environments outside of the Vitest addon.

### Additional Testing Layers

1. **Accessibility Testing**:

   Install `@storybook/addon-a11y` (powered by axe-core, catches up to 57% of WCAG issues automatically). When combined with the Vitest addon, a11y tests run alongside component tests.

   Configure test behavior per story/component/project with `parameters.a11y.test`:
   - `'error'` — violations fail the test (recommended for CI)
   - `'todo'` — violations produce warnings in Storybook UI only (useful as a TODO marker)
   - `'off'` — no a11y tests (for stories demonstrating antipatterns)

   Recommended workflow: set `'error'` globally, mark known-issue components as `'todo'`, fix them progressively, then remove the override.

   **In this project**, the global default is `'todo'` (`parameters.a11y.test: 'todo'` in preview). Progressively promote components to `'error'` as a11y issues are resolved.

2. **Visual Testing**:

   Use Chromatic or the Visual tests addon to compare rendered screenshots against baselines. Visual tests run independently from component tests and can be triggered from the testing widget.

3. **Snapshot Testing**:

   Use the Portable Stories API to render stories and compare DOM snapshots. Storybook recommends visual tests or interaction tests over snapshot tests for UI components, as snapshots are noisy and hard to review. Reserve snapshot tests for edge cases like error assertions.

4. **Coverage**:

   The Vitest addon can calculate project coverage provided by your stories. Run with Vitest's built-in coverage support — no separate `@storybook/addon-coverage` needed for Vite projects.

   This project uses **v8** coverage provider. Story files and the styled-system are excluded from coverage metrics. Threshold values are configured via environment variables (`COVERAGE_THRESHOLD_LINES`, etc.).

### CI/CD Integration

Add scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test-storybook": "vitest --project=storybook",
    "test:unit": "vitest --project=unit",
    "test-storybook:ci": "vitest run --project=storybook"
  }
}
```

For debugging test failures in CI, configure `storybookUrl` in the plugin to point to a published Storybook. Failing tests will include direct links to the relevant story.

Use tags to create different test suites:

```bash
# Run only stable tests
vitest run --project=storybook
```

### Legacy: Test Runner

The `@storybook/test-runner` (Jest-based) is still supported for non-Vite frameworks but is considered legacy. Key differences:

| Feature                    | Vitest addon       | test-runner         |
| -------------------------- | ------------------ | ------------------- |
| Requires running Storybook | No                 | Yes                 |
| Tests run via              | Vitest             | Jest                |
| Storybook UI integration   | Yes                | No                  |
| Editor extensions          | Yes                | No                  |
| Visual tests               | Yes                | No                  |
| Works without Vite         | No (requires Vite) | Yes (any framework) |

For new Vite-based projects, always prefer the Vitest addon.

### Common Pitfalls and Tips

- **Always `await`**: Every `userEvent` call and `expect` assertion inside play functions must be awaited. This ensures proper logging and debugging in the Interactions panel.
- **Prefer Accessible Queries**: Use `getByRole`, `getByLabelText`, `findByText` when possible. When raw DOM access is unavoidable (e.g. `querySelector` for elements without accessible roles), encapsulate it in a named actor action so `play` functions remain readable.
- **Flakiness**: Use stable mocks, `findBy*` for async elements, and consistent test data. `fn()` mocks are auto-restored between stories.
- **ESM-only**: Storybook 10 does not support CommonJS. Ensure your project and all mocked modules use ESM.
- **Mock File Format**: `__mocks__` files must be JavaScript ESM (not TypeScript, not CJS).
- **Scalability**: Keep stories focused; use tags to categorize and filter.
- **Team Collaboration**: Co-locate tests with stories. Share Storybook URLs for reproducing failures. Use the QR code in the sharing menu for mobile testing.
- **For LLM Agents**: Provide story files as input; instruct to generate play functions or `.test()` calls based on user flows described in natural language.
- **Reatom context isolation**: Each story gets its own `context.start()` frame. Never share Reatom state between stories. The decorator in preview handles this automatically.
- **MSW handler ordering**: When overriding handlers, always put the specific override **before** the spread of `handlersArray`. MSW uses first-match semantics.
- **Network error vs server error**: Use `() => HttpResponse.error()` to simulate a network-level failure (fetch rejects with `TypeError`). Use `() => new HttpResponse(null, { status: 500 })` for an HTTP error response. Both helpers are defined inline in the story file — no shared utility needed.
- **`loc` naming**: Use `...Appears` suffix for `findBy*` locators and `maybe...` prefix for `queryBy*` locators. This makes intent immediately clear in test bodies.
- **Mobile variant duplication**: Always create a mobile variant for every desktop story. Name the story `"... (Mobile)"` and prefix test names with `[mobile]`.

For the latest updates, refer to [Storybook's official docs](https://storybook.js.org/docs) and the [Storybook 10 blog post](https://storybook.js.org/blog/storybook-10/).
