# ai-exp
{
  "name": "qvac-offline-translate",
  "version": "1.0.0",
  "description": "Offline neural machine translation CLI powered by Tether's QVAC SDK. Translates text fully on-device — no API key, no server call, no data leaving your machine.",
  "type": "module",
  "main": "translate.js",
  "bin": {
    "qvac-translate": "./translate.js"
  },
  "scripts": {
    "start": "node translate.js",
    "pairs": "node translate.js --list"
  },
  "keywords": [
    "qvac",
    "on-device-ai",
    "local-ai",
    "translation",
    "nmt",
    "offline",
    "privacy"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@qvac/sdk": "^0.19.1"
  },
  "engines": {
    "node": ">=22.17"
  }
}
