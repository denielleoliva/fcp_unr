import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TrainingPanel from './TrainingPanel';
import RangeControl from '../vizij/RangeControl';
import '../index.css';
import '../vizij/studio.css';
import './local.css';
function LocalTrainer() {
  const [photoMode,setPhotoMode]=useState(false), [threshold,setThreshold]=useState(242);
  const [model,setModel]=useState(null);
  return <div className="retro-desktop local-training"><main className="vizij-studio">
    <h1>FCP Local Feature Trainer</h1>
    <p className="local-intro">This separate tool runs on your computer. Select a local folder, review labels, train, and export a model for Face Studio.</p>
    <div className="studio-panel studio-toolbar"><label><input type="checkbox" checked={photoMode} onChange={e=>setPhotoMode(e.target.checked)}/> Photo cleanup (line drawings)</label><RangeControl label="Paper removal threshold" min={190} max={254} step={1} value={threshold} onChange={setThreshold} disabled={photoMode} format={String}/></div>
    <TrainingPanel photoMode={photoMode} threshold={threshold} model={model} onModel={setModel}/>
  </main></div>;
}
createRoot(document.getElementById('root')).render(<LocalTrainer/>);
