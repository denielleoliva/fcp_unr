# Geometry and Vizij rigging

## Build movable geometry

Three.js converts the shapes into flat triangle meshes. SVG fills and strokes are triangulated; traced raster features use their stored pixel strips. Shapes are layered slightly in depth to maintain drawing order.

A **morph target** stores an alternate position for each vertex. Changing its weight blends the mesh between its base shape and the target shape. This rig uses morph targets for mouth opening, lip rounding, blinking, gaze, and brow raising. It is a stylized 2D face built from meshes, rather than a full volumetric head.

### Drawing-preserving motion

With both natural-motion options enabled, mouth and eye movement follows contours sampled from the original drawing:

- The mouth contracts toward a closing contour at rest. Full opening restores the traced grin and teeth.
- Eye outlines retain their asymmetry. Lid surfaces cover pupils as the eyes close.
- Pupil visibility is suppressed at full closure, including when gaze is offset.
- A thin mouth closure line fades as the jaw opens.

Uncheck **Keep my drawn shapes** to use smooth fitted mouth and eye geometry. Disable **Natural mouth & eye motion** to use the basic deformation of the traced artwork; an initially open mouth may not fully close in that mode.

Rebuild after changing these options.

## Package and run the Vizij rig

The exporter creates a binary glTF file (`.glb`) containing:

- Meshes, colors, and morph targets.
- `RobotData` describing shapes and their animatable properties.
- A `VIZIJ_bundle` containing the control graph and speech pose configuration.

The control graph connects input values to morph weights and feature visibility. The preview loads the same exported GLB through `VizijRuntimeProvider` and renders it with `VizijRuntimeFace` from `@vizij/runtime-react`.

All controls below use the prefix `rig/drawing/standard/`:

| Control | Path suffix | Range |
| --- | --- | --- |
| Mouth opening | `mouth/open/value` | 0–1 |
| Lip rounding | `mouth/round/value` | 0–1 |
| Blink | `eyes/blink/value` | 0–1 |
| Horizontal gaze | `eyes/pos/x` | −1–1 |
| Vertical gaze | `eyes/pos/y` | −1–1 |
| Brow raising | `brows/raise/value` | 0–1 |

These paths belong to this generated rig; other Vizij faces may expose different controls.
