#!/usr/bin/env node

import {
  CHANGELOG_PATH,
  RELEASE_NOTES_PATH,
  buildSections,
  ensureBaseChangelog,
  getCommits,
  getUnreleasedContent,
  insertVersionSection,
  listReleaseTags,
  findPreviousTag,
  parseVersionSections,
  renderSectionContent,
  renderVersionSection,
  replaceUnreleasedContent,
  writeFileIfChanged,
} from './changelog-lib.mjs'

function compareVersions(left, right) {
  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10))
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10))

  for (let index = 0; index < 3; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0)
    if (diff !== 0) {
      return diff
    }
  }

  return 0
}

function shouldKeepExistingUnreleased(currentTag, latestReleasedVersion, previousVersion) {
  if (!latestReleasedVersion) {
    return false
  }

  if (currentTag) {
    return !previousVersion || compareVersions(latestReleasedVersion, previousVersion) > 0
  }

  return previousVersion && compareVersions(previousVersion, latestReleasedVersion) > 0
}

function parseArgs(argv) {
  let mode = ''
  let tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME || '' : ''
  let ref = 'HEAD'

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--mode' && argv[i + 1]) {
      mode = argv[i + 1]
      i += 1
      continue
    }

    if (argv[i] === '--tag' && argv[i + 1]) {
      tag = argv[i + 1]
      i += 1
      continue
    }

    if (argv[i] === '--ref' && argv[i + 1]) {
      ref = argv[i + 1]
      i += 1
    }
  }

  if (!mode) {
    mode = tag ? 'release' : 'unreleased'
  }

  if (!['unreleased', 'release'].includes(mode)) {
    throw new Error(`Unsupported mode: ${mode}. Expected unreleased or release.`)
  }

  if (tag && !/^v\d+\.\d+\.\d+$/.test(tag)) {
    throw new Error(`Unsupported tag format: ${tag}. Expected vX.Y.Z.`)
  }

  if (mode === 'release') {
    if (!tag) {
      throw new Error('Missing tag. Pass --tag vX.Y.Z or set GITHUB_REF_NAME.')
    }
  }

  return {
    mode,
    tag,
    ref,
    version: tag ? tag.slice(1) : '',
  }
}

function updateUnreleased(ref, currentTag) {
  const tags = listReleaseTags()
  const previousTag = findPreviousTag(tags, currentTag || null)
  const existingContent = ensureBaseChangelog()
  const existingUnreleasedContent = getUnreleasedContent(existingContent)
  const latestReleasedVersion = parseVersionSections(existingContent)[0]?.version || ''
  const previousVersion = previousTag ? previousTag.slice(1) : ''

  if (!previousTag && existingUnreleasedContent) {
    console.log('Keeping existing Unreleased changelog because no previous release tag exists')
    return
  }

  if (shouldKeepExistingUnreleased(currentTag, latestReleasedVersion, previousVersion)) {
    console.log(
      `Keeping existing Unreleased changelog because latest CHANGELOG.md version ${latestReleasedVersion} does not align with previous tag ${previousTag || '(none)'}`
    )
    return
  }

  const commits = getCommits(previousTag, ref)
  const sections = buildSections(commits)
  const unreleasedContent = renderSectionContent(sections)
  const nextContent = replaceUnreleasedContent(existingContent, unreleasedContent)

  writeFileIfChanged(CHANGELOG_PATH, nextContent)
  console.log(`Updated Unreleased changelog from ${previousTag || '(none)'} to ${ref}`)
}

function updateRelease(tag, version) {
  const existingContent = ensureBaseChangelog()

  if (existingContent.includes(`## [${version}]`)) {
    throw new Error(`CHANGELOG.md already contains version ${version}.`)
  }

  const unreleasedContent = getUnreleasedContent(existingContent)
  const releaseDate = new Date().toISOString().slice(0, 10)
  const versionSection = renderVersionSection(version, releaseDate, unreleasedContent)
  const nextContent = insertVersionSection(existingContent, versionSection)

  writeFileIfChanged(CHANGELOG_PATH, nextContent)
  writeFileIfChanged(RELEASE_NOTES_PATH, `${versionSection}\n`)

  console.log(`Updated CHANGELOG.md for ${tag}`)
  console.log(`Release notes: ${RELEASE_NOTES_PATH}`)
}

function main() {
  const { mode, tag, version, ref } = parseArgs(process.argv.slice(2))

  if (mode === 'unreleased') {
    updateUnreleased(ref, tag)
    return
  }

  updateRelease(tag, version)
}

main()
