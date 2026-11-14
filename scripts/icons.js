// Renders src/icons/icon{16,32,48,64,128}.png from scripts/assets/logo-icon.svg.
// Requires ImageMagick 7 ("magick") on PATH.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'scripts', 'assets', 'logo-icon.svg')
const outDir = join(root, 'src', 'icons')
const SIZES = [16, 32, 48, 64, 128]
const DENSITY = '1440'

function fail(message) {
  console.error(message)
  process.exit(1)
}

try {
  execFileSync('magick', ['-version'], { stdio: 'ignore' })
} catch {
  fail('ImageMagick 7 is required: the "magick" binary was not found on PATH.')
}

if (!existsSync(source)) fail(`Missing icon source: ${source}`)
mkdirSync(outDir, { recursive: true })

for (const size of SIZES) {
  const target = join(outDir, `icon${size}.png`)
  execFileSync('magick', [
    '-background', 'none',
    '-density', DENSITY,
    source,
    '-resize', `${size}x${size}`,
    '-strip',
    '-depth', '8',
    `PNG32:${target}`,
  ], { stdio: 'inherit' })
  console.log(`wrote ${target}`)
}
