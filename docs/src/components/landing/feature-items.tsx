import { FeatureCard } from './feature-card'
import { FeatureCardContainer } from './feature-card-container'

export interface FeatureItem {
  title: string
  description: string
  theme:
    | 'performance'
    | 'debugging'
    | 'simplicity'
    | 'typesafety'
    | 'ecosystem'
    | 'extensibility'
    | 'effects'
}

export const featureItems: FeatureItem[] = [
  {
    title: 'Performance',
    description:
      "Engineered for maximum speed with minimal overhead. Reatom's atomization pattern ensures lightning-fast updates and efficient reactivity without proxies.",
    theme: 'performance'
  },
  {
    title: 'Debugging',
    description:
      'Powerful debugging capabilities that make tracking state changes and diagnosing issues easier than ever. Each update builds a cause stack for complete transparency.',
    theme: 'debugging'
  },
  {
    title: 'Simplicity',
    description:
      'Only three main primitives: ctx, atom, action. Clean, intuitive API that makes state management a zen-like experience.',
    theme: 'simplicity'
  },
  {
    title: 'Typesafety',
    description:
      'First-class TypeScript support with automatic type inference. Your compiler becomes your ally, preventing bugs before they happen.',
    theme: 'typesafety'
  },
  {
    title: 'Ecosystem',
    description:
      'A robust ecosystem of interconnected packages built to work seamlessly together. Adaptors for all popular frameworks and specialized solutions for common problems.',
    theme: 'ecosystem'
  },
  {
    title: 'Extensibility',
    description:
      'Modular architecture lets you add only what you need. Compose atoms and actions like building blocks to create complex state management solutions.',
    theme: 'extensibility'
  },
  {
    title: 'Effects Management',
    description:
      'Advanced async package for complex flows, including caching, retrying, and automatic cancellation. Handles side effects with precision and reliability.',
    theme: 'effects'
  }
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24">
      <div className="container">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            State Management Reimagined
          </h2>
          <p className="mx-auto max-w-[700px] text-lg text-zinc-700 dark:text-zinc-300">
            Reatom provides powerful abstractions with the reliability and performance of modern
            processor architecture.
          </p>

          {/* Animated scroll indicator */}
          <div className="mt-8 flex justify-center">
            <div className="flex h-12 w-8 items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700">
              <div className="bg-primary h-3 w-1 animate-bounce rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2">
          {featureItems.map((feature, index) => (
            <FeatureCardContainer key={index} index={index}>
              <FeatureCard
                title={feature.title}
                description={feature.description}
                theme={feature.theme}
              />
            </FeatureCardContainer>
          ))}
        </div>
      </div>
    </section>
  )
}
