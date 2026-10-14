# Feature detector training

Run `npm run training:local`, then open http://127.0.0.1:3001 in a separate browser window to trace and review drawings, assign training/validation splits, and export annotations.

```sh
node training/train.mjs training/annotations/fcp-annotations.json training/output
```

Load `training/output/feature-model.json` in the studio. Metrics are written to `training/output/metrics.json`.

See the [training guide](../docs/training.md) for the annotation workflow, model limits, evaluation, and dataset format. Raw images need reviewed region labels before training. Local `images/`, `annotations/`, and `output/` directories are ignored by Git.
