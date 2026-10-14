# Loading and vectorization

## Load the drawing

Uploads accept PNG, JPEG, and WebP images up to 15 MB. The browser decodes the image into a temporary canvas for pixel processing.

Drawings made in the canvas already contain vector strokes and shapes. **Use canvas drawing** combines those shapes with a trace of any uploaded background image. The example face supplies ready-made vector shapes.

Image extraction runs locally in the browser. Speech playback uses the browser or operating system’s voice service, which may use a network service.

## Clean the image

The image is downsampled while preserving its aspect ratio:

| Mode | Maximum processing size | Best suited to |
| --- | --- | --- |
| Normal | 240 × 180 pixels | Clean scans and broad solid fills |
| Photo cleanup | 320 × 240 pixels | Line drawings photographed on shaded paper |

Normal mode removes near-white pixels using the **Paper removal threshold**. A lower threshold removes more light-colored pixels; a higher threshold retains more of them.

Photo cleanup compares each pixel’s brightness with its neighborhood to separate darker ink from broad paper shadows. It groups shading variations into ink color families. The paper threshold is disabled in this mode.

**Cleanup settings apply to the next import.** Change the settings and reimport the image to retrace it. Small details may disappear during downsampling, and white details can be removed with the paper.

## Vectorize the colored regions

The extractor groups similar colors, then finds connected regions using each pixel’s four immediate neighbors: above, below, left, and right.

For each retained region, it:

- Traces its boundaries into closed SVG paths.
- Assigns the average source color.
- Records horizontal pixel strips for mesh construction.

Regions smaller than five processing pixels are discarded by default. The largest 240 regions are retained. Shapes are scaled and centered in an 800 × 600 drawing coordinate space.

The SVG paths support editing and vector export. The pixel strips provide a reliable mesh representation of the sampled artwork, preserving holes such as gaps between drawn teeth. The result follows the sampled drawing; it does not automatically turn every edge into a smooth curve.

## Match facial features

Feature suggestions use relative position, size, and proportions. For example, wide regions near the top may be eyebrows, while lower central regions may be mouth pieces.

Available labels are face, left/right eye, left/right pupil, left/right brow, nose, mouth, and decoration. **Left and right refer to the image**, not the character’s anatomical left and right.

Review suggestions in the feature editor. A single feature can contain several disconnected regions, and the initial matching may label pupil pieces as eyes. Hair, freckles, and other stationary marks can remain decoration. Colors can also be corrected here.

Changing a label or color invalidates the current rig. Build the face again to apply the changes.
