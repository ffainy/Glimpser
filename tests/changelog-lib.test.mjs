import { describe, expect, it } from 'vitest'
import {
  SECTION_ORDER,
  UNRELEASED_HEADER,
  buildSections,
  ensureUnreleasedSection,
  getUnreleasedContent,
  insertVersionSection,
  mapSection,
  normalizeEntry,
  parseConventionalCommit,
  parseVersionSections,
  renderSectionContent,
  renderVersionSection,
  replaceUnreleasedContent,
  shouldSkipCommit,
} from '../scripts/changelog-lib.mjs'

describe('parseConventionalCommit', () => {
  it('parses type, scope, and description', () => {
    expect(parseConventionalCommit('feat(settings): add drop area size')).toEqual({
      type: 'feat',
      scope: 'settings',
      description: 'add drop area size',
      isBreaking: false,
      isSecurity: false,
    })
  })

  it('parses a breaking change marker', () => {
    const parsed = parseConventionalCommit('fix(api)!: remove legacy option', '')
    expect(parsed?.isBreaking).toBe(true)
    expect(parsed?.scope).toBe('api')
  })

  it('detects breaking changes in the body', () => {
    const parsed = parseConventionalCommit('refactor: tidy internals', 'BREAKING CHANGE: old storage key removed')
    expect(parsed?.isBreaking).toBe(true)
  })

  it('detects security changes', () => {
    const parsed = parseConventionalCommit('fix(security): validate url', '')
    expect(parsed?.isSecurity).toBe(true)
  })

  it('returns null for non-conventional subjects', () => {
    expect(parseConventionalCommit('Update readme')).toBeNull()
    expect(parseConventionalCommit('Merge branch main')).toBeNull()
  })
})

describe('mapSection', () => {
  it('maps conventional types to changelog sections', () => {
    expect(mapSection({ type: 'feat', isBreaking: false, isSecurity: false })).toBe('Added')
    expect(mapSection({ type: 'fix', isBreaking: false, isSecurity: false })).toBe('Fixed')
    expect(mapSection({ type: 'perf', isBreaking: false, isSecurity: false })).toBe('Changed')
    expect(mapSection({ type: 'refactor', isBreaking: false, isSecurity: false })).toBe('Changed')
    expect(mapSection({ type: 'chore', isBreaking: false, isSecurity: false })).toBeNull()
  })

  it('routes breaking and security changes to the right sections', () => {
    expect(mapSection({ type: 'chore', isBreaking: true, isSecurity: false })).toBe('Changed')
    expect(mapSection({ type: 'feat', isBreaking: true, isSecurity: true })).toBe('Security')
  })
})

describe('normalizeEntry', () => {
  it('prefixes the scope and marks breaking changes', () => {
    expect(normalizeEntry({ scope: 'ui', description: 'add button', isBreaking: false })).toBe('- ui: add button')
    expect(normalizeEntry({ scope: '', description: 'drop support', isBreaking: true })).toBe('- drop support [breaking]')
  })
})

describe('shouldSkipCommit', () => {
  it('skips generated changelog and release metadata commits', () => {
    expect(shouldSkipCommit({ subject: 'docs(changelog): refresh unreleased entries' })).toBe(true)
    expect(shouldSkipCommit({ subject: 'build(release): sync metadata for v1.2.3' })).toBe(true)
    expect(shouldSkipCommit({ subject: 'feat: real change' })).toBe(false)
  })
})

describe('buildSections', () => {
  it('groups, deduplicates, and filters commits', () => {
    const sections = buildSections([
      { subject: 'feat(ui): add drop area', body: '' },
      { subject: 'feat(ui): add drop area', body: '' },
      { subject: 'fix: guard clipboard', body: '' },
      { subject: 'chore: tidy repo', body: '' },
      { subject: 'docs(changelog): refresh unreleased entries', body: '' },
    ])

    expect(sections.get('Added')).toEqual(['- ui: add drop area'])
    expect(sections.get('Fixed')).toEqual(['- guard clipboard'])
    expect(sections.get('Changed')).toEqual([])
    expect(sections.get('Security')).toEqual([])
  })
})

describe('renderSectionContent', () => {
  it('renders sections in the canonical order', () => {
    const sections = new Map(SECTION_ORDER.map((name) => [name, []]))
    sections.get('Fixed').push('- fix one')
    sections.get('Added').push('- add one')

    expect(renderSectionContent(sections)).toBe('### Added\n- add one\n\n### Fixed\n- fix one')
  })

  it('can render a fallback message and trailing blank line', () => {
    const sections = new Map(SECTION_ORDER.map((name) => [name, []]))
    expect(renderSectionContent(sections, { emptyMessage: 'maintenance release', includeTrailingBlankLine: true }))
      .toBe('### Changed\n- maintenance release\n')
  })

  it('returns an empty string when there is nothing to render', () => {
    const sections = new Map(SECTION_ORDER.map((name) => [name, []]))
    expect(renderSectionContent(sections)).toBe('')
  })
})

describe('renderVersionSection', () => {
  it('renders the version, date, and content', () => {
    expect(renderVersionSection('1.2.3', '2026-01-02', '### Added\n- feature'))
      .toBe('## [1.2.3] - 2026-01-02\n\n### Added\n- feature')
  })

  it('uses a maintenance fallback for empty content', () => {
    expect(renderVersionSection('1.2.3', '2026-01-02', ''))
      .toBe('## [1.2.3] - 2026-01-02\n\n### Changed\n- maintenance release')
  })
})

describe('unreleased helpers', () => {
  const base = '# Changelog\n\n## [Unreleased]\n\n- pending item\n'

  it('adds the Unreleased header when missing', () => {
    const content = ensureUnreleasedSection('# Changelog\n')
    expect(content).toContain(UNRELEASED_HEADER)
  })

  it('reads and replaces Unreleased content', () => {
    expect(getUnreleasedContent(base)).toBe('- pending item')
    expect(replaceUnreleasedContent(base, '### Added\n- new item')).toContain('### Added\n- new item')
    expect(getUnreleasedContent(replaceUnreleasedContent(base, ''))).toBe('')
  })

  it('inserts a version section above released versions', () => {
    const content = insertVersionSection(base, '## [1.0.0] - 2026-01-01\n\n### Added\n- first release')
    expect(content.indexOf('## [1.0.0]')).toBeGreaterThan(content.indexOf(UNRELEASED_HEADER))
    expect(content).toContain('## [1.0.0] - 2026-01-01')
  })
})

describe('parseVersionSections', () => {
  it('parses version, date, body, and raw content', () => {
    const content = [
      '# Changelog',
      '',
      '## [Unreleased]',
      '',
      '## [1.2.0] - 2026-02-03',
      '',
      '### Added',
      '- feature',
      '',
      '## [1.1.0] - 2026-01-01',
      '',
      '### Fixed',
      '- bug',
    ].join('\n')

    const sections = parseVersionSections(content)
    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({
      version: '1.2.0',
      date: '2026-02-03',
      body: '### Added\n- feature',
    })
    expect(sections[1].version).toBe('1.1.0')
    expect(sections[1].body).toBe('### Fixed\n- bug')
  })
})
