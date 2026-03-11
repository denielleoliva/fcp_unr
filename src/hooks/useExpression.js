import { useState } from 'react';
import { EXPRESSIONS } from '../constants';

export const useExpression = () => {
  const [mouthOpenAmount, setMouthOpenAmount] = useState(0);
  const [blinkAmount, setBlinkAmount] = useState(0);
  const [pupilOffsetX, setPupilOffsetX] = useState(0);
  const [pupilOffsetY, setPupilOffsetY] = useState(0);
  const [currentExpression, setCurrentExpression] = useState('neutral');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const animateToExpression = (expressionKey) => {
    if (isTransitioning) return;
    
    const target = EXPRESSIONS[expressionKey];
    if (!target) return;

    setIsTransitioning(true);
    setCurrentExpression(expressionKey);

    const start = {
      mouthOpen: mouthOpenAmount,
      blink: blinkAmount,
      pupilX: pupilOffsetX,
      pupilY: pupilOffsetY,
    };

    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setMouthOpenAmount(start.mouthOpen + (target.mouthOpen - start.mouthOpen) * eased);
      setBlinkAmount(start.blink + (target.blink - start.blink) * eased);
      setPupilOffsetX(start.pupilX + (target.pupilX - start.pupilX) * eased);
      setPupilOffsetY(start.pupilY + (target.pupilY - start.pupilY) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsTransitioning(false);
      }
    };

    requestAnimationFrame(animate);
  };

  return {
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
  };
};