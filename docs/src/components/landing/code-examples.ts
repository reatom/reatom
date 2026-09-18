export const CODE_EXAMPLES = [
  {
    id: 'counter',
    title: 'Base API',
    description: 'Base building blocks example',
    code: `import { atom, computed, effect } from '@reatom/core'

const counter = atom(0).extend((target) => ({
  increment: (amount = 1) => target.set((prev) => prev + amount),
  decrement: (amount = 1) => target.set((prev) => prev - amount),
  reset: () => target.set(0),
}))

const isEven = computed(() => counter() % 2 === 0)

effect(() => console.log(isEven()))
// log: false

counter.increment()
// log: true

counter.decrement(2)
// log nothing (memoized)`,
    annotations: [
      {
        pattern: 'atom(0)',
        note: 'Create a state container',
      },
      {
        pattern: '.extend',
        note: 'Extend atom with methods (optional)',
      },
      {
        pattern: 'computed(',
        note: 'Create a derived memoized state',
      },
      {
        pattern: 'effect(',
        note: 'Create a side-effect which is called when any atom inside it is changed',
      },
    ],
  },
  {
    id: 'data-loading',
    title: 'Framework bindings',
    description: 'Data loading and binding to UI (React)',
    code: `import { atom } from "@reatom/core"
import { reatomComponent } from "@reatom/react"

const data = atom([])
  .extend(() => ({
    isLoading: atom(false),
  }))
  .extend((target) => ({
    async load() {
      target.isLoading.set(true)
      const payload = await api.getData()
      target.set(payload)
      target.isLoading.set(false)
    },
  }))

const UserPage = reatomComponent(() => {
  if (data.isLoading()) return <div>Loading...</div>

  return (
    <ul>
      {data().map((item) => (
        <li key={item.id}>{item.value}</li>
      ))}
    </ul>
  )
})`,
    annotations: [
      {
        pattern: '@reatom/react',
        note: 'Check our docs, we have bindings for all popular frameworks!',
      },
      {
        pattern: '.extend',
        note: 'Extend the atom with additional state ("Atomization")',
      },
      {
        pattern: 'reatomComponent(',
        note: 'This is just a computed with React bindings (hooks allowed)',
      },
      {
        pattern: 'data()',
        note: 'Use state conditionally, even after the early return, no hook rules!',
      },
    ],
  },
  {
    id: 'forms',
    title: 'Forms',
    description: 'An example of a reactive form model',
    code: `import { reatomForm } from '@reatom/core'
import { reatomComponent, bindField } from '@reatom/react'
import { Button, TextInput, PasswordInput, Stack } from '@mantine/core'

export const loginForm = reatomForm({
  username: '',
  password: '',
}, {
  validateOnBlur: true,
  onSubmit: async (values) => { 
    return await api.login(values)
  },
})

export const LoginForm = reatomComponent(() => {
  const { submit, fields } = loginForm
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Stack>
        <TextInput
          label="Username"
          placeholder="Enter your username"
          {...bindField(fields.username)}
        />

        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          {...bindField(fields.password)}
        />

        <Button type="submit" loading={!submit.ready()}>
          Login
        </Button>
      </Stack>
    </form>
  )
})`,
    annotations: [
      {
        pattern: 'loginForm',
        note: "Declare the form model outside of the UI, describe it's default values and submit function",
      },
      {
        pattern: 'submit()',
        note: 'Trigger async submission function declared above in the model',
      },
      {
        pattern: '...bindField(',
        note: 'Bind field to the UI component and pass the error state there',
      },
      {
        pattern: 'loading={!submit.ready()}',
        note: 'Turning the button to loading state until the submission is completed',
      },
    ],
  },
  {
    id: 'routing',
    title: 'Routing',
    description: 'Route render, params, and loaders',
    code: `import { computed, reatomRoute, wrap } from '@reatom/core'
import { z } from 'zod'

export const layoutRoute = reatomRoute({
  layout: true,
  render({ outlet }) {
    return <AppShell>{outlet()}</AppShell>
  },
})

export const goodsRoute = layoutRoute.reatomRoute({
  path: 'goods/:category/:brand',
  search: z.object({
    sort: z.enum(['asc', 'desc']).optional(),
  }),
  async loader({ category, brand, sort }) {
    return await wrap(api.getGoods({ category, brand, sort }))
  },
  render(self) {
    const { isFirstPending, data, error } = self.loader.status()

    if (isFirstPending) return <div>Loading...</div>
    if (error) return <div>Error: {error.message}</div>

    const title = \`\${self().category} / \${self().brand}\`
    const items = data ?? []

    return <GoodsTable title={title} items={items} />
  },
})

export const app = computed(() => layoutRoute.render(), 'app')`,
    annotations: [
      {
        pattern: 'layout: true',
        note: 'Layout routes stay mounted and render active children through outlet()',
      },
      {
        pattern: '.reatomRoute({',
        note: 'Nest routes under a parent layout, inheriting the composed path and params',
      },
      {
        pattern: 'search: z.object',
        note: 'Validate and type search params with a schema',
      },
      {
        pattern: 'async loader',
        note: 'Load data automatically when the route matches, with abort on navigation',
      },
      {
        pattern: 'self.loader.status()',
        note: 'Read loading, data, and error state directly from the route loader',
      },
      {
        pattern: 'layoutRoute.render()',
        note: 'Render the whole app from the root route instead of manual route checks in components',
      },
    ],
  },
]
