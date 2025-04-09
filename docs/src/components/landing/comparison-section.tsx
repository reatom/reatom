import type { JSX } from 'react'
import { cn } from '../../lib/utils'

interface ComparisonItem {
  feature: string
  reatom: boolean | string
  redux: boolean | string
  mobx: boolean | string
  zustand: boolean | string
}

// Shared data structure for all comparisons
const comparisonItems: ComparisonItem[] = [
  {
    feature: 'Immutable state',
    reatom: true,
    redux: true,
    mobx: false,
    zustand: true
  },
  {
    feature: 'Explicit reactivity',
    reatom: true,
    redux: false,
    mobx: false,
    zustand: false
  },
  {
    feature: 'Automatic dependency tracking',
    reatom: true,
    redux: false,
    mobx: true,
    zustand: false
  },
  {
    feature: 'Atomicity guarantees',
    reatom: true,
    redux: false,
    mobx: false,
    zustand: false
  },
  {
    feature: 'Built-in data fetching',
    reatom: true,
    redux: 'RTK Query',
    mobx: false,
    zustand: false
  },
  {
    feature: 'Debugging tools',
    reatom: true,
    redux: true,
    mobx: true,
    zustand: true
  }
]

export function ComparisonSection(): JSX.Element {
  return (
    <section id="comparison" className="py-24">
      <div className="container">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Why Choose Reatom?</h2>
          <p className="mx-auto max-w-[700px] text-lg">
            See how Reatom compares to other popular state management solutions.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-zinc-200 dark:border-zinc-800">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-4 text-left font-medium">Feature</th>
                <th className="px-4 py-4 text-center font-medium">Reatom</th>
                <th className="px-4 py-4 text-center font-medium">Redux</th>
                <th className="px-4 py-4 text-center font-medium">MobX</th>
                <th className="px-4 py-4 text-center font-medium">Zustand</th>
              </tr>
            </thead>
            <tbody>
              {comparisonItems.map((item, index) => (
                <tr
                  key={index}
                  className={cn(
                    'border-b border-zinc-200 dark:border-zinc-800',
                    index % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-900/50' : ''
                  )}
                >
                  <td className="px-4 py-4">{item.feature}</td>
                  <td className="px-4 py-4 text-center">
                    {typeof item.reatom === 'boolean' ? (
                      item.reatom ? (
                        <CheckIcon className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <XIcon className="mx-auto h-5 w-5 text-red-500" />
                      )
                    ) : (
                      <span className="text-sm">{item.reatom}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {typeof item.redux === 'boolean' ? (
                      item.redux ? (
                        <CheckIcon className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <XIcon className="mx-auto h-5 w-5 text-red-500" />
                      )
                    ) : (
                      <span className="text-sm">{item.redux}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {typeof item.mobx === 'boolean' ? (
                      item.mobx ? (
                        <CheckIcon className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <XIcon className="mx-auto h-5 w-5 text-red-500" />
                      )
                    ) : (
                      <span className="text-sm">{item.mobx}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {typeof item.zustand === 'boolean' ? (
                      item.zustand ? (
                        <CheckIcon className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <XIcon className="mx-auto h-5 w-5 text-red-500" />
                      )
                    ) : (
                      <span className="text-sm">{item.zustand}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
