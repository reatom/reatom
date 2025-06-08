export const CODE_EXAMPLES = [
  {
    id: 'counter',
    title: 'Base API',
    description: 'Base building blocks example',
    code: `import { atom, computed, effect } from '@reatom/core'

const counter = atom(0).actions((target) => ({
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
        pattern: 'actions(',
        note: 'Assign relative actions (optional)',
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
  .actions((target) => ({
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
        note: 'This is just a computed with React bindings',
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
    description: 'Routing and data fetching example',
    code: `import { route } from "@reatom/core"
import { reatomComponent } from "@reatom/react"

export const goodsRoute = route("goods/:category")

export const goodsBrandRoute = goodsRoute.route({
  path: ":brand",
  search: z.object({
    sort: z.enum(["asc", "desc"]).optional(),
  }),
  async loader(params) {
    const url = \`/api/goods/\${params.category}/\${params.brand}?sort=\${params.sort}\`
    const resp = await fetch(url)
    return resp.json()
  },
})

export const BrandGoodsTable = reatomComponent(() => {
  const { data, error, ready } = goodsBrandRoute.loader
  if (!ready()) {
    return <div>Loading...</div>
  }

  if (error()) {
    return <div>Error: {error().message}</div>
  }

  return (
    <Table>
      {data().map((item) => (
        <Table.Row key={item.id}>
          <Table.Cell>{item.id}</Table.Cell>
          <Table.Cell>{item.name}</Table.Cell>
          <Table.Cell>{item.price}</Table.Cell>
        </Table.Row>
      ))}
    </Table>
  )
})`,
    annotations: [
      {
        pattern: 'route("goods/:category")',
        note: 'Match path, params types will be inferred',
      },
      {
        pattern: '.route({',
        note: 'Nest sub-path, with all related parent params',
      },
      {
        pattern: 'search: z.',
        note: 'Define search params schema (optional)',
      },
      {
        pattern: 'async loader',
        note: 'Define a data loader',
      },
      {
        pattern: '{ data, error, ready }',
        note: 'Track the loader state',
      },
    ],
  },
]
