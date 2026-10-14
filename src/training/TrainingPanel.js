import React, { useState, useEffect } from 'react';
import { assignFeatures, traceImage, ROLES, LABELS } from '../vizij/extract';
import { regionFeatures, trainFeatureModel, validateDataset, validateModel } from '../vizij/featureModel.mjs';
import { RetroWindow } from '../vizij/RetroDesktop';
const empty = () => ({kind:'fcp-feature-dataset',version:1,images:[]});
const saveJSON = (value,name) => {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=document.createElement('a'); link.href=url; link.download=name; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
};
function Region({shape,...props}) {
  const common={fill:shape.fill,stroke:shape.stroke,strokeWidth:shape.strokeWidth,fillRule:'evenodd',...props};
  if(shape.type==='circle') return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common}/>;
  if(shape.type==='rect') return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...common}/>;
  return <path d={shape.d} {...common}/>;
}
export default function TrainingPanel({photoMode,threshold,onModel,model}) {
  const [dataset,setDataset]=useState(empty), [files,setFiles]=useState([]), [index,setIndex]=useState(-1);
  const [shapes,setShapes]=useState([]), [selected,setSelected]=useState(0), [current,setCurrent]=useState(null);
  const [split,setSplit]=useState('train'), [reviewed,setReviewed]=useState(false), [dirty,setDirty]=useState(false);
  const [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [report,setReport]=useState(null);
  const [sourceURL,setSourceURL]=useState('');
  useEffect(()=>{
    if(!files[index]){setSourceURL('');return;}
    const url=URL.createObjectURL(files[index]);setSourceURL(url);
    return ()=>URL.revokeObjectURL(url);
  },[files,index]);
  const begin = async (list,n) => {
    setBusy(true);setShapes([]);setCurrent(null);setReviewed(false);setDirty(false);setIndex(n);
    const file=list[n];const url=URL.createObjectURL(file);
    try {
      if(file.size>15*1024*1024) throw new Error('Image exceeds 15 MB. Skip it or resize it.');
      const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
      const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const settings={photoMode,threshold};
      const found=assignFeatures(await traceImage(url,settings));
      setShapes(found);setSelected(0);setCurrent({id,name:file.webkitRelativePath || file.name,settings});
      const previous=dataset.images.find(i=>i.id===id);
      setSplit(previous?.split || 'train');
      const extractedFeatures=regionFeatures(found);
      if(previous && JSON.stringify(previous.settings)===JSON.stringify(settings) && previous.regions.length===found.length && previous.regions.every((r,i)=>JSON.stringify(r.features)===JSON.stringify(extractedFeatures[i]))) {
        setShapes(found.map((s,i)=>({...s,role:previous.regions[i].label}))); setReviewed(true);
      }
      setMessage(`${n+1} / ${list.length}: ${file.name}. Review every region before saving.`);
    }catch(error){setMessage(error.message);}finally{URL.revokeObjectURL(url);setBusy(false);}
  };
  const choose = async event => {
    const list=Array.from(event.target.files).filter(f=>/\.(png|jpe?g|webp)$/i.test(f.name)).sort((a,b)=>(a.webkitRelativePath||a.name).localeCompare(b.webkitRelativePath||b.name));
    event.target.value='';
    if(!list.length){setMessage('No PNG, JPEG, or WebP images found.');return;}
    setFiles(list);await begin(list,0);
  };
  const save = () => {
    const features=regionFeatures(shapes);
    const image={...current,split,reviewed:true,regions:shapes.map((s,i)=>({features:features[i],label:s.role}))};
    setDataset(d=>({...d,images:[...d.images.filter(i=>i.id!==image.id),image]}));setDirty(false);setMessage('Reviewed labels saved. Export the dataset to keep your work.');
  };
  const readJSON = async (event,type) => {
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try{
      if(file.size>50*1024*1024)throw new Error('JSON files must be under 50 MB.');
      const data=JSON.parse(await file.text());
      if(type==='dataset') {
        validateDataset(data);
        setDataset(d=>({...d,images:[...d.images.filter(i=>!data.images.some(j=>j.id===i.id)),...data.images]}));
        setReport(null);setMessage('Dataset merged. Select the image folder to continue reviewing it.');
      }else{onModel(validateModel(data));setMessage('Feature model loaded. Export it for use in Face Studio.');}
    }catch(error){setMessage(error.message);}
  };
  const train=()=>{try{if(dataset.images.length>100)throw new Error('For datasets over 100 images, export annotations and use the command-line trainer.');const result=trainFeatureModel(dataset);onModel(result.model);setReport(result.report);setMessage('Model trained. Export it, then load the model in Face Studio.');}catch(error){setMessage(error.message);}};
  const selectedShape=shapes[selected];
  return <RetroWindow title="Feature Training — Dataset & Model" icon="▤">
    <p>Load a folder, correct the feature labels, and save each reviewed image. Keep some drawings in validation to measure performance on unseen images.</p>
    <div className="studio-toolbar">
      <label className="studio-button">Choose image folder<input aria-label="Choose training image folder" type="file" webkitdirectory="" multiple disabled={busy||dirty} onChange={choose}/></label>
      <label className="studio-button">Choose multiple images<input aria-label="Choose training images" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy||dirty} onChange={choose}/></label>
      <label className="studio-button">Import annotations<input aria-label="Import annotations" type="file" accept=".json" disabled={busy||dirty} onChange={e=>readJSON(e,'dataset')}/></label>
      <button disabled={!dataset.images.length||busy} onClick={()=>saveJSON(dataset,'fcp-annotations.json')}>Export annotations</button>
    </div>
    <p className="studio-note">Uses the Photo cleanup and Paper removal settings above when opening each image. Images stay on this device. Annotations and models remain in memory until exported; they contain region measurements and labels, not the original images.</p>
    {files.length>0 && <><p>{index+1} / {files.length} · {current?.name || files[index]?.name}</p><div className="studio-toolbar">
      <button disabled={busy||dirty||index<=0} onClick={()=>begin(files,index-1)}>Previous image</button>
      <button disabled={busy||dirty||index>=files.length-1} onClick={()=>begin(files,index+1)}>Next image</button>
      {dirty&&<button onClick={()=>{setDirty(false);setReviewed(false);setShapes([]);setCurrent(null);setMessage('Unsaved review discarded. Choose another image or reopen this one.');}}>Discard unsaved review</button>}
      <button disabled={busy||dirty} onClick={()=>begin(files,index)}>Reopen image</button>
    </div></>}
    {shapes.length>0 && <div className="training-layout"><figure><img src={sourceURL} alt="Original training drawing"/><figcaption>Original image</figcaption></figure><svg className="training-preview" viewBox="0 0 800 600" aria-label="Training drawing regions">{shapes.map((s,i)=><Region key={s.id} shape={s} onClick={()=>setSelected(i)} style={{cursor:'pointer'}}/>)}{selectedShape&&<rect x={selectedShape.bounds.x-4} y={selectedShape.bounds.y-4} width={selectedShape.bounds.width+8} height={selectedShape.bounds.height+8} stroke="#800080" strokeWidth="3" strokeDasharray="6 4" fill="none" pointerEvents="none"/>}</svg>
      <div className="training-fields"><label>Training region<select aria-label="Training region" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{shapes.map((s,i)=><option key={s.id} value={i}>{i+1} · {LABELS[s.role]}</option>)}</select></label>
      <label>Correct feature label<select aria-label="Correct feature label" value={selectedShape?.role} onChange={e=>{setShapes(shapes.map((s,i)=>i===selected?{...s,role:e.target.value}:s));setDirty(true);setReviewed(false);}}>{ROLES.map(r=><option key={r} value={r}>{LABELS[r]}</option>)}</select></label>
      <label>Dataset split<select value={split} onChange={e=>{setSplit(e.target.value);setDirty(true);}}><option value="train">Training</option><option value="validation">Validation (held out)</option></select></label>
      <label><input type="checkbox" checked={reviewed} onChange={e=>{setReviewed(e.target.checked);setDirty(true);}}/> I reviewed every region label</label>
      <button disabled={!reviewed||busy} onClick={save}>Save reviewed image</button></div></div>}
    <p>{dataset.images.filter(i=>i.split==='train').length} training images · {dataset.images.filter(i=>i.split==='validation').length} validation images</p>
    <div className="studio-toolbar"><button disabled={busy} onClick={train}>Train feature detector</button><label className="studio-button">Load model<input aria-label="Load feature model" type="file" accept=".json" onChange={e=>readJSON(e,'model')}/></label><button disabled={!model} onClick={()=>saveJSON(model,'fcp-feature-model.json')}>Export model</button></div>
    {model&&<p>Loaded detector: {model.samples.length} labeled regions. Export this model to use it in Face Studio.</p>}
    {report&&<div><p>{report.accuracy===null?'No validation images: accuracy has not been measured.':`Held-out region accuracy: ${(report.accuracy*100).toFixed(1)}% · confidence coverage: ${(report.coverage*100).toFixed(1)}% (${report.validationImages} images).`}</p><p>Labels missing from training: {report.missingTrainingLabels.join(', ')||'none'}.</p><button onClick={()=>saveJSON(report,'fcp-training-metrics.json')}>Export metrics</button></div>}
    <p className="studio-note">This trains region classification after tracing. It cannot recover a feature that tracing removed or separate two features merged into one region. Weak predictions fall back to the existing position rules. Confidence is a neighbor-vote score, not a calibrated probability.</p>
    <p role="status">{message}</p>
  </RetroWindow>;
}
