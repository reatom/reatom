import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { cn } from '../../lib/utils'
import { CopyButton } from '../../components/ui/copy-button'
// import { Code } from '@/components/shiki'
// import { Popup, PopupContent, PopupTrigger } from 'fumadocs-twoslash/ui'
// import { CodeBlock } from 'fumadocs-ui/components/codeblock'

const examples = [
  {
    name: 'Basic',
    code: `import { atom, createCtx } from '@reatom/core'

// Create a context
const ctx = createCtx()

// Create an atom with initial state
const counterAtom = atom(0, 'counterAtom')

// Read the atom value
const count = ctx.get(counterAtom) // 0

// Update the atom value
ctx.set(counterAtom, count + 1)

// Read the updated value
const newCount = ctx.get(counterAtom) // 1`
  },
  {
    name: 'Actions',
    code: `import { atom, action, createCtx } from '@reatom/core'

// Create a context
const ctx = createCtx()

// Create an atom
const counterAtom = atom(0, 'counterAtom')

// Create an action
const increment = action((ctx, step = 1) => {
  const currentCount = ctx.get(counterAtom)
  ctx.set(counterAtom, currentCount + step)
}, 'increment')

// Call the action
ctx.dispatch(increment(2))

// Read the updated value
const count = ctx.get(counterAtom) // 2`
  },
  {
    name: 'React',
    code: `import { atom, action } from '@reatom/core'
import { useAtom, useAction } from '@reatom/react'

// Create an atom
const counterAtom = atom(0, 'counterAtom')

// Create an action
const increment = action((ctx, step = 1) => {
  const currentCount = ctx.get(counterAtom)
  ctx.set(counterAtom, currentCount + step)
}, 'increment')

function Counter() {
  // Use the atom in a component
  const [count] = useAtom(counterAtom)
  
  // Get the bound action
  const handleIncrement = useAction(increment)
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => handleIncrement(1)}>
        Increment
      </button>
    </div>
  )
}`
  },
  {
    name: 'Async',
    code: `import { atom, action } from '@reatom/core'
import { connectAtom } from '@reatom/async'

// Create an atom for the data
const usersAtom = atom([], 'usersAtom')

// Create an atom for loading state
const loadingAtom = atom(false, 'loadingAtom')

// Create an async action
const fetchUsers = action(async (ctx) => {
  // Set loading state
  ctx.set(loadingAtom, true)
  
  try {
    // Fetch data
    const response = await fetch('https://api.example.com/users')
    const users = await response.json()
    
    // Update the atom with fetched data
    ctx.set(usersAtom, users)
  } finally {
    // Reset loading state
    ctx.set(loadingAtom, false)
  }
}, 'fetchUsers')

// Connect the async action to the atom
connectAtom(usersAtom, fetchUsers)`
  }
]

export function CodeExamples() {
  const [activeTab, setActiveTab] = useState('Basic')

  return (
    <section id="examples" className="py-24">
      <div className="container">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Simple API</h2>
          <p className="mx-auto max-w-[700px] text-lg">
            Reatom provides a clean, intuitive API that&apos;s easy to learn and use.
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          <Tabs defaultValue="Basic" value={activeTab} onValueChange={setActiveTab}>
            <div className="mb-4">
              <TabsList className="border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                {examples.map((example) => (
                  <TabsTrigger
                    key={example.name}
                    value={example.name}
                    className={cn(
                      'data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800',
                      'data-[state=active]:border-primary data-[state=active]:border-b-2'
                    )}
                  >
                    {example.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {examples.map((example) => (
              <TabsContent
                key={example.name}
                value={example.name}
                className="rounded-lg border border-zinc-200 bg-white p-0 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <div className="font-mono text-sm">{example.name} Example</div>
                  <div className="flex items-center space-x-2">
                    <CopyButton text={example.code} />
                    <div className="flex space-x-1">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                </div>
                <pre className="overflow-x-auto p-4">
                    {/* <Code lang="ts">{example.code}</Code> */}
                    {/* <CodeBlock lang="ts">
                      {```ts twoslash
                        console.log('Hello World');
```}
                    </CodeBlock> */}
                </pre>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* TODO: uncomment if needed */}
        {/* <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          <AnimatedCard>
            <h3 className="mb-4 text-xl font-bold">Smallest Bundle Size</h3>
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              Only 2KB gzipped for the core package. The entire ecosystem with enterprise-level
              helpers takes only ~15KB.
            </p>
            <div className="flex items-center gap-2">
              <Package className="text-primary h-4 w-4" />
              <span className="text-sm font-medium">2KB Core / 15KB Full</span>
            </div>
          </AnimatedCard>

          <AnimatedCard>
            <h3 className="mb-4 text-xl font-bold">TypeScript First</h3>
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              Perfect type inference is one of our main priorities. Get autocomplete and type
              checking for all your state.
            </p>
            <div className="flex items-center gap-2">
              <Code className="text-primary h-4 w-4" />
              <span className="text-sm font-medium">100% Type Safe</span>
            </div>
          </AnimatedCard>

          <AnimatedCard>
            <h3 className="mb-4 text-xl font-bold">Framework Agnostic</h3>
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              Works with any UI framework. First-class bindings for React, Vue, Svelte, and more.
            </p>
            <div className="flex items-center gap-2">
              <Layers className="text-primary h-4 w-4" />
              <span className="text-sm font-medium">Use Anywhere</span>
            </div>
          </AnimatedCard>
        </div> */}
      </div>
    </section>
  )
}
