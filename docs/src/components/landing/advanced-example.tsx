import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { cn } from '../../lib/utils'
import { CopyButton } from '../../components/ui/copy-button'

const advancedExamples = [
  {
    name: 'Data Fetching',
    code: `import { atom, action } from '@reatom/core'
import { createQuery, withCache, withRetry } from '@reatom/async'
import { useAtom } from '@reatom/react'

// Create a query with built-in caching and retry
const usersQuery = createQuery(
  withCache(
    withRetry(
      async () => {
        const response = await fetch('https://api.example.com/users')
        if (!response.ok) throw new Error('Failed to fetch users')
        return response.json()
      },
      { attempts: 3, delay: 1000 }
    ),
    { ttl: 60000 } // 1 minute cache
  )
)

// Create a filter atom
const filterAtom = atom('', 'filterAtom')

// Create a derived atom for filtered users
const filteredUsersAtom = atom((ctx) => {
  const users = ctx.spy(usersQuery)
  const filter = ctx.spy(filterAtom)
  
  if (!users?.data) return []
  
  return users.data.filter(user => 
    user.name.toLowerCase().includes(filter.toLowerCase())
  )
}, 'filteredUsers')

// React component
function UsersList() {
  const [users, { isLoading, error }] = useAtom(filteredUsersAtom)
  const [filter, setFilter] = useAtom(filterAtom)
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      <input 
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter users..."
      />
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}`
  },
  {
    name: 'Form Handling',
    code: `import { atom, action } from '@reatom/core'
import { useAtom, useAction } from '@reatom/react'

// Form state atoms
const formAtom = atom({
  name: '',
  email: '',
  message: ''
}, 'formAtom')

// Validation atoms
const errorsAtom = atom((ctx) => {
  const form = ctx.spy(formAtom)
  const errors = {}
  
  if (!form.name) errors.name = 'Name is required'
  if (!form.email) errors.email = 'Email is required'
  else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(form.email)) {
    errors.email = 'Invalid email format'
  }
  if (!form.message) errors.message = 'Message is required'
  
  return errors
}, 'errorsAtom')

// Form validity atom
const isValidAtom = atom((ctx) => {
  const errors = ctx.spy(errorsAtom)
  return Object.keys(errors).length === 0
}, 'isValidAtom')

// Submit action
const submitForm = action(async (ctx) => {
  const form = ctx.get(formAtom)
  const isValid = ctx.get(isValidAtom)
  
  if (!isValid) return
  
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    
    if (!response.ok) throw new Error('Failed to submit form')
    
    // Reset form on success
    ctx.set(formAtom, { name: '', email: '', message: '' })
    
    return await response.json()
  } catch (error) {
    console.error('Form submission error:', error)
    throw error
  }
}, 'submitForm')

// React component
function ContactForm() {
  const [form, setForm] = useAtom(formAtom)
  const [errors] = useAtom(errorsAtom)
  const [isValid] = useAtom(isValidAtom)
  const handleSubmit = useAction(submitForm)
  
  const updateField = (field, value) => {
    setForm({ ...form, [field]: value })
  }
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleSubmit()
    }}>
      <div>
        <input
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Name"
        />
        {errors.name && <p>{errors.name}</p>}
      </div>
      
      <div>
        <input
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="Email"
        />
        {errors.email && <p>{errors.email}</p>}
      </div>
      
      <div>
        <textarea
          value={form.message}
          onChange={(e) => updateField('message', e.target.value)}
          placeholder="Message"
        />
        {errors.message && <p>{errors.message}</p>}
      </div>
      
      <button type="submit" disabled={!isValid}>
        Submit
      </button>
    </form>
  )
}`
  },
  {
    name: 'State Persistence',
    code: `import { atom, action, createCtx } from '@reatom/core'
import { persistAtom } from '@reatom/persist'
import { reatomContext } from '@reatom/react'

// Create a context
const ctx = createCtx()

// Create atoms for app state
const themeAtom = atom('light', 'themeAtom')
const userPreferencesAtom = atom({
  notifications: true,
  language: 'en',
  fontSize: 'medium'
}, 'userPreferencesAtom')

// Persist atoms to localStorage
persistAtom(ctx, themeAtom, {
  key: 'app-theme',
  storage: localStorage
})

persistAtom(ctx, userPreferencesAtom, {
  key: 'user-preferences',
  storage: localStorage
})

// Actions to update preferences
const updateTheme = action((ctx, theme) => {
  ctx.set(themeAtom, theme)
  
  // Apply theme to document
  document.documentElement.setAttribute('data-theme', theme)
}, 'updateTheme')

const updatePreference = action((ctx, key, value) => {
  const prefs = ctx.get(userPreferencesAtom)
  ctx.set(userPreferencesAtom, {
    ...prefs,
    [key]: value
  })
}, 'updatePreference')

// Initialize theme from storage on app start
const storedTheme = localStorage.getItem('app-theme')
if (storedTheme) {
  ctx.dispatch(updateTheme(JSON.parse(storedTheme)))
}

// React component
function SettingsPanel() {
  const [theme] = useAtom(themeAtom)
  const [preferences] = useAtom(userPreferencesAtom)
  const handleThemeChange = useAction(updateTheme)
  const handlePrefChange = useAction(updatePreference)
  
  return (
    <div>
      <div>
        <h3>Theme</h3>
        <select 
          value={theme} 
          onChange={(e) => handleThemeChange(e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
      
      <div>
        <h3>Notifications</h3>
        <input
          type="checkbox"
          checked={preferences.notifications}
          onChange={(e) => handlePrefChange('notifications', e.target.checked)}
        />
      </div>
      
      <div>
        <h3>Language</h3>
        <select
          value={preferences.language}
          onChange={(e) => handlePrefChange('language', e.target.value)}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </div>
    </div>
  )
}`
  }
]

export function AdvancedExample() {
  const [activeTab, setActiveTab] = useState('Data Fetching')

  return (
    <section className="py-24">
      <div className="container">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Advanced Patterns</h2>
          <p className="mx-auto max-w-[700px] text-lg">
            Reatom scales with your application, providing powerful patterns for complex state
            management.
          </p>
        </div>

        <div className="mx-auto max-w-4xl flex flex-col items-center">
          <Tabs defaultValue="Data Fetching" value={activeTab} onValueChange={setActiveTab}>
            <div className="mb-4">
              <TabsList className="border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                {advancedExamples.map((example) => (
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
            <div className="max-w-[30rem] md:max-w-full">
            {advancedExamples.map((example) => (
              <TabsContent
                key={example.name}
                value={example.name}
                className="rounded-lg border border-zinc-200 bg-white p-0 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <div className="font-mono text-sm">{example.name}</div>
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
                  <code className="text-sm">{example.code}</code>
                </pre>
              </TabsContent>
            ))}
            </div>
          </Tabs>
        </div>
      </div>
    </section>
  )
}
