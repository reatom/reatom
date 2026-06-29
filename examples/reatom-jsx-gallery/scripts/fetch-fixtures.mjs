#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, access, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const scriptDir = dirname(fileURLToPath(import.meta.url))
const galleryRoot = join(scriptDir, '..')
const manifestPath = join(galleryRoot, 'src/__fixtures__/manifest.json')
const imagesRoot = join(galleryRoot, 'src/__fixtures__/images')

const RECURSER =
  'https://raw.githubusercontent.com/recurser/exif-orientation-examples/v2.0.1'
const WPT =
  'https://raw.githubusercontent.com/web-platform-tests/wpt/master/images'
const PNGSUITE = 'http://www.schaik.com/pngsuite'
const LIBWEBP =
  'https://raw.githubusercontent.com/webmproject/libwebp-test-data/main'
const NOMACS =
  'https://raw.githubusercontent.com/nomacs/formats_testset/main'
const OCULANTE =
  'https://raw.githubusercontent.com/woelper/oculante/master/tests'
const EXIFTOOL =
  'https://raw.githubusercontent.com/exiftool/exiftool/master/t/images'
const SHARP =
  'https://raw.githubusercontent.com/lovell/sharp/main/test/fixtures'
const LIBAVIF =
  'https://raw.githubusercontent.com/AOMediaCodec/libavif/main/tests/data'
const IMAGE_RS =
  'https://raw.githubusercontent.com/image-rs/image/main/tests/bad'

function urlEntry(tier, dest, url, license, source) {
  return { tier, dest, url, license, source }
}

function pixlsEntry(tier, dest, gitPath, license, source) {
  return { tier, dest, pixlsGitPath: gitPath, license, source }
}

function generatedBmpEntry(tier, dest, license, source) {
  return { tier, dest, generated: 'bmp24-2x2', license, source }
}

const manifestEntries = [
  ...Array.from({ length: 8 }, (_, index) => {
    const number = index + 1
    return urlEntry(
      'tier-a',
      `exif/Landscape_${number}.jpg`,
      `${RECURSER}/Landscape_${number}.jpg`,
      'MIT',
      'recurser/exif-orientation-examples v2.0.1',
    )
  }),
  ...Array.from({ length: 8 }, (_, index) => {
    const number = index + 1
    return urlEntry(
      'tier-a',
      `exif/Portrait_${number}.jpg`,
      `${RECURSER}/Portrait_${number}.jpg`,
      'MIT',
      'recurser/exif-orientation-examples v2.0.1',
    )
  }),
  urlEntry(
    'tier-a',
    'web/green.png',
    `${WPT}/green.png`,
    'BSD-3-Clause',
    'web-platform-tests/wpt images/',
  ),
  urlEntry(
    'tier-a',
    'web/green.avif',
    `${WPT}/green.avif`,
    'BSD-3-Clause',
    'web-platform-tests/wpt images/',
  ),
  urlEntry(
    'tier-a',
    'web/animated-avif.avif',
    `${WPT}/animated-avif.avif`,
    'BSD-3-Clause',
    'web-platform-tests/wpt images/',
  ),
  urlEntry(
    'tier-a',
    'web/webp-animated.webp',
    `${WPT}/webp-animated.webp`,
    'BSD-3-Clause',
    'web-platform-tests/wpt images/',
  ),
  urlEntry(
    'tier-a',
    'web/apng.png',
    `${WPT}/apng.png`,
    'BSD-3-Clause',
    'web-platform-tests/wpt images/',
  ),
  urlEntry(
    'tier-a',
    'web/transparent.png',
    `${WPT}/transparent.png`,
    'BSD-3-Clause',
    'web-platform-tests/wpt images/',
  ),
  ...[
    'basn0g01.png',
    'basn0g02.png',
    'basn0g04.png',
    'basn0g08.png',
    'basn0g16.png',
    'basn2c08.png',
    'basn2c16.png',
    'basn3p01.png',
    'basn3p02.png',
    'basn3p04.png',
    'basn4a08.png',
    'basn6a08.png',
  ].map((name) =>
    urlEntry(
      'tier-a',
      `png/${name}`,
      `${PNGSUITE}/${name}`,
      'Freeware',
      'PngSuite / schaik.com/pngsuite',
    ),
  ),
  urlEntry(
    'tier-a',
    'webp/lossless1.webp',
    `${LIBWEBP}/lossless1.webp`,
    'BSD-3-Clause',
    'webmproject/libwebp-test-data',
  ),
  urlEntry(
    'tier-a',
    'webp/alpha_filter_0_method_0.webp',
    `${LIBWEBP}/alpha_filter_0_method_0.webp`,
    'BSD-3-Clause',
    'webmproject/libwebp-test-data',
  ),
  urlEntry(
    'tier-a',
    'webp/test.webp',
    `${LIBWEBP}/test.webp`,
    'BSD-3-Clause',
    'webmproject/libwebp-test-data',
  ),
  urlEntry(
    'tier-a',
    'gif/clock.gif',
    `${NOMACS}/animated/clock.gif`,
    'BSD-3-Clause',
    'nomacs/formats_testset animated/clock.gif',
  ),
  urlEntry(
    'tier-a',
    'svg/shapes_and_text.svg',
    `${OCULANTE}/shapes_and_text.svg`,
    'MIT',
    'woelper/oculante tests/shapes_and_text.svg',
  ),
  generatedBmpEntry(
    'tier-a',
    'bmp/rgb24-2x2.bmp',
    'Public Domain',
    'Generated locally for bmpsuite-style 24-bit RGB smoke test',
  ),
  urlEntry(
    'tier-a',
    'metadata/ExifTool.jpg',
    `${EXIFTOOL}/ExifTool.jpg`,
    'Artistic-2.0',
    'exiftool/exiftool t/images/ExifTool.jpg',
  ),
  urlEntry(
    'tier-a',
    'metadata/GPS.jpg',
    `${EXIFTOOL}/GPS.jpg`,
    'Artistic-2.0',
    'exiftool/exiftool t/images/GPS.jpg',
  ),
  urlEntry(
    'tier-a',
    'metadata/XMP.jpg',
    `${EXIFTOOL}/XMP.jpg`,
    'Artistic-2.0',
    'exiftool/exiftool t/images/XMP.jpg',
  ),
  ...Array.from({ length: 8 }, (_, index) => {
    const number = index + 1
    return urlEntry(
      'tier-b',
      `exif/Landscape_${number}.jpg`,
      `${NOMACS}/orientation/with-thumb/Landscape_${number}.jpg`,
      'BSD-3-Clause',
      'nomacs/formats_testset orientation/with-thumb',
    )
  }),
  ...['jpg', 'png', 'webp', 'avif'].map((ext) =>
    urlEntry(
      'tier-b',
      `rotations/img-001.${ext}`,
      `${NOMACS}/generated/exiftool-rotations/img-001.${ext}`,
      'BSD-3-Clause',
      'nomacs/formats_testset generated/exiftool-rotations',
    ),
  ),
  ...[
    '001.opaque.monob.png',
    '004.opaque.gray16be.png',
    '006.opaque.pal8.png',
    '007.opaque.rgb24.png',
    '008.opaque.rgba.png',
    '010.opaque.rgba64be.png',
    '011.transparent.ya8.png',
    '013.transparent.rgba.png',
    '015.colorkey.ya8.png',
    '018.colorkey.rgba.png',
    '019.colorkey.rgba64be.png',
  ].map((name) =>
    urlEntry(
      'tier-b',
      `png-formats/${name}`,
      `${NOMACS}/generated/png/${name}`,
      'BSD-3-Clause',
      'nomacs/formats_testset generated/png',
    ),
  ),
  urlEntry(
    'tier-b',
    'avif/repetition3.avif',
    `${NOMACS}/AVIF/repetition3.avif`,
    'BSD-3-Clause',
    'nomacs/formats_testset AVIF/repetition3.avif',
  ),
  urlEntry(
    'tier-b',
    'avif/colors-animated-8bpc.avif',
    `${LIBAVIF}/colors-animated-8bpc.avif`,
    'BSD-2-Clause',
    'AOMediaCodec/libavif tests/data',
  ),
  urlEntry(
    'tier-b',
    'stress/large.png',
    `${OCULANTE}/large.png`,
    'MIT',
    'woelper/oculante tests/large.png',
  ),
  urlEntry(
    'tier-b',
    'stress/unpremult.png',
    `${OCULANTE}/unpremult.png`,
    'MIT',
    'woelper/oculante tests/unpremult.png',
  ),
  urlEntry(
    'tier-b',
    'stress/pngtest_16bit.png',
    `${OCULANTE}/pngtest_16bit.png`,
    'MIT',
    'woelper/oculante tests/pngtest_16bit.png',
  ),
  urlEntry(
    'tier-b',
    'stress/moss.jpg',
    `${OCULANTE}/moss.jpg`,
    'MIT',
    'woelper/oculante tests/moss.jpg',
  ),
  urlEntry(
    'tier-b',
    'stress/AR-ar-test.png',
    `${OCULANTE}/AR-%D8%A7%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1.png`,
    'MIT',
    'woelper/oculante tests/AR-اختبار.png',
  ),
  urlEntry(
    'tier-b',
    'stress/JP-konnichiwa.png',
    `${OCULANTE}/JP-%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF.png`,
    'MIT',
    'woelper/oculante tests/JP-こんにちは.png',
  ),
  urlEntry(
    'tier-b',
    'stress/SC-test.png',
    `${OCULANTE}/SC-%E6%B8%AC%E8%A9%A6.png`,
    'MIT',
    'woelper/oculante tests/SC-測試.png',
  ),
  ...Array.from({ length: 8 }, (_, index) => {
    const number = index + 1
    return urlEntry(
      'tier-b',
      `orient-sharp/Landscape_${number}.jpg`,
      `${SHARP}/Landscape_${number}.jpg`,
      'Apache-2.0',
      'lovell/sharp test/fixtures',
    )
  }),
  urlEntry(
    'tier-b',
    'corrupt/Bad_height.bmp',
    `${IMAGE_RS}/bmp/Bad_height.bmp`,
    'MIT OR Apache-2.0',
    'image-rs/image tests/bad/bmp',
  ),
  urlEntry(
    'tier-b',
    'corrupt/Bad_width.bmp',
    `${IMAGE_RS}/bmp/Bad_width.bmp`,
    'MIT OR Apache-2.0',
    'image-rs/image tests/bad/bmp',
  ),
  urlEntry(
    'tier-b',
    'corrupt/Bad_shortfile.bmp',
    `${IMAGE_RS}/bmp/Bad_shortfile.bmp`,
    'MIT OR Apache-2.0',
    'image-rs/image tests/bad/bmp',
  ),
  urlEntry(
    'tier-b',
    'corrupt/Bad_smile-incorrect-image-length.ico',
    `${IMAGE_RS}/ico/Bad_smile-incorrect-image-length.ico`,
    'MIT OR Apache-2.0',
    'image-rs/image tests/bad/ico',
  ),
  urlEntry(
    'tier-b',
    'corrupt/hpredict_cmyk.tiff',
    `${IMAGE_RS}/tiff/TODO%20hpredict_cmyk.tiff`,
    'MIT OR Apache-2.0',
    'image-rs/image tests/bad/tiff',
  ),
  urlEntry(
    'tier-c',
    'raw/IMG_3887.CR2',
    `${NOMACS}/RAW/IMG_3887.CR2`,
    'BSD-3-Clause',
    'nomacs/formats_testset RAW/IMG_3887.CR2',
  ),
  urlEntry(
    'tier-c',
    'raw/IMG_4059.CR2',
    `${NOMACS}/RAW/IMG_4059.CR2`,
    'BSD-3-Clause',
    'nomacs/formats_testset RAW/IMG_4059.CR2',
  ),
  urlEntry(
    'tier-c',
    'raw/IMG_4073.CR2',
    `${NOMACS}/RAW/IMG_4073.CR2`,
    'BSD-3-Clause',
    'nomacs/formats_testset RAW/IMG_4073.CR2',
  ),
  urlEntry(
    'tier-c',
    'raw/DSC_0073.NEF',
    `${NOMACS}/RAW/DSC_0073.NEF`,
    'BSD-3-Clause',
    'nomacs/formats_testset RAW/DSC_0073.NEF',
  ),
  urlEntry(
    'tier-c',
    'dng/574-purple-cast.dng',
    `${NOMACS}/nomacs-issues/574.purple%20cast.dng`,
    'BSD-3-Clause',
    'nomacs/formats_testset nomacs-issues/574.purple cast.dng',
  ),
  pixlsEntry(
    'tier-c',
    'pixls/RX700064.ARW',
    'SONY/DSC-RX100M7A/RX700064.ARW',
    'CC0',
    'raw.pixls.us data.lfs.git SONY/DSC-RX100M7A/RX700064.ARW',
  ),
  pixlsEntry(
    'tier-c',
    'pixls/RAW_OLYMPUS_C5050Z.ORF',
    'Olympus/C5050Z/RAW_OLYMPUS_C5050Z.ORF',
    'CC0',
    'raw.pixls.us data.lfs.git Olympus/C5050Z/RAW_OLYMPUS_C5050Z.ORF',
  ),
]

function createMinimalBmp24Buffer() {
  const width = 2
  const height = 2
  const rowStride = width * 3
  const paddedRowStride = (rowStride + 3) & ~3
  const pixelBytes = paddedRowStride * height
  const fileSize = 54 + pixelBytes
  const buffer = Buffer.alloc(fileSize)

  buffer.write('BM')
  buffer.writeUInt32LE(fileSize, 2)
  buffer.writeUInt32LE(0, 6)
  buffer.writeUInt32LE(54, 10)
  buffer.writeUInt32LE(40, 14)
  buffer.writeInt32LE(width, 18)
  buffer.writeInt32LE(height, 22)
  buffer.writeUInt16LE(1, 26)
  buffer.writeUInt16LE(24, 28)
  buffer.writeUInt32LE(0, 30)
  buffer.writeUInt32LE(pixelBytes, 34)
  buffer.writeInt32LE(2835, 38)
  buffer.writeInt32LE(2835, 42)
  buffer.writeUInt32LE(0, 46)
  buffer.writeUInt32LE(0, 50)

  const colors = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
  ]
  let offset = 54
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const color = colors[row * width + column]
      buffer[offset++] = color[2]
      buffer[offset++] = color[1]
      buffer[offset++] = color[0]
    }
    offset += paddedRowStride - rowStride
  }

  return buffer
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function downloadUrl(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

let pixlsClonePath = null

async function ensurePixlsClone() {
  if (pixlsClonePath) return pixlsClonePath

  pixlsClonePath = join(galleryRoot, '.cache/pixls-data.lfs')
  if (!(await fileExists(join(pixlsClonePath, '.git')))) {
    await mkdir(dirname(pixlsClonePath), { recursive: true })
    await execFileAsync('git', [
      'clone',
      '--filter=blob:none',
      'https://raw.pixls.us/data.lfs.git',
      pixlsClonePath,
    ])
    await execFileAsync('git', ['lfs', 'install'], { cwd: pixlsClonePath })
  }

  return pixlsClonePath
}

async function downloadPixlsFile(gitPath) {
  const tmpClone = '/tmp/pixls-data'
  if (await fileExists(join(tmpClone, '.git'))) {
    await execFileAsync('git', ['lfs', 'pull', '--include', gitPath], {
      cwd: tmpClone,
      timeout: 120_000,
    })
    const tmpPath = join(tmpClone, gitPath)
    if (await fileExists(tmpPath)) {
      const bytes = await readFile(tmpPath)
      if (bytes.length > 1000) return bytes
    }
  }

  const clonePath = await ensurePixlsClone()
  await execFileAsync('git', ['lfs', 'pull', '--include', gitPath], {
    cwd: clonePath,
    timeout: 120_000,
  })
  const sourcePath = join(clonePath, gitPath)
  if (!(await fileExists(sourcePath))) {
    throw new Error(`Pixls file missing after LFS pull: ${gitPath}`)
  }
  return readFile(sourcePath)
}

async function materializeEntry(entry) {
  if (entry.generated === 'bmp24-2x2') {
    return createMinimalBmp24Buffer()
  }
  if (entry.pixlsGitPath) {
    return downloadPixlsFile(entry.pixlsGitPath)
  }
  return downloadUrl(entry.url)
}

async function main() {
  const writeHashes = process.argv.includes('--write-hashes')
  const force = process.argv.includes('--force')
  const tierFilter = process.argv.find((arg) => arg.startsWith('--tier='))?.split('=')[1]

  const selectedEntries = tierFilter
    ? manifestEntries.filter((entry) => entry.tier === tierFilter)
    : manifestEntries

  let existingManifest = { entries: [] }
  if (await fileExists(manifestPath)) {
    existingManifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  }

  const existingByDest = new Map(
    existingManifest.entries.map((entry) => [ `${entry.tier}/${entry.dest}`, entry ]),
  )

  const updatedEntries = []

  for (const entry of selectedEntries) {
    const outputPath = join(imagesRoot, entry.tier, entry.dest)
    await mkdir(dirname(outputPath), { recursive: true })

    const mergedEntry = {
      ...entry,
      sha256: existingByDest.get(`${entry.tier}/${entry.dest}`)?.sha256 ?? '',
    }

    if (!force && (await fileExists(outputPath))) {
      const fileStat = await stat(outputPath)
      if (fileStat.size > 100) {
        const currentHash = sha256(await readFile(outputPath))
        if (!mergedEntry.sha256 || mergedEntry.sha256 === currentHash) {
          updatedEntries.push({
            ...mergedEntry,
            sha256: currentHash,
            size: fileStat.size,
          })
          console.log(`hash ${entry.tier}/${entry.dest}`)
          continue
        }
      }
    }

    if (!force && mergedEntry.sha256 && (await fileExists(outputPath))) {
      const currentHash = sha256(await readFile(outputPath))
      if (currentHash === mergedEntry.sha256) {
        updatedEntries.push({ ...mergedEntry, sha256: currentHash })
        console.log(`skip ${entry.tier}/${entry.dest}`)
        continue
      }
    }

    console.log(`fetch ${entry.tier}/${entry.dest}`)
    const bytes = await materializeEntry(entry)
    const hash = sha256(bytes)
    await writeFile(outputPath, bytes)
    updatedEntries.push({ ...mergedEntry, sha256: hash, size: bytes.length })
  }

  const allEntries = tierFilter
    ? [
        ...existingManifest.entries.filter(
          (entry) => entry.tier !== tierFilter && !updatedEntries.some(
            (updated) => updated.tier === entry.tier && updated.dest === entry.dest,
          ),
        ),
        ...updatedEntries,
      ]
    : updatedEntries

  allEntries.sort((left, right) =>
    `${left.tier}/${left.dest}`.localeCompare(`${right.tier}/${right.dest}`),
  )

  await writeFile(
    manifestPath,
    `${JSON.stringify({ version: 1, entries: allEntries }, null, 2)}\n`,
  )

  if (writeHashes) {
    console.log(`Wrote manifest with ${allEntries.length} entries`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
