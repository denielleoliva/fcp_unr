# Face Rigging Studio — Drawing to Vizij

Turn a colored drawing into a vector face with a [Vizij](https://vizij.ai/) runtime preview and a portable rigged GLB. The original drawing/landmark workspace remains available under **Drawing canvas**.

Read the [documentation](docs/index.md) for the complete workflow, animation details, exports, and troubleshooting. The Sphinx site includes navigation and search.

## Run

```sh
npm ci --legacy-peer-deps
npm start
```

Open http://localhost:3000. `npm run build` produces the GitHub Pages build using the existing `/fcp_unr/` base path. React 18 uses React Three Fiber 8 and Drei 9; the legacy peer resolver accommodates Vizij’s broader rendering dependency declarations.

## Workflow

1. Open **Drawing to Vizij**. Upload a PNG, JPEG, or WebP (up to 15 MB), use the drawing canvas, or try the example.
2. For photographs of line drawings on shaded paper, enable **Photo cleanup (line drawings)** before uploading. Leave it off for broad solid color fills. Review the extracted vectors. Click a colored region or choose it in the **Vector** list. Correct its **Feature match** and color. Left/right mean image-left/image-right. A feature can contain multiple vectors. Keep hair, freckles, and other non-moving marks as decoration.
3. Assign at least a left eye, right eye, and mouth, then **Build speaking face**. **Natural mouth & eye motion** and **Keep my drawn shapes** are enabled by default. The rig follows the original contours and colors, closes the mouth at rest, and covers pupils during blinking. Full mouth opening restores the drawn grin and teeth. Uncheck **Keep my drawn shapes** for smooth fitted features, or disable natural motion for the basic trace rig; rebuild after changing either option.
4. Test mouth opening, lip rounding, blinking, gaze, and brows. Enter text and choose **Speak**; **Stop** cancels both speech and animation.
5. Export **Vizij face (.glb)** for Vizij, **vectors** for SVG editing, or **feature map** for the extracted geometry, colors, and labels. Keep exports before refreshing; this workspace currently stores edits in memory.

The layout adapts to desktop and tablet screens. Drawing supports mouse, pen, and touch.

## What is generated

Filled regions and strokes become Three.js meshes. Morph targets provide mouth opening/rounding, eye blinking and gaze, and brow raising. Original colors and relative feature positions are retained.

The GLB contains:

- Mesh geometry and morph targets, visible to standard glTF tools.
- Vizij `RobotData` for each mesh and the root group, including animatable bindings.
- A `VIZIJ_bundle` with the rig graph and speech pose configuration.
- Standard input paths under `rig/drawing/standard/`:

| Control | Path suffix | Range |
| --- | --- | --- |
| Jaw | `mouth/open/value` | 0–1 |
| Round lips | `mouth/round/value` | 0–1 |
| Blink | `eyes/blink/value` | 0–1 |
| Horizontal gaze | `eyes/pos/x` | −1–1 |
| Vertical gaze | `eyes/pos/y` | −1–1 |
| Brows | `brows/raise/value` | 0–1 |

These are controls authored for this generated face; other Vizij faces may expose different channels. Speech poses are named `viseme_<id>` with IDs from `src/constants/visemes.js` and use `rig/drawing/poses/{id}.weight` when driven as poses. The app’s preview drives the standard mouth controls directly.

The preview loads the exported GLB through `VizijRuntimeProvider` and `VizijRuntimeFace`. See `src/vizij/VizijPreview.js` for the runtime integration.

References: [runtime tutorial](https://vizij.ai/tutorials/hello-face/), [control paths](https://vizij.ai/docs/rigging-and-control-model/), [Vizij source](https://github.com/vizij-ai/vizij-web).

## Extraction and limitations

Image processing runs locally: aspect-preserving downsampling to at most 240×180 (320×240 for photo cleanup), color quantization, linear-time connected components, and closed boundary tracing (including holes). It keeps at most 240 regions and drops tiny regions to bound geometry complexity. Paper removal excludes near-white pixels; its slider applies on the next import. Bright saturated colors remain detectable. Color regions become separate editable vector pieces. Photo cleanup uses local luminance contrast to discard broad paper shadows and groups shading variants within ink color families. Raster mesh generation uses exact horizontal pixel runs to preserve holes, including the gaps between drawn teeth.

Feature matching uses position and size heuristics. Front-facing drawings on white paper are the best input. Connected features, colored backgrounds, photographs with shadows, highly asymmetric faces, or tiny details can require corrections or a cleaner scan. White details blend into paper and are removed. The output is a stylized 2D mesh rig. By default, natural motion retains the original mouth and eye traces and derives closing contours from their silhouettes. Pupil labels improve gaze and blinking; review inferred feature labels when fragments are misclassified. The optional smooth mode replaces these traces with fitted lips, eyelids, and a tooth band. With natural motion disabled, the basic mouth trace stretches and does not fully close if the drawing started open.

Browser speech synthesis may use the browser/OS voice service. Word boundary events re-anchor the approximate text-to-viseme timeline when provided. Browsers do not expose reliable phoneme timestamps, so this is not precise audio-aligned lip sync. Accurate lip sync requires a speech service with phoneme timestamps or audio alignment.

## Validation

```sh
npm test -- --watchAll=false --runInBand
npm run build
```

Tests cover tracing, paper removal, connected regions, holes, feature matching, original contour preservation, mouth closure, eyelid geometry, morph buffers, and blink timing. Use `tests/fixtures/colored-face.png` to check the upload and export workflow manually.

## Documentation site

Set up the documentation tools once (Python 3.11 or newer):

```sh
python3 -m venv .venv-docs
.venv-docs/bin/python -m pip install -r docs/requirements.txt
```

Build and preview:

```sh
npm run docs:build
npm run docs:serve
```

Open http://localhost:8000. Edit the Markdown pages in `docs/` and rebuild to see changes.

`npm run deploy` builds both the app and documentation, then publishes them together. After deployment, the documentation is served at https://denielleoliva.github.io/fcp_unr/docs/. The documentation environment must be installed before deploying.
