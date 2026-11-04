import { action, wrap } from '../../../core/src/index.ts'
import { reatomOpentelemetry } from '../../src/index.ts'
import { installFixture } from './fixture.ts'
installFixture(
  (input) => reatomOpentelemetry({ ...input, filter: () => true }),
  async () => {
    await action(async () => {
      await wrap(fetch('/api'))
    }, 'synthetic.network')()
  },
)
