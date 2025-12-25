/// <reference types="vite/client" />

import { type JSX } from 'react/jsx-runtime'

declare module '@reatom/core' {
  interface RouteChild extends JSX.Element {}
}
