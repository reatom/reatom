import type { JSX } from '@reatom/jsx'

declare module '@reatom/core' {
  interface RouteChild extends JSX.Element {}
}

declare global {
  interface ImportMetaEnv {
    readonly BASE_URL: string
    readonly RECORD_VIDEO: boolean
    readonly VITEST?: boolean
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
