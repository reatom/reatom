import { useState } from 'react'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Testimonial {
  content: string
  author: {
    name: string
    role: string
    avatar: string
  }
  company?: {
    name: string
    logo: string
  }
}

const testimonials: Testimonial[] = [
  {
    content:
      "Reatom's explicit reactivity model has completely transformed how we manage state in our application. The debugging experience is unmatched.",
    author: {
      name: 'Alex Johnson',
      role: 'Senior Frontend Developer',
      avatar: '/avatars/avatar-1.png'
    },
    company: {
      name: 'TechCorp',
      logo: '/logos/logo-1.svg'
    }
  },
  {
    content:
      'We migrated from Redux to Reatom and saw a 30% reduction in bundle size and significant performance improvements. The built-in data fetching capabilities are a game-changer.',
    author: {
      name: 'Sarah Chen',
      role: 'Lead Developer',
      avatar: '/avatars/avatar-2.png'
    },
    company: {
      name: 'StartupX',
      logo: '/logos/logo-2.svg'
    }
  },
  {
    content:
      'The atomicity guarantees in Reatom have eliminated an entire class of bugs in our application. The learning curve is minimal, but the benefits are substantial.',
    author: {
      name: 'Michael Rodriguez',
      role: 'CTO',
      avatar: '/avatars/avatar-3.png'
    },
    company: {
      name: 'DevStudio',
      logo: '/logos/logo-3.svg'
    }
  }
]

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0)

  const nextTestimonial = () => {
    setActiveIndex((current) => (current + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setActiveIndex((current) => (current - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-24">
      <div className="container">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Trusted by Developers</h2>
          <p className="mx-auto max-w-[700px] text-lg text-zinc-600 dark:text-zinc-400">
            See what developers are saying about their experience with Reatom.
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <Quote className="absolute top-8 right-8 h-16 w-16 text-zinc-200 dark:text-zinc-800" />

            <div className="relative z-10">
              <blockquote className="mb-8 text-xl leading-relaxed font-medium text-zinc-800 dark:text-zinc-200">
                {testimonials[activeIndex]?.content}
              </blockquote>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <img
                      src={testimonials[activeIndex]?.author.avatar || ''}
                      alt={testimonials[activeIndex]?.author.name}
                      width={48}
                      height={48}
                    />
                  </div>
                  <div>
                    <div className="font-semibold">{testimonials[activeIndex]?.author.name}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {testimonials[activeIndex]?.author.role}
                      {testimonials[activeIndex]?.company && (
                        <>, {testimonials[activeIndex]?.company.name}</>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={prevTestimonial}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    aria-label="Previous testimonial"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextTestimonial}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    aria-label="Next testimonial"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'h-2 w-2 rounded-full transition-all',
                  activeIndex === index ? 'bg-primary w-6' : 'bg-zinc-300 dark:bg-zinc-700'
                )}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
