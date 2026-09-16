#!/usr/bin/env node
/**
 * qvac-offline-translate
 * ------------------------------------------------------------------
 * A tiny CLI that translates text fully on-device using Tether's QVAC SDK
 * (@qvac/sdk). No API key, no server call, no usage bill — the neural
 * machine translation model (Bergamot, via qvac-fabric-llm.cpp) downloads
 * once to a local cache and every translation after that runs on your
 * own CPU/GPU. Your text never leaves the machine.
 *
 * Usage:
 *   node translate.js                              # runs the built-in demo (en -> fr)
 *   node translate.js --list                        # lists language pairs available locally
 *   node translate.js --from en --to fr --text "Hello, how are you?"
 *   echo "Hello there" | node translate.js --from en --to es
 *
 * QVAC functions used: loadModel(), translate(), unloadModel(),
 * modelRegistrySearch().
 */

import * as qvac from '@qvac/sdk'
import { loadModel, translate, unloadModel, modelRegistrySearch } from '@qvac/sdk'

// ---------------------------------------------------------------------------
// Tiny argument parser (kept dependency-free on purpose)
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { from: null, to: null, text: null, list: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--list' || a === '-l') args.list = true
    else if (a === '--from' || a === '-f') args.from = argv[++i]
    else if (a === '--to' || a === '-t') args.to = argv[++i]
    else if (a === '--text' || a === '-x') args.text = argv[++i]
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

function printHelp() {
  console.log(`
qvac-offline-translate — on-device translation via QVAC (@qvac/sdk)

  --list, -l              List language pairs available in the local QVAC model registry
  --from, -f <code>       Source language code (e.g. en)
  --to, -t <code>         Target language code (e.g. fr)
  --text, -x "<text>"     Text to translate (omit to read from stdin)
  --help, -h              Show this help

Examples:
  node translate.js --from en --to fr --text "Where is the nearest hospital?"
  echo "Good morning" | node translate.js --from en --to es
  node translate.js --list
`)
}

async function readStdin() {
  if (process.stdin.isTTY) return null
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8').trim()
}

function progressLogger(label) {
  return (p) => {
    const mb = (n) => (n / 1e6).toFixed(1)
    const line = `▸ ${label}: ${p.percentage.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)`
    process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`)
    if (p.percentage >= 100) process.stderr.write('\n')
  }
}

// ---------------------------------------------------------------------------
// --list : query QVAC's own model registry for Bergamot translation pairs
// ---------------------------------------------------------------------------
async function listPairs() {
  console.log('▸ Querying the QVAC model registry for translation models (on-device lookup)...\n')
  const models = await modelRegistrySearch({ filter: 'BERGAMOT' })
  if (!models.length) {
    console.log('No Bergamot models found in the registry response. Try again, or see the docs:')
    console.log('https://docs.qvac.tether.io/ai-capabilities/translation')
    return
  }
  console.log(`Found ${models.length} translation model(s):\n`)
  for (const m of models) {
    console.log(`  - ${m.name}`)
  }
  console.log(`
Pick a pair with --from/--to using the two-letter codes embedded in the
name, e.g. BERGAMOT_EN_FR -> --from en --to fr
`)
}

// ---------------------------------------------------------------------------
// Resolve a model constant like BERGAMOT_EN_FR from the SDK's named exports
// ---------------------------------------------------------------------------
function resolveModelConstant(from, to) {
  const key = `BERGAMOT_${from.toUpperCase()}_${to.toUpperCase()}`
  const modelSrc = qvac[key]
  if (!modelSrc) {
    throw new Error(
      `No built-in constant "${key}" in @qvac/sdk. Run "node translate.js --list" to see ` +
      `what's available, or pass a full model source object per the QVAC docs.`
    )
  }
  return { key, modelSrc }
}

// ---------------------------------------------------------------------------
// Core translation flow: loadModel -> translate -> unloadModel
// ---------------------------------------------------------------------------
async function translateOnDevice({ from, to, text }) {
  const { key, modelSrc } = resolveModelConstant(from, to)

  console.log(`▸ Loading ${key} on-device (first run downloads it once, then it's cached locally)...`)
  const modelId = await loadModel({
    modelSrc,
    modelType: 'nmt',
    modelConfig: {
      engine: 'Bergamot',
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      beamsize: 1,
      temperature: 0.2
    },
    onProgress: progressLogger('Downloading model')
  })

  console.log('▸ Model ready. Translating locally (no network call, no API key)...\n')
  const result = translate({ modelId, text, modelType: 'nmt', stream: false })
  const translatedText = await result.text

  console.log(`Source (${from}):     ${text}`)
  console.log(`Translation (${to}): ${translatedText}\n`)

  await unloadModel({ modelId })
  return translatedText
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  if (args.list) {
    await listPairs()
    return
  }

  let { from, to, text } = args

  // No arguments at all -> run a friendly built-in demo so the app is
  // demoable with zero setup beyond `npm install`.
  if (!from && !to && !text) {
    console.log('No arguments given — running the built-in demo (English -> French).')
    console.log('Try --help to see how to translate your own text.\n')
    from = 'en'
    to = 'fr'
    text = 'This translation just ran entirely on your own device, offline.'
  }

  if (!text) {
    text = await readStdin()
  }

  if (!from || !to || !text) {
    console.error('✖ Missing --from, --to, or text. Run with --help for usage.')
    process.exitCode = 1
    return
  }

  try {
    await translateOnDevice({ from, to, text })
  } catch (error) {
    console.error('✖', error.message || error)
    process.exitCode = 1
  }
}

main()
