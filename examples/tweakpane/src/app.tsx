import { reatomComponent } from '@reatom/react'

import { booleanRoute } from './demos/BooleanDemo'
import { colorRoute } from './demos/ColorDemo'
import { essentialsRoute } from './demos/EssentialsDemo'
import { monitorRoute } from './demos/MonitorDemo'
import { numberRoute } from './demos/NumberDemo'
import { pointRoute } from './demos/PointDemo'
import { stringRoute } from './demos/StringDemo'
import { syncRoute } from './demos/SyncDemo'
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
          width: '200px',
          borderRight: '1px solid #eee',
          padding: '1rem',
          background: '#f9f9f9',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Demos</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>
            <a href="/ui-components">UI Components</a>
          </li>
          <li>
            <a href="/number">Number</a>
          </li>
          <li>
            <a href="/string">String</a>
          </li>
          <li>
            <a href="/boolean">Boolean</a>
          </li>
          <li>
            <a href="/color">Color</a>
          </li>
          <li>
            <a href="/point">Point</a>
          </li>
          <li>
            <a href="/sync">Sync</a>
          </li>
          <li>
            <a href="/monitor">Monitor</a>
          </li>
          <li>
            <a href="/essentials">Essentials</a>
          </li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '2rem' }}>
        {uiComponentsRoute.render()}
        {numberRoute.render()}
        {stringRoute.render()}
        {booleanRoute.render()}
        {colorRoute.render()}
        {pointRoute.render()}
        {syncRoute.render()}
        {monitorRoute.render()}
        {essentialsRoute.render()}

        {/* Show welcome message if no specific route is active (simple check based on path) */}
        {(location.pathname === '/' || location.pathname === '') && (
          <div>
            <h2>Welcome to Tweakpane Demos</h2>
            <p>
              Select a demo from the sidebar to visualize Reatom + Tweakpane
              integration.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}, 'App')
