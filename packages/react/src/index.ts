export * from './internal'

declare module '@reatom/core' {
  interface RouteChild extends JSX.Element {}
}
