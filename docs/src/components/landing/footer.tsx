import { Zap, Github, Twitter, ExternalLink } from 'lucide-react'
import { Button } from '../../components/ui/button'

export function Footer() {
  return (
    <footer className="border-t pt-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <span className="text-xl font-bold tracking-tight">Reatom</span>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              The ultimate state manager for modern JavaScript applications.
              <br className="hidden sm:block" />
              Simple, powerful, and blazingly fast.
            </p>
            <div className="flex gap-3">
              <a href="https://github.com/reatom/reatom">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                >
                  <Github className="h-4 w-4" />
                  <span className="sr-only">GitHub</span>
                </Button>
              </a>
              <a href="https://twitter.com">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                >
                  <Twitter className="h-4 w-4" />
                  <span className="sr-only">Twitter</span>
                </Button>
              </a>
            </div>
          </div>

          {/* Documentation links */}
          <div className="sm:pl-4 lg:pl-0">
            <h3 className="text-foreground/70 mb-3 text-sm font-semibold tracking-wider uppercase">
              Documentation
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/docs/getting-started/setup"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  Getting Started
                </a>
              </li>
              <li>
                <a
                  href="/docs/core-concepts"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  Core Concepts
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
              <li>
                <a
                  href="/docs/examples"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  Examples
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
              <li>
                <a
                  href="/docs/api"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  API Reference
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
            </ul>
          </div>

          {/* Resources links */}
          <div className="sm:pl-4 lg:pl-0">
            <h3 className="text-foreground/70 mb-3 text-sm font-semibold tracking-wider uppercase">
              Resources
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/reatom/reatom"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  GitHub Repository
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/reatom/reatom/releases"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  Releases
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/reatom/reatom/issues"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  Issues
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/reatom/reatom/discussions"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  Discussions
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
            </ul>
          </div>

          {/* Community links */}
          <div className="sm:pl-4 lg:pl-0">
            <h3 className="text-foreground/70 mb-3 text-sm font-semibold tracking-wider uppercase">
              Community
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://patreon.com/artalar_dev"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  Sponsor on Patreon
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
              <li>
                <a
                  href="https://polar.sh/artalar"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  Sponsor on Polar
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
              <li>
                <a
                  href="https://boosty.to/artalar"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  Sponsor on Boosty
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/reatom"
                  className="group text-foreground/80 flex items-center transition-colors"
                >
                  Join Discord
                  <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright section */}
        <div className="mt-12 flex flex-col items-center justify-between border-t pt-4 sm:flex-row">
          <p className="text-muted-foreground mb-4 text-center text-sm sm:mb-0">
            © {new Date().getFullYear()} Reatom. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
