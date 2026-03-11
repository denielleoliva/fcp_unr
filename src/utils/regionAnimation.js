// Region-Based Animation System
// Uses influence maps with Gaussian falloff for smooth, organic deformation

// Calculate influence weight using Gaussian falloff
export const gaussianInfluence = (distance, radius) => {
  const sigma = radius / 1.5;
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
};

// Define facial regions with influence radii
export const getFacialRegions = (cp) => {
  return {
    mouth: {
      center: {
        x: (cp.mouthLeftCorner.x + cp.mouthRightCorner.x) / 2,
        y: (cp.mouthTopCenter.y + cp.mouthBottomCenter.y) / 2
      },
      radius: 120,
      landmarks: [
        cp.mouthLeftCorner, cp.mouthRightCorner,
        cp.mouthTopLeft, cp.mouthTopCenter, cp.mouthTopRight,
        cp.mouthBottomLeft, cp.mouthBottomCenter, cp.mouthBottomRight
      ]
    },
    leftEye: {
      center: cp.leftEyeCenter,
      radius: 70,
      landmarks: [
        cp.leftEyeCenter, cp.leftEyeTop, cp.leftEyeBottom,
        cp.leftEyeInner, cp.leftEyeOuter
      ]
    },
    rightEye: {
      center: cp.rightEyeCenter,
      radius: 70,
      landmarks: [
        cp.rightEyeCenter, cp.rightEyeTop, cp.rightEyeBottom,
        cp.rightEyeInner, cp.rightEyeOuter
      ]
    },
    leftBrow: {
      center: cp.leftEyebrowMiddle,
      radius: 60,
      landmarks: [
        cp.leftEyebrowInner, cp.leftEyebrowMiddle, cp.leftEyebrowOuter
      ]
    },
    rightBrow: {
      center: cp.rightEyebrowMiddle,
      radius: 60,
      landmarks: [
        cp.rightEyebrowInner, cp.rightEyebrowMiddle, cp.rightEyebrowOuter
      ]
    }
  };
};

// Apply region-based deformation to a point
export const applyRegionDeformation = (point, regionName, deformAmount, cp, blinkAmount, expressions, currentExpression, lipRounding = 0, jawDrop = 0, visemeCurve = 0) => {
  const regions = getFacialRegions(cp);
  const region = regions[regionName];
  
  if (!region) return { ...point };

  const dx = point.x - region.center.x;
  const dy = point.y - region.center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const influence = gaussianInfluence(distance, region.radius);
  
  if (influence < 0.01) return { ...point };

  let offsetX = 0;
  let offsetY = 0;

  switch (regionName) {
    case 'mouth':
      if (deformAmount > 0) {
        const verticalStretch = deformAmount * 80;
        if (dy >= 0) {
          // At center (flat line) or below: push down, with 0.3 baseline so dy=0 still moves
          offsetY = verticalStretch * influence * Math.max(0.3, dy / region.radius);
        } else {
          // Above center: upper lip moves up slightly
          offsetY = -verticalStretch * 0.2 * influence * (Math.abs(dy) / region.radius);
        }
        offsetX = -dx * 0.2 * deformAmount * influence;
      }

      // Jaw drop (additional vertical movement)
      if (jawDrop > 0) {
        // Use same baseline so flat-line mouth also responds to jaw drop
        offsetY += jawDrop * 40 * influence * Math.max(0.3, dy / region.radius);
      }
      
      // Lip rounding (horizontal compression)
      if (lipRounding > 0) {
        const horizontalDist = Math.abs(dx);
        // Pull corners inward and forward (pucker)
        offsetX += -Math.sign(dx) * lipRounding * 20 * influence * (horizontalDist / region.radius);
      }
      
      // Mouth curve (smile/frown) - use viseme curve OR expression curve
      const curveAmount = visemeCurve !== 0 ? visemeCurve : (expressions[currentExpression]?.mouthCurve || 0);
      if (Math.abs(curveAmount) > 0.01) {
        const horizontalDist = Math.abs(dx);
        if (horizontalDist > region.radius * 0.3) {
          offsetY += curveAmount * 40 * influence * (horizontalDist / region.radius);
        }
      }
      break;

    case 'leftEye':
    case 'rightEye':
      const blinkAmt = blinkAmount;
      if (blinkAmt > 0) {
        const eyeHeight = region.radius;
        if (dy < 0) {
          offsetY = blinkAmt * eyeHeight * 1.2 * influence;
        } else {
          offsetY = -blinkAmt * eyeHeight * 0.5 * influence;
        }
        offsetX = -dx * 0.25 * blinkAmt * influence;
      }
      
      const widthAmt = expressions[currentExpression]?.eyeWidth || 0;
      if (Math.abs(widthAmt) > 0.01) {
        offsetX += dx * widthAmt * 0.5 * influence;
        offsetY += dy * widthAmt * 0.25 * influence;
      }
      break;

    case 'leftBrow':
    case 'rightBrow':
      const browRaise = expressions[currentExpression]?.eyebrowRaise || 0;
      if (Math.abs(browRaise) > 0.01) {
        offsetY = -browRaise * 40 * influence;
        
        if (browRaise < 0) {
          const innerBias = (regionName === 'leftBrow' && dx < 0) || 
                           (regionName === 'rightBrow' && dx > 0);
          if (innerBias) {
            offsetY *= 1.5;
          }
        }
      }
      break;
  }

  return {
    x: point.x + offsetX,
    y: point.y + offsetY
  };
};

// Deform an entire path using region-based animation
export const deformPath = (path, controlPoints, mouthOpenAmount, blinkAmount, expressions, currentExpression, lipRounding = 0, jawDrop = 0, visemeCurve = 0) => {
  const cp = controlPoints;
  let deformedPath = { ...path };

  if (path.type === 'circle') {
    let center = { x: path.cx, y: path.cy };
    let radius = path.r;

    const regions = getFacialRegions(cp);
    
    for (const [regionName] of Object.entries(regions)) {
      let deformAmt = 0;
      if (regionName === 'mouth') deformAmt = mouthOpenAmount;
      else if (regionName.includes('Eye')) deformAmt = blinkAmount;
      else if (regionName.includes('Brow')) deformAmt = Math.abs(expressions[currentExpression]?.eyebrowRaise || 0);

      center = applyRegionDeformation(center, regionName, deformAmt, cp, blinkAmount, expressions, currentExpression, lipRounding, jawDrop, visemeCurve);
    }

    deformedPath.cx = center.x;
    deformedPath.cy = center.y;
    
    const eyeDist = Math.min(
      Math.sqrt(Math.pow(center.x - cp.leftEyeCenter.x, 2) + Math.pow(center.y - cp.leftEyeCenter.y, 2)),
      Math.sqrt(Math.pow(center.x - cp.rightEyeCenter.x, 2) + Math.pow(center.y - cp.rightEyeCenter.y, 2))
    );
    
    if (eyeDist < 50) {
      deformedPath.r = radius * (1 - blinkAmount * 0.3);
    }

  } else if (path.type === 'rect') {
    let center = { x: path.x + path.width / 2, y: path.y + path.height / 2 };
    const regions = getFacialRegions(cp);

    for (const [regionName] of Object.entries(regions)) {
      let deformAmt = 0;
      if (regionName === 'mouth') deformAmt = mouthOpenAmount;
      else if (regionName.includes('Eye')) deformAmt = blinkAmount;

      center = applyRegionDeformation(center, regionName, deformAmt, cp, blinkAmount, expressions, currentExpression, lipRounding, jawDrop, visemeCurve);
    }

    deformedPath.x = center.x - path.width / 2;
    deformedPath.y = center.y - path.height / 2;

  } else if (path.type === 'path') {
    // Match all path commands including curves (C, Q, A, etc.)
    const commands = path.d.match(/[MLCQAZ][^MLCQAZ]*/gi);
    if (!commands) return deformedPath;

    const newCommands = commands.map(cmd => {
      const cmdType = cmd[0].toUpperCase();
      
      // Extract all number pairs from the command
      const coords = cmd.slice(1).match(/([-+]?[\d.]+)/g);
      if (!coords || coords.length === 0) return cmd;
      
      const regions = getFacialRegions(cp);
      const deformedCoords = [];
      
      // Process coordinate pairs
      for (let i = 0; i < coords.length; i += 2) {
        if (i + 1 >= coords.length) {
          deformedCoords.push(coords[i]);
          break;
        }
        
        let point = { x: parseFloat(coords[i]), y: parseFloat(coords[i + 1]) };
        
        for (const [regionName] of Object.entries(regions)) {
          let deformAmt = 0;
          if (regionName === 'mouth') deformAmt = mouthOpenAmount;
          else if (regionName.includes('Eye')) deformAmt = blinkAmount;

          point = applyRegionDeformation(point, regionName, deformAmt, cp, blinkAmount, expressions, currentExpression, lipRounding, jawDrop, visemeCurve);
        }
        
        deformedCoords.push(point.x.toFixed(2), point.y.toFixed(2));
      }
      
      return cmdType + ' ' + deformedCoords.join(' ');
    });

    deformedPath.d = newCommands.join(' ');
  }

  return deformedPath;
};