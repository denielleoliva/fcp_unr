# Pipeline overview

The studio converts drawing colors and contours into a flat mesh face with a Vizij control graph.

```text
Uploaded image ── Cleanup and tracing ─┐
                                      ├─ Feature labels ─ Meshes and morph targets
Canvas strokes ───────────────────────┘                       │
                                                          Vizij GLB
                                                              │
Text ─ Speech and estimated visemes ──────────────────── Vizij preview
Sliders and automatic blinking ───────────────────────────────┘
```

| Stage | Output | Guide |
| --- | --- | --- |
| Load and clean | Downsampled image with paper removed | [Loading and vectorization](extraction.md) |
| Trace and label | Colored regions with facial roles | [Loading and vectorization](extraction.md) |
| Build | Meshes, morph targets, and control graph | [Geometry and rigging](rigging.md) |
| Animate | Mouth, eye, gaze, and brow movement | [Speech and blinking](speech.md) |
| Save | GLB, SVG, or feature-map JSON | [Export formats](exports.md) |

Image processing runs locally. The preview uses the actual Vizij runtime and loads the same GLB offered for export. Speech timing is estimated from text and browser voice events.

Start with the [quick workflow](workflow.md), or use the [code reference](reference.md) to find the implementation of each stage.
