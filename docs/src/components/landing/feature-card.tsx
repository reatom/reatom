import { cn } from '../../lib/utils'
import { CPUillustration } from './cpu-illustration'

export interface FeatureCardProps {
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
  className?: string
}

export function FeatureCard({ title, description, theme, className }: FeatureCardProps) {
  const themeMap = {
    performance: {
      bgClass:
        'bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-500/10 dark:to-purple-500/10 dark:border-blue-500/20',
      overlayElements: (
        <>
          <div className="absolute -top-4 right-8 h-12 w-2 animate-pulse rounded-full bg-yellow-400/70 blur-md dark:bg-yellow-300/50"></div>
          <div className="absolute top-1/4 right-16 h-20 w-3 animate-pulse rounded-full bg-yellow-300/60 blur-md dark:bg-yellow-200/40"></div>
          <div className="absolute top-1/2 right-4 h-16 w-2 animate-pulse rounded-full bg-yellow-500/50 blur-lg dark:bg-yellow-400/30"></div>
          <div className="absolute -top-2 right-32 h-8 w-8 animate-[spin_7s_linear_infinite] rounded-full bg-white/10 blur-sm"></div>
          <div className="absolute top-1/3 right-24 h-6 w-6 animate-[spin_5s_linear_infinite] rounded-full bg-white/10 blur-sm"></div>
        </>
      )
    },
    debugging: {
      bgClass:
        'bg-gradient-to-br from-red-600/20 to-orange-500/20 dark:from-red-700/10 dark:to-orange-600/10 dark:border-red-500/20',
      overlayElements: (
        <>
          <div className="absolute right-8 -bottom-4 h-32 w-3 animate-[flicker_2s_infinite] rounded-t-full bg-red-500/60 blur-md dark:bg-red-400/40"></div>
          <div className="absolute right-16 -bottom-2 h-24 w-4 animate-[flicker_1.7s_infinite_0.3s] rounded-t-full bg-orange-500/60 blur-md dark:bg-orange-400/40"></div>
          <div className="absolute right-24 -bottom-6 h-28 w-3 animate-[flicker_2.3s_infinite_0.7s] rounded-t-full bg-yellow-500/50 blur-md dark:bg-yellow-400/30"></div>
        </>
      )
    },
    simplicity: {
      bgClass:
        'bg-gradient-to-br from-amber-300/20 to-pink-300/20 dark:from-amber-400/10 dark:to-pink-400/10 dark:border-amber-400/20',
      overlayElements: (
        <>
          <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-200/20 via-violet-100/10 to-transparent dark:from-amber-300/10 dark:via-violet-200/5"></div>
        </>
      )
    },
    typesafety: {
      bgClass:
        'bg-gradient-to-br from-blue-600/20 to-indigo-700/20 dark:from-blue-700/10 dark:to-indigo-800/10 dark:border-blue-600/20',
      overlayElements: (
        <>
          <div className="absolute top-4 right-4 h-12 w-12 animate-[pulse_4s_infinite] rounded-lg border border-blue-400/30 bg-blue-500/10 dark:border-blue-300/20 dark:bg-blue-400/5"></div>
          <div className="absolute right-16 bottom-8 h-16 w-8 animate-[pulse_3s_infinite_0.5s] rounded-lg border border-indigo-400/30 bg-indigo-500/10 dark:border-indigo-300/20 dark:bg-indigo-400/5"></div>
          <div className="absolute right-32 bottom-4 h-8 w-8 animate-[pulse_5s_infinite_1s] rounded-lg border border-blue-400/30 bg-blue-500/10 dark:border-blue-300/20 dark:bg-blue-400/5"></div>
        </>
      )
    },
    ecosystem: {
      bgClass:
        'bg-gradient-to-br from-amber-700/20 to-yellow-600/20 dark:from-amber-800/10 dark:to-yellow-700/10 dark:border-amber-700/20',
      overlayElements: (
        <>
          <div className="absolute top-4 right-8 h-8 w-8 animate-[spin_15s_linear_infinite] rounded-full border-2 border-yellow-700/30 opacity-70 dark:border-yellow-600/20"></div>
          <div className="absolute right-24 bottom-4 h-12 w-12 animate-[spin_10s_linear_infinite_reverse] rounded-full border border-yellow-600/30 opacity-70 dark:border-yellow-500/20"></div>
        </>
      )
    },
    extensibility: {
      bgClass:
        'bg-gradient-to-br from-blue-400/20 to-green-400/20 dark:from-blue-500/10 dark:to-green-500/10 dark:border-blue-400/20',
      overlayElements: (
        <>
          <div className="absolute top-6 right-8 h-6 w-6 rotate-12 rounded bg-red-400/40 dark:bg-red-500/30"></div>
          <div className="absolute top-16 right-16 h-8 w-8 -rotate-6 rounded bg-blue-400/40 dark:bg-blue-500/30"></div>
          <div className="absolute right-24 bottom-6 h-10 w-6 rotate-3 rounded bg-yellow-400/40 dark:bg-yellow-500/30"></div>
          <div className="absolute right-10 bottom-12 h-7 w-10 rotate-12 rounded bg-green-400/40 dark:bg-green-500/30"></div>
        </>
      )
    },
    effects: {
      bgClass:
        'bg-gradient-to-br from-purple-600/20 to-pink-500/20 dark:from-purple-700/10 dark:to-pink-600/10 dark:border-purple-600/20',
      overlayElements: <></>
    }
  }

  const { bgClass, overlayElements } = themeMap[theme]

  return (
    <div
      className={cn(
        'group focus-within:ring-primary/50 relative h-64 overflow-hidden rounded-lg border p-6 shadow-md transition-all focus-within:ring-2 hover:shadow-xl',
        'transform transition-transform duration-300 hover:-translate-y-1',
        bgClass,
        className
      )}
      tabIndex={0}
      role="region"
      aria-label={`${title} feature card`}
    >
      <div className="relative z-10 flex h-full">
        <div className="flex w-1/2 flex-col justify-between pr-4">
          <h3 className="group-hover:text-primary group-focus-within:text-primary mb-2 text-2xl font-bold transition-colors">
            {title}
          </h3>
          <p className="line-clamp-6 text-sm text-gray-700 dark:text-gray-300">{description}</p>
        </div>
        <div className="relative flex w-1/2 items-center justify-center">
          <CPUillustration
            theme={theme}
            className="h-48 w-48 transition-transform duration-300 group-focus-within:scale-110 group-hover:scale-110"
          />
        </div>
      </div>
      <div className="absolute inset-0 z-0 overflow-hidden">{overlayElements}</div>
    </div>
  )
}
