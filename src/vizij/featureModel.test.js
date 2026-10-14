import { regionFeatures, trainFeatureModel, validateDataset, validateModel, applyFeatureModel } from './featureModel.mjs';
const f = x => [x,.4,.1,.1,.5,1,0,0,0];
const image = (id,split='train') => ({id,split,reviewed:true,regions:[{features:f(.2),label:'left_eye'},{features:f(.8),label:'right_eye'}]});
const dataset = images => ({kind:'fcp-feature-dataset',version:1,images});
test('validation images are never fitted and metrics measure held-out labels',()=>{
  const validation=image('c','validation');validation.regions[0].label='mouth';
  const {model,report}=trainFeatureModel(dataset([image('a'),image('b'),validation]));
  expect(model.samples).toHaveLength(4);
  expect(model.samples.some(s=>s.label==='mouth')).toBe(false);
  expect(report.accuracy).toBe(.5);
  expect(report.perClass.mouth.support).toBe(1);
});
test('duplicate content IDs cannot leak between training and validation',()=>{
  expect(()=>validateDataset(dataset([image('a'),image('a','validation')]))).toThrow(/unique/);
});
test('training requires multiple reviewed images and honest no-validation reporting',()=>{
  expect(()=>trainFeatureModel(dataset([image('a')]))).toThrow(/two/);
  expect(()=>trainFeatureModel(dataset([{...image('a'),reviewed:false},image('b')]))).toThrow(/reviewed/);
  expect(trainFeatureModel(dataset([image('a'),image('b')])).report.accuracy).toBeNull();
});
test('reject invalid imports instead of propagating NaN or unknown labels',()=>{
  const d=dataset([image('a')]);d.images[0].regions[0].features[0]=NaN;
  expect(()=>validateDataset(d)).toThrow(/Invalid/);
  expect(()=>validateModel({kind:'fcp-feature-knn',version:1,k:5,samples:[]})).toThrow();
});
test('region measurements are translation and scale invariant',()=>{
  const shapes=[{type:'rect',bounds:{x:10,y:20,width:20,height:30},fill:'#123456'},{type:'rect',bounds:{x:60,y:70,width:10,height:20}}];
  const moved=shapes.map(s=>({...s,bounds:{x:s.bounds.x*2+5,y:s.bounds.y*2+10,width:s.bounds.width*2,height:s.bounds.height*2}}));
  expect(regionFeatures(shapes)).toEqual(regionFeatures(moved));
});
test('uncertain predictions retain heuristic labels',()=>{
  const shapes=[{type:'rect',role:'mouth',bounds:{x:0,y:0,width:100,height:100}}];
  const model=trainFeatureModel(dataset([image('a'),image('b')])).model;
  expect(applyFeatureModel(shapes,model)[0].role).toBe('mouth');
  expect(applyFeatureModel(shapes,model)[0].labelSource).toBe('heuristic');
});
