# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- preview: rework header icons and add a close menu

### Changed
- settings: split general settings into extension status and language/theme cards
- settings: replace native language and theme selects with segmented controls
- settings: clarify preview section titles and turn About/footer values into gold links
- settings: add card hover glow, a stronger frosted action bar, and clearer card text hierarchy
- settings: simplify the footer and pin it above the action bar
- settings: enlarge the type scale for clearer, more readable text
- settings: add icons and a raised active pill to the tab bar
- settings: replace tab and card icons with a consistent Lucide icon set
- settings: add Lucide icons to the About version, author, and homepage rows
- settings: keep slider rows readable on narrow screens
- settings: enrich the About card with a hero block and gold pill links

## [0.2.0] - 2026-11-13

### Added
- ui: refresh brand mark, icons, and accent palette
- theme: add a palette redesign plan and standalone visual reference lab
- test: guard theme token resolution and component color usage

### Changed
- ui: redesign dark and light themes with a purple-gray, amber, and gold palette
- ui: source popup colors from the shared foundation theme tokens
- ui: follow the system color scheme for native controls
- ui: respect the reduced-motion preference
- build: upgrade GitHub Actions to the Node 24 runtime
- license: adopt GPL-3.0-only

### Fixed
- popup: label form controls and expose a main landmark for assistive tech
- ui: strengthen the light-theme focus ring for non-text contrast

## [0.1.0] - 2026-11-12

### Added
- popup: add quick controls for language, windows, and site blocking
- settings: overhaul controls and save flow
- ui: unify settings palette and localize popup controls
- settings: redesign settings with native popup and standalone page

### Changed
- preview: remove Google Fonts dependency

### Fixed
- preview: harden iframe loading and runtime guards
- ui: correct checkbox styling and polish settings UI

## [0.0.1] - 2026-04-27

### Added
- Initial Chrome and Firefox extension release.
- Floating preview windows opened by dragging links.
- Release-anywhere and drop-area trigger modes.
- Single-window backdrop mode and multi-window preview controls.
- Settings for interface language, theme, preview window defaults, toolbar actions, and domain blacklist.
- Automated release artifacts for Firefox XPI and Chrome CRX/ZIP with checksums.
