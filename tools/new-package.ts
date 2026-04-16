import 'zx/globals'
import path from 'node:path'
import fs from 'node:fs'
import readline from 'node:readline/promises'

const templatePath = path.join(process.cwd(), 'tools/new-package-template')

const rl = readline.createInterface(process.stdin, process.stdout)

$.verbose = false

const VERSION = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), 'packages/core/package.json'),
    'utf-8',
  ),
).version

main()
async function main() {
  do {
    var pkgName = await rl.question('❓ How should the new package be named? ')
    pkgName = pkgName.trim()
  } while (!pkgName)
  console.log(`ℹ️ The name is "${pkgName}"`)

  let description = await rl.question(
    '❓ How the package can be briefly described? ',
  )
  description = description.trim()
  console.log(`ℹ️ The description is "${description}"`)

  const authorNameDefault =
    (await $`git config --get user.name`).stdout.trim() || 'artalar'
  let authorName = await rl.question(
    `❓ What is your GitHub username [${authorNameDefault}]? `,
  )
  authorName = authorName.trim() || authorNameDefault
  console.log(`ℹ️ Author username is "${authorName}"`)

  const pkg = path.join(process.cwd(), 'packages', pkgName)
  await fs.promises.cp(templatePath, pkg, { recursive: true })

  const pkgManifestPath = path.join(pkg, 'package.json')
  const pkgManifest = JSON.parse(
    await fs.promises.readFile(pkgManifestPath, 'utf-8'),
  )
  pkgManifest.name = `@reatom/${pkgName}`
  pkgManifest.version = VERSION
  if (description) pkgManifest.description = description
  pkgManifest.author = makePerson(authorName)
  pkgManifest.maintainers = [
    makePerson('artalar'),
    ...(authorName === 'artalar' ? [] : [makePerson(authorName)]),
  ]
  pkgManifest.repository.directory = `packages/${pkgName}`
  pkgManifest.dependencies['@reatom/core'] = `>=${VERSION}`
  pkgManifest.homepage = `https://www.reatom.dev/package/${pkgName}`
  await fs.promises.writeFile(
    pkgManifestPath,
    JSON.stringify(pkgManifest, null, '\t'),
  )

  const pkgReadmePath = path.join(pkg, 'README.md')
  let pkgReadme = await fs.promises.readFile(pkgReadmePath, 'utf8')
  pkgReadme = pkgReadme.replaceAll('{{name}}', pkgName)
  pkgReadme = pkgReadme.replaceAll('{{description}}', description)
  await fs.promises.writeFile(pkgReadmePath, pkgReadme)

  console.log(`\n🍾 Done! Package created in directory "${pkg}"`)

  process.exit(0)
}

function makePerson(name: string) {
  return { name, url: `https://github.com/${name}` }
}
