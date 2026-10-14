export const FEATURE_VERSION = 1;
export const FEATURE_ROLES = ['decoration', 'face', 'left_eye', 'right_eye', 'left_pupil', 'right_pupil', 'left_brow', 'right_brow', 'nose', 'mouth'];
const clamp = x => Math.max(0, Math.min(1, x));
export function regionFeatures(shapes) {
  const left = Math.min(...shapes.map(s => s.bounds.x)), top = Math.min(...shapes.map(s => s.bounds.y));
  const width = Math.max(1, ...shapes.map(s => s.bounds.x+s.bounds.width-left));
  const height = Math.max(1, ...shapes.map(s => s.bounds.y+s.bounds.height-top));
  return shapes.map(s => {
    const b = s.bounds, area = Math.max(1, b.width*b.height);
    const color = (s.fill && s.fill !== 'none' ? s.fill : s.stroke) || '#000000';
    const rgb = /^#[\da-f]{6}$/i.test(color) ? [1,3,5].map(i => parseInt(color.slice(i,i+2),16)/255) : [0,0,0];
    const ink = s.runs ? s.runs.reduce((sum,r) => sum+r[2]*r[3],0)/area : s.type === 'circle' ? Math.PI/4 : 1;
    return [(b.x+b.width/2-left)/width, (b.y+b.height/2-top)/height,
      b.width/width, b.height/height, b.width/(b.width+b.height || 1), clamp(ink), ...rgb];
  });
}
const validFeatures = values => Array.isArray(values) && values.length === 9 && values.every(v => Number.isFinite(v) && v >= 0 && v <= 1.00001);
export function validateDataset(data) {
  if (data?.kind !== 'fcp-feature-dataset' || data.version !== FEATURE_VERSION || !Array.isArray(data.images) || data.images.length > 1000) throw new Error('Expected an FCP feature dataset (version 1, up to 1000 images).');
  const ids = new Set();
  for (const image of data.images) {
    if (typeof image.id !== 'string' || !image.id || ids.has(image.id)) throw new Error('Each image needs a unique content ID; duplicate images cannot cross splits.');
    ids.add(image.id);
    if (image.reviewed !== true || !['train','validation'].includes(image.split) || !Array.isArray(image.regions) || !image.regions.length || image.regions.length > 240) throw new Error('Every saved image must be reviewed and assigned to a split.');
    for (const region of image.regions) {
      if (!FEATURE_ROLES.includes(region.label) || !validFeatures(region.features)) throw new Error('Invalid region label or feature vector.');
    }
  }
  return data;
}
export function validateModel(model) {
  if (model?.kind !== 'fcp-feature-knn' || model.version !== FEATURE_VERSION || model.k !== 5 || !Array.isArray(model.samples) || !model.samples.length || model.samples.length > 240000 || !model.samples.every(s => FEATURE_ROLES.includes(s.label) && validFeatures(s.features))) throw new Error('Invalid or unsupported FCP feature model.');
  return model;
}
export function predictRegion(features, model) {
  // Position and geometry dominate; color is a weak cue across different drawings.
  const weights = [3,3,2,2,1,1,.15,.15,.15];
  const nearest = [];
  for (const sample of model.samples) {
    const distance = Math.sqrt(sample.features.reduce((sum,v,i) => sum+weights[i]*(v-features[i])**2,0)/12.45);
    if (nearest.length < model.k || distance < nearest[nearest.length-1].distance) {
      nearest.push({label: sample.label, distance});
      nearest.sort((a,b) => a.distance-b.distance);
      if (nearest.length > model.k) nearest.pop();
    }
  }
  const votes = {};
  nearest.forEach(s => { votes[s.label] = (votes[s.label] || 0) + 1/(s.distance+.01); });
  const [label, score] = Object.entries(votes).sort((a,b) => b[1]-a[1])[0];
  const confidence = score/Object.values(votes).reduce((a,b) => a+b,0);
  return { label, confidence, distance: nearest[0].distance, accepted: confidence >= .65 && nearest[0].distance <= .25 };
}
export function applyFeatureModel(shapes, model) {
  if (!model || !shapes.length) return shapes;
  return regionFeatures(shapes).map((features,i) => {
    const result = predictRegion(features,model);
    return result.accepted ? { ...shapes[i], role: result.label, confidence: result.confidence, labelSource: 'trained' } : { ...shapes[i], labelSource: 'heuristic' };
  });
}
export function trainFeatureModel(dataset) {
  validateDataset(dataset);
  const train = dataset.images.filter(i => i.split === 'train');
  if (train.length < 2) throw new Error('Review and save at least two different training images first.');
  const model = { kind: 'fcp-feature-knn', version: FEATURE_VERSION, k: 5, trainedAt: new Date().toISOString(), imageCount: train.length,
    samples: train.flatMap(i => i.regions.map(r => ({ features: r.features, label: r.label }))) };
  const validation = dataset.images.filter(i => i.split === 'validation');
  const counts = Object.fromEntries(FEATURE_ROLES.map(role => [role,{support:0,correct:0,predicted:0}]));
  let total=0,correct=0,accepted=0;
  validation.forEach(i => i.regions.forEach(r => {
    const prediction = predictRegion(r.features,model);
    total++; counts[r.label].support++; counts[prediction.label].predicted++;
    if (prediction.accepted) accepted++;
    if (prediction.label === r.label) { correct++; counts[r.label].correct++; }
  }));
  const report = { trainingImages: train.length, validationImages: validation.length, regions: total,
    accuracy: total ? correct/total : null, coverage: total ? accepted/total : null, perClass: counts,
    missingTrainingLabels: FEATURE_ROLES.filter(role => !model.samples.some(s => s.label === role)) };
  return { model, report };
}
