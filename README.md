# qvac-offline-translate

A tiny CLI that translates text **entirely on your own device** using
[Tether's QVAC SDK](https://github.com/tetherto/qvac) (`@qvac/sdk`). There's
no API key, no server call, and no bill — the neural machine translation
model downloads once to a local cache, and every translation after that runs
on your own CPU/GPU. Your text never leaves your machine.

Under the hood this uses QVAC's [Bergamot](https://browser.mt) translation
engine, which ships **101 language-pair models** — including several
low-resource pairs (Gujarati, Kannada, Tamil, Malayalam, Bengali, Telugu, and
more) that most cloud translation APIs treat as an afterthought.

## What it does / which QVAC functions it calls

`translate.js` calls, in order:

1. `loadModel()` — loads a Bergamot NMT model (e.g. `BERGAMOT_EN_FR`) fetched
   from QVAC's distributed model registry.
2. `translate()` — runs the actual on-device inference.
3. `unloadModel()` — frees the model from memory when done.
4. `modelRegistrySearch()` — (used by `--list`) looks up which translation
   models are available, without loading anything.

## SDK version used

`@qvac/sdk` **0.19.1** (latest on npm at the time of writing; requires
`>= 0.19.0`).

## Requirements

- Node.js `>= 22.17`
- ~2 GB free RAM, a few hundred MB free disk per language pair you use
- See QVAC's [system requirements](https://docs.qvac.tether.io/system-requirements)
  for GPU/Vulkan details (the app works fine on CPU-only machines too)

## Install

```bash
git clone <this-repo-url>
cd qvac-offline-translate
npm install
```

## Run

Run the built-in demo (no flags needed) — translates a sample English
sentence into French, downloading the model the first time:

```bash
node translate.js
```

Translate your own text:

```bash
node translate.js --from en --to fr --text "Where is the nearest hospital?"
```

Pipe text in instead of using `--text`:

```bash
echo "Good morning, how did you sleep?" | node translate.js --from en --to gu
```

See which language pairs are available in the local model registry:

```bash
node translate.js --list
```

Full flag reference:

```bash
node translate.js --help
```

The first translation for a given language pair downloads that pair's model
(a few hundred MB) via QVAC's peer-to-peer distributed model registry and
caches it locally (default cache directory managed by the SDK, see QVAC's
[configuration docs](https://docs.qvac.tether.io/configuration)). Every
translation after that is instant and fully offline — turn off your Wi-Fi
and it still works.

## Why I built this

Translation is one of the clearest cases for local-first AI: it's often
needed exactly when you *don't* have reliable connectivity (traveling,
fieldwork, low-bandwidth regions), and it's exactly the kind of text people
don't want passing through a third-party server. QVAC makes "load a model,
call a function" genuinely that simple.

## License

MIT — see [LICENSE](./LICENSE).
