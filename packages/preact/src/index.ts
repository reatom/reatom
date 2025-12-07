export * from './internal'

declare module '@reatom/core' {
  interface RouteChild extends preact.JSX.Element {}
}
