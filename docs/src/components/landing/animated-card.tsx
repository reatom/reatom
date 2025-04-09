import { type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface AnimatedCardProps {
  icon?: ReactNode
  title?: string
  description?: string
  children?: ReactNode
  className?: string
}

export function AnimatedCard({ icon, title, description, children, className }: AnimatedCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border p-6 shadow-md transition-all hover:shadow-lg',
        className
      )}
    >
      {children ? (
        children
      ) : (
        <>
          {icon && (
            <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              {icon}
            </div>
          )}
          {title && <h3 className="mb-2 text-xl font-bold">{title}</h3>}
          {description && <p>{description}</p>}
        </>
      )}
    </div>
  )
}
