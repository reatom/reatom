import { ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/button'

export function CTASection() {
  return (
    <section className="py-24">
      <div className="container">
        <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 p-8 shadow-lg md:p-12 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
          <div className="mb-8 space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Ready to Simplify Your State Management?
            </h2>
            <p className="mx-auto max-w-[700px] text-lg text-zinc-600 dark:text-zinc-400">
              Start building with Reatom today and experience the perfect balance of simplicity and
              power.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
            <Button asChild size="lg" className="w-full md:w-auto">
              <a href="/docs/getting-started/setup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full md:w-auto">
              <a
                href="https://github.com/reatom/reatom"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
