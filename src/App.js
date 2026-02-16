import React, { useState, useRef, useEffect } from 'react';
import { Download, Play, Trash2, Square, Circle, Pen, Move, Save } from 'lucide-react';

export default function VectorDrawTTS() {
  const [tool, setTool] = useState('pen');
  const [mode, setMode] = useState('draw');
  const [color, setColor] = useState('#000000');
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [text, setText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [mouthOpenAmount, setMouthOpenAmount] = useState(0);
  const [blinkAmount, setBlinkAmount] = useState(0); // 0 = open, 1 = closed
  const [pupilOffsetX, setPupilOffsetX] = useState(0);
  const [pupilOffsetY, setPupilOffsetY] = useState(0);
  const svgRef = useRef(null);

  const [controlPoints, setControlPoints] = useState({
    leftEye: { x: 300, y: 200 },
    rightEye: { x: 500, y: 200 },
    leftEyebrow: { x: 300, y: 150 },
    rightEyebrow: { x: 500, y: 150 },
    mouthLeft: { x: 350, y: 350 },
    mouthRight: { x: 450, y: 350 },
    mouthTop: { x: 400, y: 330 },
    mouthBottom: { x: 400, y: 370 }
  });

  const [draggingPoint, setDraggingPoint] = useState(null);

  // Force re-render when mouthOpenAmount changes
  useEffect(() => {
    if (isAnimating) {
      // Force component update
    }
  }, [mouthOpenAmount, isAnimating]);

  const getMousePos = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);

    if (mode === 'rig') {
      for (const [key, point] of Object.entries(controlPoints)) {
        const dx = pos.x - point.x;
        const dy = pos.y - point.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 15) {
          setDraggingPoint(key);
          return;
        }
      }
    }

    if (mode !== 'draw') return;

    setIsDrawing(true);
    
    if (tool === 'pen') {
      setCurrentPath({
        type: 'path',
        d: `M ${pos.x} ${pos.y}`,
        color: color,
        fill: 'none',
        stroke: color,
        strokeWidth: 3
      });
    } else if (tool === 'rect') {
      setCurrentPath({
        type: 'rect',
        x: pos.x,
        y: pos.y,
        startX: pos.x,
        startY: pos.y,
        width: 0,
        height: 0,
        color: color,
        fill: color,
        stroke: color,
        strokeWidth: 2
      });
    } else if (tool === 'circle') {
      setCurrentPath({
        type: 'circle',
        cx: pos.x,
        cy: pos.y,
        startX: pos.x,
        startY: pos.y,
        r: 0,
        color: color,
        fill: color,
        stroke: color,
        strokeWidth: 2
      });
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);

    if (draggingPoint) {
      setControlPoints(prev => ({
        ...prev,
        [draggingPoint]: { x: pos.x, y: pos.y }
      }));
      return;
    }

    if (!isDrawing || !currentPath || mode !== 'draw') return;

    if (tool === 'pen') {
      setCurrentPath(prev => ({
        ...prev,
        d: `${prev.d} L ${pos.x} ${pos.y}`
      }));
    } else if (tool === 'rect') {
      const width = pos.x - currentPath.startX;
      const height = pos.y - currentPath.startY;
      setCurrentPath(prev => ({
        ...prev,
        x: width < 0 ? pos.x : prev.startX,
        y: height < 0 ? pos.y : prev.startY,
        width: Math.abs(width),
        height: Math.abs(height)
      }));
    } else if (tool === 'circle') {
      const dx = pos.x - currentPath.startX;
      const dy = pos.y - currentPath.startY;
      const radius = Math.sqrt(dx * dx + dy * dy);
      setCurrentPath(prev => ({
        ...prev,
        r: radius
      }));
    }
  };

  const handleMouseUp = () => {
    if (currentPath) {
      setPaths([...paths, currentPath]);
      setCurrentPath(null);
    }
    setIsDrawing(false);
    setDraggingPoint(null);
  };

  const exportSVG = () => {
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drawing.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = {
      paths: paths,
      controlPoints: controlPoints
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'face-rigging.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const animateMouth = () => {
    const amplitude = 0.5 + Math.random() * 0.5;
    setMouthOpenAmount(amplitude);
    
    setTimeout(() => {
      setMouthOpenAmount(0);
    }, 80 + Math.random() * 120);
  };

  const animateBlink = () => {
    // Quick blink
    setBlinkAmount(1);
    setTimeout(() => {
      setBlinkAmount(0);
    }, 150);
  };

  const animatePupils = () => {
    // Random subtle eye movement
    const maxOffset = 3; // pixels
    setPupilOffsetX((Math.random() - 0.5) * maxOffset);
    setPupilOffsetY((Math.random() - 0.5) * maxOffset);
  };

  const animateWithTTS = async () => {
    if (!text.trim()) {
      alert('Please enter text to speak');
      return;
    }

    setIsAnimating(true);
    setMouthOpenAmount(0);
    setBlinkAmount(0);
    setPupilOffsetX(0);
    setPupilOffsetY(0);
    setMode('animate');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;

    let mouthIntervalId, blinkIntervalId, pupilIntervalId;
    
    utterance.onstart = () => {
      // Mouth animation
      mouthIntervalId = setInterval(() => {
        animateMouth();
      }, 150);
      
      // Random blinking (every 2-4 seconds)
      blinkIntervalId = setInterval(() => {
        animateBlink();
      }, 2000 + Math.random() * 2000);
      
      // Pupil movement (every 1-2 seconds)
      pupilIntervalId = setInterval(() => {
        animatePupils();
      }, 1000 + Math.random() * 1000);
    };

    utterance.onend = () => {
      clearInterval(mouthIntervalId);
      clearInterval(blinkIntervalId);
      clearInterval(pupilIntervalId);
      setIsAnimating(false);
      setMouthOpenAmount(0);
      setBlinkAmount(0);
      setPupilOffsetX(0);
      setPupilOffsetY(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath(null);
  };

  const resetControlPoints = () => {
    setControlPoints({
      leftEye: { x: 300, y: 200 },
      rightEye: { x: 500, y: 200 },
      leftEyebrow: { x: 300, y: 150 },
      rightEyebrow: { x: 500, y: 150 },
      mouthLeft: { x: 350, y: 350 },
      mouthRight: { x: 450, y: 350 },
      mouthTop: { x: 400, y: 330 },
      mouthBottom: { x: 400, y: 370 }
    });
  };

  const getPathAnimationType = (path) => {
    const cp = controlPoints;
    
    let pathCenterX, pathCenterY;
    if (path.type === 'circle') {
      pathCenterX = path.cx;
      pathCenterY = path.cy;
    } else if (path.type === 'rect') {
      pathCenterX = path.x + path.width / 2;
      pathCenterY = path.y + path.height / 2;
    } else if (path.type === 'path') {
      // For pen paths, calculate center from all points
      const points = [];
      const commands = path.d.match(/[ML]\s*([\d.]+)\s+([\d.]+)/g);
      
      if (commands) {
        commands.forEach(cmd => {
          const match = cmd.match(/([\d.]+)\s+([\d.]+)/);
          if (match) {
            points.push({
              x: parseFloat(match[1]),
              y: parseFloat(match[2])
            });
          }
        });
      }
      
      if (points.length === 0) return null;
      
      // Calculate bounding box center
      const minX = Math.min(...points.map(p => p.x));
      const maxX = Math.max(...points.map(p => p.x));
      const minY = Math.min(...points.map(p => p.y));
      const maxY = Math.max(...points.map(p => p.y));
      
      pathCenterX = (minX + maxX) / 2;
      pathCenterY = (minY + maxY) / 2;
    } else {
      return null;
    }

    const distanceToPoint = (px, py) => {
      const dx = pathCenterX - px;
      const dy = pathCenterY - py;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Check for pupils (inner circle, closer to eye center)
    const distToLeftEye = distanceToPoint(cp.leftEye.x, cp.leftEye.y);
    const distToRightEye = distanceToPoint(cp.rightEye.x, cp.rightEye.y);
    
    if (distToLeftEye < 15) {
      return { type: 'leftPupil', eyeX: cp.leftEye.x, eyeY: cp.leftEye.y };
    }
    if (distToRightEye < 15) {
      return { type: 'rightPupil', eyeX: cp.rightEye.x, eyeY: cp.rightEye.y };
    }

    // Check for eye shapes (outer circle, near eye but not pupil)
    if (distToLeftEye < 40) {
      return { type: 'leftEye', eyeX: cp.leftEye.x, eyeY: cp.leftEye.y };
    }
    if (distToRightEye < 40) {
      return { type: 'rightEye', eyeX: cp.rightEye.x, eyeY: cp.rightEye.y };
    }

    const mouthCenterX = (cp.mouthLeft.x + cp.mouthRight.x) / 2;
    const mouthCenterY = (cp.mouthTop.y + cp.mouthBottom.y) / 2;
    const distToMouth = distanceToPoint(mouthCenterX, mouthCenterY);
    
    if (distToMouth < 120) {
      return { type: 'mouth', centerX: pathCenterX, centerY: pathCenterY };
    }

    const distToLeftBrow = distanceToPoint(cp.leftEyebrow.x, cp.leftEyebrow.y);
    const distToRightBrow = distanceToPoint(cp.rightEyebrow.x, cp.rightEyebrow.y);
    
    if (distToLeftBrow < 60 || distToRightBrow < 60) {
      return { type: 'eyebrow' };
    }

    return null;
  };

  const renderPath = (path, index) => {
    const animInfo = getPathAnimationType(path);
    
    // Calculate animated properties directly
    let animatedPath = { ...path };
    let isAnimated = false;
    
    if (animInfo && isAnimating && (mouthOpenAmount > 0 || blinkAmount > 0 || pupilOffsetX !== 0 || pupilOffsetY !== 0)) {
      isAnimated = true;
      
      if (animInfo.type === 'mouth') {
        // For mouth animation, scale the shape
        const scaleY = 1 + (mouthOpenAmount * 0.8);
        
        if (path.type === 'circle') {
          const newR = path.r * scaleY;
          animatedPath = { ...path, r: newR };
        } else if (path.type === 'rect') {
          const newHeight = path.height * scaleY;
          const heightDiff = newHeight - path.height;
          animatedPath = { ...path, y: path.y - heightDiff / 2, height: newHeight };
        } else if (path.type === 'path') {
          const centerY = animInfo.centerY;
          const commands = path.d.match(/[ML]\s*([\d.]+)\s+([\d.]+)/g);
          
          if (commands) {
            let newD = '';
            commands.forEach((cmd) => {
              const match = cmd.match(/([ML])\s*([\d.]+)\s+([\d.]+)/);
              if (match) {
                const command = match[1];
                const x = parseFloat(match[2]);
                const y = parseFloat(match[3]);
                const scaledY = centerY + (y - centerY) * scaleY;
                newD += `${command} ${x} ${scaledY} `;
              }
            });
            animatedPath = { ...path, d: newD.trim() };
          }
        }
      } else if (animInfo.type === 'eyebrow') {
        const translateY = -5 * mouthOpenAmount;
        
        if (path.type === 'circle') {
          animatedPath = { ...path, cy: path.cy + translateY };
        } else if (path.type === 'rect') {
          animatedPath = { ...path, y: path.y + translateY };
        } else if (path.type === 'path') {
          const commands = path.d.match(/[ML]\s*([\d.]+)\s+([\d.]+)/g);
          
          if (commands) {
            let newD = '';
            commands.forEach((cmd) => {
              const match = cmd.match(/([ML])\s*([\d.]+)\s+([\d.]+)/);
              if (match) {
                const command = match[1];
                const x = parseFloat(match[2]);
                const y = parseFloat(match[3]) + translateY;
                newD += `${command} ${x} ${y} `;
              }
            });
            animatedPath = { ...path, d: newD.trim() };
          }
        }
      } else if (animInfo.type === 'leftEye' || animInfo.type === 'rightEye') {
        // Blink animation - squash eye vertically
        const scaleY = 1 - (blinkAmount * 0.9); // Almost close completely
        
        if (path.type === 'circle') {
          const centerY = path.cy;
          const newCy = centerY;
          const newR = path.r * scaleY;
          animatedPath = { ...path, cy: newCy, r: newR };
        } else if (path.type === 'rect') {
          const newHeight = path.height * scaleY;
          const heightDiff = path.height - newHeight;
          animatedPath = { ...path, y: path.y + heightDiff / 2, height: newHeight };
        } else if (path.type === 'path') {
          const centerY = animInfo.eyeY;
          const commands = path.d.match(/[ML]\s*([\d.]+)\s+([\d.]+)/g);
          
          if (commands) {
            let newD = '';
            commands.forEach((cmd) => {
              const match = cmd.match(/([ML])\s*([\d.]+)\s+([\d.]+)/);
              if (match) {
                const command = match[1];
                const x = parseFloat(match[2]);
                const y = parseFloat(match[3]);
                const scaledY = centerY + (y - centerY) * scaleY;
                newD += `${command} ${x} ${scaledY} `;
              }
            });
            animatedPath = { ...path, d: newD.trim() };
          }
        }
      } else if (animInfo.type === 'leftPupil' || animInfo.type === 'rightPupil') {
        // Pupil movement
        if (path.type === 'circle') {
          animatedPath = { 
            ...path, 
            cx: path.cx + pupilOffsetX,
            cy: path.cy + pupilOffsetY
          };
        } else if (path.type === 'rect') {
          animatedPath = { 
            ...path, 
            x: path.x + pupilOffsetX,
            y: path.y + pupilOffsetY
          };
        } else if (path.type === 'path') {
          const commands = path.d.match(/[ML]\s*([\d.]+)\s+([\d.]+)/g);
          
          if (commands) {
            let newD = '';
            commands.forEach((cmd) => {
              const match = cmd.match(/([ML])\s*([\d.]+)\s+([\d.]+)/);
              if (match) {
                const command = match[1];
                const x = parseFloat(match[2]) + pupilOffsetX;
                const y = parseFloat(match[3]) + pupilOffsetY;
                newD += `${command} ${x} ${y} `;
              }
            });
            animatedPath = { ...path, d: newD.trim() };
          }
        }
      }
    }

    // Add highlight for shapes that are being animated (debug)
    const debugHighlight = animInfo && mode === 'animate' ? {
      filter: isAnimated ? 'drop-shadow(0 0 8px rgba(255, 0, 0, 0.8))' : 'drop-shadow(0 0 4px rgba(0, 255, 0, 0.5))'
    } : {};

    const transitionStyle = {
      transition: 'all 0.1s ease-out',
      ...debugHighlight
    };

    if (animatedPath.type === 'path') {
      return (
        <path
          key={index}
          d={animatedPath.d}
          fill={animatedPath.fill}
          stroke={animatedPath.stroke}
          strokeWidth={animatedPath.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={transitionStyle}
        />
      );
    } else if (animatedPath.type === 'rect') {
      return (
        <rect
          key={index}
          x={animatedPath.x}
          y={animatedPath.y}
          width={animatedPath.width}
          height={animatedPath.height}
          fill={animatedPath.fill}
          stroke={animatedPath.stroke}
          strokeWidth={animatedPath.strokeWidth}
          style={transitionStyle}
        />
      );
    } else if (animatedPath.type === 'circle') {
      return (
        <circle
          key={index}
          cx={animatedPath.cx}
          cy={animatedPath.cy}
          r={animatedPath.r}
          fill={animatedPath.fill}
          stroke={animatedPath.stroke}
          strokeWidth={animatedPath.strokeWidth}
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
          r="12"
          fill="white"
          stroke={color}
          strokeWidth="3"
          style={{
            cursor: mode === 'rig' ? 'grab' : 'default',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}
        />
        <circle
          cx={point.x}
          cy={point.y}
          r="6"
          fill={color}
          opacity="0.8"
        />
        <text
          x={point.x}
          y={point.y - 20}
          textAnchor="middle"
          fill={color}
          fontSize="11"
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
      </g>
    );
  };

  const renderSkeleton = () => {
    if (mode !== 'rig') return null;

    const cp = controlPoints;
    
    return (
      <g>
        <g stroke="#64748b" strokeWidth="2" strokeDasharray="5,5" opacity="0.5">
          <line x1={cp.leftEyebrow.x} y1={cp.leftEyebrow.y} x2={cp.leftEye.x} y2={cp.leftEye.y} />
          <line x1={cp.rightEyebrow.x} y1={cp.rightEyebrow.y} x2={cp.rightEye.x} y2={cp.rightEye.y} />
          <line x1={cp.mouthLeft.x} y1={cp.mouthLeft.y} x2={cp.mouthTop.x} y2={cp.mouthTop.y} />
          <line x1={cp.mouthTop.x} y1={cp.mouthTop.y} x2={cp.mouthRight.x} y2={cp.mouthRight.y} />
          <line x1={cp.mouthRight.x} y1={cp.mouthRight.y} x2={cp.mouthBottom.x} y2={cp.mouthBottom.y} />
          <line x1={cp.mouthBottom.x} y1={cp.mouthBottom.y} x2={cp.mouthLeft.x} y2={cp.mouthLeft.y} />
          <line x1={(cp.leftEye.x + cp.rightEye.x) / 2} y1={cp.leftEye.y} 
                x2={(cp.mouthLeft.x + cp.mouthRight.x) / 2} y2={cp.mouthTop.y} />
        </g>

        {renderControlPoint('leftEye', cp.leftEye, '#3b82f6', 'L EYE')}
        {renderControlPoint('rightEye', cp.rightEye, '#3b82f6', 'R EYE')}
        {renderControlPoint('leftEyebrow', cp.leftEyebrow, '#8b5cf6', 'L BROW')}
        {renderControlPoint('rightEyebrow', cp.rightEyebrow, '#8b5cf6', 'R BROW')}
        {renderControlPoint('mouthLeft', cp.mouthLeft, '#ec4899', 'M LEFT')}
        {renderControlPoint('mouthRight', cp.mouthRight, '#ec4899', 'M RIGHT')}
        {renderControlPoint('mouthTop', cp.mouthTop, '#ec4899', 'M TOP')}
        {renderControlPoint('mouthBottom', cp.mouthBottom, '#ec4899', 'M BOT')}
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Face Rigging Studio</h1>
        <p className="text-gray-600 mb-6">Draw, rig with control points, and animate with speech</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setMode('draw');
                  setDraggingPoint(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  mode === 'draw'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Pen className="inline mr-2" size={18} />
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
                <Move className="inline mr-2" size={18} />
                Rig Points
              </button>
              <button
                onClick={() => setMode('animate')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  mode === 'animate'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Play className="inline mr-2" size={18} />
                Animate
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
              {mode === 'draw' && (
                <p className="text-blue-800"><strong>Draw Mode:</strong> Use the tools below to draw your face</p>
              )}
              {mode === 'rig' && (
                <p className="text-blue-800"><strong>Rig Mode:</strong> Drag the control points to position them on your drawing</p>
              )}
              {mode === 'animate' && (
                <p className="text-blue-800"><strong>Animate Mode:</strong> Enter text and click "Animate with Speech"!</p>
              )}
            </div>

            {mode === 'draw' && (
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="flex gap-2">
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

                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-12 rounded cursor-pointer border-2 border-gray-300"
                />

                <button
                  onClick={clearCanvas}
                  className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            )}

            {mode === 'rig' && (
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <button
                  onClick={resetControlPoints}
                  className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                >
                  Reset Points
                </button>
              </div>
            )}

            <div className="border-4 border-gray-300 rounded-lg overflow-hidden bg-white relative">
              {mode === 'rig' && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-10">
                  Adjust by dragging the points
                </div>
              )}
              
              <svg
                ref={svgRef}
                width="800"
                height="600"
                viewBox="0 0 800 600"
                className={`w-full h-auto ${
                  mode === 'draw' ? 'cursor-crosshair' : 
                  mode === 'rig' ? 'cursor-grab' : 
                  'cursor-default'
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ touchAction: 'none' }}
              >
                <rect width="800" height="600" fill="white" />
                
                {paths.map((path, index) => renderPath(path, index))}
                {currentPath && renderPath(currentPath, -1)}
                
                {renderSkeleton()}
              </svg>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={exportSVG}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                <Download size={18} />
                Export SVG
              </button>
              <button
                onClick={exportJSON}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              >
                <Save size={18} />
                Save Rigging
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Speech Animation</h2>
            
            <div className="mb-4">
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

            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">How to use:</h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li><strong>Draw:</strong> Create your face</li>
                <li><strong>Rig:</strong> Drag mouth points to your drawn mouth area</li>
                <li><strong>Animate:</strong> Click animate and watch!</li>
              </ol>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">
                <strong>Debug Info:</strong><br/>
                Mouth open: {(mouthOpenAmount * 100).toFixed(0)}%<br/>
                Blink: {(blinkAmount * 100).toFixed(0)}%<br/>
                Animating: {isAnimating ? 'YES' : 'NO'}<br/>
                Total shapes: {paths.length}<br/>
                Mouth: {paths.filter(p => {
                  const info = getPathAnimationType(p);
                  return info && info.type === 'mouth';
                }).length}<br/>
                Eyes: {paths.filter(p => {
                  const info = getPathAnimationType(p);
                  return info && (info.type === 'leftEye' || info.type === 'rightEye');
                }).length}<br/>
                Pupils: {paths.filter(p => {
                  const info = getPathAnimationType(p);
                  return info && (info.type === 'leftPupil' || info.type === 'rightPupil');
                }).length}<br/>
                Eyebrows: {paths.filter(p => {
                  const info = getPathAnimationType(p);
                  return info && info.type === 'eyebrow';
                }).length}
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                Green glow = detected, Red glow = animating
              </p>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Animation Zones:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>• <span className="text-pink-600">Mouth:</span> 120px from center</div>
                <div>• <span className="text-purple-600">Eyebrows:</span> 60px radius</div>
                <div>• <span className="text-blue-600">Eyes:</span> 40px from eye points</div>
                <div>• <span className="text-cyan-600">Pupils:</span> 15px from eye center</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
