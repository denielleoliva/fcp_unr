import React from 'react';
import { EXPRESSIONS } from '../constants';

const ExpressionButtons = ({ currentExpression, isTransitioning, onExpressionChange }) => {
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
      <h3 className="font-semibold text-gray-800 mb-3 text-center">6 Basic Expressions</h3>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(EXPRESSIONS).map(([key, expr]) => (
          <button
            key={key}
            onClick={() => onExpressionChange(key)}
            disabled={isTransitioning}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentExpression === key
                ? 'bg-purple-600 text-white shadow-md scale-105'
                : 'bg-white text-gray-700 hover:bg-purple-100 border-2 border-purple-200'
            } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
          >
            {expr.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-3 text-center">
        Click any expression to smoothly animate the face
      </p>
    </div>
  );
};

export default ExpressionButtons;