import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultRoot = path.resolve(__dirname, '..')
const cwdRoot = process.cwd()

export const ROOT = fs.existsSync(path.join(cwdRoot, '.git')) ? cwdRoot : defaultRoot
export const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md')
export const RELEASE_NOTES_PATH = path.join(ROOT, '.github', 'release-notes.md')
export const SECTION_ORDER = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']
export const UNRELEASED_HEADER = '## [Unreleased]'

const GENERATED_COMMIT_PATTERNS = [
  /^docs\(changelog\): refresh unreleased entries$/i,
  /^build\(release\): sync metadata for v\d+\.\d+\.\d+$/i,
]

export function runGit(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

export function listReleaseTags() {
  const raw = runGit(['tag', '--list', 'v*.*.*', '--sort=version:refname'])
  return raw ? raw.split(/\r?\n/).filter(Boolean) : []
}

export function findPreviousTag(tags, currentTag = null) {
  if (!currentTag) {
    return tags.length > 0 ? tags[tags.length - 1] : null
  }

  const index = tags.indexOf(currentTag)
  if (index === -1) {
    throw new Error(`Tag ${currentTag} does not exist locally.`)
  }

  return index > 0 ? tags[index - 1] : null
}

export function getTagDate(tag) {
  return runGit(['log', '-1', '--format=%cs', tag])
}

export function getCommits(fromRef, toRef = 'HEAD') {
  const range = fromRef ? `${fromRef}..${toRef}` : toRef
  const format = '%H%x1f%s%x1f%b%x1e'
  const raw = runGit(['log', '--format=' + format, range])

  if (!raw) {
    return []
  }

  return raw
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash, subject, body = ''] = entry.split('\x1f')
      return {
        hash,
        subject: subject.trim(),
        body: body.trim(),
      }
    })
}

export function parseConventionalCommit(subject, body) {
  const match = subject.match(/^([a-z]+)(\(([^)]+)\))?(!)?:\s+(.+)$/i)
  if (!match) {
    return null
  }

  const [, rawType, , scope = '', bang = '', description] = match
  const type = rawType.toLowerCase()
  const isBreaking = bang === '!' || /BREAKING CHANGE:/i.test(body)
  const isSecurity = /security/i.test(scope) || /security/i.test(description) || /security/i.test(body)

  return {
    type,
    scope,
    description: description.trim(),
    isBreaking,
    isSecurity,
  }
}

export function mapSection(commit) {
  if (commit.isSecurity) {
    return 'Security'
  }

  switch (commit.type) {
    case 'feat':
      return 'Added'
    case 'fix':
      return 'Fixed'
    case 'perf':
      return 'Changed'
    default:
      return commit.isBreaking ? 'Changed' : null
  }
}

export function normalizeEntry(commit) {
  const scopePrefix = commit.scope ? `${commit.scope}: ` : ''
  const breakingSuffix = commit.isBreaking ? ' [breaking]' : ''
  return `- ${scopePrefix}${commit.description}${breakingSuffix}`
}

export function shouldSkipCommit(commit) {
  return GENERATED_COMMIT_PATTERNS.some((pattern) => pattern.test(commit.subject))
}

export function buildSections(commits) {
  const sections = new Map(SECTION_ORDER.map((name) => [name, []]))

  for (const commit of commits) {
    if (shouldSkipCommit(commit)) {
      continue
    }

    const parsed = parseConventionalCommit(commit.subject, commit.body)
    if (!parsed) {
      continue
    }

    const section = mapSection(parsed)
    if (!section) {
      continue
    }

    const entry = normalizeEntry(parsed)
    if (!sections.get(section).includes(entry)) {
      sections.get(section).push(entry)
    }
  }

  return sections
}

export function renderSectionContent(sections, { emptyMessage = '', includeTrailingBlankLine = false } = {}) {
  const lines = []

  for (const name of SECTION_ORDER) {
    const entries = sections.get(name) || []
    if (entries.length === 0) {
      continue
    }

    lines.push(`### ${name}`)
    lines.push(...entries)
    lines.push('')
  }

  if (lines.length === 0 && emptyMessage) {
    lines.push('### Changed')
    lines.push(`- ${emptyMessage}`)
    lines.push('')
  }

  const rendered = lines.join('\n').trimEnd()
  if (!rendered) {
    return ''
  }

  return includeTrailingBlankLine ? `${rendered}\n` : rendered
}

export function renderVersionSection(version, date, content) {
  const suffix = content ? `\n\n${content}` : '\n\n### Changed\n- maintenance release'
  return `## [${version}] - ${date}${suffix}`.trimEnd()
}

export function ensureBaseChangelog() {
  if (fs.existsSync(CHANGELOG_PATH)) {
    return fs.readFileSync(CHANGELOG_PATH, 'utf8')
  }

  return [
    '# Changelog',
    '',
    'All notable changes to this project will be documented in this file.',
    '',
    'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),',
    'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
    '',
    UNRELEASED_HEADER,
    '',
  ].join('\n')
}

export function ensureUnreleasedSection(content) {
  if (content.includes(UNRELEASED_HEADER)) {
    return content
  }

  return `${ensureBaseChangelog().trimEnd()}\n\n${content.trimStart()}`
}

export function getUnreleasedPattern() {
  return /## \[Unreleased\]([\s\S]*?)(?=\n## \[|$)/
}

export function getUnreleasedContent(content) {
  const match = ensureUnreleasedSection(content).match(getUnreleasedPattern())
  return match ? match[1].trim() : ''
}

export function replaceUnreleasedContent(content, unreleasedContent) {
  const normalized = ensureUnreleasedSection(content)
  const replacement = unreleasedContent
    ? `${UNRELEASED_HEADER}\n\n${unreleasedContent}\n`
    : `${UNRELEASED_HEADER}\n`

  return normalized.replace(getUnreleasedPattern(), replacement)
}

export function insertVersionSection(content, versionSection) {
  return replaceUnreleasedContent(content, '').replace(
    UNRELEASED_HEADER,
    `${UNRELEASED_HEADER}\n\n${versionSection}`
  )
}

export function parseVersionSections(content) {
  const headers = [...content.matchAll(/^## \[(.+?)\] - (\d{4}-\d{2}-\d{2})$/gm)]
  return headers.map((match, index) => {
    const start = match.index ?? 0
    const end = index + 1 < headers.length ? (headers[index + 1].index ?? content.length) : content.length
    const raw = content.slice(start, end).trim()
    const lines = raw.split(/\r?\n/)
    const body = lines.slice(1).join('\n').trim()

    return {
      version: match[1],
      date: match[2],
      body,
      raw,
    }
  })
}

export function writeFileIfChanged(filePath, content) {
  const normalized = content.endsWith('\n') ? content : `${content}\n`
  fs.writeFileSync(filePath, normalized, 'utf8')
}
