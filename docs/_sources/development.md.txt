# Development and deployment

From the repository directory:

```sh
npm ci --legacy-peer-deps
npm start
```

Open `http://localhost:3000` for local development. To check the project:

```sh
npm test -- --watchAll=false --runInBand
npm run build
```

To publish to the configured [GitHub Pages site](https://denielleoliva.github.io/fcp_unr/):

```sh
npm run deploy
```

The `predeploy` script builds the app and Sphinx documentation, copies the documentation into `build/docs`, then `gh-pages` publishes the `build` folder to the `gh-pages` branch. Install the documentation tools below before deploying. GitHub Pages should serve that branch’s root folder. Committing and pushing source changes to `main` is a separate step.

Run npm commands as your normal user, without `sudo`, so future builds can replace their output files.

## Build this documentation

Use Python 3.11 or newer. From the repository directory:

```sh
python3 -m venv .venv-docs
.venv-docs/bin/python -m pip install -r docs/requirements.txt
npm run docs:build
npm run docs:serve
```

Open `http://localhost:8000`. The output is in `docs/_build/html`; source pages are Markdown parsed by MyST. The build treats warnings as errors to catch broken references. Rebuild after editing a page.

On Windows, use `.venv-docs\Scripts\python.exe` in place of `.venv-docs/bin/python`, or run the equivalent Sphinx command in an activated environment:

```sh
python -m sphinx -W --keep-going -b html docs docs/_build/html
```

The site uses [Sphinx](https://www.sphinx-doc.org/), [MyST Parser](https://myst-parser.readthedocs.io/), and the Read the Docs theme. It includes client-side search and responsive navigation. Deploying the app also publishes the docs at `/fcp_unr/docs/`.
