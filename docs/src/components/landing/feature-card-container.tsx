import { useRef, useEffect, useState } from 'react'
import { cn } from '../../lib/utils'

interface FeatureCardContainerProps {
  children: React.ReactNode
  index: number
  className?: string
}

export function FeatureCardContainer({ children, index, className }: FeatureCardContainerProps) {
  const [isInView, setIsInView] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={cardRef}
      className={cn(
        'transform transition-all duration-700',
        isInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0',
        index % 2 === 0 ? 'md:translate-y-8' : '',
        className
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {children}
    </div>
  )
}
