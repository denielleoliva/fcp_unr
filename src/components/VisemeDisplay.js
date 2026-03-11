import React from 'react';
import { VISEMES } from '../constants/visemes';

const VisemeDisplay = ({ currentViseme, mouthOpenAmount, lipRounding, isAnimating }) => {
  const visemeData = VISEMES[currentViseme] || VISEMES.sil;
  
  return (
    <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800">Viseme Animation</h4>
        {isAnimating && (
          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full animate-pulse">
            Speaking
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white p-2 rounded">
          <div className="text-xs text-gray-600 mb-1">Current Viseme</div>
          <div className="text-lg font-bold text-indigo-600">{currentViseme}</div>
          <div className="text-xs text-gray-500">{visemeData.name}</div>
        </div>
        
        <div className="bg-white p-2 rounded">
          <div className="text-xs text-gray-600 mb-1">Phonemes</div>
          <div className="text-xs text-gray-700 font-mono">
            {visemeData.phonemes.join(', ')}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Mouth Open</span>
            <span>{(mouthOpenAmount * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-100"
              style={{ width: `${mouthOpenAmount * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Lip Rounding</span>
            <span>{(lipRounding * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-100"
              style={{ width: `${lipRounding * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Jaw Drop</span>
            <span>{((visemeData.jawDrop || 0) * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-pink-600 h-2 rounded-full transition-all duration-100"
              style={{ width: `${(visemeData.jawDrop || 0) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-700">
        <div className="font-semibold mb-1">Viseme Details:</div>
        <div className="space-y-1">
          {visemeData.lipsClosed && <div>• Lips closed</div>}
          {visemeData.lowerLipTucked && <div>• Lower lip tucked</div>}
          {visemeData.tongueVisible && <div>• Tongue visible</div>}
          {visemeData.teethVisible && <div>• Teeth visible</div>}
          {!visemeData.lipsClosed && !visemeData.lowerLipTucked && !visemeData.tongueVisible && !visemeData.teethVisible && (
            <div>• Standard mouth position</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisemeDisplay;