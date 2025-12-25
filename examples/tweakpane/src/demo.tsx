import { reatomRoute } from '@reatom/core'

export const demoRoute = reatomRoute({
  path: 'demo',
  render: () => {
    return (
      <div key="demoRoute">
        <a href="/">Go back</a>
        <div>Demo</div>
      </div>
    )
  },
})
