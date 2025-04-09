import type React from 'react'

import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

interface AnimatedGradientTextProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedGradientText({ children, className }: AnimatedGradientTextProps) {
  const textRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const element = textRef.current
    if (!element) return

    let start = 0

    const animate = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = (timestamp - start) / 10

      // Animate the gradient position
      element.style.backgroundPosition = `${progress % 200}% 50%`

      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <h1
      ref={textRef}
      className={cn(
        'bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-cyan-400 dark:via-indigo-500 dark:to-purple-500',
        className
      )}
    >
      {children}
    </h1>
  )
}
