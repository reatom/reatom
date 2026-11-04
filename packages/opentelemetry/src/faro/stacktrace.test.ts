import { expect, test } from 'vitest'
import { stackFrames } from './stacktrace.ts'

test('Chrome and Firefox stacks become native Faro frames', () => {
  expect(
    stackFrames(
      undefined,
      'Error: bad\n    at checkout (https://shop.test/app.js:12:3)\n    at https://shop.test/app.js:20:4',
    ),
  ).toEqual([
    {
      filename: 'https://shop.test/app.js',
      function: 'checkout',
      lineno: 12,
      colno: 3,
    },
    {
      filename: 'https://shop.test/app.js',
      function: '',
      lineno: 20,
      colno: 4,
    },
  ])
  expect(
    stackFrames(
      undefined,
      'checkout@https://shop.test/app.js:12:3\n@https://shop.test/app.js:20:4',
    ),
  ).toHaveLength(2)
})

test('explicit frames override parsing and strip unsafe or invalid fields', () => {
  expect(
    stackFrames(
      [
        {
          filename: 'app.js',
          function: 'fn',
          lineno: 10,
          colno: -1,
          bundleid: 'release',
          arbitrary: true,
        },
        { filename: 10, function: 'invalid' },
      ],
      'at https://other.test/x:1:2',
    ),
  ).toEqual([
    { filename: 'app.js', function: 'fn', lineno: 10, bundleid: 'release' },
  ])
  expect(stackFrames(undefined, 'opaque error')).toEqual([])
  expect(
    stackFrames(
      undefined,
      Array(1000).fill('at https://shop.test/app.js:1:2').join('\n'),
    ),
  ).toHaveLength(100)
})
