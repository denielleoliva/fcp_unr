import store from './storage';

// Extract feature vector from a shape (8D, scale-invariant)
export const extractFeatures = (shape, faceBounds) => {
  const { minX, minY, width, height, area } = faceBounds;
  
  let centerX, centerY, shapeWidth, shapeHeight, shapeArea;
  let isCircle = 0;
  let closure = 0;

  if (shape.type === 'circle') {
    centerX = shape.cx;
    centerY = shape.cy;
    shapeWidth = shape.r * 2;
    shapeHeight = shape.r * 2;
    shapeArea = Math.PI * shape.r * shape.r;
    isCircle = 1;
    closure = 1;
  } else if (shape.type === 'rect') {
    centerX = shape.x + shape.width / 2;
    centerY = shape.y + shape.height / 2;
    shapeWidth = shape.width;
    shapeHeight = shape.height;
    shapeArea = shape.width * shape.height;
    isCircle = 0;
    closure = 0.9;
  } else if (shape.type === 'path') {
    const commands = shape.d.match(/[ML]\s*([\d.]+)\s+([\d.]+)/g);
    if (!commands) return null;
    
    const points = commands.map(cmd => {
      const match = cmd.match(/[ML]\s*([\d.]+)\s+([\d.]+)/);
      return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null;
    }).filter(Boolean);
    
    if (points.length === 0) return null;
    
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minPX = Math.min(...xs);
    const maxPX = Math.max(...xs);
    const minPY = Math.min(...ys);
    const maxPY = Math.max(...ys);
    
    centerX = (minPX + maxPX) / 2;
    centerY = (minPY + maxPY) / 2;
    shapeWidth = maxPX - minPX;
    shapeHeight = maxPY - minPY;
    shapeArea = shapeWidth * shapeHeight;
    
    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const dist = Math.sqrt(Math.pow(lastPt.x - firstPt.x, 2) + Math.pow(lastPt.y - firstPt.y, 2));
    closure = dist < 10 ? 0.8 : Math.max(0, 1 - dist / 50);
    isCircle = closure > 0.7 ? 0.8 : 0;
  } else {
    return null;
  }

  const aspectRatio = shapeHeight > 0 ? Math.min(shapeWidth / shapeHeight, 5) : 1;

  return [
    (centerX - minX) / width,
    (centerY - minY) / height,
    shapeWidth / width,
    shapeHeight / height,
    aspectRatio / 5,
    shapeArea / area,
    isCircle,
    closure
  ];
};

// Get face bounding box
export const getFaceBounds = (controlPoints) => {
  const allX = Object.values(controlPoints).map(p => p.x);
  const allY = Object.values(controlPoints).map(p => p.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const width = maxX - minX;
  const height = maxY - minY;
  const area = width * height;
  return { minX, minY, maxX, maxY, width, height, area };
};

// Label a shape based on proximity to control points
export const labelShape = (shape, controlPoints, faceBounds) => {
  const features = extractFeatures(shape, faceBounds);
  if (!features) return 'other';

  const centerX = features[0] * faceBounds.width + faceBounds.minX;
  const centerY = features[1] * faceBounds.height + faceBounds.minY;

  const threshold = Math.min(faceBounds.width, faceBounds.height) * 0.15;

  const leftEyeDist = Math.sqrt(
    Math.pow(centerX - controlPoints.leftEyeCenter.x, 2) +
    Math.pow(centerY - controlPoints.leftEyeCenter.y, 2)
  );
  const rightEyeDist = Math.sqrt(
    Math.pow(centerX - controlPoints.rightEyeCenter.x, 2) +
    Math.pow(centerY - controlPoints.rightEyeCenter.y, 2)
  );

  const leftBrowDist = Math.sqrt(
    Math.pow(centerX - controlPoints.leftEyebrowMiddle.x, 2) +
    Math.pow(centerY - controlPoints.leftEyebrowMiddle.y, 2)
  );
  const rightBrowDist = Math.sqrt(
    Math.pow(centerX - controlPoints.rightEyebrowMiddle.x, 2) +
    Math.pow(centerY - controlPoints.rightEyebrowMiddle.y, 2)
  );

  const mouthCenterX = (controlPoints.mouthLeftCorner.x + controlPoints.mouthRightCorner.x) / 2;
  const mouthCenterY = (controlPoints.mouthTopCenter.y + controlPoints.mouthBottomCenter.y) / 2;
  const mouthDist = Math.sqrt(
    Math.pow(centerX - mouthCenterX, 2) +
    Math.pow(centerY - mouthCenterY, 2)
  );

  const minDist = Math.min(leftEyeDist, rightEyeDist, leftBrowDist, rightBrowDist, mouthDist);

  if (minDist > threshold) return 'other';

  if (minDist === leftEyeDist) return 'leftEye';
  if (minDist === rightEyeDist) return 'rightEye';
  if (minDist === leftBrowDist) return 'leftBrow';
  if (minDist === rightBrowDist) return 'rightBrow';
  if (minDist === mouthDist) return 'mouth';

  return 'other';
};

// Train k-NN classifier
export const trainKNNClassifier = async (examples) => {
  const vectors = [];

  for (const example of examples) {
    const faceBounds = getFaceBounds(example.controlPoints);
    
    for (const shape of example.paths) {
      const features = extractFeatures(shape, faceBounds);
      if (!features) continue;

      const label = labelShape(shape, example.controlPoints, faceBounds);
      
      vectors.push({ features, label });
    }
  }

  const model = {
    vectors,
    trainedAt: new Date().toISOString(),
    exampleCount: examples.length
  };

  await store.set('knnModel', JSON.stringify(model));
  return model;
};

// k-NN prediction with cosine similarity
export const knnPredict = (features, model, k = 5) => {
  if (!model || !model.vectors || model.vectors.length === 0) return 'other';

  const similarities = model.vectors.map(v => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < features.length; i++) {
      dotProduct += features[i] * v.features[i];
      normA += features[i] * features[i];
      normB += v.features[i] * v.features[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
    return { label: v.label, similarity };
  });

  similarities.sort((a, b) => b.similarity - a.similarity);
  const topK = similarities.slice(0, k);

  const votes = {};
  for (const item of topK) {
    votes[item.label] = (votes[item.label] || 0) + 1;
  }

  let maxVotes = 0;
  let predictedLabel = 'other';
  for (const [label, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      predictedLabel = label;
    }
  }

  return predictedLabel;
};