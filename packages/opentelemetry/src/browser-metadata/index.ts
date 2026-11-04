import type { BooleanAtom, Ext } from '@reatom/core'
import { featureControl } from '../feature.ts'
import { setBrowserMetadata } from '../browserCapture.ts'
import type { BrowserTelemetry } from '../captureEngine.ts'
import type { OtlpAttrValue } from '../toOtlpValue.ts'
export interface BrowserMetadataOptions {
  /** Explicit document URL capture, strips credentials, query and fragment. */
  pageUrl?: boolean
  bundleId?: string
  gitHash?: string
  installationId?: string
  /** Overrides for browsers not recognized by the bounded native parser. */
  attributes?: Record<string, OtlpAttrValue>
}
/** Stateless document metadata. No persistent storage or visitor identity. */
export const withBrowserMetadata =
  (
    options: BrowserMetadataOptions = {},
  ): Ext<BrowserTelemetry, { browserMetadata: BooleanAtom }> =>
  (otel) => ({
    browserMetadata: featureControl(otel, 'browserMetadata', () => {
      if (typeof window === 'undefined' || typeof navigator === 'undefined')
        return { dispose() {} }
      const remove = setBrowserMetadata(otel, () => {
        const ua = navigator.userAgent.slice(0, 2048)
        const match = ['Edg', 'OPR', 'Firefox', 'Chrome', 'Version']
          .map((name) => new RegExp(`(${name})/([\\d.]+)`).exec(ua))
          .find(Boolean)
        const names: Record<string, string> = {
          Edg: 'Edge',
          OPR: 'Opera',
          Firefox: 'Firefox',
          Chrome: 'Chrome',
          Version: 'Safari',
        }
        const attrs: Record<string, OtlpAttrValue> = {
          'user_agent.original': ua,
          'browser.language': navigator.language.slice(0, 64),
          'browser.mobile': /Mobile|Android|iPhone|iPad/.test(ua),
          'browser.viewport.width': window.innerWidth,
          'browser.viewport.height': window.innerHeight,
        }
        const brands = (
          navigator as Navigator & {
            userAgentData?: {
              brands?: Array<{ brand: string; version: string }>
            }
          }
        ).userAgentData?.brands
        if (brands)
          attrs['browser.brands'] = brands
            .slice(0, 10)
            .map(({ brand, version }) => ({
              brand: brand.slice(0, 64),
              version: version.slice(0, 32),
            }))
        if (match) {
          attrs['browser.name'] = names[match[1]!]!
          attrs['browser.version'] = match[2]!
        }
        const os = /Windows NT/.test(ua)
          ? 'Windows'
          : /Android/.test(ua)
            ? 'Android'
            : /iPhone|iPad/.test(ua)
              ? 'iOS'
              : /Mac OS X/.test(ua)
                ? 'macOS'
                : /Linux/.test(ua)
                  ? 'Linux'
                  : undefined
        if (os) attrs['browser.os'] = os
        if (options.pageUrl) {
          const url = new URL(window.location.href)
          attrs['page.url'] = `${url.origin}${url.pathname}`.slice(0, 2048)
        }
        for (const [key, value] of Object.entries({
          'service.bundle.id': options.bundleId,
          'service.git.hash': options.gitHash,
          'service.installation.id': options.installationId,
        }))
          if (value !== undefined) attrs[key] = value.slice(0, 256)
        return { ...attrs, ...options.attributes }
      })
      return { dispose: remove }
    }),
  })
