import React, { useState, useRef, useEffect } from 'react';
import { Download, Play, Trash2, Square, Circle, Pen, Move, Save, Undo } from 'lucide-react';
import { EXPRESSIONS, INITIAL_CONTROL_POINTS, BRUSH_STYLES } from './constants';
import store from './utils/storage';
import { deformPath } from './utils/regionAnimation';
import { trainKNNClassifier, knnPredict, extractFeatures, getFaceBounds, labelShape } from './utils/knnClassifier';
import { useExpression } from './hooks/useExpression';
import ExpressionButtons from './components/ExpressionButtons';

export default function VectorDrawTTS() {
  // Drawing state
  const [tool, setTool] = useState('pen');
  const [mode, setMode] = useState('draw');
  const [color, setColor] = useState('#000000');
  const [penSize, setPenSize] = useState(3);
  const [brushStyle, setBrushStyle] = useState('solid');
  const [paths, setPaths] = useState([]);
  const [pathHistory, setPathHistory] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageOpacity, setImageOpacity] = useState(0.5);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Animation state (from hook)
  const {
    mouthOpenAmount,
    blinkAmount,
    pupilOffsetX,
    pupilOffsetY,
    currentExpression,
    isTransitioning,
    setMouthOpenAmount,
    setBlinkAmount,
    setPupilOffsetX,
    setPupilOffsetY,
    animateToExpression,
  } = useExpression();
  
  // TTS state
  const [text, setText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Training state
  const [trainingCount, setTrainingCount] = useState(0);
  const [modelTrained, setModelTrained] = useState(false);
  
  // Control points
  const [controlPoints, setControlPoints] = useState(INITIAL_CONTROL_POINTS);
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  const svgRef = useRef(null);

  // Load training status on mount
  useEffect(() => {
    const loadStatus = async () => {
      const raw = await store.get('trainingData');
      if (raw) setTrainingCount(JSON.parse(raw).length);
      const model = await store.get('knnModel');
      if (model) setModelTrained(true);
    };
    loadStatus();
  }, []);

  // Get brush style
  const getBrushStyle = (style) => BRUSH_STYLES[style] || 'none';

  // Mouse/Touch Handlers
  const getCoordinates = (e) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    if (mode === 'rig') return;
    
    const coords = getCoordinates(e);
    if (!coords) return;

    if (tool === 'eraser') {
      const clickedPathIndex = paths.findIndex(path => {
        if (path.type === 'circle') {
          const dist = Math.sqrt(Math.pow(coords.x - path.cx, 2) + Math.pow(coords.y - path.cy, 2));
          return dist <= path.r;
        }
        return false;
      });
      
      if (clickedPathIndex !== -1) {
        setPaths(paths.filter((_, i) => i !== clickedPathIndex));
      }
      return;
    }

    setIsDrawing(true);

    if (tool === 'pen') {
      setCurrentPath({
        type: 'path',
        d: `M ${coords.x} ${coords.y}`,
        fill: 'none',
        stroke: color,
        strokeWidth: penSize,
        brushStyle
      });
    } else if (tool === 'rect') {
      setCurrentPath({
        type: 'rect',
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        fill: 'none',
        stroke: color,
        strokeWidth: penSize
      });
    } else if (tool === 'circle') {
      setCurrentPath({
        type: 'circle',
        cx: coords.x,
        cy: coords.y,
        r: 0,
        fill: 'none',
        stroke: color,
        strokeWidth: penSize
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentPath || mode === 'rig') return;

    const coords = getCoordinates(e);
    if (!coords) return;

    if (tool === 'pen') {
      setCurrentPath({
        ...currentPath,
        d: currentPath.d + ` L ${coords.x} ${coords.y}`
      });
    } else if (tool === 'rect') {
      const width = coords.x - currentPath.x;
      const height = coords.y - currentPath.y;
      setCurrentPath({ ...currentPath, width, height });
    } else if (tool === 'circle') {
      const r = Math.sqrt(
        Math.pow(coords.x - currentPath.cx, 2) + 
        Math.pow(coords.y - currentPath.cy, 2)
      );
      setCurrentPath({ ...currentPath, r });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentPath) return;
    
    setIsDrawing(false);
    setPaths([...paths, currentPath]);
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(null);
  };

  // Undo
  const handleUndo = () => {
    if (paths.length === 0) return;
    setPaths(paths.slice(0, -1));
  };

  // Clear canvas
  const handleClear = () => {
    setPaths([]);
    setPathHistory([]);
    setCurrentPath(null);
  };

  // Image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
  };

  // Control point handlers
  const handleControlPointMouseDown = (key) => {
    if (mode !== 'rig') return;
    setSelectedPoint(key);
  };

  const handleSVGMouseMove = (e) => {
    if (!selectedPoint || mode !== 'rig') return;
    
    const coords = getCoordinates(e);
    if (!coords) return;

    setControlPoints({
      ...controlPoints,
      [selectedPoint]: coords
    });
  };

  const handleSVGMouseUp = () => {
    setSelectedPoint(null);
  };

  const resetControlPoints = () => {
    setControlPoints(INITIAL_CONTROL_POINTS);
  };

  // Auto-detect landmarks
  const autoDetectLandmarks = async () => {
    if (!uploadedImage) {
      alert('Please upload an image first!');
      return;
    }

    const img = new Image();
    img.src = uploadedImage;
    await new Promise(resolve => { img.onload = resolve; });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const darkPixels = [];
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const i = (y * imageData.width + x) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const brightness = (r + g + b) / 3;
        
        if (brightness < 100) {
          darkPixels.push({ x, y });
        }
      }
    }

    const clusters = clusterDarkRegions(darkPixels, 20);
    
    const scaleX = 800 / img.width;
    const scaleY = 600 / img.height;

    if (clusters.length >= 3) {
      const sortedByY = [...clusters].sort((a, b) => a.y - b.y);
      const topTwo = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
      
      const leftEye = topTwo[0];
      const rightEye = topTwo[1];
      const mouth = sortedByY[sortedByY.length - 1];

      setControlPoints({
        ...controlPoints,
        leftEyeCenter: { x: leftEye.x * scaleX, y: leftEye.y * scaleY },
        rightEyeCenter: { x: rightEye.x * scaleX, y: rightEye.y * scaleY },
        mouthTopCenter: { x: mouth.x * scaleX, y: (mouth.y - 10) * scaleY },
        mouthBottomCenter: { x: mouth.x * scaleX, y: (mouth.y + 10) * scaleY },
      });

      alert('Basic landmarks detected! Adjust manually for better results.');
    } else {
      alert('Could not detect enough dark regions. Try adjusting the image or place landmarks manually.');
    }
  };

  const clusterDarkRegions = (pixels, radius) => {
    const clusters = [];
    const used = new Set();

    for (const pixel of pixels) {
      if (used.has(`${pixel.x},${pixel.y}`)) continue;

      const cluster = [];
      const queue = [pixel];
      
      while (queue.length > 0) {
        const p = queue.shift();
        const key = `${p.x},${p.y}`;
        
        if (used.has(key)) continue;
        used.add(key);
        cluster.push(p);

        for (const neighbor of pixels) {
          const dist = Math.sqrt(
            Math.pow(neighbor.x - p.x, 2) + Math.pow(neighbor.y - p.y, 2)
          );
          if (dist < radius && !used.has(`${neighbor.x},${neighbor.y}`)) {
            queue.push(neighbor);
          }
        }
      }

      if (cluster.length > 50) {
        const avgX = cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length;
        const avgY = cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length;
        clusters.push({ x: avgX, y: avgY, size: cluster.length });
      }
    }

    return clusters.sort((a, b) => b.size - a.size);
  };

  // Auto-detect with k-NN
  const autoDetectLandmarksWithLearning = async () => {
    const modelRaw = await store.get('knnModel');
    if (!modelRaw) {
      alert('No trained model found. Train the classifier first!');
      return;
    }

    const model = JSON.parse(modelRaw);
    const faceBounds = getFaceBounds(controlPoints);

    const detected = { leftEye: [], rightEye: [], leftBrow: [], rightBrow: [], mouth: [] };

    for (const shape of paths) {
      const features = extractFeatures(shape, faceBounds);
      if (!features) continue;

      const label = knnPredict(features, model, 5);
      if (label !== 'other' && detected[label]) {
        detected[label].push(shape);
      }
    }

    let updates = {};

    if (detected.mouth.length > 0) {
      const mouthShapes = detected.mouth;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

      for (const shape of mouthShapes) {
        if (shape.type === 'circle') {
          minX = Math.min(minX, shape.cx - shape.r);
          maxX = Math.max(maxX, shape.cx + shape.r);
          minY = Math.min(minY, shape.cy - shape.r);
          maxY = Math.max(maxY, shape.cy + shape.r);
        }
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      updates.mouthLeftCorner = { x: minX, y: centerY };
      updates.mouthRightCorner = { x: maxX, y: centerY };
      updates.mouthTopCenter = { x: centerX, y: minY };
      updates.mouthBottomCenter = { x: centerX, y: maxY };
    }

    ['leftEye', 'rightEye'].forEach(eyeKey => {
      if (detected[eyeKey].length > 0) {
        const sorted = detected[eyeKey].sort((a, b) => a.cx - b.cx);
        const eye = sorted[0];
        const prefix = eyeKey;
        
        if (eye.type === 'circle') {
          updates[`${prefix}Center`] = { x: eye.cx, y: eye.cy };
        }
      }
    });

    if (Object.keys(updates).length > 0) {
      setControlPoints({ ...controlPoints, ...updates });
      alert(`Detected: ${Object.keys(updates).join(', ')}`);
    } else {
      alert('No facial features detected with classifier.');
    }
  };

  // Training functions
  const saveAsTrainingExample = async () => {
    const raw = await store.get('trainingData');
    const existing = raw ? JSON.parse(raw) : [];

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    if (uploadedImage) {
      const img = new Image();
      img.src = uploadedImage;
      await new Promise(resolve => { img.onload = resolve; });
      ctx.globalAlpha = imageOpacity;
      ctx.drawImage(img, 0, 0, 800, 600);
      ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);

    paths.forEach(path => {
      ctx.strokeStyle = path.stroke || '#000000';
      ctx.lineWidth = path.strokeWidth || 2;
      ctx.fillStyle = path.fill || 'none';

      if (path.type === 'path') {
        const commands = path.d.split(/(?=[ML])/);
        ctx.beginPath();
        commands.forEach(cmd => {
          const parts = cmd.trim().split(/\s+/);
          if (parts[0] === 'M') {
            ctx.moveTo(parseFloat(parts[1]), parseFloat(parts[2]));
          } else if (parts[0] === 'L') {
            ctx.lineTo(parseFloat(parts[1]), parseFloat(parts[2]));
          }
        });
        ctx.stroke();
      } else if (path.type === 'circle') {
        ctx.beginPath();
        ctx.arc(path.cx, path.cy, path.r, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (path.type === 'rect') {
        ctx.strokeRect(path.x, path.y, path.width, path.height);
      }
    });

    const imageData = canvas.toDataURL('image/png');

    const trainingExample = {
      id: Date.now(),
      paths: paths,
      controlPoints: controlPoints,
      timestamp: new Date().toISOString(),
      image: imageData,
      name: `Training Example ${existing.length + 1}`
    };

    existing.push(trainingExample);
    await store.set('trainingData', JSON.stringify(existing));
    setTrainingCount(existing.length);

    alert('Training example saved!');
  };

  const viewTrainingExamples = async () => {
    const raw = await store.get('trainingData');
    const examples = raw ? JSON.parse(raw) : [];

    if (examples.length === 0) {
      alert('No training examples saved yet.');
      return;
    }

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;overflow:auto;padding:20px;';
    
    const container = document.createElement('div');
    container.style.cssText = 'max-width:1200px;margin:0 auto;background:white;padding:20px;border-radius:8px;';
    
    container.innerHTML = `<h2 style="margin-bottom:20px;">Training Examples (${examples.length})</h2>`;
    
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:15px;';
    
    examples.forEach((ex, idx) => {
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid #ddd;padding:10px;border-radius:4px;';
      
      card.innerHTML = `
        <img src="${ex.image}" style="width:100%;height:auto;border-radius:4px;margin-bottom:8px;" />
        <p style="font-size:12px;color:#666;margin:4px 0;">${new Date(ex.timestamp).toLocaleString()}</p>
        <button class="load-btn" data-idx="${idx}" style="margin-right:8px;padding:4px 8px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;">Load to Canvas</button>
        <button class="delete-btn" data-idx="${idx}" style="padding:4px 8px;background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;">Delete</button>
      `;
      grid.appendChild(card);
    });
    
    container.appendChild(grid);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'margin-top:20px;padding:8px 16px;background:#666;color:white;border:none;border-radius:4px;cursor:pointer;';
    closeBtn.onclick = () => document.body.removeChild(modal);
    container.appendChild(closeBtn);
    
    modal.appendChild(container);
    document.body.appendChild(modal);

    grid.addEventListener('click', async (e) => {
      if (e.target.classList.contains('load-btn')) {
        const idx = parseInt(e.target.dataset.idx);
        const ex = examples[idx];
        setPaths(ex.paths);
        setControlPoints(ex.controlPoints);
        document.body.removeChild(modal);
      } else if (e.target.classList.contains('delete-btn')) {
        const idx = parseInt(e.target.dataset.idx);
        if (window.confirm('Are you sure you want to delete this training example?')) {
          examples.splice(idx, 1);
          await store.set('trainingData', JSON.stringify(examples));
          setTrainingCount(examples.length);
          document.body.removeChild(modal);
          viewTrainingExamples();
        }
      }
    });
  };

  const clearAllTrainingData = async () => {
    if (!window.confirm('Are you sure you want to delete ALL training examples? This cannot be undone!')) {
      return;
    }

    await store.remove('trainingData');
    await store.remove('knnModel');
    setTrainingCount(0);
    setModelTrained(false);
    alert('All training data cleared.');
  };

  const exportTrainingDataset = async () => {
    const raw = await store.get('trainingData');
    const examples = raw ? JSON.parse(raw) : [];

    if (examples.length === 0) {
      alert('No training data to export.');
      return;
    }

    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `face-training-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTrainingDataset = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        if (!Array.isArray(importedData)) {
          alert('Invalid training data format.');
          return;
        }

        const raw = await store.get('trainingData');
        const existing = raw ? JSON.parse(raw) : [];
        
        if (existing.length > 0) {
          const merge = window.confirm(`Found ${importedData.length} training examples to import.\n\nClick OK to MERGE with existing ${existing.length} examples\nClick Cancel to REPLACE all existing examples`);
          
          if (merge) {
            const combined = [...existing, ...importedData];
            await store.set('trainingData', JSON.stringify(combined));
            setTrainingCount(combined.length);
            alert(`Merged ${importedData.length} examples. Total: ${combined.length}`);
          } else {
            await store.set('trainingData', JSON.stringify(importedData));
            setTrainingCount(importedData.length);
            alert(`Replaced all data. New total: ${importedData.length}`);
          }
        } else {
          await store.set('trainingData', JSON.stringify(importedData));
          setTrainingCount(importedData.length);
          alert(`Imported ${importedData.length} training examples.`);
        }
      } catch (err) {
        alert('Error importing data: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const trainClassifier = async () => {
    const raw = await store.get('trainingData');
    const examples = raw ? JSON.parse(raw) : [];

    if (examples.length === 0) {
      alert('No training examples found. Save some examples first!');
      return;
    }

    await trainKNNClassifier(examples);
    setModelTrained(true);
    alert(`Classifier trained on ${examples.length} examples!`);
  };

  // TTS Animation
  const animateWithTTS = () => {
    if (!text.trim()) {
      alert('Please enter some text to speak!');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    setIsAnimating(true);

    let lastTime = Date.now();
    const animationInterval = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (Math.random() < 0.3) {
        setMouthOpenAmount(Math.random() * 0.8 + 0.2);
      }

      if (Math.random() < 0.05) {
        setBlinkAmount(1);
        setTimeout(() => setBlinkAmount(0), 150);
      }

      if (Math.random() < 0.1) {
        setPupilOffsetX((Math.random() - 0.5) * 10);
        setPupilOffsetY((Math.random() - 0.5) * 10);
      }
    }, 50);

    utterance.onend = () => {
      clearInterval(animationInterval);
      setMouthOpenAmount(0);
      setBlinkAmount(0);
      setPupilOffsetX(0);
      setPupilOffsetY(0);
      setIsAnimating(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Export functions
  const exportAsSVG = () => {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  ${paths.map(path => {
    if (path.type === 'path') {
      const strokeDasharray = getBrushStyle(path.brushStyle);
      return `<path d="${path.d}" fill="${path.fill}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" stroke-dasharray="${strokeDasharray}" stroke-linecap="round" stroke-linejoin="round" />`;
    } else if (path.type === 'rect') {
      return `<rect x="${path.x}" y="${path.y}" width="${path.width}" height="${path.height}" fill="${path.fill}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" />`;
    } else if (path.type === 'circle') {
      return `<circle cx="${path.cx}" cy="${path.cy}" r="${path.r}" fill="${path.fill}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" />`;
    }
    return '';
  }).join('\n  ')}
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'face-drawing.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    const data = {
      paths,
      controlPoints,
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'face-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render functions
  const renderPath = (path, index) => {
    let renderedPath = path;
    
    if (mouthOpenAmount > 0 || blinkAmount > 0 || Math.abs(pupilOffsetX) > 0.01 || Math.abs(pupilOffsetY) > 0.01) {
      renderedPath = deformPath(path, controlPoints, mouthOpenAmount, blinkAmount, EXPRESSIONS, currentExpression);
    }

    const transitionStyle = {
      transition: 'all 0.1s ease-out',
    };

    if (renderedPath.type === 'path') {
      const strokeDasharray = renderedPath.brushStyle ? getBrushStyle(renderedPath.brushStyle) : 'none';
      return (
        <path
          key={index}
          d={renderedPath.d}
          fill={renderedPath.fill}
          stroke={renderedPath.stroke}
          strokeWidth={renderedPath.strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={transitionStyle}
        />
      );
    } else if (renderedPath.type === 'rect') {
      return (
        <rect
          key={index}
          x={renderedPath.x}
          y={renderedPath.y}
          width={renderedPath.width}
          height={renderedPath.height}
          fill={renderedPath.fill}
          stroke={renderedPath.stroke}
          strokeWidth={renderedPath.strokeWidth}
          style={transitionStyle}
        />
      );
    } else if (renderedPath.type === 'circle') {
      return (
        <circle
          key={index}
          cx={renderedPath.cx}
          cy={renderedPath.cy}
          r={renderedPath.r}
          fill={renderedPath.fill}
          stroke={renderedPath.stroke}
          strokeWidth={renderedPath.strokeWidth}
          style={transitionStyle}
        />
      );
    }
  };

  const renderControlPoint = (key, point, color, label) => {
    return (
      <g key={key}>
        <circle
          cx={point.x}
          cy={point.y}
          r={6}
          fill={color}
          stroke="white"
          strokeWidth={2}
          style={{ cursor: 'move', opacity: mode === 'rig' ? 1 : 0.3 }}
          onMouseDown={() => handleControlPointMouseDown(key)}
          onTouchStart={() => handleControlPointMouseDown(key)}
        />
        <text
          x={point.x + 10}
          y={point.y - 10}
          fontSize="10"
          fill={color}
          style={{ pointerEvents: 'none', userSelect: 'none', opacity: mode === 'rig' ? 1 : 0 }}
        >
          {label}
        </text>
      </g>
    );
  };

  const renderSkeleton = () => {
    const cp = controlPoints;
    
    return (
      <g opacity={mode === 'rig' ? 0.5 : 0}>
        {/* Left Eye */}
        {renderControlPoint('leftEyeCenter', cp.leftEyeCenter, '#3b82f6', 'LE C')}
        {renderControlPoint('leftEyeTop', cp.leftEyeTop, '#60a5fa', 'LE T')}
        {renderControlPoint('leftEyeBottom', cp.leftEyeBottom, '#60a5fa', 'LE B')}
        {renderControlPoint('leftEyeInner', cp.leftEyeInner, '#60a5fa', 'LE I')}
        {renderControlPoint('leftEyeOuter', cp.leftEyeOuter, '#60a5fa', 'LE O')}
        
        {/* Right Eye */}
        {renderControlPoint('rightEyeCenter', cp.rightEyeCenter, '#3b82f6', 'RE C')}
        {renderControlPoint('rightEyeTop', cp.rightEyeTop, '#60a5fa', 'RE T')}
        {renderControlPoint('rightEyeBottom', cp.rightEyeBottom, '#60a5fa', 'RE B')}
        {renderControlPoint('rightEyeInner', cp.rightEyeInner, '#60a5fa', 'RE I')}
        {renderControlPoint('rightEyeOuter', cp.rightEyeOuter, '#60a5fa', 'RE O')}
        
        {/* Left Eyebrow */}
        {renderControlPoint('leftEyebrowInner', cp.leftEyebrowInner, '#8b5cf6', 'LB I')}
        {renderControlPoint('leftEyebrowMiddle', cp.leftEyebrowMiddle, '#8b5cf6', 'LB M')}
        {renderControlPoint('leftEyebrowOuter', cp.leftEyebrowOuter, '#8b5cf6', 'LB O')}
        
        {/* Right Eyebrow */}
        {renderControlPoint('rightEyebrowInner', cp.rightEyebrowInner, '#8b5cf6', 'RB I')}
        {renderControlPoint('rightEyebrowMiddle', cp.rightEyebrowMiddle, '#8b5cf6', 'RB M')}
        {renderControlPoint('rightEyebrowOuter', cp.rightEyebrowOuter, '#8b5cf6', 'RB O')}
        
        {/* Mouth */}
        {renderControlPoint('mouthLeftCorner', cp.mouthLeftCorner, '#ec4899', 'M LC')}
        {renderControlPoint('mouthRightCorner', cp.mouthRightCorner, '#ec4899', 'M RC')}
        {renderControlPoint('mouthTopLeft', cp.mouthTopLeft, '#f472b6', 'M TL')}
        {renderControlPoint('mouthTopCenter', cp.mouthTopCenter, '#ec4899', 'M TC')}
        {renderControlPoint('mouthTopRight', cp.mouthTopRight, '#f472b6', 'M TR')}
        {renderControlPoint('mouthBottomLeft', cp.mouthBottomLeft, '#f472b6', 'M BL')}
        {renderControlPoint('mouthBottomCenter', cp.mouthBottomCenter, '#ec4899', 'M BC')}
        {renderControlPoint('mouthBottomRight', cp.mouthBottomRight, '#f472b6', 'M BR')}
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Face Rigging Studio</h1>
        <p className="text-gray-600 mb-6">Draw, rig facial landmarks, and animate with expressions</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setMode('draw')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    mode === 'draw'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Pen className="inline mr-2" size={16} />
                  Draw
                </button>
                <button
                  onClick={() => setMode('rig')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    mode === 'rig'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Move className="inline mr-2" size={16} />
                  Rig
                </button>
                <button
                  onClick={() => setMode('animate')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    mode === 'animate'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Play className="inline mr-2" size={16} />
                  Animate
                </button>
              </div>

              <div className="border-4 border-gray-300 rounded-lg overflow-hidden bg-white">
                <svg
                  ref={svgRef}
                  width="800"
                  height="600"
                  style={{ display: 'block', touchAction: 'none' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={mode === 'rig' ? handleSVGMouseMove : handleMouseMove}
                  onMouseUp={mode === 'rig' ? handleSVGMouseUp : handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchMove={mode === 'rig' ? handleSVGMouseMove : handleMouseMove}
                  onTouchEnd={mode === 'rig' ? handleSVGMouseUp : handleMouseUp}
                >
                  {uploadedImage && (
                    <image
                      href={uploadedImage}
                      x="0"
                      y="0"
                      width="800"
                      height="600"
                      opacity={imageOpacity}
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  
                  {paths.map((path, i) => renderPath(path, i))}
                  {currentPath && renderPath(currentPath, 'current')}
                  {renderSkeleton()}
                </svg>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {mode === 'draw' && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Drawing Tools</h3>
                
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium block text-center">
                    Upload Face Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  
                  {uploadedImage && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Opacity:</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={imageOpacity}
                          onChange={(e) => setImageOpacity(parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-600">{Math.round(imageOpacity * 100)}%</span>
                      </div>
                      <button
                        onClick={removeUploadedImage}
                        className="w-full px-3 py-1.5 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200 transition-all"
                      >
                        Remove Image
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setTool('pen')}
                    className={`p-3 rounded-lg transition-all ${
                      tool === 'pen' 
                        ? 'bg-purple-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Pen size={20} />
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`p-3 rounded-lg transition-all ${
                      tool === 'eraser' 
                        ? 'bg-red-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={() => setTool('rect')}
                    className={`p-3 rounded-lg transition-all ${
                      tool === 'rect' 
                        ? 'bg-purple-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Square size={20} />
                  </button>
                  <button
                    onClick={() => setTool('circle')}
                    className={`p-3 rounded-lg transition-all ${
                      tool === 'circle' 
                        ? 'bg-purple-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Circle size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pen Size: {penSize}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={penSize}
                      onChange={(e) => setPenSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brush Style</label>
                    <select
                      value={brushStyle}
                      onChange={(e) => setBrushStyle(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                      <option value="sketch">Sketch</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleUndo}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Undo size={16} />
                    Undo
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Clear
                  </button>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={exportAsSVG}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    SVG
                  </button>
                  <button
                    onClick={exportAsJSON}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    JSON
                  </button>
                </div>
              </div>
            )}

            {mode === 'rig' && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Rigging Controls</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={autoDetectLandmarks}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium"
                  >
                    Auto-Detect Landmarks
                  </button>

                  <button
                    onClick={resetControlPoints}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium"
                  >
                    Reset to Default
                  </button>
                </div>

                <div className="mt-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <h4 className="text-sm font-medium text-purple-900 mb-2">Training Dataset:</h4>
                  <div className="flex gap-2 mb-3">
                    <div className={`text-xs px-2 py-1 rounded ${trainingCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {trainingCount} example{trainingCount !== 1 ? 's' : ''} saved
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${modelTrained ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                      {modelTrained ? 'Classifier ready' : 'Not yet trained'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={saveAsTrainingExample}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all font-medium"
                    >
                      Save as Training Example
                    </button>
                    <button
                      onClick={viewTrainingExamples}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all font-medium"
                    >
                      View Examples
                    </button>
                    <button
                      onClick={trainClassifier}
                      className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-all font-medium"
                    >
                      Train Classifier
                    </button>
                    <button
                      onClick={autoDetectLandmarksWithLearning}
                      className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-all font-medium"
                    >
                      Detect with Classifier
                    </button>
                    <button
                      onClick={exportTrainingDataset}
                      className="px-3 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-all font-medium"
                    >
                      Export Dataset
                    </button>
                    <label className="px-3 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 transition-all font-medium cursor-pointer text-center">
                      Import Dataset
                      <input
                        type="file"
                        accept="application/json"
                        onChange={importTrainingDataset}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <button
                      onClick={clearAllTrainingData}
                      className="col-span-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-all font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === 'animate' && (
              <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-800 mb-3">Animation Controls</h3>

                <ExpressionButtons
                  currentExpression={currentExpression}
                  isTransitioning={isTransitioning}
                  onExpressionChange={animateToExpression}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speech Text
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text to speak..."
                    className="w-full h-32 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
                  />
                </div>

                <button
                  onClick={animateWithTTS}
                  disabled={isAnimating}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    isAnimating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isAnimating ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      Speaking...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Animate with Speech
                    </>
                  )}
                </button>

                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Manual Controls:</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mouth Open: {(mouthOpenAmount * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={mouthOpenAmount}
                        onChange={(e) => setMouthOpenAmount(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Blink: {(blinkAmount * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={blinkAmount}
                        onChange={(e) => setBlinkAmount(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}