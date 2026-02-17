import type { JSX } from '@reatom/jsx'

declare module '@reatom/core' {
  interface RouteChild extends JSX.Element {}
}

declare global {
  interface ImportMetaEnv {
    readonly RECORD_VIDEO: boolean
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
