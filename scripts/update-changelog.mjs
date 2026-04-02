#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md')
const RELEASE_NOTES_PATH = path.join(ROOT, '.github', 'release-notes.md')

const SECTION_ORDER = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']

function runGit(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function parseArgs(argv) {
  let tag = process.env.GITHUB_REF_NAME || ''

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--tag' && argv[i + 1]) {
      tag = argv[i + 1]
      i += 1
    }
  }

  if (!tag) {
    throw new Error('Missing tag. Pass --tag vX.Y.Z or set GITHUB_REF_NAME.')
  }

  if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
    throw new Error(`Unsupported tag format: ${tag}. Expected vX.Y.Z.`)
  }

  return { tag, version: tag.slice(1) }
}

function listReleaseTags() {
  const raw = runGit(['tag', '--list', 'v*.*.*', '--sort=version:refname'])
  return raw ? raw.split(/\r?\n/).filter(Boolean) : []
}

function findPreviousTag(tags, currentTag) {
  const index = tags.indexOf(currentTag)
  if (index === -1) {
    throw new Error(`Tag ${currentTag} does not exist locally.`)
  }

  return index > 0 ? tags[index - 1] : null
}

function getCommits(previousTag, currentTag) {
  const range = previousTag ? `${previousTag}..${currentTag}` : currentTag
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

function parseConventionalCommit(subject, body) {
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

function mapSection(commit) {
  if (commit.isSecurity) {
    return 'Security'
  }

  switch (commit.type) {
    case 'feat':
      return 'Added'
    case 'fix':
      return 'Fixed'
    case 'perf':
    case 'refactor':
    case 'build':
    case 'ci':
    case 'docs':
    case 'style':
    case 'test':
      return 'Changed'
    case 'chore':
      return commit.isBreaking ? 'Changed' : null
    default:
      return commit.isBreaking ? 'Changed' : null
  }
}

function normalizeEntry(commit) {
  const scopePrefix = commit.scope ? `${commit.scope}: ` : ''
  const breakingSuffix = commit.isBreaking ? ' [breaking]' : ''
  return `- ${scopePrefix}${commit.description}${breakingSuffix}`
}

function buildSections(commits) {
  const sections = new Map(SECTION_ORDER.map((name) => [name, []]))

  for (const commit of commits) {
    const parsed = parseConventionalCommit(commit.subject, commit.body)
    if (!parsed) {
      continue
    }

    const section = mapSection(parsed)
    if (!section) {
      continue
    }

    sections.get(section).push(normalizeEntry(parsed))
  }

  return sections
}

function renderVersionSection(version, date, sections) {
  const lines = [`## [${version}] - ${date}`, '']
  let hasEntries = false

  for (const name of SECTION_ORDER) {
    const entries = sections.get(name) || []
    if (entries.length === 0) {
      continue
    }

    hasEntries = true
    lines.push(`### ${name}`)
    lines.push(...entries)
    lines.push('')
  }

  if (!hasEntries) {
    lines.push('### Changed')
    lines.push('- maintenance release')
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

function ensureBaseChangelog() {
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
    '## [Unreleased]',
    '',
  ].join('\n')
}

function updateChangelog(existingContent, versionSection, version) {
  if (existingContent.includes(`## [${version}]`)) {
    return existingContent
  }

  if (existingContent.includes('## [Unreleased]')) {
    return existingContent.replace(
      '## [Unreleased]',
      `## [Unreleased]\n\n${versionSection}`
    )
  }

  return `${ensureBaseChangelog().trimEnd()}\n\n${versionSection}\n`
}

function main() {
  const { tag, version } = parseArgs(process.argv.slice(2))
  const tags = listReleaseTags()
  const previousTag = findPreviousTag(tags, tag)
  const commits = getCommits(previousTag, tag)
  const sections = buildSections(commits)
  const releaseDate = new Date().toISOString().slice(0, 10)
  const versionSection = renderVersionSection(version, releaseDate, sections)
  const existingContent = ensureBaseChangelog()
  const nextContent = updateChangelog(existingContent, versionSection, version)

  fs.writeFileSync(CHANGELOG_PATH, nextContent.endsWith('\n') ? nextContent : `${nextContent}\n`, 'utf8')
  fs.writeFileSync(RELEASE_NOTES_PATH, `${versionSection}\n`, 'utf8')

  console.log(`Updated CHANGELOG.md for ${tag}`)
  console.log(`Previous tag: ${previousTag || '(none)'}`)
  console.log(`Release notes: ${path.relative(ROOT, RELEASE_NOTES_PATH)}`)
}

main()
