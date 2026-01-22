import { reatomComponent } from '@reatom/react'

import { rootRoute } from './routes'

export const App = reatomComponent(() => {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: 'sans-serif',
      }}
    >
      <nav
        style={{
          width: '240px',
          borderRight: '1px solid #eee',
          padding: '1rem',
          background: '#f9f9f9',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>
          <a href="/">Tweakpane + Reatom</a>
        </h3>
        <p
          style={{
            fontSize: '0.8rem',
            color: '#666',
            marginBottom: '1rem',
            lineHeight: 1.4,
          }}
        >
          Extensions as integration adapters
        </p>

        <h4
          style={{
            margin: '0 0 0.5rem 0',
            fontSize: '0.75rem',
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Showcases
        </h4>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem' }}>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/mixer">Audio Mixer</a>
          </li>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/animation">Animation</a>
          </li>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/three">Three.js Scene</a>
          </li>
        </ul>

        <h4
          style={{
            margin: '1rem 0 0.5rem 0',
            fontSize: '0.75rem',
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Controls
        </h4>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem' }}>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/ui-components">UI Components</a>
          </li>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/number">Number</a>
          </li>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/string">String</a>
          </li>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/boolean">Boolean</a>
          </li>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/color">Color</a>
          </li>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/point">Point</a>
          </li>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/monitor">Monitor</a>
          </li>
          <li style={{ marginBottom: '0.25rem' }}>
            <a href="/essentials">Essentials Plugin</a>
          </li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '2rem', maxWidth: '640px' }}>
        {rootRoute.render()}
      </main>
    </div>
  )
}, 'App')
