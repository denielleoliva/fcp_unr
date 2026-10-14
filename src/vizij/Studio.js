import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { assignFeatures, traceImage, ROLES, LABELS, asSVG } from './extract';
import { createRig, exportRig } from './rig';
import { useVisemeAnimation } from '../hooks/useVisemeAnimation';
import './studio.css';
import { RetroWindow } from './RetroDesktop';
import { blinkAt } from './naturalFeatures';
import RangeControl from './RangeControl';
import { applyFeatureModel, validateModel } from './featureModel.mjs';
const VizijPreview = lazy(() => import('./VizijPreview'));
const download = (blob, name) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const sample = [
  { type: 'circle', cx: 400, cy: 300, r: 235, fill: '#ffd26d', stroke: '#813b30', strokeWidth: 7 },
  ...[290, 510].map(cx => ({ type: 'circle', cx, cy: 250, r: 43, fill: '#75cace', stroke: '#244357', strokeWidth: 6 })),
  ...[290, 510].map(cx => ({ type: 'circle', cx, cy: 250, r: 15, fill: '#243448', stroke: 'none' })),
  { type: 'path', d: 'M 246 173 L 286 158 L 325 170', fill: 'none', stroke: '#813b30', strokeWidth: 10 },
  { type: 'path', d: 'M 473 170 L 512 158 L 550 175', fill: 'none', stroke: '#813b30', strokeWidth: 10 },
  { type: 'path', d: 'M 400 285 L 376 335 L 419 335', fill: 'none', stroke: '#e9824f', strokeWidth: 9 },
  { type: 'path', d: 'M 322 390 L 355 417 L 399 426 L 445 414 L 478 390 L 400 400 Z', fill: '#e55d79', stroke: '#8f334c', strokeWidth: 6 }
];
function Shape({ shape, ...props }) {
  const common = { fill: shape.fill, stroke: shape.stroke, strokeWidth: shape.strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', fillRule: 'evenodd', ...props };
  if (shape.type === 'circle') return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
  if (shape.type === 'rect') return <rect x={Math.min(shape.x, shape.x + shape.width)} y={Math.min(shape.y, shape.y + shape.height)} width={Math.abs(shape.width)} height={Math.abs(shape.height)} {...common} />;
  return <path d={shape.d} {...common} />;
}
class PreviewBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? <p role="alert">Preview unavailable: {this.state.error.message}. Your vectors are still available.</p> : this.props.children; }
}
export default function Studio({ paths, uploadedImage, active = true }) {
  const [featureModel, setFeatureModel] = useState(null), [useModel, setUseModel] = useState(true);
  const [shapes, setShapes] = useState([]), [selected, setSelected] = useState(null);
  const [blob, setBlob] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [natural, setNatural] = useState(true);
  const [preserve, setPreserve] = useState(true);
  const [photoMode, setPhotoMode] = useState(false);
  const [threshold, setThreshold] = useState(242), [text, setText] = useState('Hello! I am a face you made.');
  const [manual, setManual] = useState({ jaw: 0, round: 0, blink: 0, gazeX: 0, gazeY: 0, brow: 0 });
  const [idle, setIdle] = useState(true), [blink, setBlink] = useState(0);
  const mounted = useRef(true);
  const speech = useVisemeAnimation();
  const { stopAnimation } = speech;
  useEffect(() => { if (!active) stopAnimation(); }, [active, stopAnimation]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!active || !idle || !blob) return;
    let timer, frame;
    const run = () => {
      const start = performance.now();
      const tick = now => {
        setBlink(blinkAt(now - start));
        if (now - start < 240) frame = requestAnimationFrame(tick);
        else timer = setTimeout(run, 2600 + Math.random() * 1800);
      };
      frame = requestAnimationFrame(tick);
    };
    timer = setTimeout(run, 2500);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); setBlink(0); };
  }, [idle, blob, active]);
  const values = useMemo(() => ({ ...manual, jaw: speech.isAnimating ? speech.mouthOpenAmount : manual.jaw, round: speech.isAnimating ? speech.lipRounding : manual.round, blink: Math.max(manual.blink, blink) }), [manual, speech.isAnimating, speech.mouthOpenAmount, speech.lipRounding, blink]);
  const invalidate = () => { setBlob(null); speech.stopAnimation(); };
  const load = async (src, vectors = []) => {
    invalidate(); setBusy(true); setMessage('Finding colored regions…');
    try {
      const traced = src ? await traceImage(src, { threshold, photoMode }) : [];
      if (!mounted.current) return;
      const found = applyFeatureModel(assignFeatures([...traced, ...vectors]), useModel ? featureModel : null); setShapes(found); setSelected(found[0]?.id || null);
      setMessage(found.length ? `${found.length} vectors found. ${found.filter(s => s.labelSource === 'trained').length} labels from the trained detector. Review labels before rigging.` : 'No colored regions found. Try a darker drawing or adjust paper removal.');
    } catch (e) { if (mounted.current) setMessage(e.message); }
    finally { if (mounted.current) setBusy(false); }
  };
  const upload = async event => {
    const file = event.target.files[0]; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setMessage('Choose a PNG, JPEG, or WebP image.'); return; }
    if (file.size > 15 * 1024 * 1024) { setMessage('Please use an image smaller than 15 MB.'); return; }
    const url = URL.createObjectURL(file); try { await load(url); } finally { URL.revokeObjectURL(url); }
    event.target.value = '';
  };
  const importModel = async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('Model files must be under 50 MB.');
      setFeatureModel(validateModel(JSON.parse(await file.text()))); setUseModel(true);
      setMessage('Feature model loaded. Upload a drawing to apply it.');
    } catch (error) { setMessage(error.message); }
  };
  const build = async () => {
    setBusy(true); setMessage('Building Vizij geometry and speech rig…'); let rig;
    try { rig = createRig(shapes, { natural, preserve }); const result = await exportRig(rig); if (mounted.current) { setBlob(result); setMessage('Face built. Test the controls and speech, then export your Vizij GLB.'); } }
    catch (e) { if (mounted.current) setMessage(`Could not build face: ${e.message}`); }
    finally { rig?.dispose(); if (mounted.current) setBusy(false); }
  };
  const current = shapes.find(s => s.id === selected);
  const missing = ['left_eye', 'right_eye', 'mouth'].filter(r => !shapes.some(s => s.role === r));
  return <section className="vizij-studio">
    <header><div><span className="eyebrow">FACE STUDIO</span><h2>Drawing to Vizij</h2><p>Import a drawing, match its features, and make it speak.</p></div><a href="https://vizij.ai/" target="_blank" rel="noreferrer">About Vizij ↗</a></header>
    <div className="studio-toolbar"><label className="studio-button">Upload a drawing<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={upload} /></label><button disabled={busy || (!paths.length && !uploadedImage)} onClick={() => load(uploadedImage, paths)}>Use canvas drawing</button><button disabled={busy} onClick={() => { invalidate(); setShapes(assignFeatures(sample)); setSelected('shape-1'); setMessage('Example loaded. Review the feature labels, then build the face.'); }}>Try an example</button><label><input type="checkbox" checked={photoMode} onChange={e => setPhotoMode(e.target.checked)} /> Photo cleanup (line drawings)</label><RangeControl compact label="Paper removal threshold" min={190} max={254} step={1} value={threshold} onChange={setThreshold} format={v => String(v)} disabled={photoMode} /></div>
    <p className="studio-note">PNG, JPEG, or WebP · Images are traced locally. Cleanup settings apply to the next import. Use Photo cleanup for shaded paper; leave it off for solid colored fills. Clear, front-facing drawings on white paper work best.</p>
    <div className="studio-toolbar"><label className="studio-button">Load feature model<input aria-label="Load feature model" type="file" accept=".json" onChange={importModel}/></label>{featureModel && <label><input type="checkbox" checked={useModel} onChange={e => setUseModel(e.target.checked)}/> Use trained detector ({featureModel.samples.length} regions)</label>}</div>
    <div className="studio-grid"><RetroWindow title="Drawing.bmp — Feature Editor" icon="▧"><div className="vector-stage"><svg viewBox="0 0 800 600" aria-label="Extracted drawing; select a feature to label it">{shapes.map(s => <Shape key={s.id} shape={s} onClick={() => setSelected(s.id)} style={{ cursor: 'pointer' }} />)}{current && <rect x={current.bounds.x - 5} y={current.bounds.y - 5} width={Math.max(10, current.bounds.width + 10)} height={Math.max(10, current.bounds.height + 10)} fill="none" stroke="#6949e8" strokeWidth="3" strokeDasharray="8 6" pointerEvents="none" />}</svg>{!shapes.length && <div className="stage-empty">Every great face starts with a scribble.<br /><small>Upload a drawing or try the example.</small></div>}</div>
    <div className="feature-editor"><label>Vector<select value={selected || ''} onChange={e => setSelected(e.target.value)} disabled={!shapes.length}>{!shapes.length && <option value="">No vectors yet</option>}{shapes.map((s, i) => <option value={s.id} key={s.id}>{i + 1} · {LABELS[s.role]}</option>)}</select></label><label>Feature match<select disabled={!current || busy} value={current?.role || 'decoration'} onChange={e => { invalidate(); setShapes(shapes.map(s => s.id === selected ? { ...s, role: e.target.value, confidence: 1 } : s)); }}>{ROLES.map(r => <option key={r} value={r}>{LABELS[r]}</option>)}</select></label><label>Color<input aria-label="Selected vector color" type="color" disabled={!current || busy} value={(current?.fill && current.fill !== 'none' ? current.fill : current?.stroke) || '#000000'} onChange={e => { invalidate(); setShapes(shapes.map(s => s.id === selected ? { ...s, [s.fill && s.fill !== 'none' ? 'fill' : 'stroke']: e.target.value } : s)); }} /></label></div>
    <p className="studio-note">Labels are suggestions, not recognition guarantees. Left and right refer to the image. Assign all pieces of a feature to the same label.</p>{missing.length > 0 && shapes.length > 0 && <p className="warning">Still to match: {missing.map(r => LABELS[r]).join(', ')}.</p>}<label className="natural-conversion"><input type="checkbox" checked={natural} disabled={busy} onChange={e => { invalidate(); setNatural(e.target.checked); }} /> Natural mouth & eye motion</label>{natural && <label className="natural-conversion"><input type="checkbox" checked={preserve} disabled={busy} onChange={e => { invalidate(); setPreserve(e.target.checked); }} /> Keep my drawn shapes</label>}<p className="studio-note">Keep your original outlines, pupils, and toothy grin while fixing mouth closure and blinking. Uncheck “Keep my drawn shapes” for smooth converted shapes. Rebuild after changing these options.</p><button className="primary" onClick={build} disabled={busy || !shapes.length || missing.length > 0}>{busy ? 'Working…' : 'Build speaking face →'}</button></RetroWindow>
    <RetroWindow title="My Face — Vizij Player" icon="▣"><div className="runtime-stage">{blob ? <PreviewBoundary key={blob.size + shapes.map(s => s.role + s.fill + s.stroke).join('')}><Suspense fallback={<p>Loading Vizij…</p>}><VizijPreview blob={blob} values={values} /></Suspense></PreviewBoundary> : <div className="stage-empty">Your character will appear here.<br /><small>Review the features, then build the face.</small></div>}</div><label className="speech-label">Something to say<textarea value={text} maxLength={1500} onChange={e => setText(e.target.value)} /></label><div className="studio-toolbar"><button disabled={!blob || speech.isAnimating || !text.trim()} onClick={() => { setManual(v => ({ ...v, jaw: 0, round: 0 })); speech.animateText(text, true); }}>Speak</button><button disabled={!speech.isAnimating} onClick={speech.stopAnimation}>Stop</button><label><input type="checkbox" checked={idle} onChange={e => setIdle(e.target.checked)} /> Blink naturally</label></div><p className="studio-note">Speech uses your browser’s voice service; mouth timing is approximate. Current viseme: {speech.currentViseme}. {typeof window !== 'undefined' && !window.speechSynthesis && 'Audio is unavailable in this browser; preview is silent.'}</p></RetroWindow></div>
    <RetroWindow title="Face Controls & Export" icon="▤" className="controls-panel"><div className="rig-sliders">{Object.entries(manual).map(([key, value]) => <RangeControl key={key} label={({ jaw: 'Mouth open', round: 'Lip rounding', blink: 'Blink', gazeX: 'Look left / right', gazeY: 'Look down / up', brow: 'Raise brows' })[key]} min={key.startsWith('gaze') ? -1 : 0} value={value} disabled={!blob} onChange={value => setManual(prev => ({ ...prev, [key]: value }))} />)}</div><div className="studio-toolbar"><button className="primary" disabled={!blob} onClick={() => download(blob, 'drawing-face.vizij.glb')}>Export Vizij face (.glb)</button><button disabled={!shapes.length} onClick={() => download(new Blob([asSVG(shapes)], { type: 'image/svg+xml' }), 'drawing-vectors.svg')}>Export vectors</button><button disabled={!shapes.length} onClick={() => download(new Blob([JSON.stringify({ version: 1, shapes }, null, 2)], { type: 'application/json' }), 'drawing-features.json')}>Export feature map</button></div></RetroWindow><p className="studio-message" role="status">{message}</p>
  </section>;
}
