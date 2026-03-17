// Pixel widths matching Panda CSS default breakpoints (1rem = 16px base font).
// If you ever add custom `theme.extend.breakpoints` to panda.config.ts, update
// these values to match.

export const FALLBACK_VIEWPORT = { width: 1280, height: 720 } as const

type PandaBreakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const pandaBreakpointWidths: Record<PandaBreakpoint, number> = {
	sm: 640, // 40rem
	md: 768, // 48rem
	lg: 1024, // 64rem
	xl: 1280, // 80rem
	'2xl': 1536, // 96rem
}

/** Returns `{ width, height }` for a Panda breakpoint name, or `null` if unknown. */
export function getViewportSize(name: string): { width: number; height: number } | null {
	const width = pandaBreakpointWidths[name as PandaBreakpoint]
	if (width === undefined) return null
	return { width, height: FALLBACK_VIEWPORT.height }
}
