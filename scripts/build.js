#!/usr/bin/env node
// scripts/build.js — Build script for Glimpser extension
// Merges manifests, copies source files, and packages into zip archives.

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const archiver = require('archiver')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC  = path.join(ROOT, 'src')

// Source files to include in each browser package
const SOURCE_FILES = [
  'i18n.js',
  'background.js',
  'content.js',
  'settings.html',
  'settings-panel.js',
]
const SOURCE_DIRS = ['icons', '_locales', 'css']

function stripBom(content) {
  return content.replace(/^\uFEFF/, '')
}

function readJSON(filePath) {
  return JSON.parse(stripBom(fs.readFileSync(filePath, 'utf8')))
}

// Version: CLI arg > env var > package.json > fallback
const pkgVersion = readJSON(path.join(ROOT, 'package.json')).version
const version = process.argv[2] || process.env.VERSION || pkgVersion || '0.0.0'

function buildManifest(base, overlay, browser) {
  // Deep merge: overlay fields overwrite base fields
  const merged = { ...base, ...overlay }

  // Merge nested background object
  if (base.background || overlay.background) {
    merged.background = { ...base.background, ...overlay.background }
  }

  // Set version from build argument
  merged.version = version

  // Chrome: remove browser_specific_settings
  if (browser === 'chrome') {
    delete merged.browser_specific_settings
    // Ensure service_worker is set (from chrome overlay), remove scripts
    if (merged.background) {
      delete merged.background.scripts
    }
  }

  // Firefox: remove background.service_worker
  if (browser === 'firefox') {
    if (merged.background) {
      delete merged.background.service_worker
    }
  }

  return merged
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest))
  // Strip ES module export statements from JS files (not valid in content scripts)
  if (src.endsWith('.js')) {
    let content = fs.readFileSync(src, 'utf8')
    content = content.replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    fs.writeFileSync(dest, content, 'utf8')
  } else {
    fs.copyFileSync(src, dest)
  }
}

function copyDir(srcDir, destDir) {
  ensureDir(destDir)
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name)
    const destPath = path.join(destDir, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function copySourceFiles(destDir) {
  for (const file of SOURCE_FILES) {
    const src = path.join(SRC, file)
    if (fs.existsSync(src)) {
      copyFile(src, path.join(destDir, file))
    } else {
      console.warn(`Warning: source file not found: ${file}`)
    }
  }
  for (const dir of SOURCE_DIRS) {
    const src = path.join(SRC, dir)
    if (fs.existsSync(src)) {
      copyDir(src, path.join(destDir, dir))
    } else {
      console.warn(`Warning: source directory not found: ${dir}`)
    }
  }
}

function createZip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(outputPath))
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve())
    archive.on('error', reject)

    archive.pipe(output)
    archive.directory(sourceDir, false)
    archive.finalize()
  })
}

async function buildBrowser(browser) {
  console.log(`\nBuilding ${browser}...`)

  const base = readJSON(path.join(SRC, 'manifest.json'))
  const overlay = readJSON(path.join(SRC, `manifest.${browser}.json`))
  const merged = buildManifest(base, overlay, browser)

  const distDir = path.join(ROOT, 'dist', browser)
  ensureDir(distDir)

  // Copy source files
  copySourceFiles(distDir)

  // Write merged manifest (replaces any copied manifest.json)
  fs.writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(merged, null, 2),
    'utf8'
  )

  // Create zip
  const zipName = `glimpser-${version}-${browser}.zip`
  const zipPath = path.join(ROOT, 'dist', zipName)
  await createZip(distDir, zipPath)

  console.log(`  ✓ dist/${browser}/ populated`)
  console.log(`  ✓ dist/${zipName} created`)
}

async function main() {
  console.log(`Glimpser build — version: ${version}`)

  // Clean dist
  const distPath = path.join(ROOT, 'dist')
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true })
  }

  await buildBrowser('firefox')
  await buildBrowser('chrome')

  console.log('\nBuild complete.')
}

main().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
