import { ArrowRight, Github, Star, GitFork, Package, Zap } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { SpeedParticles } from './speed-particles'
import { AnimatedGradientText } from './animated-gradient-text'
import { useEffect, useState } from 'react'

export function HeroSection() {
  const [zapVisible, setZapVisible] = useState(false)

  useEffect(() => {
    // Show zap effect after a short delay
    const timer = setTimeout(() => {
      setZapVisible(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="bg-background text-foreground relative overflow-hidden py-24 md:py-32 lg:py-40">
      <div className="absolute inset-0 -z-10">
        <SpeedParticles />
      </div>

      {/* Decorative zap elements */}
      <div
        className={`absolute top-[20%] left-[10%] z-0 transition-opacity duration-1000 ${zapVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <Zap className="h-12 w-12 animate-pulse text-blue-500/30" />
      </div>
      <div
        className={`absolute top-[30%] right-[15%] z-0 transition-opacity duration-1000 ${zapVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <Zap className="h-16 w-16 animate-pulse text-purple-500/30" />
      </div>
      <div
        className={`absolute bottom-[25%] left-[20%] z-0 transition-opacity duration-1000 ${zapVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <Zap className="h-10 w-10 animate-pulse text-pink-500/30" />
      </div>
      <div
        className={`absolute right-[10%] bottom-[15%] z-0 transition-opacity duration-1000 ${zapVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <Zap className="h-14 w-14 animate-pulse text-cyan-500/30" />
      </div>

      <div className="relative z-10 container">
        <div className="flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-6 flex items-center gap-1">
            <Zap className="h-3 w-3 animate-pulse fill-yellow-400 text-yellow-400" />
            v4 Now Available
          </Badge>
          <AnimatedGradientText className="mb-6 max-w-4xl pb-2 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            The State Manager That Moves at the Speed of Thought
          </AnimatedGradientText>
          <p className="mt-4 mb-8 max-w-2xl text-lg md:text-xl">
            Simple, powerful, and blazingly fast state management for modern JavaScript
            applications. Only 2KB gzipped with the best TypeScript experience.
          </p>
          <div className="flex gap-4">
            <a href="/docs/getting-started/setup">
              <Button
                size="lg"
                className="hover:bg-foreground/80 gap-2 rounded-full px-8 hover:animate-none"
              >
                <Zap className="size-4 fill-yellow-300 text-yellow-300" />
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </a>
            <a href="https://github.com/reatom/reatom">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 rounded-full bg-transparent px-8 hover:bg-white/10"
              >
                <Github className="h-4 w-4" />
                Star on GitHub
              </Button>
            </a>
          </div>
          <div className="mt-12 flex items-center gap-6">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>1.1k+ Stars</span>
            </div>
            <div className="bg-foreground/20 h-4 w-px"></div>
            <div className="flex items-center gap-1">
              <GitFork className="h-4 w-4" />
              <span>117+ Forks</span>
            </div>
            <div className="bg-foreground/20 h-4 w-px"></div>
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span>2KB gzipped</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
