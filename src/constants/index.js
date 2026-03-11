// 6 Basic Expressions (Ekman's universal emotions)
export const EXPRESSIONS = {
  neutral: {
    name: 'Neutral',
    mouthOpen: 0,
    mouthCurve: 0,      // -1 = frown, 0 = flat, 1 = smile
    blink: 0,
    eyebrowRaise: 0,    // -1 = down (angry), 0 = normal, 1 = up (surprised)
    eyeWidth: 0,        // -1 = squint, 0 = normal, 1 = wide
    pupilX: 0,
    pupilY: 0,
  },
  happy: {
    name: 'Happy',
    mouthOpen: 0.3,
    mouthCurve: 1,
    blink: 0,
    eyebrowRaise: 0.2,
    eyeWidth: 0,
    pupilX: 0,
    pupilY: 0,
  },
  sad: {
    name: 'Sad',
    mouthOpen: 0,
    mouthCurve: -0.8,
    blink: 0.3,
    eyebrowRaise: -0.4,
    eyeWidth: -0.2,
    pupilX: 0,
    pupilY: 0.3,
  },
  angry: {
    name: 'Angry',
    mouthOpen: 0.2,
    mouthCurve: -0.5,
    blink: 0,
    eyebrowRaise: -1,
    eyeWidth: -0.3,
    pupilX: 0,
    pupilY: 0,
  },
  surprised: {
    name: 'Surprised',
    mouthOpen: 0.8,
    mouthCurve: 0,
    blink: 0,
    eyebrowRaise: 1,
    eyeWidth: 1,
    pupilX: 0,
    pupilY: 0,
  },
  fearful: {
    name: 'Fearful',
    mouthOpen: 0.4,
    mouthCurve: -0.3,
    blink: 0,
    eyebrowRaise: 0.8,
    eyeWidth: 0.8,
    pupilX: 0,
    pupilY: 0,
  },
  disgusted: {
    name: 'Disgusted',
    mouthOpen: 0.1,
    mouthCurve: -0.6,
    blink: 0.2,
    eyebrowRaise: -0.5,
    eyeWidth: -0.4,
    pupilX: 0,
    pupilY: -0.2,
  },
};

// Initial control points (26 facial landmarks)
export const INITIAL_CONTROL_POINTS = {
  // Eyes (5 points each)
  leftEyeCenter: { x: 250, y: 200 },
  leftEyeTop: { x: 250, y: 185 },
  leftEyeBottom: { x: 250, y: 215 },
  leftEyeInner: { x: 265, y: 200 },
  leftEyeOuter: { x: 235, y: 200 },
  
  rightEyeCenter: { x: 550, y: 200 },
  rightEyeTop: { x: 550, y: 185 },
  rightEyeBottom: { x: 550, y: 215 },
  rightEyeInner: { x: 535, y: 200 },
  rightEyeOuter: { x: 565, y: 200 },
  
  // Eyebrows (3 points each)
  leftEyebrowInner: { x: 270, y: 160 },
  leftEyebrowMiddle: { x: 250, y: 150 },
  leftEyebrowOuter: { x: 230, y: 160 },
  
  rightEyebrowInner: { x: 530, y: 160 },
  rightEyebrowMiddle: { x: 550, y: 150 },
  rightEyebrowOuter: { x: 570, y: 160 },
  
  // Mouth (8 points)
  mouthLeftCorner: { x: 300, y: 400 },
  mouthRightCorner: { x: 500, y: 400 },
  mouthTopLeft: { x: 350, y: 380 },
  mouthTopCenter: { x: 400, y: 375 },
  mouthTopRight: { x: 450, y: 380 },
  mouthBottomLeft: { x: 350, y: 420 },
  mouthBottomCenter: { x: 400, y: 425 },
  mouthBottomRight: { x: 450, y: 420 },
};

// Brush styles
export const BRUSH_STYLES = {
  solid: 'none',
  dashed: '10,5',
  dotted: '2,3',
  sketch: '5,3,2,3'
};