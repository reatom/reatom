# Reatom

**Reatom is the ultimate logic and state manager for small widgets and huge SPAs.**

A powerful reactive state management library designed to become your go-to resource for building anything from tiny libraries to full-blown applications.

## Key Features

- **Simple and powerful abstractions**  
  Only a few core primitives: `atom` and `computed`, `action` and `effect`. All other features work on top of that.

- **Explicit reactivity without proxies**  
  Direct, predictable state management with atomization patterns for maximum performance.

- **Perfect effects management**  
  Advanced async handling with caching, retrying, and automatic cancellation using native `await` and `AbortController`.

- **Excellent debugging experience**  
  Built-in logging and immutable cause tracking for complex async flows.

- **Composable extensions**  
  Enhance atoms and actions with ready-made solutions for async operations, persistence, caching, and more.

- **Framework-agnostic**  
  Adapters for many frameworks and libraries.

- **Smallest bundle size**  
  [2 KB](https://bundlejs.com/?q=%40reatom%2Fcore) gzipped for core.

- **Best TypeScript experience**  
  Top type inference with excellent type safety throughout.

## Installation

```bash
npm install @reatom/core @reatom/react
```

## Quick Start

### Basic Example

```typescript
import { atom, computed } from '@reatom/core'
import { reatomComponent } from '@reatom/react'

const counter = atom(0)
const isEven = computed(() => counter() % 2 === 0)

const Counter = reatomComponent(() => (
  <section>
    <p>
      {counter()} is {isEven() ? 'even' : 'odd'}
    </p>
    <button onClick={() => counter.set(v => v + 1)}>Increment</button>
  </section>
))
```

### Core Primitives

#### Atom

The base state container:

```typescript
import { atom } from '@reatom/core'

const counter = atom(0)

console.log(counter()) // 0

counter.set(1)
console.log(counter()) // 1

counter.set((state) => state + 5)
console.log(counter()) // 6
```

#### Computed

Lazy memoized computations:

```typescript
import { atom, computed } from '@reatom/core'

const counter = atom(0)
const isEven = computed(() => counter() % 2 === 0)

console.log(isEven()) // true

counter.set(1)
console.log(isEven()) // false
```

#### Effect

React to state changes immediately:

```typescript
import { atom, computed, effect } from '@reatom/core'

const counter = atom(0)
const isEven = computed(() => counter() % 2 === 0)

effect(() => {
  console.log(`${counter()} is ${isEven() ? 'even' : 'odd'}`)
})
```

### Actions and Organization

Actions help organize complex operations:

```typescript
import { atom } from '@reatom/core'

export const list = atom([], 'list').extend((target) => ({
  isLoading: atom(false, `${target.name}.isLoading`),
  async load(page: number) {
    target.isLoading.set(true)
    const response = await fetch(`/api/list?page=${page}`)
    const payload = await response.json()
    target.set(payload)
    target.isLoading.set(false)
  },
}))

list.load(1)
console.log(list.isLoading())
```

### Extensions

Enhance atoms and actions with composable extensions:

```typescript
import { atom, computed, withAsyncData, withSearchParams } from '@reatom/core'

const search = atom('', 'search').extend(withSearchParams('search'))
const page = atom(1, 'page').extend(withSearchParams('page'))

const listResource = computed(async () => {
  const response = await fetch(`/api/data?search=${search()}&page=${page()}`)
  return await response.json()
}, 'listResource').extend(withAsyncData({ initState: [] }))

listResource.ready() // false during fetch
listResource.data() // the fetch result
listResource.error() // Error or undefined
```

### Forms

Type-safe form management:

```typescript
import { reatomForm } from '@reatom/core'

const loginForm = reatomForm(
  {
    username: '',
    password: '',
    passwordDouble: '',
  },
  {
    validate({ password, passwordDouble }) {
      if (password !== passwordDouble) {
        return 'Passwords do not match'
      }
    },
    onSubmit: async (values) => {
      return await api.login(values)
    },
    validateOnBlur: true,
    name: 'loginForm',
  },
)
```

Using in React:

```tsx
import { reatomComponent, bindField } from '@reatom/react'

const LoginForm = reatomComponent(() => {
  const { submit, fields } = loginForm

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        loginForm.submit()
      }}
    >
      <input {...bindField(fields.username)} />
      <input {...bindField(fields.password)} type="password" />
      <input {...bindField(fields.passwordDouble)} type="password" />
      <button type="submit" disabled={!submit.ready()}>
        Login
      </button>
    </form>
  )
})
```

### Routing

Manage routes and state lifecycles:

```typescript
import { reatomRoute, reatomForm } from '@reatom/core'

export const loginRoute = reatomRoute({
  path: '/login',
  async loader() {
    const loginForm = reatomForm(
      { username: '', password: '' },
      {
        onSubmit: async (values) => await api.login(values),
        name: 'loginForm',
      },
    )

    return { loginForm }
  },
})

const LoginPage = reatomComponent(() => {
  if (!loginRoute.loader.ready()) return <div>Loading...</div>

  const { loginForm } = loginRoute.loader.data()

  return <form>{/* your form */}</form>
})
```

## Template

For a fast start, use our template with React and Mantine:

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/reatom/reatom/tree/v1001/examples/react-search)

## Documentation

- [Getting Started](https://www.reatom.dev/start/) - Learn the basics
- [Guides](https://www.reatom.dev/guides/) - Advanced use cases
- [Reference](https://www.reatom.dev/reference/) - Complete API documentation
- [Handbook](https://www.reatom.dev/handbook/) - In-depth patterns and concepts

## Community

- [Twitter](https://twitter.com/ReatomJS)
- [Discord](https://discord.gg/EPAKK5SNFh)
- [GitHub Discussions](https://github.com/reatom/reatom/discussions)
- [Telegram (RU)](https://t.me/reatom_ru)
- [YouTube (RU)](https://www.youtube.com/playlist?list=PLXObawgXpIfxERCN8Lqd89wdsXeUHm9XU)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE.md)

## Credits

Special thanks to:

- [React](https://reactjs.org), [Redux](https://redux.js.org), [Effector](https://effector.dev/), and [$mol](https://github.com/hyoo-ru/mam_mol) for inspiration
- [Quokka](https://wallabyjs.com/oss/) and [vitest](https://vitest.dev/) for testing experience
- [Astro](https://astro.build) for documentation framework
- [Vercel](https://vercel.com/) for hosting and CI/CD
- All our [contributors](https://github.com/reatom/reatom/graphs/contributors) and maintainers

---

**Good primitive is more than a framework**
