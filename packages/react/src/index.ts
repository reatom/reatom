export * from './internal'

import { type JSX } from 'react/jsx-runtime'

declare module '@reatom/core' {
  interface RouteChild extends JSX.Element {}
}
