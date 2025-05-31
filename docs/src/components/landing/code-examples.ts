export const CODE_EXAMPLES = [
  {
    id: 'counter',
    title: 'Base API',
    description: 'Base building blocks example',
    code: `import { atom, computed } from '@reatom/core'

const counter = atom(0).actions((target) => ({
  increment: (amount = 1) => target.set((prev) => prev + amount),
  decrement: (amount = 1) => target.set((prev) => prev - amount),
  reset: () => target.set(0),
}))

const isEven = computed(() => counter() % 2 === 0)

isEven.subscribe((state) => console.log(state))
// log: false

counter.increment()
// log: true

counter.decrement(2)
// log nothing`,
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
        note: 'Create a derived state',
      },
      {
        pattern: 'subscribe(',
        note: 'Activate the computed and receive changes',
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
    loading: atom(false),
  }))
  .actions((target) => ({
    async load() {
      target.loading.set(true)
      const payload = await api.getData()
      target.set(payload)
      target.loading.set(false)
    },
  }))

const UserPage = reatomComponent(() => {
  if (data.loading()) return <div>Loading...</div>

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
