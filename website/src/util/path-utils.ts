/** Ensure the passed path does not start with a leading slash. */
export function stripLeadingSlash(href: string) {
  if (href[0] === '/') href = href.slice(1)
  return href
}

/** Ensure the passed path does not end with a trailing slash. */
export function stripTrailingSlash(href: string) {
  if (href[href.length - 1] === '/') href = href.slice(0, -1)
  return href
}

/** Ensure the passed path does not start and end with slashes. */
export function stripLeadingAndTrailingSlashes(href: string): string {
  href = stripLeadingSlash(href)
  href = stripTrailingSlash(href)
  return href
}

export function getLanguageFromURL(pathname: string) {
  const langCodeMatch = pathname.match(/\/([a-z]{2}-?[a-z]{0,2})\//)
  return langCodeMatch ? langCodeMatch[1] : 'en'
}

/** Remove \ and / from beginning of string */
export function removeLeadingSlash(path: string) {
  return path.replace(/^[/\\]+/, '')
}

/** Remove \ and / from end of string */
export function removeTrailingSlash(path: string) {
  return path.replace(/[/\\]+$/, '')
}

/** Get a page’s slug, without the language prefix (e.g. `'en/migrate'` => `'migrate'`). */
export const stripLangFromSlug = (slug: string) =>
  slug.split('/').slice(1).join('/')

/** Get a page’s lang tag from its slug (e.g. `'en/migrate'` => `'en'`). */
export const getLangFromSlug = (slug: string) => slug.split('/')[0]
