import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const cwd = process.cwd()
const repoRoot = existsSync(resolve(cwd, 'pnpm-workspace.yaml'))
  ? cwd
  : resolve(cwd, '..')

execFileSync(
  'pnpm',
  [
    '--filter',
    '@reatom/docs...',
    '--filter',
    '@reatom/jsx...',
    '--filter',
    './examples/*...',
    'install',
    '--frozen-lockfile',
  ],
  { cwd: repoRoot, stdio: 'inherit' },
)
