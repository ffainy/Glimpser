#!/usr/bin/env node

import {
  CHANGELOG_PATH,
  UNRELEASED_HEADER,
  buildSections,
  ensureBaseChangelog,
  getCommits,
  getTagDate,
  listReleaseTags,
  parseVersionSections,
  renderSectionContent,
  renderVersionSection,
  runGit,
  writeFileIfChanged,
} from './changelog-lib.mjs'

function parseArgs(argv) {
  let write = true
  let stdout = false

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--stdout') {
      stdout = true
      write = false
    }

    if (argv[i] === '--write') {
      write = true
      stdout = false
    }
  }

  return { write, stdout }
}

function renderChangelogDocument(unreleasedContent, releaseSections, preservedSections) {
  const lines = [
    '# Changelog',
    '',
    'All notable changes to this project will be documented in this file.',
    '',
    'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),',
    'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
    '',
    UNRELEASED_HEADER,
  ]

  if (unreleasedContent) {
    lines.push('', unreleasedContent)
  }

  const sections = [...releaseSections, ...preservedSections]
  if (sections.length) {
    lines.push('')
    lines.push('')
    lines.push(sections.join('\n\n'))
  }

  return lines.join('\n').trimEnd() + '\n'
}

function main() {
  const { write, stdout } = parseArgs(process.argv.slice(2))
  let baselineContent = ensureBaseChangelog()
  try {
    baselineContent = runGit(['show', 'HEAD:CHANGELOG.md'])
  } catch (error) {}
  const tags = listReleaseTags()
  const generatedVersions = new Set()
  const legacySections = parseVersionSections(baselineContent)
  const hasLegacyVersions = legacySections.some((section) => !tags.includes(`v${section.version}`))

  const unreleasedCommits = getCommits(tags.length ? tags[tags.length - 1] : null, 'HEAD')
  const unreleasedSections = buildSections(unreleasedCommits)
  const unreleasedContent = renderSectionContent(unreleasedSections)

  const releaseSections = []
  for (let index = tags.length - 1; index >= 0; index -= 1) {
    const tag = tags[index]
    const previousTag = index > 0 ? tags[index - 1] : null
    const version = tag.slice(1)
    const date = getTagDate(tag)
    const commits = previousTag || !hasLegacyVersions
      ? getCommits(previousTag, tag)
      : getCommits(`${tag}^`, tag)
    const sections = buildSections(commits)
    const content = renderSectionContent(sections, { emptyMessage: 'maintenance release' })

    generatedVersions.add(version)
    releaseSections.push(renderVersionSection(version, date, content))
  }

  const preservedSections = legacySections
    .filter((section) => !generatedVersions.has(section.version))
    .map((section) => section.raw)

  const nextContent = renderChangelogDocument(unreleasedContent, releaseSections, preservedSections)

  if (stdout) {
    process.stdout.write(nextContent)
    return
  }

  if (write) {
    writeFileIfChanged(CHANGELOG_PATH, nextContent)
    console.log(`Rebuilt ${CHANGELOG_PATH}`)
  }
}

main()
