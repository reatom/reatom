import { type CSSProperties } from 'react'
import { cn } from '../../lib/utils'

interface CPUillustrationProps {
  theme:
    | 'performance'
    | 'debugging'
    | 'simplicity'
    | 'typesafety'
    | 'ecosystem'
    | 'extensibility'
    | 'effects'
  className?: string
  style?: CSSProperties
}

export function CPUillustration({ theme, className, style }: CPUillustrationProps) {
  // Common CPU elements
  const renderBaseCPU = (mainColor: string, secondaryColor: string, highlightColor: string) => (
    <>
      {/* CPU Base */}
      <rect x="70" y="40" width="100" height="100" rx="4" fill={mainColor} />

      {/* CPU Grid */}
      <path
        d="M80 50h80M80 60h80M80 70h80M80 80h80M80 90h80M80 100h80M80 110h80M80 120h80M90 50v80M100 50v80M110 50v80M120 50v80M130 50v80M140 50v80M150 50v80M160 50v80"
        stroke={secondaryColor}
        strokeWidth="1"
        strokeOpacity="0.3"
      />

      {/* CPU Pins */}
      <path
        d="M70 50h-20M70 60h-20M70 70h-20M70 80h-20M70 90h-20M70 100h-20M70 110h-20M70 120h-20M170 50h20M170 60h20M170 70h20M170 80h20M170 90h20M170 100h20M170 110h20M170 120h20M80 40v-20M90 40v-20M100 40v-20M110 40v-20M120 40v-20M130 40v-20M140 40v-20M150 40v-20M160 40v-20M80 140v20M90 140v20M100 140v20M110 140v20M120 140v20M130 140v20M140 140v20M150 140v20M160 140v20"
        stroke={secondaryColor}
        strokeWidth="2"
      />

      {/* CPU Highlights */}
      <circle cx="120" cy="90" r="20" fill={highlightColor} fillOpacity="0.6" />
      <rect x="85" y="55" width="15" height="15" rx="2" fill={highlightColor} fillOpacity="0.4" />
      <rect x="140" y="55" width="15" height="15" rx="2" fill={highlightColor} fillOpacity="0.4" />
      <rect x="85" y="110" width="15" height="15" rx="2" fill={highlightColor} fillOpacity="0.4" />
      <rect x="140" y="110" width="15" height="15" rx="2" fill={highlightColor} fillOpacity="0.4" />
    </>
  )

  // Theme-specific elements
  const themeElements = {
    performance: (
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('h-full w-full', className)}
        style={style}
      >
        {renderBaseCPU('#4338ca', '#818cf8', '#c7d2fe')}
        <defs>
          <filter id="lightning-glow-performance" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Lightning bolts */}
        <g filter="url(#lightning-glow-performance)">
          <path
            d="M160 60l-15 20 10-2-12 22"
            stroke="#fbbf24"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M180 80l-12 15 8-1-10 16"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M140 40l-10 18 7-1-8 14"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        {/* Cloud elements */}
        <ellipse cx="165" cy="50" rx="20" ry="12" fill="white" fillOpacity="0.2" />
        <ellipse cx="190" cy="55" rx="15" ry="10" fill="white" fillOpacity="0.15" />
        <ellipse cx="150" cy="45" rx="18" ry="8" fill="white" fillOpacity="0.1" />
      </svg>
    ),
    debugging: (
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('h-full w-full', className)}
        style={style}
      >
        {renderBaseCPU('#dc2626', '#f87171', '#fecaca')}
        {/* Fire elements */}
        <path
          d="M120 150c-10 0-30-15-30-40 0-15 5-20 10-25 0 10 5 15 10 15-5-15 5-30 15-35-5 15 10 20 15 15 0 10 10 15 15 10 5 25-5 60-35 60z"
          fill="url(#fire-gradient-debugging)"
        />
        <defs>
          <radialGradient id="fire-gradient-debugging" cx="0.5" cy="0.7" r="0.5">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="40%" stopColor="#f97316" />
            <stop offset="90%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    ),
    simplicity: (
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('h-full w-full', className)}
        style={style}
      >
        {/* Sunrise background */}
        <defs>
          <linearGradient id="sunrise-gradient-simplicity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="240" height="180" fill="url(#sunrise-gradient-simplicity)" />
        <circle cx="120" cy="160" r="60" fill="#fbbf24" fillOpacity="0.2" />

        {renderBaseCPU('#f59e0b', '#fcd34d', '#fef3c7')}

        {/* Yoga silhouette */}
        <path
          d="M180 130c0 0-2-5-5-5s-4 2-5 5c-1-3-3-5-6-5s-5 2-6 5c-1-3-3-5-6-5s-5 2-6 5c-1-3-4-3-5-1 0-2-3-4-5-3 0-4 4-10 10-10 3 0 4 1 5 2 1-1 2-2 5-2 2 0 4 1 5 2 1-1 3-2 5-2 6 0 10 6 10 10-2-1-4 1-4 3-1-2-3-2-4 1-1-3-3-5-6-5s-5 2-6 5"
          fill="#fdba74"
          fillOpacity="0.6"
        />
      </svg>
    ),
    typesafety: (
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('h-full w-full', className)}
        style={style}
      >
        {renderBaseCPU('#3b82f6', '#93c5fd', '#dbeafe')}
        {/* Robot elements */}
        <rect x="170" y="100" width="30" height="40" rx="5" fill="#3b82f6" fillOpacity="0.3" />
        <rect x="175" y="110" width="20" height="15" rx="2" fill="#dbeafe" fillOpacity="0.5" />
        <circle cx="180" cy="113" r="2" fill="#1e40af" />
        <circle cx="190" cy="113" r="2" fill="#1e40af" />
        <rect x="180" y="120" width="10" height="2" rx="1" fill="#1e40af" />
        <rect x="175" y="140" width="5" height="15" rx="2" fill="#3b82f6" fillOpacity="0.3" />
        <rect x="190" y="140" width="5" height="15" rx="2" fill="#3b82f6" fillOpacity="0.3" />
        <rect x="160" y="95" width="10" height="3" rx="1" fill="#3b82f6" fillOpacity="0.3" />
        <rect x="200" y="95" width="10" height="3" rx="1" fill="#3b82f6" fillOpacity="0.3" />
      </svg>
    ),
    ecosystem: (
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('h-full w-full', className)}
        style={style}
      >
        {renderBaseCPU('#92400e', '#fbbf24', '#fef3c7')}
        {/* Steampunk gear elements */}
        <circle
          cx="50"
          cy="60"
          r="15"
          fill="none"
          stroke="#92400e"
          strokeWidth="2"
          strokeOpacity="0.5"
        />
        <circle
          cx="50"
          cy="60"
          r="10"
          fill="none"
          stroke="#92400e"
          strokeWidth="2"
          strokeOpacity="0.5"
        />
        <circle cx="50" cy="60" r="3" fill="#92400e" fillOpacity="0.5" />
        <path
          d="M50 42v5M50 73v5M32 60h5M63 60h5M37 47l3 3M60 73l3 3M37 73l3-3M60 47l3-3"
          stroke="#92400e"
          strokeWidth="2"
          strokeOpacity="0.5"
        />

        <circle
          cx="190"
          cy="110"
          r="20"
          fill="none"
          stroke="#92400e"
          strokeWidth="2"
          strokeOpacity="0.5"
        >
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 190 110"
            to="360 190 110"
            dur="20s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          cx="190"
          cy="110"
          r="15"
          fill="none"
          stroke="#92400e"
          strokeWidth="2"
          strokeOpacity="0.5"
        />
        <circle cx="190" cy="110" r="5" fill="#92400e" fillOpacity="0.5" />
        <path
          d="M190 85v7M190 128v7M165 110h7M208 110h7M173 93l5 5M202 122l5 5M173 127l5-5M202 98l5-5"
          stroke="#92400e"
          strokeWidth="2"
          strokeOpacity="0.5"
        >
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 190 110"
            to="360 190 110"
            dur="20s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    ),
    extensibility: (
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('h-full w-full', className)}
        style={style}
      >
        {renderBaseCPU('#10b981', '#6ee7b7', '#d1fae5')}
        {/* LEGO brick elements */}
        <rect x="30" y="60" width="20" height="10" rx="2" fill="#ef4444" fillOpacity="0.6" />
        <circle cx="35" cy="60" r="3" fill="#ef4444" fillOpacity="0.7" />
        <circle cx="45" cy="60" r="3" fill="#ef4444" fillOpacity="0.7" />

        <rect
          x="190"
          y="70"
          width="30"
          height="15"
          rx="2"
          fill="#3b82f6"
          fillOpacity="0.6"
          transform="rotate(10 190 70)"
        />
        <circle
          cx="195"
          cy="70"
          r="4"
          fill="#3b82f6"
          fillOpacity="0.7"
          transform="rotate(10 190 70)"
        />
        <circle
          cx="205"
          cy="70"
          r="4"
          fill="#3b82f6"
          fillOpacity="0.7"
          transform="rotate(10 190 70)"
        />
        <circle
          cx="215"
          cy="70"
          r="4"
          fill="#3b82f6"
          fillOpacity="0.7"
          transform="rotate(10 190 70)"
        />

        <rect
          x="180"
          y="120"
          width="25"
          height="12"
          rx="2"
          fill="#eab308"
          fillOpacity="0.6"
          transform="rotate(-5 180 120)"
        />
        <circle
          cx="185"
          cy="120"
          r="3.5"
          fill="#eab308"
          fillOpacity="0.7"
          transform="rotate(-5 180 120)"
        />
        <circle
          cx="195"
          cy="120"
          r="3.5"
          fill="#eab308"
          fillOpacity="0.7"
          transform="rotate(-5 180 120)"
        />

        <rect
          x="40"
          y="110"
          width="25"
          height="12"
          rx="2"
          fill="#22c55e"
          fillOpacity="0.6"
          transform="rotate(-15 40 110)"
        />
        <circle
          cx="45"
          cy="110"
          r="3.5"
          fill="#22c55e"
          fillOpacity="0.7"
          transform="rotate(-15 40 110)"
        />
        <circle
          cx="55"
          cy="110"
          r="3.5"
          fill="#22c55e"
          fillOpacity="0.7"
          transform="rotate(-15 40 110)"
        />
      </svg>
    ),
    effects: (
      <svg
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('h-full w-full', className)}
        style={style}
      >
        {renderBaseCPU('#8b5cf6', '#c4b5fd', '#ede9fe')}

        {/* Data flow paths */}
        <path
          d="M90 90 L40 70"
          stroke="#a855f7"
          strokeWidth="2"
          strokeDasharray="4,2"
          strokeOpacity="0.6"
          className="animate-[pulse_2s_infinite]"
        />
        <path
          d="M160 100 L185 120"
          stroke="#a855f7"
          strokeWidth="2"
          strokeDasharray="4,2"
          strokeOpacity="0.6"
          className="animate-[pulse_2s_infinite_0.7s]"
        />
        <path
          d="M100 130 L50 130"
          stroke="#a855f7"
          strokeWidth="2"
          strokeDasharray="4,2"
          strokeOpacity="0.6"
          className="animate-[pulse_2s_infinite_0.3s]"
        />

        {/* Mini CPU elements */}
        <g transform="translate(30, 50) scale(0.4)">
          <rect x="70" y="40" width="100" height="100" rx="4" fill="#8b5cf6" fillOpacity="0.7" />
          <path
            d="M80 50h80M80 60h80M80 70h80M80 80h80M80 90h80M80 100h80M80 110h80M80 120h80M90 50v80M100 50v80M110 50v80M120 50v80M130 50v80M140 50v80M150 50v80M160 50v80"
            stroke="#c4b5fd"
            strokeWidth="1"
            strokeOpacity="0.3"
          />
          <circle cx="120" cy="90" r="20" fill="#ede9fe" fillOpacity="0.6" />
        </g>

        <g transform="translate(170, 110) scale(0.35) rotate(10)">
          <rect x="70" y="40" width="100" height="100" rx="4" fill="#8b5cf6" fillOpacity="0.7" />
          <path
            d="M80 50h80M80 60h80M80 70h80M80 80h80M80 90h80M80 100h80M80 110h80M80 120h80M90 50v80M100 50v80M110 50v80M120 50v80M130 50v80M140 50v80M150 50v80M160 50v80"
            stroke="#c4b5fd"
            strokeWidth="1"
            strokeOpacity="0.3"
          />
          <circle cx="120" cy="90" r="20" fill="#ede9fe" fillOpacity="0.6" />
        </g>

        <g transform="translate(30, 120) scale(0.3) rotate(-15)">
          <rect x="70" y="40" width="100" height="100" rx="4" fill="#8b5cf6" fillOpacity="0.7" />
          <path
            d="M80 50h80M80 60h80M80 70h80M80 80h80M80 90h80M80 100h80M80 110h80M80 120h80M90 50v80M100 50v80M110 50v80M120 50v80M130 50v80M140 50v80M150 50v80M160 50v80"
            stroke="#c4b5fd"
            strokeWidth="1"
            strokeOpacity="0.3"
          />
          <circle cx="120" cy="90" r="20" fill="#ede9fe" fillOpacity="0.6" />
        </g>
      </svg>
    )
  }

  return themeElements[theme]
}
