import { useState, useEffect, useCallback, useRef } from 'react';
import { textToVisemes, VISEMES, interpolateVisemes } from '../constants/visemes';

export const useVisemeAnimation = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentViseme, setCurrentViseme] = useState('sil');
  const [mouthOpenAmount, setMouthOpenAmount] = useState(0);
  const [mouthCurve, setMouthCurve] = useState(0);
  const [lipRounding, setLipRounding] = useState(0);
  const [jawDrop, setJawDrop] = useState(0);
  
  const animationFrameRef = useRef(null);
  const visemeSequenceRef = useRef([]);
  const startTimeRef = useRef(null);

  // Animate text using visemes
  const animateText = useCallback((text, useWebSpeechAPI = true) => {
    if (!text.trim()) {
      return;
    }

    // Generate viseme sequence from text
    const visemeSequence = textToVisemes(text);
    visemeSequenceRef.current = visemeSequence;
    
    setIsAnimating(true);
    startTimeRef.current = performance.now();

    // Animation loop
    const animate = (currentTime) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = (currentTime - startTimeRef.current) / 1000; // Convert to seconds
      
      // Find current viseme
      let currentVisemeData = visemeSequence.find(
        v => elapsed >= v.startTime && elapsed < v.endTime
      );

      if (!currentVisemeData) {
        // Animation complete
        setIsAnimating(false);
        setCurrentViseme('sil');
        setMouthOpenAmount(0);
        setMouthCurve(0);
        setLipRounding(0);
        setJawDrop(0);
        return;
      }

      // Calculate interpolation between current and next viseme
      const nextVisemeData = visemeSequence[visemeSequence.indexOf(currentVisemeData) + 1];
      const t = nextVisemeData 
        ? (elapsed - currentVisemeData.startTime) / (currentVisemeData.endTime - currentVisemeData.startTime)
        : 0;

      let params;
      if (nextVisemeData && t > 0.7) {
        // Start blending to next viseme in last 30% of current viseme
        const blendT = (t - 0.7) / 0.3;
        params = interpolateVisemes(currentVisemeData.viseme, nextVisemeData.viseme, blendT);
      } else {
        params = currentVisemeData.params;
      }

      // Apply viseme parameters
      setCurrentViseme(currentVisemeData.viseme);
      setMouthOpenAmount(params.mouthOpen);
      setMouthCurve(params.mouthCurve);
      setLipRounding(params.lipRounding || 0);
      setJawDrop(params.jawDrop || 0);

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Use Web Speech API if requested
    if (useWebSpeechAPI && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Add some randomness for natural feel
      utterance.rate = 0.9 + Math.random() * 0.2;
      utterance.pitch = 0.95 + Math.random() * 0.1;
      
      utterance.onend = () => {
        setTimeout(() => {
          setIsAnimating(false);
          setCurrentViseme('sil');
          setMouthOpenAmount(0);
          setMouthCurve(0);
          setLipRounding(0);
          setJawDrop(0);
          
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        }, 200);
      };

      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Stop animation
  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    setCurrentViseme('sil');
    setMouthOpenAmount(0);
    setMouthCurve(0);
    setLipRounding(0);
    setJawDrop(0);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isAnimating,
    currentViseme,
    mouthOpenAmount,
    mouthCurve,
    lipRounding,
    jawDrop,
    animateText,
    stopAnimation,
  };
};