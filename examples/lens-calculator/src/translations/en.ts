import { degree } from './lang'

export const vocab = {
  meta: {
    title: 'Prime — lens envelope estimator',
    documentTitle: (designation: string) =>
      `${designation} — Prime lens estimator`,
  },
  header: {
    wordmark: 'Prime',
    tagline: 'lens envelope estimator',
    estimateHint: 'first-order estimate · ±25 %',
  },
  lang: {
    label: 'Language',
    auto: 'Auto',
    en: 'English',
    ru: 'Русский',
  },
  controls: {
    aria: 'Lens parameters',
    presets: 'Presets',
    optics: 'Optics',
    system: 'System',
    build: 'Build',
    focal: 'Focal length',
    aperture: 'Max aperture',
    iris: 'Iris position',
    irisDesign: 'design',
    irisTrack: (percent: number) => `${percent} % of track`,
    towardFront: 'toward front',
    towardMount: 'toward mount',
    vignetting: 'Corner falloff wide open',
    format: 'Format',
    body: 'Body',
    correction: 'Correction',
    barrel: 'Barrel',
    autofocus: 'Autofocus',
    autofocusNote: 'motor, encoder and drive electronics',
    stabilizer: 'Stabilizer',
    stabilizerNote: 'floating group, +3 mm Ø, +8 mm length',
    reset: 'Reset',
    resetTitle: 'Restore the default 50 / 1.4 full-frame spec',
  },
  format: {
    mft: 'M4/3',
    apsc: 'APS-C',
    ff: 'Full frame',
    mf: '44 × 33',
  },
  body: {
    mirrorless: 'Mirrorless',
    slr: 'SLR',
  },
  tier: {
    classic: 'Classic',
    modern: 'Modern',
    flagship: 'Flagship',
  },
  barrel: {
    aluminium: 'Aluminium',
    magnesium: 'Magnesium',
    polycarbonate: 'Polycarbonate',
    brass: 'Brass',
  },
  filter: {
    any: 'Any',
  },
  presets: {
    fifty: { label: 'Nifty fifty', note: '50 / 1.8 · polycarbonate' },
    portrait: { label: 'Portrait', note: '85 / 1.4 · flagship' },
    ultrawide: { label: 'Ultra-wide', note: '14 / 1.8 · flagship' },
    pancake: { label: 'Pancake', note: '40 / 2.8 · SLR' },
    supertele: { label: 'Super-tele', note: '400 / 2.8 · OIS · magnesium' },
  },
  readout: {
    aria: 'Estimate',
    diameter: 'Diameter',
    length: 'Length',
    mass: 'Mass',
    massBudget: 'Mass budget',
    glass: 'glass',
    barrelMass: 'barrel',
    focus: 'focus drive',
    stabilizer: 'stabilizer',
    iris: 'iris',
    mount: 'mount',
    filterThread: 'Filter thread',
    rearDropIn: 'rear drop-in',
    frontElement: 'Front element',
    entrancePupil: 'Entrance pupil',
    irisWideOpen: 'Iris wide open',
    elementsGroups: 'Elements / groups',
    aov: 'Diagonal angle of view',
    backFocus: 'Back focus',
    flange: 'Flange distance',
    opticalType: 'Optical type',
    retrofocus: 'retrofocus',
    telephoto: 'telephoto',
    gauss: 'double Gauss',
  },
  reference: {
    nearest: 'Nearest production lens',
    findNearest: 'Find nearest',
    loadingCatalog: 'Loading catalog…',
    retryCatalog: 'Retry catalog',
    filters: 'Nearest lens filters',
    mount: 'System / mount',
    identityOnly: 'optical identity only',
    loadingProduction: 'Loading production catalog…',
    noMatch: (count: number) => `No close match in ${count} catalogued lenses.`,
    closeMatches: (matches: number, loaded: number) =>
      `${matches} close matches · ${loaded} loaded`,
    catalogFoot: (count: number) =>
      `${count} lenses · catalog CC BY-SA 4.0 · Wikidata CC0 · Wikipedia · Lensfun`,
    dropIn: 'drop-in',
    panelAria: 'Nearest production lens',
  },
  sheet: {
    aria: 'Cross-section of the estimated lens',
    designation: 'Designation',
    formatMount: 'Format · mount',
    estMass: 'Est. mass',
    envelope: 'Envelope Ø × L',
    design: 'Design',
    bodySheet: 'Body · sheet',
    legend: {
      element: 'element',
      barrel: 'barrel section',
      iris: 'iris · dimension',
      axial: 'axial beam',
      corner: 'corner beam · chief ray dashed',
    },
    axialBeam: 'axial beam',
    cornerBeam: 'corner beam',
    falloff: (ev: string) => `${ev} EV falloff`,
    imagePlane: (circle: string, sensor: string) =>
      `image plane Ø ${circle} · ${sensor}`,
    noThread: 'no front thread · rear drop-in filter',
    filterThread: (thread: number) => `M${thread} × 0.75 filter thread`,
    irisCallout: (iris: string, pupil: string) =>
      `iris Ø ${iris} · entrance pupil Ø ${pupil}`,
  },
  envelope: {
    kicker: 'Notes on the envelope',
    title: 'Why a 50 / 1.4 is already large, and a 14 / 1.8 is even larger',
    lead: 'This page is a first-order fit, not a ray-trace. Entrance pupil, field angle and mount geometry set the envelope; element count follows speed, field, correction tier and iris asymmetry; mass is glass volume plus a barrel shell, drive and mount. Expect ±25 % against production lenses. The drawing is a paraxial sketch.',
    footer:
      'Calibrated against ~30 published primes · catalog of 2,901 for nearest match · first-order only',
    reatom: '@reatom/jsx · withSearchParams',
    pupil: {
      index: '01',
      title: 'The entrance pupil is the real aperture',
      p1Before:
        'Photographers write f/1.4. The thing that actually has to fit through the barrel is the entrance pupil — the image of the iris as seen from the front. Its diameter is focal length over f-number. For the current ',
      p1Mid: ' that is ',
      p1After: '.',
      p2: 'A 50 / 1.4 and a 35 / 1.0 share almost the same pupil. So does a 400 / 2.8 versus a 200 / 1.4. Speed is cheap on short glass and brutal on long glass, which is why super-teles look like artillery and pancake 2.8s do not.',
    },
    reach: {
      index: '02',
      title: 'Reach, not millimetres, classifies the design',
      p1: '“Wide” and “tele” only make sense relative to the sensor. The model uses reach — how many octaves the focal length sits above or below the image-circle diameter. Negative reach is retrofocus, near zero is a double Gauss, positive is telephoto. A 25 mm on Micro 4/3 is a normal; the same glass on full frame is a wide.',
      p2: 'Almost every shape parameter — pupil depth, stop ratio, front-group cliff, telephoto track — is a curve of reach, so the estimate slides continuously from a 14 mm to a 400 mm instead of jumping between named types.',
    },
    front: {
      index: '03',
      title: 'The front element is a vignetting budget',
      p1: 'The corner beam aims at the entrance pupil a few tens of millimetres behind the front vertex. By the time it gets there it is already off axis, so the front glass must be larger than the pupil or the barrel rim clips it. Lower falloff tolerance forces a larger front group. 2 EV is typical for production lenses wide open; cinema glass often spends the extra diameter to get closer to 0.',
      p2: 'That is why a fast ultra-wide has a bulbous front and no useful filter thread: the field angle is huge, the pupil sits deep, and there is nowhere for an M-thread to live without vignetting the corner.',
    },
    iris: {
      index: '04',
      title: 'Where the iris sits',
      p1: 'The slider centre is where a designer would put the iris for this reach — about halfway on a Gauss, further back on a tele, a little forward of centre on a retrofocus. Pushing it toward the mount deepens the entrance pupil, so the front group grows; pulling it forward makes the rear group cover the image circle. Either way the asymmetric layout needs extra correction glass.',
      p2Before: 'Right now the iris is at ',
      p2Mid: ' of the optical track, wide open ',
      p2After:
        '. On a long tele the physical iris is much smaller than the entrance pupil: the front group already magnified it.',
    },
    slr: {
      index: '05',
      title: 'The SLR tax and the telephoto trick',
      p1: 'Mirrorless bodies have a short flange and a wide throat — about 18 mm and 50 mm on E / Z / RF / L. An SLR keeps a mirror box behind the mount, so the flange jumps to 44 mm. A 14 mm SLR lens cannot be 14 mm long: the rear vertex would sit inside the swinging mirror. The retrofocus group inverts the natural layout and the barrel grows.',
      p2: 'The opposite trick is the telephoto. A 400 mm does not need 400 mm of glass; a negative rear group shortens the track to roughly 0.75–1.05 × focal length. That is why the drawing of a super-tele is long but not absurd, and why the rear elements suddenly look tiny after the front cliff.',
    },
    correction: {
      index: '06',
      title: 'Correction is mostly extra glass',
      p1: 'Classic is spherical glass and film-era residuals — six or seven elements for a 50 / 1.8. Modern adds aspherics and ED and is aimed at 40 MP sensors. Flagship is GM / Art class: near-zero residuals, 14–21 elements, and a barrel that has to hold them. The model just multiplies a speed-and-field count by 1 / 1.3 / 1.9.',
      p2: 'More elements are more mass twice: once as glass, again as the shell and focus drive that have to move them. Autofocus adds a motor, encoder and a couple of millimetres of length; a stabilizer is a floating group — about +3 mm diameter and +8 mm length before the extra glass is even counted.',
    },
    mass: {
      index: '07',
      title: 'Mass is volume, then a shell',
      p1: 'Each element is treated as a cylinder of its clear diameter and centre thickness, then discounted by a shape factor because real surfaces are thinner at the edge. Density is a mid-index crown, about 3.3 g/cm³. The barrel is a cylindrical shell of the chosen material — aluminium at 2.7, magnesium at 1.8, polycarbonate at 1.25, brass at 8.5 — thickened for ribs, helicoids and the focus ring. Mount mass scales with throat area; the iris with stop diameter.',
      p2: 'Brass looks “premium” and weighs like a doorstop. Super-teles are magnesium for a reason: the shell is huge and the glass already accounts for most of the budget. A polycarbonate 50 / 1.8 can be under 200 g; the same formula in brass is a paperweight.',
    },
    drawing: {
      index: '08',
      title: 'What the drawing is, and is not',
      p1: 'The blue fan is the axial beam: it fills the entrance pupil and lands on the image centre. The amber fan is the corner beam; its dashed chief ray goes through the middle of the iris and to the corner of the image circle. Neither is a real trace — surfaces do not refract, and the element profiles are a plausible collage, not a patent drawing.',
      p2: 'Filter threads jump in ISO steps (M49, M52, M67…). When the front element outgrows M112 the model drops the thread and assumes a rear drop-in, which is how 400 / 2.8s actually work. The readout starts with a short published-envelope hint; Find nearest loads the 2,901-lens catalog. Neither is a claim that the estimate equals that datasheet.',
    },
  },
  i18nPost: {
    kicker: 'From DEV.to',
    title:
      'Building a Lightning-Fast i18n Alternative: Why I Ditched i18next for Native JavaScript',
    source: 'Original article',
    implNote:
      'This page uses that idea: translations are typed objects, only the active language is loaded, and Intl formats numbers. Language follows an explicit choice, then the browser language list (navigator.languages), then English. The choice lives in localStorage — not a cookie — so it is not sent with every request.',
    crisis: {
      title: 'The Performance Crisis in Modern i18n',
      lead: "If you're using i18next with TypeScript, you've probably felt the pain. Despite performance improvements, the reality is sobering:",
      bench: 'tested on Apple M1',
      ts: 'TypeScript compilation: each 1,000 translation keys adds ~1 second to tsc build time',
      ide: 'IDE responsiveness: type hints slow down by 0.3+ seconds with large dictionaries',
      bundle:
        'Bundle size: i18next weighs 41.6 kB (13.2 kB gzip) before you even add translations',
      runtime:
        'Runtime performance: custom DSL parsing becomes a bottleneck at scale',
      social: 'Real developers are feeling this pain:',
      quote1:
        'We had to remove i18n typing entirely due to CI memory overflow with ~3k translations',
      quote1By: 'Production developer',
      quote2:
        'Removing i18next improved our SSR performance by 3x without losing functionality',
      quote2By: 'Performance engineer',
      closer:
        "But here's the thing: modern JavaScript has everything we need built-in.",
    },
    native: {
      title: 'Why Go Native?',
      lead: 'The Internationalization API has matured significantly. We have:',
      number: 'Intl.NumberFormat for numbers, currencies, units',
      date: 'Intl.DateTimeFormat for dates and times',
      plural: 'Intl.PluralRules for pluralization logic',
      relative: 'Intl.RelativeTimeFormat for “2 days ago” formatting',
      closer: 'These APIs are zero-cost, tree-shakeable, and blazing fast.',
    },
    solution: {
      title: 'The Solution: A 5-File i18n System',
      lead: "Here's a complete internationalization system that's simpler, faster, and more maintainable than traditional libraries:",
      lang: '1. Language detection & management',
      loading: '2. Dynamic translation loading',
      typed: '3. Type-safe translation files',
      cookie: '4. Simple cookie utility',
      usage: '5. Usage in components',
    },
    benefits: {
      title: 'The Benefits',
      types: 'Blazing fast types: direct object access, no complex mapping.',
      runtime: 'Zero runtime overhead: no DSL parsing, no library weight.',
      split: 'Automatic code splitting: only load translations you need.',
      safety: 'Full type safety: TypeScript infers everything automatically.',
      native:
        'Native formatting: leverage browser APIs for numbers, dates, plurals.',
      api: 'Simple API: t.key instead of t("key").',
      ssr: 'SSR out of the box: no additional setup for SSR.',
      agnostic: 'Framework agnostic: use with Svelte, React, Vue or jQuery.',
    },
    namespace: {
      title: 'Namespace Support',
      lead: 'Create subdirectories for different feature areas:',
    },
    plurals: {
      title: 'Pluralization with Intl.PluralRules',
      lead: 'For complex plural forms, integrate the native Intl.PluralRules API directly into your vocabulary:',
      usage: 'Usage remains beautifully simple:',
      closer:
        'The beauty is that each language can define its own plural rules — Russian has different categories than English, and the Intl.PluralRules API handles all the complexity for you.',
    },
    ssr: {
      title: 'Server-Side Rendering',
      p1: 'One of the biggest advantages of this approach becomes apparent with Server-Side Rendering. It just works out of the box — no complex server configuration, no hydration mismatches, no locale detection headaches.',
      p2: 'For serverless environments (Lambda, Vercel Functions, etc.), this solution is perfect as-is. Each request gets its own execution context, so the static imports work beautifully.',
      p3: 'For stateful servers (Express, Fastify, etc.), you have a simple migration path. Convert the dot notation t.key to function calls t().key, then implement the t function using Node.js AsyncLocalStorage. That gives you per-request locale isolation without any global state pollution — exactly what you need for concurrent request handling.',
    },
    tradeoff: {
      title: 'The Trade-off',
      p1: "The main downside: translations live in code, making it harder for non-technical team members to edit them. This isn't always a problem — many teams prefer developer-controlled translations for better version control and review processes.",
      p2: 'For teams that need non-technical editing, consider:',
      gen: 'Build-time generation from external sources',
      git: 'Git-based workflows with translation management tools',
      hybrid: 'Hybrid approaches for different content types',
      closer:
        "This approach has transformed how I think about internationalization. Sometimes the best solution isn't the most popular one — it's the one that leverages what's already built into the platform.",
      question:
        "What's your experience with i18n performance? Have you found other lightweight alternatives?",
    },
    demo: {
      title: 'Try the vocabulary',
      lead: 'The greeting and temperature line are the live English or Russian object — same t.hi / t.temperature API as in the article.',
      bump: 'Add a degree',
    },
  },
  preview: {
    kicker:
      'Isolated preview · same catalog the estimator loads on Find nearest',
    title: 'Nearest production lens',
  },
  demo: {
    hi: 'Hello',
    temperature: (n: number) => `Temperature is ${degree.format(n)}`,
  },
}

export type Vocab = typeof vocab
