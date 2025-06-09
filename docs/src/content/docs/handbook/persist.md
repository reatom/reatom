---
title: State Persistence
description: Persist atom state across browser sessions with flexible storage backends
---

State persistence allows your application to maintain state across browser sessions, page refreshes, and even different tabs. Reatom's persist system provides a flexible and powerful way to save and restore atom state using various storage backends.

## Quick Start

The simplest way to add persistence to an atom is using the `reatomPersist` extension:

```typescript
import { atom } from '@reatom/core'
import { createMemStorage, reatomPersist } from '@reatom/core/persist'

// Create a storage backend
const storage = createMemStorage({ name: 'my-app' })
const withPersist = reatomPersist(storage)

// Create a persistent atom
const counterAtom = atom(0, 'counter').extend(withPersist('counter-key'))

// The value is automatically saved and restored
counterAtom.set(42)
// After page refresh, counterAtom() will return 42
```

## Storage Backends

Reatom provides built-in storage options and supports custom storage implementations:

### Memory Storage (Built-in)

Perfect for testing and development:

```typescript
import { createMemStorage } from '@reatom/core/persist'

const storage = createMemStorage({
  name: 'my-app',
  snapshot: { // Optional: pre-populate with data
    'user-name': 'John Doe',
    'theme': 'dark'
  }
})
```

### Custom Storage

Implement any storage backend by following the `PersistStorage` interface:

```typescript
import { PersistStorage } from '@reatom/core/persist'

// Example: localStorage implementation
const createLocalStorage = (name: string): PersistStorage => ({
  name,
  get: (key) => {
    const item = localStorage.getItem(`${name}:${key}`)
    return item ? JSON.parse(item) : null
  },
  set: (key, record) => {
    localStorage.setItem(`${name}:${key}`, JSON.stringify(record))
  },
  clear: (key) => {
    localStorage.removeItem(`${name}:${key}`)
  }
})

// Example: async storage (IndexedDB, API, etc.)
const createAsyncStorage = (): PersistStorage => ({
  name: 'async-storage',
  get: async (key) => {
    const response = await fetch(`/api/storage/${key}`)
    return response.ok ? await response.json() : null
  },
  set: async (key, record) => {
    await fetch(`/api/storage/${key}`, {
      method: 'POST',
      body: JSON.stringify(record)
    })
  }
})
```

## Configuration Options

The persist extension accepts either a simple key string or a configuration object:

```typescript
// Simple key
const simpleAtom = atom(0).extend(withPersist('my-key'))

// Full configuration
const configuredAtom = atom({ name: '', age: 0 }).extend(
  withPersist({
    key: 'user-data',
    
    // Custom serialization
    toSnapshot: (state) => ({ 
      n: state.name, 
      a: state.age 
    }),
    fromSnapshot: (snapshot: any) => ({ 
      name: snapshot.n, 
      age: snapshot.a 
    }),
    
    // Version migration
    version: 2,
    migration: (record) => {
      if (record.version === 1) {
        // Migrate from v1 to v2
        return { name: record.data.userName, age: record.data.userAge }
      }
      return record.data
    },
    
    // TTL (time to live) in milliseconds
    time: 24 * 60 * 60 * 1000, // 24 hours
    
    // Storage subscription for cross-tab sync
    subscribe: true // Default: true if storage supports it
  })
)
```

### Configuration Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | **required** | Unique key for storage |
| `toSnapshot` | `(state) => any` | `identity` | Serialize state before saving |
| `fromSnapshot` | `(snapshot) => state` | `identity` | Deserialize state after loading |
| `version` | `number` | `0` | Version number for migration |
| `migration` | `(record) => state` | `undefined` | Migrate old data to current version |
| `time` | `number` | `MAX_SAFE_TIMEOUT` | TTL in milliseconds |
| `subscribe` | `boolean` | `true` | Enable cross-tab synchronization |

## Cross-Tab Synchronization

When multiple atoms share the same storage key, they automatically stay synchronized across browser tabs:

```typescript
// Tab 1
const userNameAtom1 = atom('').extend(withPersist('user-name'))

// Tab 2  
const userNameAtom2 = atom('').extend(withPersist('user-name'))

// When userNameAtom1 changes in Tab 1, userNameAtom2 in Tab 2 updates automatically
userNameAtom1.set('Alice') // Both tabs now show 'Alice'
```

This works through storage subscriptions (enabled by default). You can disable it by setting `subscribe: false`.

## Version Migration

Handle data format changes gracefully with version migration:

```typescript
const userAtom = atom({ name: '', preferences: {} }).extend(
  withPersist({
    key: 'user',
    version: 3,
    migration: (record) => {
      const data = record.data
      
      // Migrate from v1: { userName } -> { name, preferences }
      if (record.version === 1) {
        return { name: data.userName, preferences: {} }
      }
      
      // Migrate from v2: add default preferences
      if (record.version === 2) {
        return { ...data, preferences: { theme: 'light' } }
      }
      
      return data
    }
  })
)
```

## Custom Serialization

Control exactly what gets saved and how:

```typescript
// Only persist specific fields
const formAtom = atom({
  // Persistent fields
  email: '',
  preferences: { theme: 'dark' },
  
  // Temporary fields (not persisted)
  isSubmitting: false,
  errors: []
}).extend(
  withPersist({
    key: 'form-data',
    toSnapshot: (state) => ({
      email: state.email,
      preferences: state.preferences
    }),
    fromSnapshot: (snapshot: any) => ({
      email: snapshot.email,
      preferences: snapshot.preferences,
      isSubmitting: false,
      errors: []
    })
  })
)
```

## Time-to-Live (TTL)

Automatically expire stored data after a specified time:

```typescript
// Cache API data for 1 hour
const apiCacheAtom = atom(null).extend(
  withPersist({
    key: 'api-cache',
    time: 60 * 60 * 1000 // 1 hour in milliseconds
  })
)

// After 1 hour, the stored data is considered expired
// and the atom will use its default value
```

## Error Handling

Persist operations are designed to be non-blocking. If storage fails, your application continues to work:

```typescript
const robustAtom = atom('default').extend(withPersist('may-fail'))

// If storage.get() throws, atom uses default value
console.log(robustAtom()) // 'default'

// If storage.set() throws, atom still updates in memory
robustAtom.set('new-value')
console.log(robustAtom()) // 'new-value'

// Errors are logged to console for debugging
```

## Working with Computed Atoms

Persist works seamlessly with computed atoms:

```typescript
import { withComputed } from '@reatom/core'

const baseValueAtom = atom(10).extend(withPersist('base-value'))

const doubledAtom = atom(0).extend(
  withComputed(() => baseValueAtom() * 2)
)

// Only baseValueAtom is persisted
// doubledAtom is automatically recomputed on restore
```

## Storage Interface

Implement custom storage backends by following the `PersistStorage` interface:

```typescript
interface PersistStorage {
  name: string
  get(key: string): null | PersistRecord | Promise<null | PersistRecord>
  set(key: string, rec: PersistRecord): void | Promise<void>
  clear?(key: string): void | Promise<void>
  subscribe?(key: string, callback: (record: PersistRecord) => void): Unsubscribe
}

interface PersistRecord {
  data: any           // Your serialized state
  id: number          // Unique record ID
  timestamp: number   // When record was created
  version: number     // Your version number
  to: number          // Expiration timestamp
}
```

## Best Practices

### 1. Use Descriptive Keys
```typescript
// ❌ Generic keys
withPersist('data')

// ✅ Descriptive keys
withPersist('user-profile')
withPersist('shopping-cart')
withPersist('app-settings')
```

### 2. Version Your Data
```typescript
// Always specify version for production data
withPersist({
  key: 'user-preferences',
  version: 1, // Start with version 1
  migration: (record) => {
    // Handle future migrations here
    return record.data
  }
})
```

### 3. Consider TTL for Cached Data
```typescript
// Cache API responses with reasonable TTL
const apiDataAtom = atom(null).extend(
  withPersist({
    key: 'api-cache',
    time: 15 * 60 * 1000 // 15 minutes
  })
)
```

### 4. Serialize Carefully
```typescript
// Only persist what you need
withPersist({
  key: 'form',
  toSnapshot: (state) => ({
    // Include: user input
    email: state.email,
    name: state.name,
    
    // Exclude: UI state, temporary data
    // isLoading: state.isLoading,
    // errors: state.errors
  })
})
```

## Advanced Patterns

### Conditional Persistence

```typescript
// Only persist when user is logged in
const withConditionalPersist = (key: string) => 
  withPersist({
    key,
    toSnapshot: (state) => {
      if (!userAtom().isLoggedIn) return null
      return state
    }
  })
```

### Multiple Storage Backends

```typescript
// Use different storage for different data types
const userStorage = createLocalStorage('user-data')
const cacheStorage = createMemStorage({ name: 'cache' })

const userAtom = atom({}).extend(reatomPersist(userStorage)('profile'))
const tempAtom = atom({}).extend(reatomPersist(cacheStorage)('temp-data'))
```

---

The persist system provides a robust foundation for maintaining state across sessions while remaining flexible enough to handle complex requirements like data migration, custom serialization, and various storage backends.