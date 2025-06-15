import { atom } from '@reatom/core'
import {
  type Atom,
  withBroadcastChannel,
  withIndexedDb,
  withLocalStorage,
  withSessionStorage,
} from '@reatom/core'
import { reatomComponent } from '@reatom/react'

// Create BroadcastChannel for cross-tab synchronization demo
// BroadcastChannel allows real-time communication between tabs/windows of the same origin
// If not available (e.g., in SSR), we fallback to null and use memory storage
const demoChannel =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('persist-demo')
    : null

// Create atoms with different storage adapters
const dataWithLocalStorage = atom('', 'localStorageValue').extend(
  withLocalStorage('local-storage-demo'),
)

const dataWithSessionStorage = atom('', 'sessionStorageValue').extend(
  withSessionStorage('session-storage-demo'),
)

const dataWithBroadcastChannel = atom('', 'broadcastChannelValue').extend(
  demoChannel ? withBroadcastChannel(demoChannel) : () => ({}),
)

const dataWithIndexedDb = atom('', 'indexedDbValue').extend(
  withIndexedDb('indexed-db-demo'),
)

// Storage demo component
const StorageDemo = reatomComponent<{
  title: string
  model: Atom<string>
  placeholder: string
}>(({ title, model, placeholder }) => {
  const value = model()

  // Check availability of different storage APIs
  const getStatus = () => {
    switch (title) {
      case 'localStorage':
        return typeof localStorage !== 'undefined'
          ? 'Available'
          : 'Fallback to memory'
      case 'sessionStorage':
        return typeof sessionStorage !== 'undefined'
          ? 'Available'
          : 'Fallback to memory'
      case 'BroadcastChannel':
        return typeof BroadcastChannel !== 'undefined'
          ? 'Available'
          : 'Fallback to memory'
      case 'IndexedDB':
        return typeof indexedDB !== 'undefined'
          ? 'Available (requires idb-keyval)'
          : 'Fallback to memory'
      default:
        return 'Unknown'
    }
  }

  return (
    <div
      style={{
        border: '1px solid #ccc',
        padding: '16px',
        margin: '8px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
      }}
    >
      <h3>
        {title === 'localStorage' && '🗃️ '}
        {title === 'sessionStorage' && '📝 '}
        {title === 'BroadcastChannel' && '📡 '}
        {title === 'IndexedDB' && '🗄️ '}
        {title}
      </h3>
      <input
        type="text"
        value={value}
        onChange={(e) => model.set(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
        }}
      />
      <div style={{ fontSize: '12px', color: '#666' }}>
        Status: {getStatus()}
      </div>
    </div>
  )
})

export const App = reatomComponent(() => {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔄 Reatom Persist Demo</h1>
      <p>Try different storage adapters and see how data persists!</p>
      <p>Open a few tabs and see the realtime sync.</p>
      <p>Open the devtools Application tab and inspect the data.</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        <StorageDemo
          title="localStorage"
          model={dataWithLocalStorage}
          placeholder="I'm synced with localStorage"
        />

        <StorageDemo
          title="sessionStorage"
          model={dataWithSessionStorage}
          placeholder="I'm synced with sessionStorage"
        />

        <StorageDemo
          title="BroadcastChannel"
          model={dataWithBroadcastChannel}
          placeholder="I'm synced with BroadcastChannel"
        />

        <StorageDemo
          title="IndexedDB"
          model={dataWithIndexedDb}
          placeholder="I'm synced with IndexedDB"
        />
      </div>

      <div
        style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#f0f8ff',
          borderRadius: '8px',
        }}
      >
        <h3>🧪 Try it out:</h3>
        <ul>
          <li>
            <strong>localStorage:</strong> Type something, refresh the page - it
            persists! Open in multiple tabs to see sync.
          </li>
          <li>
            <strong>sessionStorage:</strong> Type something, refresh - it
            persists, but open a new tab - it's independent.
          </li>
          <li>
            <strong>BroadcastChannel:</strong> Type something, open another tab
            - see real-time sync! But refresh - it's gone.
          </li>
          <li>
            <strong>IndexedDB:</strong> Type something, refresh - it persists!
            Also syncs across tabs in real-time.
          </li>
        </ul>
      </div>
    </div>
  )
})
