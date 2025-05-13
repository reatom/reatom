import { fs } from 'zx'
import { join } from 'node:path'

export async function GET() {
  return new Response(
    await fs.readFile(
      join(process.cwd(), '../.well-known/funding-manifest-urls'),
      'utf8',
    ),
  )
}
