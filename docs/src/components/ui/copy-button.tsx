import { useState, useEffect } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CopyButtonProps {
  text: string
  className?: string
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700',
        className
      )}
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}
