import React, { useState, useRef, useEffect } from 'react';
import { Download, Play, Trash2, Square, Circle, Pen, Move, Save, Undo } from 'lucide-react';

export default function VectorDrawTTS() {
  const [tool, setTool] = useState('pen');
  const [mode, setMode] = useState('draw');
  const [color, setColor] = useState('#000000');
  const [penSize, setPenSize] = useState(3);
  const [brushStyle, setBrushStyle] = useState('solid'); // 'solid', 'dashed', 'dotted', 'sketch'
  const [paths, setPaths] = useState([]);
  const [pathHistory, setPathHistory] = useState([]); // For undo functionality
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
    // Eyes (5 points each - center + 4 corners for detailed eye shape)
    leftEyeCenter: { x: 250, y: 200 },
    leftEyeTop: { x: 250, y: 185 },
    leftEyeBottom: { x: 250, y: 215 },
    leftEyeInner: { x: 235, y: 200 },
    leftEyeOuter: { x: 265, y: 200 },
    
    rightEyeCenter: { x: 550, y: 200 },
    rightEyeTop: { x: 550, y: 185 },
    rightEyeBottom: { x: 550, y: 215 },
    rightEyeInner: { x: 535, y: 200 },
    rightEyeOuter: { x: 565, y: 200 },
    
    // Eyebrows (3 points each for curved brows)
    leftEyebrowInner: { x: 235, y: 150 },
    leftEyebrowMiddle: { x: 250, y: 145 },
    leftEyebrowOuter: { x: 265, y: 150 },
    
    rightEyebrowInner: { x: 535, y: 150 },
    rightEyebrowMiddle: { x: 550, y: 145 },
    rightEyebrowOuter: { x: 565, y: 150 },
    
    // Mouth (8 points for detailed mouth control)
    mouthLeftCorner: { x: 330, y: 360 },
    mouthRightCorner: { x: 470, y: 360 },
    mouthTopLeft: { x: 360, y: 340 },
    mouthTopCenter: { x: 400, y: 335 },
    mouthTopRight: { x: 440, y: 340 },
    mouthBottomLeft: { x: 360, y: 380 },
    mouthBottomCenter: { x: 400, y: 385 },
    mouthBottomRight: { x: 440, y: 380 }
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
    
    // Handle touch events
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    // Prevent default touch behavior (scrolling)
    if (e.touches) {
      e.preventDefault();
    }
    
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

    // Handle eraser
    if (tool === 'eraser') {
      handleEraser(pos);
      return;
    }

    setIsDrawing(true);
    
    if (tool === 'pen') {
      setCurrentPath({
        type: 'path',
        d: `M ${pos.x} ${pos.y}`,
        color: color,
        fill: 'none',
        stroke: color,
        strokeWidth: penSize,
        brushStyle: brushStyle
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
        strokeWidth: penSize
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
        strokeWidth: penSize
      });
    }
  };

  const handleMouseMove = (e) => {
    // Prevent default touch behavior (scrolling)
    if (e.touches) {
      e.preventDefault();
    }
    
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
      const newPaths = [...paths, currentPath];
      setPaths(newPaths);
      setPathHistory([...pathHistory, paths]); // Save current state before adding
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

  const exportAnimationHTML = () => {
    // Create standalone HTML file with animation
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Animated Face</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: #f0f0f0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
        }
        #container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 20px;
        }
        svg {
            display: block;
            max-width: 100%;
            height: auto;
        }
        #controls {
            margin-top: 20px;
            text-align: center;
        }
        textarea {
            width: 100%;
            max-width: 600px;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            resize: vertical;
        }
        button {
            margin-top: 10px;
            padding: 12px 24px;
            background: #8b5cf6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
        }
        button:hover {
            background: #7c3aed;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div id="container">
        <svg id="faceSVG" width="800" height="600" viewBox="0 0 800 600">
            <rect width="800" height="600" fill="white" />
        </svg>
        <div id="controls">
            <textarea id="textInput" rows="3" placeholder="Enter text to speak...">Hello! I am an animated face.</textarea>
            <br>
            <button id="animateBtn">Animate with Speech</button>
        </div>
    </div>

    <script>
        // Face data
        const paths = ${JSON.stringify(paths)};
        const controlPoints = ${JSON.stringify(controlPoints)};
        
        // Animation state
        let isAnimating = false;
        let mouthOpenAmount = 0;
        let blinkAmount = 0;
        let pupilOffsetX = 0;
        let pupilOffsetY = 0;

        // Get path animation type
        function getPathAnimationType(path) {
            const cp = controlPoints;
            let pathCenterX, pathCenterY;
            
            if (path.type === 'circle') {
                pathCenterX = path.cx;
                pathCenterY = path.cy;
            } else if (path.type === 'rect') {
                pathCenterX = path.x + path.width / 2;
                pathCenterY = path.y + path.height / 2;
            } else if (path.type === 'path') {
                const points = [];
                const commands = path.d.match(/[ML]\\s*([\\d.]+)\\s+([\\d.]+)/g);
                if (commands) {
                    commands.forEach(cmd => {
                        const match = cmd.match(/([\\d.]+)\\s+([\\d.]+)/);
                        if (match) {
                            points.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
                        }
                    });
                }
                if (points.length === 0) return null;
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

            const distToLeftEye = distanceToPoint(cp.leftEye.x, cp.leftEye.y);
            const distToRightEye = distanceToPoint(cp.rightEye.x, cp.rightEye.y);
            
            if (distToLeftEye < 15) return { type: 'leftPupil', eyeX: cp.leftEye.x, eyeY: cp.leftEye.y };
            if (distToRightEye < 15) return { type: 'rightPupil', eyeX: cp.rightEye.x, eyeY: cp.rightEye.y };
            if (distToLeftEye < 40) return { type: 'leftEye', eyeX: cp.leftEye.x, eyeY: cp.leftEye.y };
            if (distToRightEye < 40) return { type: 'rightEye', eyeX: cp.rightEye.x, eyeY: cp.rightEye.y };

            const mouthCenterX = (cp.mouthLeft.x + cp.mouthRight.x) / 2;
            const mouthCenterY = (cp.mouthTop.y + cp.mouthBottom.y) / 2;
            const distToMouth = distanceToPoint(mouthCenterX, mouthCenterY);
            
            if (distToMouth < 120) return { type: 'mouth', centerX: pathCenterX, centerY: pathCenterY };

            const distToLeftBrow = distanceToPoint(cp.leftEyebrow.x, cp.leftEyebrow.y);
            const distToRightBrow = distanceToPoint(cp.rightEyebrow.x, cp.rightEyebrow.y);
            
            if (distToLeftBrow < 60 || distToRightBrow < 60) return { type: 'eyebrow' };

            return null;
        }

        // Render animated path
        function renderAnimatedPath(path, svg) {
            const animInfo = getPathAnimationType(path);
            let animatedPath = { ...path };
            
            if (animInfo && isAnimating) {
                if (animInfo.type === 'mouth' && mouthOpenAmount > 0) {
                    const scaleY = 1 + (mouthOpenAmount * 0.8);
                    if (path.type === 'circle') {
                        animatedPath.r = path.r * scaleY;
                    } else if (path.type === 'rect') {
                        const newHeight = path.height * scaleY;
                        const heightDiff = newHeight - path.height;
                        animatedPath.y = path.y - heightDiff / 2;
                        animatedPath.height = newHeight;
                    } else if (path.type === 'path') {
                        const centerY = animInfo.centerY;
                        const commands = path.d.match(/[ML]\\s*([\\d.]+)\\s+([\\d.]+)/g);
                        if (commands) {
                            let newD = '';
                            commands.forEach(cmd => {
                                const match = cmd.match(/([ML])\\s*([\\d.]+)\\s+([\\d.]+)/);
                                if (match) {
                                    const command = match[1];
                                    const x = parseFloat(match[2]);
                                    const y = parseFloat(match[3]);
                                    const scaledY = centerY + (y - centerY) * scaleY;
                                    newD += command + ' ' + x + ' ' + scaledY + ' ';
                                }
                            });
                            animatedPath.d = newD.trim();
                        }
                    }
                } else if (animInfo.type === 'eyebrow' && mouthOpenAmount > 0) {
                    const translateY = -5 * mouthOpenAmount;
                    if (path.type === 'circle') {
                        animatedPath.cy = path.cy + translateY;
                    } else if (path.type === 'rect') {
                        animatedPath.y = path.y + translateY;
                    } else if (path.type === 'path') {
                        const commands = path.d.match(/[ML]\\s*([\\d.]+)\\s+([\\d.]+)/g);
                        if (commands) {
                            let newD = '';
                            commands.forEach(cmd => {
                                const match = cmd.match(/([ML])\\s*([\\d.]+)\\s+([\\d.]+)/);
                                if (match) {
                                    const command = match[1];
                                    const x = parseFloat(match[2]);
                                    const y = parseFloat(match[3]) + translateY;
                                    newD += command + ' ' + x + ' ' + y + ' ';
                                }
                            });
                            animatedPath.d = newD.trim();
                        }
                    }
                } else if ((animInfo.type === 'leftEye' || animInfo.type === 'rightEye') && blinkAmount > 0) {
                    const scaleY = 1 - (blinkAmount * 0.9);
                    if (path.type === 'circle') {
                        animatedPath.r = path.r * scaleY;
                    } else if (path.type === 'rect') {
                        const newHeight = path.height * scaleY;
                        const heightDiff = path.height - newHeight;
                        animatedPath.y = path.y + heightDiff / 2;
                        animatedPath.height = newHeight;
                    } else if (path.type === 'path') {
                        const centerY = animInfo.eyeY;
                        const commands = path.d.match(/[ML]\\s*([\\d.]+)\\s+([\\d.]+)/g);
                        if (commands) {
                            let newD = '';
                            commands.forEach(cmd => {
                                const match = cmd.match(/([ML])\\s*([\\d.]+)\\s+([\\d.]+)/);
                                if (match) {
                                    const command = match[1];
                                    const x = parseFloat(match[2]);
                                    const y = parseFloat(match[3]);
                                    const scaledY = centerY + (y - centerY) * scaleY;
                                    newD += command + ' ' + x + ' ' + scaledY + ' ';
                                }
                            });
                            animatedPath.d = newD.trim();
                        }
                    }
                } else if ((animInfo.type === 'leftPupil' || animInfo.type === 'rightPupil') && (pupilOffsetX !== 0 || pupilOffsetY !== 0)) {
                    if (path.type === 'circle') {
                        animatedPath.cx = path.cx + pupilOffsetX;
                        animatedPath.cy = path.cy + pupilOffsetY;
                    } else if (path.type === 'rect') {
                        animatedPath.x = path.x + pupilOffsetX;
                        animatedPath.y = path.y + pupilOffsetY;
                    } else if (path.type === 'path') {
                        const commands = path.d.match(/[ML]\\s*([\\d.]+)\\s+([\\d.]+)/g);
                        if (commands) {
                            let newD = '';
                            commands.forEach(cmd => {
                                const match = cmd.match(/([ML])\\s*([\\d.]+)\\s+([\\d.]+)/);
                                if (match) {
                                    const command = match[1];
                                    const x = parseFloat(match[2]) + pupilOffsetX;
                                    const y = parseFloat(match[3]) + pupilOffsetY;
                                    newD += command + ' ' + x + ' ' + y + ' ';
                                }
                            });
                            animatedPath.d = newD.trim();
                        }
                    }
                }
            }

            let element;
            if (animatedPath.type === 'path') {
                element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                element.setAttribute('d', animatedPath.d);
                element.setAttribute('fill', animatedPath.fill);
                element.setAttribute('stroke', animatedPath.stroke);
                element.setAttribute('stroke-width', animatedPath.strokeWidth);
                element.setAttribute('stroke-linecap', 'round');
                element.setAttribute('stroke-linejoin', 'round');
            } else if (animatedPath.type === 'rect') {
                element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                element.setAttribute('x', animatedPath.x);
                element.setAttribute('y', animatedPath.y);
                element.setAttribute('width', animatedPath.width);
                element.setAttribute('height', animatedPath.height);
                element.setAttribute('fill', animatedPath.fill);
                element.setAttribute('stroke', animatedPath.stroke);
                element.setAttribute('stroke-width', animatedPath.strokeWidth);
            } else if (animatedPath.type === 'circle') {
                element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                element.setAttribute('cx', animatedPath.cx);
                element.setAttribute('cy', animatedPath.cy);
                element.setAttribute('r', animatedPath.r);
                element.setAttribute('fill', animatedPath.fill);
                element.setAttribute('stroke', animatedPath.stroke);
                element.setAttribute('stroke-width', animatedPath.strokeWidth);
            }
            
            element.style.transition = 'all 0.1s ease-out';
            return element;
        }

        // Render all paths
        function render() {
            const svg = document.getElementById('faceSVG');
            // Clear previous paths (keep background rect)
            while (svg.children.length > 1) {
                svg.removeChild(svg.lastChild);
            }
            
            paths.forEach(path => {
                const element = renderAnimatedPath(path, svg);
                svg.appendChild(element);
            });
        }

        // Animation functions
        function animateMouth() {
            const amplitude = 0.5 + Math.random() * 0.5;
            mouthOpenAmount = amplitude;
            render();
            setTimeout(() => {
                mouthOpenAmount = 0;
                render();
            }, 80 + Math.random() * 120);
        }

        function animateBlink() {
            blinkAmount = 1;
            render();
            setTimeout(() => {
                blinkAmount = 0;
                render();
            }, 150);
        }

        function animatePupils() {
            const maxOffset = 3;
            pupilOffsetX = (Math.random() - 0.5) * maxOffset;
            pupilOffsetY = (Math.random() - 0.5) * maxOffset;
            render();
        }

        // Animate with TTS
        function animateWithTTS() {
            const text = document.getElementById('textInput').value;
            if (!text.trim()) {
                alert('Please enter text to speak');
                return;
            }

            isAnimating = true;
            mouthOpenAmount = 0;
            blinkAmount = 0;
            pupilOffsetX = 0;
            pupilOffsetY = 0;
            
            const btn = document.getElementById('animateBtn');
            btn.disabled = true;
            btn.textContent = 'Speaking...';

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;

            let mouthInterval, blinkInterval, pupilInterval;
            
            utterance.onstart = () => {
                mouthInterval = setInterval(animateMouth, 150);
                blinkInterval = setInterval(animateBlink, 2000 + Math.random() * 2000);
                pupilInterval = setInterval(animatePupils, 1000 + Math.random() * 1000);
            };

            utterance.onend = () => {
                clearInterval(mouthInterval);
                clearInterval(blinkInterval);
                clearInterval(pupilInterval);
                isAnimating = false;
                mouthOpenAmount = 0;
                blinkAmount = 0;
                pupilOffsetX = 0;
                pupilOffsetY = 0;
                render();
                btn.disabled = false;
                btn.textContent = 'Animate with Speech';
            };

            window.speechSynthesis.speak(utterance);
        }

        // Initial render
        render();

        // Event listener
        document.getElementById('animateBtn').addEventListener('click', animateWithTTS);
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animated-face.html';
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
    setPathHistory([...pathHistory, paths]); // Save before clearing
    setPaths([]);
    setCurrentPath(null);
  };

  const undo = () => {
    if (pathHistory.length > 0) {
      const previousState = pathHistory[pathHistory.length - 1];
      setPaths(previousState);
      setPathHistory(pathHistory.slice(0, -1));
    }
  };

  const handleEraser = (pos) => {
    // Find and remove path at position
    const clickRadius = 20; // Detection radius for eraser
    
    for (let i = paths.length - 1; i >= 0; i--) {
      const path = paths[i];
      let shouldDelete = false;
      
      if (path.type === 'circle') {
        const dx = pos.x - path.cx;
        const dy = pos.y - path.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= path.r + clickRadius) shouldDelete = true;
      } else if (path.type === 'rect') {
        if (pos.x >= path.x - clickRadius && 
            pos.x <= path.x + path.width + clickRadius &&
            pos.y >= path.y - clickRadius && 
            pos.y <= path.y + path.height + clickRadius) {
          shouldDelete = true;
        }
      } else if (path.type === 'path') {
        // For paths, check if click is near any point
        const commands = path.d.match(/[ML]\s*([\d.]+)\s+([\d.]+)/g);
        if (commands) {
          for (const cmd of commands) {
            const match = cmd.match(/([\d.]+)\s+([\d.]+)/);
            if (match) {
              const px = parseFloat(match[1]);
              const py = parseFloat(match[2]);
              const dx = pos.x - px;
              const dy = pos.y - py;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= clickRadius) {
                shouldDelete = true;
                break;
              }
            }
          }
        }
      }
      
      if (shouldDelete) {
        setPathHistory([...pathHistory, paths]); // Save before erasing
        const newPaths = [...paths];
        newPaths.splice(i, 1);
        setPaths(newPaths);
        break; // Only erase one path at a time
      }
    }
  };

  const resetControlPoints = () => {
    setControlPoints({
      // Eyes (5 points each)
      leftEyeCenter: { x: 250, y: 200 },
      leftEyeTop: { x: 250, y: 185 },
      leftEyeBottom: { x: 250, y: 215 },
      leftEyeInner: { x: 235, y: 200 },
      leftEyeOuter: { x: 265, y: 200 },
      
      rightEyeCenter: { x: 550, y: 200 },
      rightEyeTop: { x: 550, y: 185 },
      rightEyeBottom: { x: 550, y: 215 },
      rightEyeInner: { x: 535, y: 200 },
      rightEyeOuter: { x: 565, y: 200 },
      
      // Eyebrows (3 points each)
      leftEyebrowInner: { x: 235, y: 150 },
      leftEyebrowMiddle: { x: 250, y: 145 },
      leftEyebrowOuter: { x: 265, y: 150 },
      
      rightEyebrowInner: { x: 535, y: 150 },
      rightEyebrowMiddle: { x: 550, y: 145 },
      rightEyebrowOuter: { x: 565, y: 150 },
      
      // Mouth (8 points)
      mouthLeftCorner: { x: 330, y: 360 },
      mouthRightCorner: { x: 470, y: 360 },
      mouthTopLeft: { x: 360, y: 340 },
      mouthTopCenter: { x: 400, y: 335 },
      mouthTopRight: { x: 440, y: 340 },
      mouthBottomLeft: { x: 360, y: 380 },
      mouthBottomCenter: { x: 400, y: 385 },
      mouthBottomRight: { x: 440, y: 380 }
    });
  };

  const autoDetectLandmarks = () => {
    if (paths.length === 0) {
      alert('Please draw something first!');
      return;
    }

    // Analyze all paths to find bounding boxes and centroids
    const pathData = paths.map(path => {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let points = [];

      if (path.type === 'circle') {
        minX = path.cx - path.r;
        maxX = path.cx + path.r;
        minY = path.cy - path.r;
        maxY = path.cy + path.r;
        points = [{ x: path.cx, y: path.cy }];
      } else if (path.type === 'rect') {
        minX = path.x;
        maxX = path.x + path.width;
        minY = path.y;
        maxY = path.y + path.height;
        points = [{ x: path.x + path.width / 2, y: path.y + path.height / 2 }];
      } else if (path.type === 'path') {
        const commands = path.d.match(/[ML]\s*([\d.]+)\s+([\d.]+)/g);
        if (commands) {
          commands.forEach(cmd => {
            const match = cmd.match(/([\d.]+)\s+([\d.]+)/);
            if (match) {
              const x = parseFloat(match[1]);
              const y = parseFloat(match[2]);
              points.push({ x, y });
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          });
        }
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const width = maxX - minX;
      const height = maxY - minY;
      const area = width * height;
      const aspectRatio = width / height;

      return {
        path,
        centerX,
        centerY,
        minX,
        maxX,
        minY,
        maxY,
        width,
        height,
        area,
        aspectRatio,
        points
      };
    });

    // Find overall bounding box
    const allMinX = Math.min(...pathData.map(p => p.minX));
    const allMaxX = Math.max(...pathData.map(p => p.maxX));
    const allMinY = Math.min(...pathData.map(p => p.minY));
    const allMaxY = Math.max(...pathData.map(p => p.maxY));
    
    const faceWidth = allMaxX - allMinX;
    const faceHeight = allMaxY - allMinY;
    const faceCenterX = (allMinX + allMaxX) / 2;
    const faceCenterY = (allMinY + allMaxY) / 2;

    // Divide face into regions
    const topThird = allMinY + faceHeight * 0.33;
    const middleThird = allMinY + faceHeight * 0.66;

    // Find potential eyes - improved criteria
    const potentialEyes = pathData.filter(p => {
      // Must be in upper third of face
      const inUpperRegion = p.centerY < topThird + faceHeight * 0.15;
      
      // Reasonable eye size (not too big or small)
      const reasonableSize = p.width > 15 && p.width < faceWidth * 0.4 && 
                            p.height > 10 && p.height < faceHeight * 0.3;
      
      // Aspect ratio close to circular/oval (0.5 to 2.0)
      const goodAspectRatio = p.aspectRatio > 0.5 && p.aspectRatio < 2.0;
      
      // Prefer circles, but accept reasonable closed paths
      const goodType = p.path.type === 'circle' || 
                       (p.path.type === 'path' && p.points.length > 5);
      
      return inUpperRegion && reasonableSize && goodAspectRatio && goodType;
    }).sort((a, b) => {
      // Sort by: 1) How centered horizontally, 2) Similar Y position, 3) Similar size
      const aCenteredness = Math.abs(a.centerX - faceCenterX);
      const bCenteredness = Math.abs(b.centerX - faceCenterX);
      return aCenteredness - bCenteredness;
    });

    // If we have potential eyes, pick the two that are:
    // 1. Most horizontally separated
    // 2. At similar Y heights
    // 3. Similar sizes
    let leftEye = null;
    let rightEye = null;
    
    if (potentialEyes.length >= 2) {
      // Find pairs that are well-separated horizontally and aligned vertically
      let bestPair = null;
      let bestScore = -1;
      
      for (let i = 0; i < potentialEyes.length; i++) {
        for (let j = i + 1; j < potentialEyes.length; j++) {
          const eye1 = potentialEyes[i];
          const eye2 = potentialEyes[j];
          
          // Calculate horizontal separation
          const separation = Math.abs(eye1.centerX - eye2.centerX);
          
          // Calculate vertical alignment (prefer eyes at similar heights)
          const yDiff = Math.abs(eye1.centerY - eye2.centerY);
          
          // Calculate size similarity
          const sizeDiff = Math.abs(eye1.area - eye2.area);
          const avgArea = (eye1.area + eye2.area) / 2;
          const sizeRatio = sizeDiff / avgArea;
          
          // Good separation (at least 20% of face width)
          const goodSeparation = separation > faceWidth * 0.2;
          
          // Good alignment (Y difference less than 15% of face height)
          const goodAlignment = yDiff < faceHeight * 0.15;
          
          // Similar sizes (size difference less than 50% of average)
          const similarSize = sizeRatio < 0.5;
          
          if (goodSeparation && goodAlignment && similarSize) {
            // Score based on separation (prefer wider apart) and alignment
            const score = separation - (yDiff * 2) - (sizeDiff * 0.1);
            
            if (score > bestScore) {
              bestScore = score;
              // Assign left/right based on X position
              if (eye1.centerX < eye2.centerX) {
                bestPair = { left: eye1, right: eye2 };
              } else {
                bestPair = { left: eye2, right: eye1 };
              }
            }
          }
        }
      }
      
      if (bestPair) {
        leftEye = bestPair.left;
        rightEye = bestPair.right;
      } else if (potentialEyes.length >= 2) {
        // Fallback: just use the two leftmost and rightmost
        const sorted = [...potentialEyes].sort((a, b) => a.centerX - b.centerX);
        leftEye = sorted[0];
        rightEye = sorted[sorted.length - 1];
      }
    } else if (potentialEyes.length === 1) {
      // Only one eye found
      const eye = potentialEyes[0];
      if (eye.centerX < faceCenterX) {
        leftEye = eye;
      } else {
        rightEye = eye;
      }
    }

    // Find potential eyebrows (above eyes, horizontal shapes)
    const potentialEyebrows = pathData.filter(p =>
      p.centerY < topThird &&
      p.centerY > allMinY - 50 &&
      p.width > p.height && // More horizontal than vertical
      p.width > 20 // Reasonable minimum width
    ).sort((a, b) => a.centerX - b.centerX);

    // Find potential mouth (lower third, larger horizontal shape)
    const potentialMouths = pathData.filter(p =>
      p.centerY > middleThird &&
      p.width > 40 && // Reasonable minimum width
      p.width > p.height // More horizontal than vertical
    ).sort((a, b) => b.width - a.width); // Sort by width (largest first)

    const newControlPoints = { ...controlPoints };

    // Set eyes
    if (leftEye) {
      newControlPoints.leftEyeCenter = { x: leftEye.centerX, y: leftEye.centerY };
      newControlPoints.leftEyeTop = { x: leftEye.centerX, y: leftEye.minY };
      newControlPoints.leftEyeBottom = { x: leftEye.centerX, y: leftEye.maxY };
      newControlPoints.leftEyeInner = { x: leftEye.minX, y: leftEye.centerY };
      newControlPoints.leftEyeOuter = { x: leftEye.maxX, y: leftEye.centerY };
    }
    
    if (rightEye) {
      newControlPoints.rightEyeCenter = { x: rightEye.centerX, y: rightEye.centerY };
      newControlPoints.rightEyeTop = { x: rightEye.centerX, y: rightEye.minY };
      newControlPoints.rightEyeBottom = { x: rightEye.centerX, y: rightEye.maxY };
      newControlPoints.rightEyeInner = { x: rightEye.minX, y: rightEye.centerY };
      newControlPoints.rightEyeOuter = { x: rightEye.maxX, y: rightEye.centerY };
    }

    // Set eyebrows
    if (potentialEyebrows.length >= 2) {
      const leftBrow = potentialEyebrows[0];
      const rightBrow = potentialEyebrows[1];
      
      // Left eyebrow
      newControlPoints.leftEyebrowInner = { x: leftBrow.minX, y: leftBrow.centerY };
      newControlPoints.leftEyebrowMiddle = { x: leftBrow.centerX, y: leftBrow.minY };
      newControlPoints.leftEyebrowOuter = { x: leftBrow.maxX, y: leftBrow.centerY };
      
      // Right eyebrow
      newControlPoints.rightEyebrowInner = { x: rightBrow.minX, y: rightBrow.centerY };
      newControlPoints.rightEyebrowMiddle = { x: rightBrow.centerX, y: rightBrow.minY };
      newControlPoints.rightEyebrowOuter = { x: rightBrow.maxX, y: rightBrow.centerY };
    } else if (potentialEyebrows.length === 1) {
      const brow = potentialEyebrows[0];
      if (brow.centerX < faceCenterX) {
        // Left eyebrow
        newControlPoints.leftEyebrowInner = { x: brow.minX, y: brow.centerY };
        newControlPoints.leftEyebrowMiddle = { x: brow.centerX, y: brow.minY };
        newControlPoints.leftEyebrowOuter = { x: brow.maxX, y: brow.centerY };
      } else {
        // Right eyebrow
        newControlPoints.rightEyebrowInner = { x: brow.minX, y: brow.centerY };
        newControlPoints.rightEyebrowMiddle = { x: brow.centerX, y: brow.minY };
        newControlPoints.rightEyebrowOuter = { x: brow.maxX, y: brow.centerY };
      }
    }

    // Set mouth
    if (potentialMouths.length > 0) {
      const mouth = potentialMouths[0];
      
      newControlPoints.mouthLeftCorner = { x: mouth.minX, y: mouth.centerY };
      newControlPoints.mouthRightCorner = { x: mouth.maxX, y: mouth.centerY };
      
      const mouthThirdWidth = mouth.width / 3;
      newControlPoints.mouthTopLeft = { x: mouth.minX + mouthThirdWidth, y: mouth.minY };
      newControlPoints.mouthTopCenter = { x: mouth.centerX, y: mouth.minY };
      newControlPoints.mouthTopRight = { x: mouth.maxX - mouthThirdWidth, y: mouth.minY };
      
      newControlPoints.mouthBottomLeft = { x: mouth.minX + mouthThirdWidth, y: mouth.maxY };
      newControlPoints.mouthBottomCenter = { x: mouth.centerX, y: mouth.maxY };
      newControlPoints.mouthBottomRight = { x: mouth.maxX - mouthThirdWidth, y: mouth.maxY };
    }

    setControlPoints(newControlPoints);
    setMode('rig'); // Switch to rig mode to show results
    
    // Provide feedback
    const detected = [];
    if (leftEye && rightEye) detected.push('both eyes');
    else if (leftEye || rightEye) detected.push('one eye');
    if (potentialEyebrows.length > 0) detected.push('eyebrows');
    if (potentialMouths.length > 0) detected.push('mouth');
    
    if (detected.length > 0) {
      alert(`Detected: ${detected.join(', ')}. You can now adjust the points manually in Rig mode if needed.`);
    } else {
      alert('Could not detect facial features. Try making your eyes more circular and distinct from each other.');
    }
  };

  const getBrushStyle = (brushStyle) => {
    switch(brushStyle) {
      case 'dashed':
        return '10,5';
      case 'dotted':
        return '2,4';
      case 'sketch':
        return '8,3,2,3';
      default:
        return 'none';
    }
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

    // Check for pupils (very close to eye center)
    const distToLeftEyeCenter = distanceToPoint(cp.leftEyeCenter.x, cp.leftEyeCenter.y);
    const distToRightEyeCenter = distanceToPoint(cp.rightEyeCenter.x, cp.rightEyeCenter.y);
    
    if (distToLeftEyeCenter < 15) {
      return { type: 'leftPupil', eyeX: cp.leftEyeCenter.x, eyeY: cp.leftEyeCenter.y };
    }
    if (distToRightEyeCenter < 15) {
      return { type: 'rightPupil', eyeX: cp.rightEyeCenter.x, eyeY: cp.rightEyeCenter.y };
    }

    // Check for eye shapes (near any of the 5 eye points)
    const leftEyePoints = [cp.leftEyeCenter, cp.leftEyeTop, cp.leftEyeBottom, cp.leftEyeInner, cp.leftEyeOuter];
    const rightEyePoints = [cp.rightEyeCenter, cp.rightEyeTop, cp.rightEyeBottom, cp.rightEyeInner, cp.rightEyeOuter];
    
    for (const point of leftEyePoints) {
      if (distanceToPoint(point.x, point.y) < 40) {
        return { type: 'leftEye', eyeX: cp.leftEyeCenter.x, eyeY: cp.leftEyeCenter.y };
      }
    }
    
    for (const point of rightEyePoints) {
      if (distanceToPoint(point.x, point.y) < 40) {
        return { type: 'rightEye', eyeX: cp.rightEyeCenter.x, eyeY: cp.rightEyeCenter.y };
      }
    }

    // Check for mouth (near any of the 8 mouth points)
    const mouthPoints = [
      cp.mouthLeftCorner, cp.mouthRightCorner,
      cp.mouthTopLeft, cp.mouthTopCenter, cp.mouthTopRight,
      cp.mouthBottomLeft, cp.mouthBottomCenter, cp.mouthBottomRight
    ];
    
    // Calculate mouth center from all points
    const mouthCenterX = mouthPoints.reduce((sum, p) => sum + p.x, 0) / mouthPoints.length;
    const mouthCenterY = mouthPoints.reduce((sum, p) => sum + p.y, 0) / mouthPoints.length;
    
    for (const point of mouthPoints) {
      if (distanceToPoint(point.x, point.y) < 60) {
        return { type: 'mouth', centerX: pathCenterX, centerY: pathCenterY };
      }
    }

    // Check for eyebrows (near any of the 3 eyebrow points)
    const leftBrowPoints = [cp.leftEyebrowInner, cp.leftEyebrowMiddle, cp.leftEyebrowOuter];
    const rightBrowPoints = [cp.rightEyebrowInner, cp.rightEyebrowMiddle, cp.rightEyebrowOuter];
    
    for (const point of leftBrowPoints) {
      if (distanceToPoint(point.x, point.y) < 40) {
        return { type: 'eyebrow' };
      }
    }
    
    for (const point of rightBrowPoints) {
      if (distanceToPoint(point.x, point.y) < 40) {
        return { type: 'eyebrow' };
      }
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
      const strokeDasharray = animatedPath.brushStyle ? getBrushStyle(animatedPath.brushStyle) : 'none';
      return (
        <path
          key={index}
          d={animatedPath.d}
          fill={animatedPath.fill}
          stroke={animatedPath.stroke}
          strokeWidth={animatedPath.strokeWidth}
          strokeDasharray={strokeDasharray}
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
        {/* Connection lines */}
        <g stroke="#64748b" strokeWidth="2" strokeDasharray="5,5" opacity="0.5">
          {/* Left eye shape */}
          <line x1={cp.leftEyeCenter.x} y1={cp.leftEyeCenter.y} x2={cp.leftEyeTop.x} y2={cp.leftEyeTop.y} />
          <line x1={cp.leftEyeCenter.x} y1={cp.leftEyeCenter.y} x2={cp.leftEyeBottom.x} y2={cp.leftEyeBottom.y} />
          <line x1={cp.leftEyeCenter.x} y1={cp.leftEyeCenter.y} x2={cp.leftEyeInner.x} y2={cp.leftEyeInner.y} />
          <line x1={cp.leftEyeCenter.x} y1={cp.leftEyeCenter.y} x2={cp.leftEyeOuter.x} y2={cp.leftEyeOuter.y} />
          
          {/* Right eye shape */}
          <line x1={cp.rightEyeCenter.x} y1={cp.rightEyeCenter.y} x2={cp.rightEyeTop.x} y2={cp.rightEyeTop.y} />
          <line x1={cp.rightEyeCenter.x} y1={cp.rightEyeCenter.y} x2={cp.rightEyeBottom.x} y2={cp.rightEyeBottom.y} />
          <line x1={cp.rightEyeCenter.x} y1={cp.rightEyeCenter.y} x2={cp.rightEyeInner.x} y2={cp.rightEyeInner.y} />
          <line x1={cp.rightEyeCenter.x} y1={cp.rightEyeCenter.y} x2={cp.rightEyeOuter.x} y2={cp.rightEyeOuter.y} />
          
          {/* Left eyebrow curve */}
          <line x1={cp.leftEyebrowInner.x} y1={cp.leftEyebrowInner.y} x2={cp.leftEyebrowMiddle.x} y2={cp.leftEyebrowMiddle.y} />
          <line x1={cp.leftEyebrowMiddle.x} y1={cp.leftEyebrowMiddle.y} x2={cp.leftEyebrowOuter.x} y2={cp.leftEyebrowOuter.y} />
          
          {/* Right eyebrow curve */}
          <line x1={cp.rightEyebrowInner.x} y1={cp.rightEyebrowInner.y} x2={cp.rightEyebrowMiddle.x} y2={cp.rightEyebrowMiddle.y} />
          <line x1={cp.rightEyebrowMiddle.x} y1={cp.rightEyebrowMiddle.y} x2={cp.rightEyebrowOuter.x} y2={cp.rightEyebrowOuter.y} />
          
          {/* Eyebrow to eye connections */}
          <line x1={cp.leftEyebrowMiddle.x} y1={cp.leftEyebrowMiddle.y} x2={cp.leftEyeCenter.x} y2={cp.leftEyeCenter.y} />
          <line x1={cp.rightEyebrowMiddle.x} y1={cp.rightEyebrowMiddle.y} x2={cp.rightEyeCenter.x} y2={cp.rightEyeCenter.y} />
          
          {/* Mouth outline */}
          <line x1={cp.mouthLeftCorner.x} y1={cp.mouthLeftCorner.y} x2={cp.mouthTopLeft.x} y2={cp.mouthTopLeft.y} />
          <line x1={cp.mouthTopLeft.x} y1={cp.mouthTopLeft.y} x2={cp.mouthTopCenter.x} y2={cp.mouthTopCenter.y} />
          <line x1={cp.mouthTopCenter.x} y1={cp.mouthTopCenter.y} x2={cp.mouthTopRight.x} y2={cp.mouthTopRight.y} />
          <line x1={cp.mouthTopRight.x} y1={cp.mouthTopRight.y} x2={cp.mouthRightCorner.x} y2={cp.mouthRightCorner.y} />
          <line x1={cp.mouthRightCorner.x} y1={cp.mouthRightCorner.y} x2={cp.mouthBottomRight.x} y2={cp.mouthBottomRight.y} />
          <line x1={cp.mouthBottomRight.x} y1={cp.mouthBottomRight.y} x2={cp.mouthBottomCenter.x} y2={cp.mouthBottomCenter.y} />
          <line x1={cp.mouthBottomCenter.x} y1={cp.mouthBottomCenter.y} x2={cp.mouthBottomLeft.x} y2={cp.mouthBottomLeft.y} />
          <line x1={cp.mouthBottomLeft.x} y1={cp.mouthBottomLeft.y} x2={cp.mouthLeftCorner.x} y2={cp.mouthLeftCorner.y} />
          
          {/* Face midline */}
          <line x1={(cp.leftEyeCenter.x + cp.rightEyeCenter.x) / 2} y1={cp.leftEyeCenter.y} 
                x2={(cp.mouthTopCenter.x + cp.mouthBottomCenter.x) / 2} y2={(cp.mouthTopCenter.y + cp.mouthBottomCenter.y) / 2} />
        </g>

        {/* Left Eye Control Points */}
        {renderControlPoint('leftEyeCenter', cp.leftEyeCenter, '#3b82f6', 'LE C')}
        {renderControlPoint('leftEyeTop', cp.leftEyeTop, '#60a5fa', 'LE T')}
        {renderControlPoint('leftEyeBottom', cp.leftEyeBottom, '#60a5fa', 'LE B')}
        {renderControlPoint('leftEyeInner', cp.leftEyeInner, '#60a5fa', 'LE I')}
        {renderControlPoint('leftEyeOuter', cp.leftEyeOuter, '#60a5fa', 'LE O')}
        
        {/* Right Eye Control Points */}
        {renderControlPoint('rightEyeCenter', cp.rightEyeCenter, '#3b82f6', 'RE C')}
        {renderControlPoint('rightEyeTop', cp.rightEyeTop, '#60a5fa', 'RE T')}
        {renderControlPoint('rightEyeBottom', cp.rightEyeBottom, '#60a5fa', 'RE B')}
        {renderControlPoint('rightEyeInner', cp.rightEyeInner, '#60a5fa', 'RE I')}
        {renderControlPoint('rightEyeOuter', cp.rightEyeOuter, '#60a5fa', 'RE O')}
        
        {/* Left Eyebrow Control Points */}
        {renderControlPoint('leftEyebrowInner', cp.leftEyebrowInner, '#8b5cf6', 'LB I')}
        {renderControlPoint('leftEyebrowMiddle', cp.leftEyebrowMiddle, '#8b5cf6', 'LB M')}
        {renderControlPoint('leftEyebrowOuter', cp.leftEyebrowOuter, '#8b5cf6', 'LB O')}
        
        {/* Right Eyebrow Control Points */}
        {renderControlPoint('rightEyebrowInner', cp.rightEyebrowInner, '#8b5cf6', 'RB I')}
        {renderControlPoint('rightEyebrowMiddle', cp.rightEyebrowMiddle, '#8b5cf6', 'RB M')}
        {renderControlPoint('rightEyebrowOuter', cp.rightEyebrowOuter, '#8b5cf6', 'RB O')}
        
        {/* Mouth Control Points */}
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
              <div className="space-y-3 mb-4">
                {/* Tool Selection */}
                <div className="flex items-center gap-4 flex-wrap">
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
                      onClick={() => setTool('eraser')}
                      className={`p-3 rounded-lg transition-all ${
                        tool === 'eraser' 
                          ? 'bg-red-600 text-white shadow-md' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title="Eraser Tool"
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

                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer border-2 border-gray-300"
                  />

                  <button
                    onClick={undo}
                    disabled={pathHistory.length === 0}
                    className={`p-3 rounded-lg transition-all ${
                      pathHistory.length === 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                    title="Undo"
                  >
                    <Undo size={20} />
                  </button>

                  <button
                    onClick={clearCanvas}
                    className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                    title="Clear All"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Pen Size and Brush Style */}
                <div className="flex items-center gap-6 flex-wrap bg-gray-50 p-3 rounded-lg">
                  {/* Pen Size */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Size:</label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={penSize}
                      onChange={(e) => setPenSize(parseInt(e.target.value))}
                      className="w-32"
                    />
                    <span className="text-sm font-medium text-gray-600 w-8">{penSize}px</span>
                  </div>

                  {/* Brush Style */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Brush:</label>
                    <button
                      onClick={() => setBrushStyle('solid')}
                      className={`px-3 py-1.5 text-xs rounded transition-all ${
                        brushStyle === 'solid'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      onClick={() => setBrushStyle('dashed')}
                      className={`px-3 py-1.5 text-xs rounded transition-all ${
                        brushStyle === 'dashed'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Dashed
                    </button>
                    <button
                      onClick={() => setBrushStyle('dotted')}
                      className={`px-3 py-1.5 text-xs rounded transition-all ${
                        brushStyle === 'dotted'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Dotted
                    </button>
                    <button
                      onClick={() => setBrushStyle('sketch')}
                      className={`px-3 py-1.5 text-xs rounded transition-all ${
                        brushStyle === 'sketch'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Sketch
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === 'rig' && (
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <button
                  onClick={autoDetectLandmarks}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
                >
                  🤖 Auto Detect Landmarks
                </button>
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
                  mode === 'draw' ? (tool === 'eraser' ? 'cursor-not-allowed' : 'cursor-crosshair') : 
                  mode === 'rig' ? 'cursor-grab' : 
                  'cursor-default'
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
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
              <button
                onClick={exportAnimationHTML}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                <Download size={18} />
                Export Animation
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