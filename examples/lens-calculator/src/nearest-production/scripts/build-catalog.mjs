#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'catalog', 'data')
const userAgent =
  'ReatomLensCalculator/0.1 (https://github.com/reatom/reatom; legal catalog research)'

const manufacturerIds = [
  'sony',
  'canon',
  'nikon',
  'fujifilm',
  'olympus',
  'panasonic',
  'leica',
  'sigma',
  'tamron',
  'zeiss',
  'samyang',
  'voigtlander',
  'tokina',
  'laowa',
  'viltrox',
  'ttartisan',
  'artisans',
  'yongnuo',
  'meike',
  'pentax',
  'hasselblad',
  'minolta',
  'other',
]

const wikipediaPages = [
  { title: 'List_of_Sony_E-mount_lenses', mount: 'sony-e', manufacturer: 'sony' },
  { title: 'List_of_third-party_Sony_E-mount_lenses', mount: 'sony-e' },
  { title: 'List_of_Nikon_Z-mount_lenses', mount: 'nikon-z' },
  { title: 'Nikon_Z-mount', mount: 'nikon-z' },
  {
    title: 'List_of_Nikon_F-mount_lenses_with_integrated_autofocus_motor',
    mount: 'nikon-f',
  },
  { title: 'List_of_Canon_EF_lenses', mount: 'canon-ef', manufacturer: 'canon' },
  {
    title: 'List_of_Canon_EF-S_lenses',
    mount: 'canon-ef-s',
    manufacturer: 'canon',
    format: 'apsc',
  },
  { title: 'Canon_RF_lens_mount', mount: 'canon-rf' },
  {
    title: 'Canon_EF-M_lens_mount',
    mount: 'canon-ef-m',
    manufacturer: 'canon',
    format: 'apsc',
  },
  { title: 'List_of_Canon_EF-M_lenses', mount: 'canon-ef-m', format: 'apsc' },
  { title: 'Fujifilm_X-mount', mount: 'fujifilm-x', format: 'apsc' },
  { title: 'Fujifilm_G-mount', mount: 'fujifilm-g', format: 'mf' },
  { title: 'Four_Thirds_system', mount: 'four-thirds', format: 'mft' },
  {
    title: 'List_of_Micro_Four_Thirds_lenses',
    mount: 'mft',
    format: 'mft',
  },
  { title: 'Leica_M_lenses', mount: 'leica-m', manufacturer: 'leica' },
  { title: 'Leica_R_bayonet', mount: 'leica-r', manufacturer: 'leica' },
  {
    title: 'List_of_lenses_for_Hasselblad_cameras',
    mount: 'hasselblad-xcd',
    manufacturer: 'hasselblad',
    format: 'mf',
  },
  { title: 'Pentax_lenses', mount: 'pentax-k' },
  { title: 'Mamiya_645', mount: '645', format: 'mf' },
  { title: 'Contax_G', mount: 'other', manufacturer: 'zeiss' },
  {
    title: 'List_of_Sigma_lenses_with_Nikon_F-mount_and_integrated_autofocus_motor',
    mount: 'nikon-f',
    manufacturer: 'sigma',
  },
]

const manufacturerAliases = [
  [/^sony|zeiss.*sony|sony.*zeiss/i, 'sony'],
  [/^canon/i, 'canon'],
  [/^nikon|nikkor/i, 'nikon'],
  [/^fuji/i, 'fujifilm'],
  [/^olympus|^om[- ]?system|^om digital/i, 'olympus'],
  [/^panasonic|^lumix/i, 'panasonic'],
  [/^leica/i, 'leica'],
  [/^sigma/i, 'sigma'],
  [/^tamron/i, 'tamron'],
  [/^zeiss|^carl zeiss/i, 'zeiss'],
  [/^samyang|^rokinon|^walimex|^bokina/i, 'samyang'],
  [/^voigt|^cosina/i, 'voigtlander'],
  [/^tokina/i, 'tokina'],
  [/^laowa|^venus/i, 'laowa'],
  [/^viltrox/i, 'viltrox'],
  [/^tt\s*artisan/i, 'ttartisan'],
  [/^7\s*artisans/i, 'artisans'],
  [/^yongnuo|^yn /i, 'yongnuo'],
  [/^meike/i, 'meike'],
  [/^pentax|^ricoh/i, 'pentax'],
  [/^hasselblad/i, 'hasselblad'],
  [/^minolta|^konica/i, 'minolta'],
]

const mountAliases = [
  [/\bfe\b|e-mount|sony e|nex/i, 'sony-e'],
  [/\ba-mount|minolta a|sony a|alpha mount/i, 'sony-a'],
  [/\brf-s\b/, 'canon-rf'],
  [/\brf\b|canon rf/i, 'canon-rf'],
  [/\bef-s\b/, 'canon-ef-s'],
  [/\bef-m\b/, 'canon-ef-m'],
  [/\bef\b|canon ef/i, 'canon-ef'],
  [/\bz[- ]?mount|\bnz\b|nikon z/i, 'nikon-z'],
  [/\bf[- ]?mount|nikon f|\bai-s\b/i, 'nikon-f'],
  [/\bx[- ]?mount|fujifilm x|\bxf\b|\bxc\b/i, 'fujifilm-x'],
  [/\bg[- ]?mount|gfx|\bgf\b|fujifilm g/i, 'fujifilm-g'],
  [/micro four|m4\/3|mft|micro 4\/3/i, 'mft'],
  [/four thirds|4\/3/i, 'four-thirds'],
  [/\bl-mount|\bl mount|leica l/i, 'leica-l'],
  [/\bm-mount|leica m/i, 'leica-m'],
  [/\br-mount|leica r/i, 'leica-r'],
  [/\bsl-mount|leica sl/i, 'leica-sl'],
  [/pentax k|\bk-mount/i, 'pentax-k'],
  [/xcd|hasselblad x/i, 'hasselblad-xcd'],
  [/\bm42\b/, 'm42'],
  [/\b645\b/, '645'],
]

const mountMeta = {
  'sony-e': { label: 'Sony E', body: 'mirrorless', format: 'ff' },
  'sony-a': { label: 'Sony / Minolta A', body: 'slr', format: 'ff' },
  'canon-rf': { label: 'Canon RF', body: 'mirrorless', format: 'ff' },
  'canon-ef': { label: 'Canon EF', body: 'slr', format: 'ff' },
  'canon-ef-s': { label: 'Canon EF-S', body: 'slr', format: 'apsc' },
  'canon-ef-m': { label: 'Canon EF-M', body: 'mirrorless', format: 'apsc' },
  'nikon-z': { label: 'Nikon Z', body: 'mirrorless', format: 'ff' },
  'nikon-f': { label: 'Nikon F', body: 'slr', format: 'ff' },
  'fujifilm-x': { label: 'Fujifilm X', body: 'mirrorless', format: 'apsc' },
  'fujifilm-g': { label: 'Fujifilm G', body: 'mirrorless', format: 'mf' },
  mft: { label: 'Micro Four Thirds', body: 'mirrorless', format: 'mft' },
  'four-thirds': { label: 'Four Thirds', body: 'slr', format: 'mft' },
  'leica-l': { label: 'L-Mount', body: 'mirrorless', format: 'ff' },
  'leica-m': { label: 'Leica M', body: 'mirrorless', format: 'ff' },
  'leica-r': { label: 'Leica R', body: 'slr', format: 'ff' },
  'leica-sl': { label: 'Leica SL', body: 'mirrorless', format: 'ff' },
  'pentax-k': { label: 'Pentax K', body: 'slr', format: 'ff' },
  'hasselblad-xcd': { label: 'Hasselblad XCD', body: 'mirrorless', format: 'mf' },
  'minolta-a': { label: 'Minolta A', body: 'slr', format: 'ff' },
  m42: { label: 'M42', body: 'slr', format: 'ff' },
  645: { label: '645', body: 'slr', format: 'mf' },
  other: { label: 'Other', body: 'mirrorless', format: 'ff' },
}

const manufacturerLabels = {
  sony: 'Sony',
  canon: 'Canon',
  nikon: 'Nikon',
  fujifilm: 'Fujifilm',
  olympus: 'OM System',
  panasonic: 'Panasonic',
  leica: 'Leica',
  sigma: 'Sigma',
  tamron: 'Tamron',
  zeiss: 'Zeiss',
  samyang: 'Samyang',
  voigtlander: 'Voigtländer',
  tokina: 'Tokina',
  laowa: 'Laowa',
  viltrox: 'Viltrox',
  ttartisan: 'TTArtisan',
  artisans: '7artisans',
  yongnuo: 'Yongnuo',
  meike: 'Meike',
  pentax: 'Pentax',
  hasselblad: 'Hasselblad',
  minolta: 'Minolta',
  other: 'Other',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const fetchText = async (url, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'user-agent': userAgent,
      accept: 'application/json, text/html;q=0.9',
      ...init.headers,
    },
  })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return response
}

const decodeEntities = (value) =>
  value
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replaceAll(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&ndash;', '-')
    .replaceAll('&mdash;', '-')
    .replaceAll('&minus;', '-')
    .replaceAll('\u00ad', '')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

const firstNumber = (value) => {
  const match = String(value).replaceAll(',', '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

const parseFocalRange = (value) => {
  const text = String(value).replaceAll('–', '-').replaceAll('—', '-')
  const numbers = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:mm)?/gi)].map((match) =>
    Number(match[1]),
  )
  const focals = numbers.filter((number) => number >= 3 && number <= 2000)
  if (focals.length === 0) return null
  return { min: Math.min(...focals), max: Math.max(...focals) }
}

const parseAperture = (value) => {
  const text = String(value).replaceAll('–', '-').replaceAll(',', '.')
  const match = text.match(
    /(?:f|t)\s*[\/⁄]?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:-|–|$)/i,
  )
  if (!match) return null
  const number = Number(match[1] ?? match[2])
  return number >= 0.5 && number <= 45 ? number : null
}

const toMillimetres = (amount) => {
  if (amount === null || !Number.isFinite(amount)) return null
  if (amount > 0 && amount < 3) return Math.round(amount * 1000 * 10) / 10
  return Math.round(amount * 10) / 10
}

const toGrams = (amount) => {
  if (amount === null || !Number.isFinite(amount)) return null
  if (amount > 0 && amount < 20) return Math.round(amount * 1000)
  return Math.round(amount)
}

const matchAlias = (value, aliases, fallback) => {
  if (!value) return fallback
  for (const [pattern, id] of aliases) {
    if (pattern.test(value)) return id
  }
  return fallback
}

const classifyFormat = ({ name, mount, hint, focal }) => {
  if (hint === 'mft' || hint === 'apsc' || hint === 'ff' || hint === 'mf') {
    return hint
  }
  const text = `${name} ${mount}`
  if (/\bgf\b|\bxcd\b|44.?33|medium format|gfx/i.test(text)) return 'mf'
  if (/\bmft\b|m4\/3|micro four|four thirds/i.test(text)) return 'mft'
  if (/\bdx\b|\brf-s\b|\bef-s\b|\bef-m\b|\bxc\b|\bxf\b|aps-?c|e-mount aps/i.test(text)) {
    return 'apsc'
  }
  if (mount === 'fujifilm-x' || mount === 'canon-ef-s' || mount === 'canon-ef-m') {
    return 'apsc'
  }
  if (mount === 'mft' || mount === 'four-thirds') return 'mft'
  if (mount === 'fujifilm-g' || mount === 'hasselblad-xcd' || mount === '645') {
    return 'mf'
  }
  if (mount === 'sony-e' && focal !== null && focal <= 18 && /E |SEL-?\d/.test(name)) {
    return /FE|SEL1|SEL2|SEL3|SEL4|SEL5|GM|G Master/.test(name) ? 'ff' : 'apsc'
  }
  return mountMeta[mount]?.format ?? 'ff'
}

const classifyTier = ({ name, year, line }) => {
  const text = `${name} ${line ?? ''}`
  if (
    /g master|gm\b|\bart\b|\botus\b|\bnoct\b|\bplena\b|\bs-line\b|\blensbaby\b/i.test(
      text,
    ) ||
    /\bL(\s|\/|$)/.test(text) ||
    /flagship|apo-summicron|noctilux|summilux/i.test(text)
  ) {
    return 'flagship'
  }
  if (year !== null && year < 2000) return 'classic'
  if (
    /\bstm\b|\bg\b|modern|oss|vr |is usm|is stm|wr |lm wr/i.test(text) ||
    (year !== null && year >= 2010)
  ) {
    return 'modern'
  }
  if (year !== null && year < 2010) return 'classic'
  return 'modern'
}

const inferBarrel = (tier, name) => {
  if (/brass|voigt|leica m|summar/i.test(name) && tier === 'classic') return 'brass'
  if (tier === 'flagship') return 'magnesium'
  if (/kit|plastic|pz 16-50|18-55|dt 18/i.test(name)) return 'polycarbonate'
  return 'aluminium'
}

const slugify = (value) =>
  value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 80)

const makeLens = (partial) => {
  const mount = partial.mount ?? 'other'
  const manufacturer = partial.manufacturer ?? 'other'
  const name = partial.name
    ?.replaceAll(/\s*\[\s*\d+\s*\]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
  const focal = partial.focal
  const fNumber = partial.fNumber
  if (!name || focal === null || fNumber === null) return null
  if (/^Q\d+$/i.test(name)) return null
  if (focal < 3 || focal > 2000 || fNumber < 0.5 || fNumber > 45) return null

  const format = classifyFormat({
    name,
    mount,
    hint: partial.format,
    focal,
  })
  const body = mountMeta[mount]?.body ?? 'mirrorless'
  const year = partial.year
  const tier = classifyTier({ name, year, line: partial.line })
  const id = slugify(
    `${manufacturer}-${mount}-${name}-${focal}-${fNumber}-${partial.year ?? ''}`,
  )
  const isPrime = !/\d+(?:\.\d+)?\s*[-–]\s*\d+/.test(name)
  const focalMax = isPrime ? focal : (partial.focalMax ?? focal)

  return {
    id,
    name,
    manufacturer,
    manufacturerLabel: manufacturerLabels[manufacturer] ?? partial.manufacturerLabel ?? 'Other',
    mount,
    mountLabel: mountMeta[mount]?.label ?? 'Other',
    focal,
    focalMax,
    fNumber,
    format,
    body,
    tier,
    barrel: inferBarrel(tier, name),
    diameter: partial.diameter > 0 ? partial.diameter : null,
    length: partial.length > 0 ? partial.length : null,
    weight: partial.weight > 0 ? partial.weight : null,
    filter: partial.filter > 0 ? partial.filter : null,
    elements: partial.elements > 0 ? partial.elements : null,
    autofocus: partial.autofocus,
    stabilized: partial.stabilized,
    year,
    sources: partial.sources,
  }
}

const wikidataQuery = `
SELECT ?lens ?lensLabel ?manufacturerLabel ?mountLabel
  (GROUP_CONCAT(DISTINCT ?focal; separator="|") AS ?focals)
  (MIN(?aperture) AS ?maxAperture)
  (SAMPLE(?mass) AS ?mass)
  (SAMPLE(?length) AS ?length)
  (GROUP_CONCAT(DISTINCT ?diameter; separator="|") AS ?diameters)
  (SAMPLE(?inception) AS ?inception)
  (SAMPLE(?elementCount) AS ?elements)
WHERE {
  { ?lens wdt:P31/wdt:P279* wd:Q192234 . }
  UNION
  { ?lens wdt:P31/wdt:P279* wd:Q109672300 . }
  OPTIONAL { ?lens wdt:P176 ?manufacturer }
  OPTIONAL { ?lens wdt:P2151 ?focal }
  OPTIONAL { ?lens wdt:P7863 ?aperture }
  OPTIONAL { ?lens wdt:P6790 ?aperture }
  OPTIONAL { ?lens wdt:P2067 ?mass }
  OPTIONAL { ?lens wdt:P2043 ?length }
  OPTIONAL { ?lens wdt:P2386 ?diameter }
  OPTIONAL { ?lens wdt:P2935 ?mount }
  OPTIONAL { ?lens wdt:P571 ?inception }
  OPTIONAL {
    ?lens p:P2283 ?elemStmt .
    ?elemStmt ps:P2283 wd:Q115743910 .
    ?elemStmt pq:P1114 ?elementCount .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
GROUP BY ?lens ?lensLabel ?manufacturerLabel ?mountLabel
`

const fetchWikidata = async () => {
  const url = new URL('https://query.wikidata.org/sparql')
  url.searchParams.set('query', wikidataQuery)
  url.searchParams.set('format', 'json')
  const response = await fetchText(url, {
    headers: { accept: 'application/sparql-results+json' },
  })
  const payload = await response.json()
  const lenses = []
  for (const row of payload.results.bindings) {
    const focals = (row.focals?.value ?? '')
      .split('|')
      .map((value) => toMillimetres(Number(value)))
      .filter((value) => value !== null && value >= 3 && value <= 2000)
    const diameters = (row.diameters?.value ?? '')
      .split('|')
      .map((value) => toMillimetres(Number(value)))
      .filter((value) => value !== null)
    const sortedDiameters = [...diameters].sort((left, right) => left - right)
    const filterCandidate = sortedDiameters.find((value) => value >= 30 && value <= 112)
    const diameterCandidate =
      [...sortedDiameters].reverse().find((value) => value >= 40 && value <= 200) ??
      filterCandidate
    const yearText = row.inception?.value ?? ''
    const yearMatch = yearText.match(/^(\d{4})/)
    const lens = makeLens({
      name: row.lensLabel?.value,
      manufacturer: matchAlias(row.manufacturerLabel?.value, manufacturerAliases, 'other'),
      manufacturerLabel: row.manufacturerLabel?.value,
      mount: matchAlias(row.mountLabel?.value, mountAliases, 'other'),
      focal: focals[0] ?? null,
      focalMax: focals.length > 0 ? Math.max(...focals) : null,
      fNumber: row.maxAperture ? Number(row.maxAperture.value) : null,
      diameter: diameterCandidate ?? null,
      filter:
        filterCandidate !== undefined && filterCandidate !== diameterCandidate
          ? filterCandidate
          : (filterCandidate ?? null),
      length: toMillimetres(row.length ? Number(row.length.value) : null),
      weight: toGrams(row.mass ? Number(row.mass.value) : null),
      elements: row.elements ? Number(row.elements.value) : null,
      autofocus: /AF|USM|STM|HSM|SWM|XSM|LM |SSD/i.test(row.lensLabel?.value ?? '')
        ? true
        : null,
      stabilized: /VR|OSS|IS |OIS|Mega OIS|Power OIS/i.test(row.lensLabel?.value ?? '')
        ? true
        : null,
      year: yearMatch ? Number(yearMatch[1]) : null,
      sources: [row.lens.value],
    })
    if (lens) lenses.push(lens)
  }
  return lenses
}

const headerKey = (header) => {
  const text = header.toLowerCase().replaceAll(/[^a-z0-9]+/g, '')
  if (/^fl$|^flmm$/.test(text) || (/foc/.test(text) && !/minfoc|focusdist/.test(text))) {
    return 'focal'
  }
  if (/apert|^ap$|^f$|^fn$|fnumber|fstop/.test(text)) return 'aperture'
  if (/wgt|weight|mass/.test(text)) return 'weight'
  if (text === 'o' || text.includes('diameter') || text === 'dia' || text === 'diam') {
    return 'diameter'
  }
  if (header.includes('⌀') || header.includes('Ø') || header.includes('Φ')) {
    return header.toLowerCase().includes('len') ? 'dims' : 'diameter'
  }
  if (text.includes('dims') || text.includes('phil')) return 'dims'
  if (text === 'l' || (text.includes('length') && !text.includes('focal'))) return 'length'
  if (text.includes('filter')) return 'filter'
  if (
    text.includes('model') ||
    text === 'lens' ||
    text === 'lensname' ||
    text === 'name' ||
    text === 'designation'
  ) {
    return 'name'
  }
  if (
    text.includes('brand') ||
    text.includes('maker') ||
    text.includes('manuf') ||
    text === 'mfr'
  ) {
    return 'manufacturer'
  }
  if (
    text.includes('intro') ||
    text.includes('year') ||
    text.includes('reldate') ||
    text.includes('release') ||
    text === 'announced'
  ) {
    return 'year'
  }
  if (text === 'type' || text.includes('line') || text.includes('series')) return 'line'
  if (/oss|stabil|vr$|^is$|^vr$|ois/.test(text)) return 'stabilized'
  if (text.includes('element') || text === 'const') return 'elements'
  if (text.includes('mount')) return 'mount'
  if (/fxdx|format|coverage|sensor/.test(text)) return 'format'
  if (text.includes('notes')) return 'notes'
  return null
}

const splitRow = (rowHtml) =>
  [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) =>
    decodeEntities(match[1]),
  )

const parseDims = (value) => {
  const text = String(value).replaceAll('×', 'x').replaceAll('–', '-')
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*x\s*(\d+(?:\.\d+)?)/i)
  if (!match) return { diameter: null, length: null }
  return {
    diameter: Number(match[1]),
    length: Number(match[2]),
  }
}

const parseWikipediaTables = (html, page) => {
  const tables = []
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch
  while ((tableMatch = tableRe.exec(html))) {
    const tableHtml = tableMatch[1]
    if (/navbar|navbox|vertical-navbox|timeline/i.test(tableMatch[0].slice(0, 400))) {
      continue
    }
    const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(
      (match) => match[1],
    )
    if (rows.length < 3) continue
    let headerIndex = -1
    let keys = []
    for (const [index, rowHtml] of rows.entries()) {
      const mapped = splitRow(rowHtml).map(headerKey)
      if (mapped.includes('focal') && (mapped.includes('aperture') || mapped.includes('name'))) {
        headerIndex = index
        keys = mapped
        break
      }
    }
    if (headerIndex === -1) continue
    if (keys.includes('year') && keys.filter((key) => key === null).length > 8) continue
    for (const rowHtml of rows.slice(headerIndex + 1)) {
      const cells = splitRow(rowHtml)
      if (cells.length < 2) continue
      const record = {}
      keys.forEach((key, index) => {
        if (key) record[key] = cells[index] ?? ''
      })
      if (record.dims) {
        const dims = parseDims(record.dims)
        record.diameter ??= dims.diameter === null ? '' : String(dims.diameter)
        record.length ??= dims.length === null ? '' : String(dims.length)
      }
      tables.push({ page, record })
    }
  }
  return tables
}

const lensfunMount = [
  [/sony.?e|nex/i, 'sony-e'],
  [/sony.?a|minolta.?a|alpha/i, 'sony-a'],
  [/canon.?rf/i, 'canon-rf'],
  [/canon.?ef-s/i, 'canon-ef-s'],
  [/canon.?ef-m/i, 'canon-ef-m'],
  [/canon.?ef/i, 'canon-ef'],
  [/nikon.?z/i, 'nikon-z'],
  [/nikon.?f|nikkor.?f/i, 'nikon-f'],
  [/fuji.?x|x-mount/i, 'fujifilm-x'],
  [/fuji.?g|g-mount|gfx/i, 'fujifilm-g'],
  [/micro.?four|mft|m4\/3/i, 'mft'],
  [/four.?thirds/i, 'four-thirds'],
  [/leica.?l|l-mount/i, 'leica-l'],
  [/leica.?m/i, 'leica-m'],
  [/leica.?r/i, 'leica-r'],
  [/pentax.?k/i, 'pentax-k'],
  [/hasselblad/i, 'hasselblad-xcd'],
  [/m42/i, 'm42'],
  [/645/i, '645'],
]

const fetchLensfun = async () => {
  const listing = await fetchText(
    'https://api.github.com/repos/lensfun/lensfun/contents/data/db',
    { headers: { accept: 'application/vnd.github+json' } },
  )
  const files = (await listing.json()).filter(
    (file) => file.type === 'file' && file.name.endsWith('.xml'),
  )
  const lenses = []
  for (const file of files) {
    const response = await fetchText(file.download_url)
    const xml = await response.text()
    const blocks = [...xml.matchAll(/<lens\b[^>]*>([\s\S]*?)<\/lens>/gi)]
    for (const block of blocks) {
      const body = block[1]
      const maker = body.match(/<maker>([\s\S]*?)<\/maker>/i)?.[1]?.trim()
      const model = body.match(/<model>([\s\S]*?)<\/model>/i)?.[1]?.trim()
      const mount = body.match(/<mount>([\s\S]*?)<\/mount>/i)?.[1]?.trim()
      const crop = Number(body.match(/<cropfactor>([\s\S]*?)<\/cropfactor>/i)?.[1] ?? '')
      const focals = [...body.matchAll(/<focal[^>]*\bvalue="([^"]+)"/gi)].map((match) =>
        Number(match[1]),
      )
      const apertures = [...body.matchAll(/<aperture[^>]*\bmin="([^"]+)"/gi)].map((match) =>
        Number(match[1]),
      )
      const focalMin = focals.length > 0 ? Math.min(...focals) : firstNumber(model ?? '')
      const focalMax = focals.length > 0 ? Math.max(...focals) : focalMin
      const fNumber = apertures.length > 0 ? Math.min(...apertures) : parseAperture(model ?? '')
      const format =
        crop && crop >= 1.8 ? 'mft' : crop && crop >= 1.4 ? 'apsc' : crop && crop < 1 ? 'mf' : 'ff'
      const lens = makeLens({
        name: [maker, model].filter(Boolean).join(' '),
        manufacturer: matchAlias(maker, manufacturerAliases, 'other'),
        mount: matchAlias(mount, lensfunMount, 'other'),
        format,
        focal: focalMin ?? null,
        focalMax: focalMax ?? null,
        fNumber,
        diameter: null,
        length: null,
        weight: null,
        filter: null,
        elements: null,
        autofocus: /AF|USM|STM|HSM|SWM|SAM|SSD/i.test(model ?? '') ? true : null,
        stabilized: /VR|OSS|IS |OIS|VC /i.test(model ?? '') ? true : null,
        year: null,
        sources: [
          `https://github.com/lensfun/lensfun/blob/master/data/db/${file.name}`,
        ],
      })
      if (lens) lenses.push(lens)
    }
    await sleep(150)
  }
  return lenses
}

const wikipediaRowToLens = (page, record) => {
  const nameParts = [record.manufacturer, record.name, record.focal, record.aperture]
    .filter(Boolean)
    .join(' ')
  const focalRange = parseFocalRange(record.focal ?? record.name ?? '')
  const fNumber = parseAperture(record.aperture ?? record.name ?? '')
  const manufacturer = matchAlias(
    record.manufacturer || record.name || page.manufacturer,
    manufacturerAliases,
    page.manufacturer ?? 'other',
  )
  const mount = matchAlias(
    record.mount || record.name || page.mount,
    mountAliases,
    page.mount ?? 'other',
  )
  const formatHint = /aps-?c|dx|rf-s|ef-s|ef-m|\bxf\b/i.test(
    `${record.format ?? ''} ${record.name ?? ''} ${record.notes ?? ''}`,
  )
    ? 'apsc'
    : /mft|m4\/3|four thirds/i.test(`${record.format ?? ''} ${record.notes ?? ''}`)
      ? 'mft'
      : /medium|gfx|xcd|44.?33/i.test(`${record.format ?? ''} ${record.notes ?? ''}`)
        ? 'mf'
        : page.format
  const weight = toGrams(firstNumber(record.weight ?? ''))
  const diameter = toMillimetres(firstNumber(record.diameter ?? ''))
  const length = toMillimetres(firstNumber(record.length ?? ''))
  const filter = toMillimetres(firstNumber(record.filter ?? ''))
  const year = firstNumber(record.year ?? '')
  const elements = firstNumber(record.elements ?? '')
  const stabilizedText = `${record.stabilized ?? ''} ${record.name ?? ''}`
  return makeLens({
    name: nameParts.replaceAll(/\s+/g, ' ').trim(),
    manufacturer,
    mount,
    format: formatHint,
    focal: focalRange?.min ?? null,
    focalMax: focalRange?.max ?? null,
    fNumber,
    diameter,
    length,
    weight,
    filter,
    elements: elements !== null && elements >= 3 && elements <= 40 ? elements : null,
    autofocus: /AF|USM|STM|HSM|SWM|LM |XSM|SSD|autofocus/i.test(nameParts)
      ? true
      : /manual|MF only/i.test(nameParts)
        ? false
        : null,
    stabilized: /yes|oss|vr|ois|is usm|is stm/i.test(stabilizedText)
      ? true
      : /no|none/.test(record.stabilized ?? '')
        ? false
        : null,
    year: year !== null && year >= 1930 && year <= 2028 ? year : null,
    line: record.line,
    sources: [`https://en.wikipedia.org/wiki/${page.title}`],
  })
}

const fetchWikipediaPage = async (page) => {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'parse')
  url.searchParams.set('page', page.title)
  url.searchParams.set('prop', 'text')
  url.searchParams.set('format', 'json')
  url.searchParams.set('formatversion', '2')
  url.searchParams.set('redirects', '1')
  const response = await fetchText(url)
  const payload = await response.json()
  if (payload.error) {
    console.warn(`Wikipedia skip ${page.title}: ${payload.error.info}`)
    return []
  }
  const html = payload.parse?.text ?? ''
  return parseWikipediaTables(html, page)
    .map(({ record }) => wikipediaRowToLens(page, record))
    .filter((lens) => lens !== null)
}

const mergeLenses = (groups) => {
  const byKey = new Map()
  for (const lens of groups.flat()) {
    const key = [
      lens.manufacturer,
      lens.mount,
      lens.focal,
      lens.focalMax,
      lens.fNumber,
      slugify(lens.name.replaceAll(/\d+/g, '')),
    ].join('|')
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, lens)
      continue
    }
    byKey.set(key, {
      ...existing,
      name: existing.name.length >= lens.name.length ? existing.name : lens.name,
      diameter: existing.diameter ?? lens.diameter,
      length: existing.length ?? lens.length,
      weight: existing.weight ?? lens.weight,
      filter: existing.filter ?? lens.filter,
      elements: existing.elements ?? lens.elements,
      autofocus: existing.autofocus ?? lens.autofocus,
      stabilized: existing.stabilized ?? lens.stabilized,
      year: existing.year ?? lens.year,
      sources: [...new Set([...existing.sources, ...lens.sources])],
    })
  }
  return [...byKey.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  )
}

const printTs = (value) => JSON.stringify(value, null, 2)

const writeChunk = async (manufacturer, lenses) => {
  const contents = `import type { ProductionLens } from '../types'

export const manufacturer = ${printTs(manufacturer)} as const

export const lenses: readonly ProductionLens[] = ${printTs(lenses)}
`
  await writeFile(join(dataDir, `${manufacturer}.ts`), contents)
}

const main = async () => {
  await mkdir(dataDir, { recursive: true })
  console.log('Fetching Wikidata (CC0)…')
  const wikidata = await fetchWikidata()
  console.log(`Wikidata usable rows: ${wikidata.length}`)

  const wikipedia = []
  for (const [index, page] of wikipediaPages.entries()) {
    console.log(`Fetching Wikipedia ${page.title} (${index + 1}/${wikipediaPages.length})…`)
    try {
      const rows = await fetchWikipediaPage(page)
      console.log(`  ${rows.length} lenses`)
      wikipedia.push(...rows)
    } catch (error) {
      console.warn(`  failed: ${error instanceof Error ? error.message : error}`)
    }
    await sleep(600)
  }

  console.log('Fetching Lensfun database (CC BY-SA 3.0)…')
  let lensfun = []
  try {
    lensfun = await fetchLensfun()
    console.log(`Lensfun usable rows: ${lensfun.length}`)
  } catch (error) {
    console.warn(`Lensfun failed: ${error instanceof Error ? error.message : error}`)
  }

  const merged = mergeLenses([wikidata, wikipedia, lensfun])
  console.log(`Merged unique lenses: ${merged.length}`)

  const grouped = Object.fromEntries(manufacturerIds.map((id) => [id, []]))
  for (const lens of merged) {
    grouped[lens.manufacturer].push(lens)
  }

  for (const manufacturer of manufacturerIds) {
    await writeChunk(manufacturer, grouped[manufacturer])
    console.log(`  ${manufacturer}: ${grouped[manufacturer].length}`)
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    lensCount: merged.length,
    licenses: [
      'Wikidata items: CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)',
      'English Wikipedia tables: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)',
      'Lensfun lens database: CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/)',
    ],
    attribution: [
      'This catalog mixes Wikidata (CC0), English Wikipedia tables (CC BY-SA 4.0), and the Lensfun database (CC BY-SA 3.0).',
      'The merged catalog is licensed CC BY-SA 4.0.',
      'Wikipedia pages used: ' +
        wikipediaPages.map((page) => `https://en.wikipedia.org/wiki/${page.title}`).join(', '),
      'Wikidata Query Service: https://query.wikidata.org/',
      'Lensfun: https://lensfun.github.io/ and https://github.com/lensfun/lensfun',
      'Product names are trademarks of their respective owners. Specs are published facts.',
    ],
  }
  await writeFile(
    join(root, 'catalog', 'meta.ts'),
    `import type { CatalogMeta } from './types'

export const catalogMeta: CatalogMeta = ${printTs(meta)}
`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
