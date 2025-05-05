import type starlight from '@astrojs/starlight'
import { resolve, join } from 'node:path'
import { readFile } from 'node:fs/promises'

type StarlightSidebarConfig = NonNullable<
  Parameters<typeof starlight>[0]['sidebar']
>
type StarlightSidebarEntry = StarlightSidebarConfig[number]
type StarlightSidebarLink = Extract<StarlightSidebarEntry, { link: string }>

type PackageRef = {
  path: string
  package: { name: string }
  slug: string
  originalSelector: string
}

export function nameToSlug(name: string): string {
  return name.replace(/[@\/]/g, '-').replace(/^-+|-+$|/, '')
}

export async function defineConfig(paths: string[]): Promise<PackageRef[]> {
  return Promise.all(
    paths.map(async (pkgPath) => {
      const path = resolve(process.cwd(), pkgPath)
      const pkgBody = await readFile(join(path, 'package.json'), 'utf8')
      const pkgJson = JSON.parse(pkgBody)
      const npmName = pkgJson.name as string
      return {
        path,
        package: { name: npmName },
        slug: nameToSlug(npmName),
        originalSelector: pkgPath,
      }
    }),
  )
}

export function makeSidebar(
  packages: PackageRef[],
  { prefix }: { prefix?: string },
): Promise<StarlightSidebarLink[]> {
  const links = packages.map(async (pkg) => ({
    label: pkg.package.name,
    link: `/${prefix ? prefix + '/' : ''}${pkg.slug}`,
  }))

  return Promise.all(links)
}
