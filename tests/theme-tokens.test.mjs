import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const CSS_DIR = new URL('../src/css/', import.meta.url)
const COMPONENT_FILES = ['settings.css', 'preview.css', 'popup.css']
const ALL_FILES = ['foundation.css', ...COMPONENT_FILES]

const readCss = (file) => readFileSync(new URL(file, CSS_DIR), 'utf8')

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function themeBlock(css, theme) {
  const marker = `[data-dp-theme="${theme}"]`
  const start = css.indexOf(marker)
  if (start === -1) throw new Error(`Missing theme block: ${theme}`)

  const open = css.indexOf('{', start)
  let depth = 0
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') {
      depth -= 1
      if (depth === 0) return css.slice(open + 1, index)
    }
  }
  throw new Error(`Unclosed theme block: ${theme}`)
}

function declaredProperties(css) {
  return [...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((match) => match[1])
}

function referencedProperties(css) {
  return [...css.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((match) => match[1])
}

describe('theme tokens', () => {
  it('resolves every referenced custom property', () => {
    const definitions = new Set()
    for (const file of ALL_FILES) {
      for (const name of declaredProperties(stripComments(readCss(file)))) definitions.add(name)
    }

    const unresolved = ALL_FILES.flatMap((file) =>
      referencedProperties(stripComments(readCss(file)))
        .filter((name) => !definitions.has(name))
        .map((name) => `${file}: ${name}`),
    )

    expect([...new Set(unresolved)]).toEqual([])
  })

  it('keeps dark and light theme token sets aligned', () => {
    const css = stripComments(readCss('foundation.css'))
    const dark = declaredProperties(themeBlock(css, 'dark'))
    const light = declaredProperties(themeBlock(css, 'light'))

    expect(new Set(dark).size).toBe(dark.length)
    expect(new Set(light).size).toBe(light.length)
    expect([...light].sort()).toEqual([...dark].sort())
  })

  it('declares the native color scheme per theme', () => {
    const css = stripComments(readCss('foundation.css'))

    expect(themeBlock(css, 'dark')).toMatch(/color-scheme\s*:\s*dark/)
    expect(themeBlock(css, 'light')).toMatch(/color-scheme\s*:\s*light/)
  })

  it('honors the reduced-motion preference', () => {
    const css = stripComments(readCss('foundation.css'))

    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })

  it('keeps component CSS free of raw color literals', () => {
    const colorLiteral = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?)\(/

    for (const file of COMPONENT_FILES) {
      const css = stripComments(readCss(file))
      expect(css.match(colorLiteral) ?? [], `${file} should consume theme tokens`).toEqual([])
    }
  })

  it('loads foundation before popup overrides', () => {
    const html = readFileSync(new URL('../src/popup.html', import.meta.url), 'utf8')
    const foundation = html.indexOf('css/foundation.css')
    const popup = html.indexOf('css/popup.css')

    expect(foundation).toBeGreaterThanOrEqual(0)
    expect(popup).toBeGreaterThan(foundation)
  })
})
