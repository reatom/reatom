import { reatomComponent } from '@reatom/react'

import { demoRoute } from './demo'

export const App = reatomComponent(() => {
  return (
    <div>
      Hello
      <div>{demoRoute.render() || <a href="/demo">Go to demo</a>}</div>
    </div>
  )
}, 'App')
