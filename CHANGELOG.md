# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- preview: add release-anywhere trigger
- preview: add single-window backdrop mode

### Changed
- ui: clarify settings and preview copy
- ui: unify settings and preview icons
- settings: clarify general and preview sections
- ui: use shared logo asset
- settings: clarify preview settings layout

### Fixed
- changelog: preserve tagged release entries
- ui: resolve token and mobile layout issues

## [0.0.4] - 2026-04-19

### Added
- settings: add domain blacklist controls
- preview: support multiple simultaneous preview windows

### Changed
- ui: unify semantic design tokens for settings and preview
- settings: separate brand and title gradients
- settings: simplify gradient title styling
- preview: unify drop area styling and structure
- settings: refine panel layout and visual hierarchy
- settings: refine panel typography and information hierarchy
- ui: refine theme styling and unify css tokens
- styles: split css system into reusable ui layers
- settings: inline standalone settings bootstrap
- i18n: unify settings panel copy in locale files

### Fixed
- changelog: align rebuild output with unreleased updates
- ui: load shared fonts from document head
- settings: keep theme badge in sync with theme changes
- settings: align language selection with active locale
- settings: refine panel layout and stabilize ci

## [0.0.3] - 2026-04-02

### Fixed
- build: handle BOM-prefixed JSON files

## [0.0.2] - 2026-04-02

### Changed
- maintenance release

## [0.0.1] - 2026-04-02

### Added
- debug: add optional diagnostic logging

### Changed
- release: add version check, checksums, and artifacts

### Fixed
- content: use correct overlay radius variable
