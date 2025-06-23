import { spawn } from 'node:child_process'

const order = [
  ['core', 'eslint-plugin', 'utils'],
  ['effects', 'logger', 'primitives'],
  ['all-settled', 'hooks', 'jsx'],
  ['core-v1', 'core-v2', 'lens', 'timer', 'url', 'web'],
  ['persist', 'react-v1', 'react-v2'],
  ['async'],
  ['framework', 'undo', 'web-fetch'],
  [
    'cjs-import-check',
    'esm-import-check',
    'form',
    'npm-cookie-baker',
    'npm-lit',
    'npm-react',
    'npm-solid-js',
    'npm-svelte',
    'npm-vue',
    'npm-zod',
    'persist-web-storage',
    'testing',
  ],
  ['form-web'],
]

const runCommand = async (pkg: string) => {
  return new Promise((resolve, reject) => {
    const cmd = spawn('pnpm', ['--filter', pkg, 'run', 'build'], {
      stdio: 'inherit',
      shell: true,
    })

    cmd.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`❌ ${pkg}`))
      } else {
        resolve()
      }
    })
  })
}

const runBuildsInOrder = async (order: string[][]) => {
  for (const group of order) {
    console.log(`\n🚀 [${group.join(', ')}]`)

    await Promise.all(group.map(runCommand))

    console.log(`✅ [${group.join(', ')}]\n`)
  }

  console.log('🎉')
}

runBuildsInOrder(order).catch((err) => {
  console.error(err.message)
  process.exit(1)
})
