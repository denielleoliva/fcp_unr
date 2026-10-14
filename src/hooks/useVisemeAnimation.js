import { useState, useEffect, useCallback, useRef } from 'react';
import { textToVisemes, VISEMES, interpolateVisemes } from '../constants/visemes';

// Browser TTS has word boundaries, not phoneme timestamps. This is an approximate
// viseme preview; word events re-anchor the timeline when the voice supplies them.
export const useVisemeAnimation = () => {
  const [state, setState] = useState({ isAnimating: false, currentViseme: 'sil', ...VISEMES.sil });
  const frame = useRef(null), generation = useRef(0), utteranceRef = useRef(null);
  const stopAnimation = useCallback(() => {
    generation.current++;
    cancelAnimationFrame(frame.current);
    if (utteranceRef.current) {
      utteranceRef.current.onend = null; utteranceRef.current.onerror = null;
      utteranceRef.current.onstart = null; utteranceRef.current.onboundary = null;
      window.speechSynthesis?.cancel(); utteranceRef.current = null;
    }
    setState({ isAnimating: false, currentViseme: 'sil', ...VISEMES.sil });
  }, []);
  const animateText = useCallback((text, useWebSpeechAPI = true) => {
    stopAnimation();
    if (!text.trim()) return;
    const token = generation.current, sequence = textToVisemes(text);
    let start = 0, offset = 0;
    const tick = now => {
      if (generation.current !== token) return;
      const elapsed = (now - start) / 1000 + offset;
      const i = sequence.findIndex(v => elapsed >= v.startTime && elapsed < v.endTime);
      if (i < 0) {
        setState({ isAnimating: !!utteranceRef.current, currentViseme: 'sil', ...VISEMES.sil });
        if (utteranceRef.current) frame.current = requestAnimationFrame(tick);
        return;
      }
      const v = sequence[i], t = (elapsed - v.startTime) / (v.endTime - v.startTime);
      const params = sequence[i + 1] && t > .7 ? interpolateVisemes(v.viseme, sequence[i + 1].viseme, (t - .7) / .3) : v.params;
      setState({ isAnimating: true, currentViseme: v.viseme, ...params });
      frame.current = requestAnimationFrame(tick);
    };
    const begin = () => { if (generation.current === token) { start = performance.now(); frame.current = requestAnimationFrame(tick); } };
    setState({ isAnimating: true, currentViseme: 'sil', ...VISEMES.sil });
    if (useWebSpeechAPI && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text); utteranceRef.current = utterance;
      utterance.rate = 1;
      utterance.onstart = begin;
      utterance.onboundary = event => {
        if (event.name !== 'word' || generation.current !== token) return;
        const prefix = textToVisemes(text.slice(0, event.charIndex));
        offset = prefix.length ? prefix[prefix.length - 1].endTime : 0;
        start = performance.now();
      };
      utterance.onend = utterance.onerror = () => { if (generation.current === token) stopAnimation(); };
      window.speechSynthesis.speak(utterance);
    } else begin();
  }, [stopAnimation]);
  useEffect(() => () => {
    generation.current++; cancelAnimationFrame(frame.current);
    if (utteranceRef.current) { utteranceRef.current.onend = null; utteranceRef.current.onerror = null; window.speechSynthesis?.cancel(); }
  }, []);
  return { isAnimating: state.isAnimating, currentViseme: state.currentViseme, mouthOpenAmount: state.mouthOpen, mouthCurve: state.mouthCurve, lipRounding: state.lipRounding || 0, jawDrop: state.jawDrop || 0, animateText, stopAnimation };
};
