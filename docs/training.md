# Train the feature detector

The separate local trainer can learn feature labels from a folder of drawings. Its folder picker and annotation interface are not included in the deployed website. This is a supervised region classifier: you correct the labels for extracted regions, then train a k-nearest-neighbor model on their measurements. No GPU or external service is required.

The model labels regions after vectorization. It does not change image cleanup or tracing, recover missing ink, or separate connected features that were extracted as one region. It is separate from the original drawing canvas's landmark-based classifier.

## Open the local trainer

From the repository directory, run:

```sh
npm run training:local
```

Open `http://127.0.0.1:3001` in a separate browser window. The trainer is served only on the local loopback address, has no external service dependencies at runtime, and uses the browser file picker to read the images you select. It does not send images or annotations to the hosted Face Studio website. Stop it with Ctrl-C in the terminal. Restart after changing its source code.

The first setup requires `npm ci --legacy-peer-deps`. `npm run training:build` builds the tool without starting its server. Generated trainer assets live in `training/.cache/`, which is ignored by Git and is not copied into the website's `build` directory.

## Prepare a folder

Use one drawing per PNG, JPEG, or WebP file, up to 15 MB each. Subfolders are accepted. An optional local organization is:

```text
training/
  images/
    drawing-001.png
    drawing-002.jpg
    drawing-003.png
  annotations/
    fcp-annotations.json
  output/
    feature-model.json
    metrics.json
```

Images, annotation exports, and trained outputs in these directories are ignored by Git. You can select a folder elsewhere on your computer instead. The browser reads only the files you select; images are not uploaded to a server.

## Review and save labels

1. Set **Photo cleanup** and **Paper removal threshold** for your images.
2. Use the **Feature Training — Dataset & Model** window in the local trainer.
3. Choose **Choose image folder**, or **Choose multiple images** if directory selection is unavailable on your device.
4. Compare the original image and extracted drawing. Select each region and correct its feature label. Use image-left/image-right, including separate pupil labels where appropriate. Keep unrelated marks as decoration.
5. Select **Training** or **Validation (held out)** for the whole image.
6. Check **I reviewed every region label**, then **Save reviewed image**.
7. Move to the next image. Export annotations regularly to save your work.

Suggestions are only starting points. Saving uncorrected mistakes teaches the model those mistakes. Images with extraction failures should be retraced with different cleanup settings or omitted until the features are usable.

Navigation is blocked while a review has unsaved changes. Save it or use **Discard unsaved review** before moving on. There is no autosave; a page refresh clears the in-memory dataset and model.

## Training and validation

Save at least two distinct training images before training. Add separate validation drawings to measure generalization. As a practical starting point, reserve roughly one in five drawings for validation and include examples of each feature in training. Small collections provide only a rough indication of performance.

Keep all versions of the same drawing, and preferably all drawings from the same child, in one split. The app detects byte-identical images using SHA-256 and prevents them from appearing in both splits. It cannot recognize resized, edited, or rephotographed duplicates, so grouping those is your responsibility.

Choose **Train feature detector**. The browser supports up to 100 saved images per training run; use the command-line trainer for larger datasets (up to 1000 images in this baseline format).

Each region is represented by nine values:

- Center X and Y relative to the drawing bounds.
- Width and height relative to the drawing bounds.
- Aspect proportion and ink coverage.
- Red, green, and blue color values.

The model uses five nearby labeled examples with distance-weighted voting. Position and geometry have more weight than color. Predictions with weak agreement or distant neighbors fall back to the studio's position rules. The confidence score is neighbor agreement, not a calibrated probability.

Training examples are stored in the model rather than compressed into neural-network weights. Prediction cost and file size grow with the dataset.

## Measure the results

The report includes:

| Metric | Meaning |
| --- | --- |
| Held-out region accuracy | Fraction of validation regions whose top predicted label matches your reviewed label |
| Confidence coverage | Fraction of validation regions accepted by the confidence and distance thresholds |
| Per-class support, correct, predicted | Counts in the exported metrics for evaluating each feature separately |
| Missing training labels | Feature types absent from the training set |

Validation images are never fitted into the model. If there are none, the interface reports that accuracy has not been measured. Accuracy evaluates the classifier's top predictions, before heuristic fallback; it is not end-to-end tracing or rigging accuracy. Overall accuracy can hide errors in rare labels such as pupils, so inspect the per-class counts too.

## Export, resume, and use a model

**Export annotations** downloads `fcp-annotations.json`. It records image content IDs, names, extraction settings, region measurements, reviewed labels, and split assignments. It does not include image pixels or SVG paths.

To resume, import the annotations and select the original image folder. Use the saved cleanup settings for each image. Matching extraction results restore the reviewed labels; changed settings or geometry require another review. Imported annotations merge by image content ID, replacing existing records for that image.

**Export model** saves a reusable JSON model. In the main Face Studio website, choose **Load feature model** and select that file. Keep **Use trained detector** enabled, then upload a drawing through the studio. Only inference runs in the website; training and annotation stay in the local tool. The import status reports how many labels came from the detector. Existing open drawings are not automatically relabeled.

Models are currently loaded per browser session. Publishing the website does not automatically enable a locally trained model for everyone. Robot GLBs already contain their reviewed labels and rig, so robots do not need the detector to play an exported face.

## Command-line training

Export the reviewed annotations from the local trainer, then run from the repository root:

```sh
node training/train.mjs training/annotations/fcp-annotations.json training/output
```

The command writes `feature-model.json` and `metrics.json`, using the same feature-model implementation as the browser. Load the resulting model in the studio. Raw images alone are not sufficient for supervised training; they must be traced and labeled first.

The dataset format is documented in [the JSON schema](https://github.com/denielleoliva/fcp_unr/blob/main/training/dataset.schema.json). Runtime validation checks versions, dimensions, labels, finite numbers, unique image IDs, review status, and split assignments.

## Implementation

| File | Responsibility |
| --- | --- |
| `src/training/TrainingPanel.js` | Folder queue, annotation controls, dataset/model imports and exports |
| `src/vizij/featureModel.mjs` | Feature measurements, validation, training, prediction, and metrics |
| `training/local.cjs` | Local-only build and preview server |
| `training/train.mjs` | Command-line trainer |
| `src/vizij/featureModel.test.js` | Split isolation, validation, invariance, and fallback tests |

For a future learned segmentation or keypoint model, retain the original image folder alongside the exported annotations. This baseline's region labels are useful supervision, but a pixel-level model would need an additional annotation/export format that preserves masks or keypoints.
