import { reatomComponent } from '@reatom/react'

import { booleanRoute } from './demos/BooleanDemo'
import { colorRoute } from './demos/ColorDemo'
import { essentialsRoute } from './demos/EssentialsDemo'
import { monitorRoute } from './demos/MonitorDemo'
import { numberRoute } from './demos/NumberDemo'
import { overviewRoute } from './demos/OverviewDemo'
import { pointRoute } from './demos/PointDemo'
import { stringRoute } from './demos/StringDemo'
import { uiComponentsRoute } from './demos/UIComponentsDemo'

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
          Tweakpane + Reatom
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

        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <a href="/overview" style={{ fontWeight: 'bold' }}>
              Overview
            </a>
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
        {overviewRoute.render()}
        {uiComponentsRoute.render()}
        {numberRoute.render()}
        {stringRoute.render()}
        {booleanRoute.render()}
        {colorRoute.render()}
        {pointRoute.render()}
        {monitorRoute.render()}
        {essentialsRoute.render()}

        {(location.pathname === '/' || location.pathname === '') && (
          <div>
            <h2>Tweakpane + Reatom</h2>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
              This example shows how Reatom extensions embed Tweakpane controls
              as reactive endpoints. Reatom owns the state; Tweakpane rents
              access.
            </p>
            <p style={{ marginTop: '1rem' }}>
              <a
                href="/overview"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  background: '#0ea5e9',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                }}
              >
                View Overview
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}, 'App')
