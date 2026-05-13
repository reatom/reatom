export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))

export const relativeTime = (value: string) => {
  const diff = Date.parse(value) - Date.now()
  const abs = Math.abs(diff)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (abs < 60_000) return 'just now'
  if (abs < 3_600_000) return formatter.format(Math.round(diff / 60_000), 'minute')
  if (abs < 86_400_000) return formatter.format(Math.round(diff / 3_600_000), 'hour')
  return formatter.format(Math.round(diff / 86_400_000), 'day')
}
