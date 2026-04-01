#!/usr/bin/env node
// scripts/sign-crx.cjs — Sign a Chrome extension directory into a .crx file
// Usage: node scripts/sign-crx.cjs <sourceDir> <privateKeyPath> <outputPath>

'use strict'

const fs = require('fs')
const path = require('path')
const CRX = require('crx')

const [sourceDir, privateKeyPath, outputPath] = process.argv.slice(2)

if (!sourceDir || !privateKeyPath || !outputPath) {
  console.error('Usage: node scripts/sign-crx.cjs <sourceDir> <privateKeyPath> <outputPath>')
  process.exit(1)
}

const privateKey = fs.readFileSync(privateKeyPath)
const crx = new CRX({ privateKey })

crx
  .load(path.resolve(sourceDir))
  .then(() => crx.pack())
  .then((buf) => {
    fs.writeFileSync(outputPath, buf)
    console.log(`CRX created: ${outputPath}`)
  })
  .catch((err) => {
    console.error('CRX signing failed:', err)
    process.exit(1)
  })
