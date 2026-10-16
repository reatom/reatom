import { shopOtlpLogs } from '../../otlp/fixtures/analyticsRecords'

export const STORY_RESOURCE = {
  'service.name': 'reatom-admin-story',
  'service.instance.id': 'story',
  'telemetry.sdk.name': '@reatom/opentelemetry',
  'telemetry.sdk.language': 'webjs',
  'telemetry.sdk.version': '1000.15.2',
}

const successSpan = {
  traceId: 'e81f78cd8e164b580618a24df929cd89',
  spanId: 'f4cc6608a95edba1',
  name: 'devtools.ping',
  kind: 1,
  startTimeUnixNano: '1791352144731000000',
  endTimeUnixNano: '1791352144731060547',
  attributes: [
    { key: 'reatom.name', value: { stringValue: 'devtools.ping' } },
    { key: 'reatom.kind', value: { stringValue: 'action' } },
    { key: 'reatom.outcome', value: { stringValue: 'ok' } },
    { key: 'reatom.params', value: { stringValue: '[]' } },
    { key: 'reatom.payload', value: { stringValue: 'pong' } },
    { key: 'reatom.frame.id', value: { stringValue: '1' } },
    { key: 'reatom.cause.ids', value: { arrayValue: { values: [] } } },
  ],
  events: [],
  flags: 1,
}

const atomUpdateSpan = {
  traceId: 'cb8d064f62349e625e67d655b9ed1946',
  spanId: '50c144f8a2824d56',
  name: 'tree#.toggle',
  kind: 'internal',
  startTimeUnixNano: '1791351231722000000',
  endTimeUnixNano: '1791351231722396973',
  attributes: {
    'reatom.name': 'tree#12.toggle',
    'reatom.kind': 'action',
    'reatom.outcome': 'ok',
    'reatom.params': '[]',
    'reatom.payload': 'true',
    'reatom.instance': '12',
    'reatom.frame.id': '1',
    'reatom.cause.ids': [],
  },
  events: [],
}

const atomUpdateLog = {
  eventName: 'reatom.atom.update',
  traceId: 'cb8d064f62349e625e67d655b9ed1946',
  spanId: '50c144f8a2824d56',
  severityNumber: 9,
  body: true,
  attributes: {
    'event.name': 'reatom.atom.update',
    'reatom.name': 'tree.checked',
    'reatom.kind': 'atom',
    'reatom.frame.id': '2',
    'reatom.cause.ids': ['1'],
  },
}

const exceptionSpan = {
  traceId: '5b8efff798038103d269b633813fc60c',
  spanId: 'eee19b7ec3c1b174',
  name: 'explode',
  kind: 1,
  startTimeUnixNano: '1761000000123000000',
  endTimeUnixNano: '1761000000124000000',
  status: { code: 2, message: 'boom' },
  attributes: [
    { key: 'reatom.name', value: { stringValue: 'explode' } },
    { key: 'reatom.kind', value: { stringValue: 'action' } },
    { key: 'reatom.outcome', value: { stringValue: 'error' } },
    { key: 'reatom.params', value: { stringValue: '[]' } },
    { key: 'reatom.frame.id', value: { stringValue: '1' } },
    { key: 'reatom.cause.ids', value: { arrayValue: { values: [] } } },
  ],
  events: [],
  flags: 1,
}

const exceptionLog = {
  eventName: 'exception',
  traceId: '5b8efff798038103d269b633813fc60c',
  spanId: 'eee19b7ec3c1b174',
  timeUnixNano: '1761000000123500000',
  severityNumber: 17,
  body: { stringValue: 'TypeError: boom' },
  attributes: [
    { key: 'event.name', value: { stringValue: 'exception' } },
    { key: 'exception.type', value: { stringValue: 'TypeError' } },
    { key: 'exception.message', value: { stringValue: 'boom' } },
    {
      key: 'exception.stacktrace',
      value: { stringValue: 'TypeError: boom\n    at explode' },
    },
    { key: 'reatom.frame.id', value: { stringValue: '1' } },
    { key: 'reatom.cause.ids', value: { arrayValue: { values: [] } } },
  ],
}

const diamondSpan = {
  traceId: 'b87110b55a4743558bad836760edf358',
  spanId: 'b5c850b17d034d03',
  parentSpanId: '2c8a5498651e6b28',
  name: 'cart.total',
  kind: 1,
  startTimeUnixNano: '1791345062720000000',
  endTimeUnixNano: '1791345062720000000',
  attributes: [
    { key: 'reatom.name', value: { stringValue: 'cart.total' } },
    { key: 'reatom.kind', value: { stringValue: 'computed' } },
    { key: 'reatom.outcome', value: { stringValue: 'ok' } },
    { key: 'reatom.frame.id', value: { stringValue: '6' } },
    {
      key: 'reatom.cause.ids',
      value: {
        arrayValue: {
          values: [{ stringValue: '3' }, { stringValue: '5' }],
        },
      },
    },
  ],
  events: [],
  flags: 1,
  links: [
    {
      traceId: 'e3f80e40aa791584b0cf76de190c5860',
      spanId: '2ee337375cfd8185',
      attributes: [
        {
          key: 'reatom.link.reason',
          value: { stringValue: 'computed.dependency' },
        },
      ],
    },
  ],
}

const routeShort = {
  traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  spanId: 'bbbbbbbbbbbbbbbb',
  name: 'route goods',
  startTimeUnixNano: '1791352144731000000',
  endTimeUnixNano: '1791352144731000000',
  attributes: {
    'reatom.kind': 'route',
    'reatom.name': 'goods',
  },
}

const explodeRetrySpan = {
  traceId: '5b8efff798038103d269b633813fc60c',
  spanId: 'cccccccccccccccc',
  parentSpanId: 'eee19b7ec3c1b174',
  name: 'retry',
  kind: 1,
  startTimeUnixNano: '1761000000125000000',
  endTimeUnixNano: '1761000000126000000',
  attributes: [
    { key: 'reatom.name', value: { stringValue: 'retry' } },
    { key: 'reatom.kind', value: { stringValue: 'action' } },
    { key: 'reatom.outcome', value: { stringValue: 'ok' } },
    { key: 'reatom.params', value: { stringValue: '[]' } },
    { key: 'reatom.frame.id', value: { stringValue: '2' } },
    {
      key: 'reatom.cause.ids',
      value: { arrayValue: { values: [{ stringValue: '1' }] } },
    },
  ],
  events: [],
  flags: 1,
}

export const STORY_FIXTURE_BATCH: unknown[] = [
  successSpan,
  atomUpdateSpan,
  atomUpdateLog,
  diamondSpan,
  exceptionSpan,
  exceptionLog,
  routeShort,
]

export const STORY_SPANS_BATCH: unknown[] = [
  ...STORY_FIXTURE_BATCH,
  explodeRetrySpan,
]

export const STORY_ANALYTICS_BATCH = shopOtlpLogs()
