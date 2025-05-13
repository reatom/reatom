import type starlight from '@astrojs/starlight'
import { defu } from 'defu'
import { join, relative, sep as pathSep } from 'node:path'
import { fs } from 'zx'
import { glob, Loader } from 'astro/loaders'

type StarlightSidebarConfig = NonNullable<
  Parameters<typeof starlight>[0]['sidebar']
>
type StarlightSidebarEntry = StarlightSidebarConfig[number]
type StarlightSidebarLink = Extract<StarlightSidebarEntry, { link: string }>

type ReferenceJSON = {
  /** @default: "./package.json" */
  'package.json'?: string
  /** @default "./README.md" */
  introduction?: string
  referenceDocs?: string
  changelog?: string
}

type PackageRef = {
  absolutePath: string
  packageJson: { name: string }
  slug: string
  relativePath: string
  referenceJson: ReferenceJSON
}

export function nameToSlug(name: string): string {
  return name.replace(/[@\/]/g, '-').replace(/^-+|-+$|/, '')
}

export async function defineConfig(paths: string[]): Promise<PackageRef[]> {
  return Promise.all(
    paths.map(async (relativePath) => {
      const absolutePath = join(process.cwd(), relativePath)
      const referencePath = join(absolutePath, 'reference.json')
      const referenceBody = await fs.readJson(referencePath).catch(() => ({}))
      const referenceJson = defu(referenceBody, {
        'package.json': './package.json',
        introduction: './README.md',
      }) as ReferenceJSON

      const packageJsonPath = join(absolutePath, referenceJson['package.json'])
      const packageJson = (await fs.readJson(packageJsonPath)) as {
        name: string
      }

      return {
        absolutePath,
        packageJson,
        slug: nameToSlug(packageJson.name),
        relativePath: relativePath,
        referenceJson,
      }
    }),
  )
}

export function makeSidebar(
  packages: PackageRef[],
  { prefix }: { prefix?: string },
): Promise<StarlightSidebarLink[]> {
  const links = packages.map(async (pkg) => {
    const packageLink = `/${prefix ? prefix + '/' : ''}${pkg.slug}`

    const pages = []
    if (pkg.referenceJson.referenceDocs) {
      pages.push({
        label: 'Reference',
        link: `${packageLink}/reference`,
      })
    }
    if (pkg.referenceJson.changelog) {
      pages.push({
        label: 'Changelog',
        link: `${packageLink}/changelog`,
      })
    }

    return pages.length
      ? {
          label: pkg.packageJson.name,
          collapsed: true,
          items: [
            {
              label: 'Introduction',
              link: packageLink,
            },
            ...pages,
          ],
        }
      : {
          label: pkg.packageJson.name,
          link: packageLink,
        }
  })

  return Promise.all(links)
}

export function loader(pkgs: PackageRef[]): Loader {
  const base = pkgs
    .map((pkg) => pkg.absolutePath)
    .reduce((base, candidate) => {
      if (candidate.startsWith(base)) return base

      let candidateParts = candidate.split(pathSep)
      let baseParts = base.split(pathSep)
      const minLength = Math.min(candidateParts.length, baseParts.length)
      let i = 0
      for (; i < minLength; i++) {
        if (baseParts[i] !== candidateParts[i]) {
          break
        }
      }
      return baseParts.slice(0, i).join(pathSep)
    })

  let map = new Map<string, string>()
  let pattern: string[] = []

  function trackFile(pkg: PackageRef, prop: keyof ReferenceJSON) {
    const localTarget = pkg.referenceJson[prop]
    if (localTarget) {
      // resolve absolute path in FS
      const absolutePath = join(pkg.absolutePath, localTarget)
      // get path relative to `base`, it'll be used below in generateId
      const relativePath = relative(base, absolutePath)
      pattern.push(relativePath)
      map.set(relativePath, `${pkg.slug}:${prop}`)
    }
  }

  for (const pkg of pkgs) {
    trackFile(pkg, 'introduction')
    trackFile(pkg, 'referenceDocs')
    trackFile(pkg, 'changelog')
  }

  return glob({
    pattern,
    base,
    generateId({ entry, base }) {
      const id = map.get(entry)
      if (!id) throw new Error(`Not found id for ${entry} on ${base}`)
      return id
    },
  })
}
