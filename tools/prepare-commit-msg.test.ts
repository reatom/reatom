import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const hook = fileURLToPath(new URL('./prepare-commit-msg.ts', import.meta.url))

function prepare(files: string[], message: string, source = 'message') {
  const cwd = mkdtempSync(join(tmpdir(), 'reatom-commit-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd })
  try {
    git('init', '--quiet')
    for (const file of files) {
      mkdirSync(dirname(join(cwd, file)), { recursive: true })
      writeFileSync(join(cwd, file), 'test\n')
    }
    git('add', '.')
    const messageFile = join(cwd, '.git/COMMIT_EDITMSG')
    writeFileSync(messageFile, message)
    execFileSync(
      process.execPath,
      ['--experimental-strip-types', hook, messageFile, source],
      { cwd },
    )
    return readFileSync(messageFile, 'utf8')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

test('infer sorted scopes for nested core modules and other packages', () => {
  assert.equal(
    prepare(
      ['packages/core/src/form/nested/a.ts', 'packages/opentelemetry/src/a.ts'],
      'fix!: update behavior\n\nBody\n',
    ),
    'fix(form,opentelemetry)!: update behavior\n\nBody\n',
  )
})

test('directory prefixes cannot match a file named like a directory', () => {
  assert.equal(prepare(['docs'], 'fix: update'), 'fix: update')
})

test('handle quoted and newline-containing filenames', () => {
  assert.equal(
    prepare(['packages/react/src/"odd\nname.ts'], 'fix: update'),
    'fix(react): update',
  )
})

test('preserve explicit scopes for package changes', () => {
  assert.equal(
    prepare(['packages/react/a.ts'], 'fix(custom): update'),
    'fix(custom): update',
  )
})

test('default unformatted documentation and example messages', () => {
  assert.equal(
    prepare(['docs/guide.md'], 'update guide\n'),
    'docs: update guide\n',
  )
  assert.equal(
    prepare(['examples/gallery/a.ts'], 'update gallery'),
    'docs(gallery): update gallery',
  )
})

test('leave merge, squash, reused messages and empty indexes alone', () => {
  for (const source of ['merge', 'squash', 'commit']) {
    assert.equal(
      prepare(['packages/react/a.ts'], 'fix: update', source),
      'fix: update',
    )
  }
  assert.equal(prepare([], 'fix: update'), 'fix: update')
})

test('normalize explicit example types, scopes and breaking markers', () => {
  for (const message of [
    'fix(gallery): update',
    'feat(other)!: update',
    'fix: update',
  ]) {
    assert.equal(
      prepare(['examples/gallery/src/a.ts'], message),
      'docs(gallery): update',
    )
  }
  assert.equal(
    prepare(['examples/gallery/a.ts', 'examples/chat/b.ts'], 'fix: update'),
    'docs(chat,gallery): update',
  )
})

test('normalize again after the editor, preserving bodies and trailers', () => {
  assert.equal(
    prepare(
      ['examples/gallery/a.ts'],
      'fix(gallery): update\n\nDetails\n\nCo-authored-by: A <a@example.com>\n',
      'validate',
    ),
    'docs(gallery): update\n\nDetails\n\nCo-authored-by: A <a@example.com>\n',
  )
  assert.equal(
    prepare(['examples/gallery/a.ts'], "Merge branch 'topic'", 'validate'),
    "Merge branch 'topic'",
  )
})

test('mixed example and package commits retain their type', () => {
  assert.equal(
    prepare(['examples/gallery/a.ts', 'packages/react/a.ts'], 'fix: update'),
    'fix(react): update',
  )
})
