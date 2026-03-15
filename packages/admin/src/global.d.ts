declare module '@reatom/core' {
  interface RouteChild extends ChildNode {}
}

declare global {
  interface ImportMetaEnv {
    readonly RECORD_VIDEO: boolean
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
