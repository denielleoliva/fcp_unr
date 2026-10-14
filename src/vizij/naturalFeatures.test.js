import { naturalizeFeatures, blinkAt, preserveDrawingFeatures, drawingVertex, contourProfile } from './naturalFeatures';
const shape = (id, role, x, y, width, height, fill = '#234567') => ({ id, role, bounds: { x, y, width, height }, fill });
const source = [shape('m','mouth',250,350,180,70), shape('le','left_eye',230,180,100,45),shape('lp','left_pupil',260,190,20,20),shape('re','right_eye',430,180,100,45),shape('freckle','decoration',190,290,5,5)];
function area(mesh, target) {
  let total = 0;
  for (let i=0;i<mesh.length;i+=9) {
    const p = [0,3,6].map(j=>[mesh[i+j]+(target?.[i+j]||0),mesh[i+j+1]+(target?.[i+j+1]||0)]);
    total += Math.abs((p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[2][0]-p[0][0])*(p[1][1]-p[0][1]))/2;
  }
  return total;
}
test('mouth cavity and teeth have no visible area at rest and open with jaw',()=>{
  const result=naturalizeFeatures(source);
  for(const id of ['natural-mouth-interior','natural-mouth-teeth']) {
    const s=result.find(s=>s.id===id);
    expect(area(s.mesh)).toBeCloseTo(0);
    expect(area(s.mesh,s.motion.jaw)).toBeGreaterThan(100);
    expect(area(s.mesh,s.motion.round)).toBeCloseTo(0);
  }
});
test('blink closes both lids onto one contour while pupil remains round',()=>{
  const result=naturalizeFeatures(source);
  const upper=result.find(s=>s.id==='natural-left-lid-0'), lower=result.find(s=>s.id==='natural-left-lid-1');
  upper.mesh.forEach((p,i)=>expect(p+upper.motion.blink[i]).toBeCloseTo(lower.mesh[i]+lower.motion.blink[i]));
  const pupil=result.find(s=>s.id==='natural-left-pupil');
  expect(pupil.motion.blink).toBeUndefined();
  expect(pupil.hideOnBlink).toBe(true);
  expect(pupil.fill).toBe('#234567');
  expect(result.find(s=>s.id==='natural-left-lid-0').motion.gazeX).toBeUndefined();
});
test('preserves decorations and produces finite compatible morph buffers',()=>{
  const result=naturalizeFeatures(source);
  expect(result).toContain(source[4]);
  for(const s of result.filter(s=>s.mesh)) {
    expect(s.mesh.every(Number.isFinite)).toBe(true);
    for(const target of Object.values(s.motion)) {
      expect(target).toHaveLength(s.mesh.length);
      expect(target.every(Number.isFinite)).toBe(true);
    }
  }
});
test('blink closes smoothly, makes contact, and opens more slowly',()=>{
  expect(blinkAt(0)).toBe(0); expect(blinkAt(75)).toBe(1); expect(blinkAt(100)).toBe(1); expect(blinkAt(240)).toBe(0);
  expect(blinkAt(35)).toBeGreaterThan(0); expect(blinkAt(35)).toBeLessThan(1);
  expect(blinkAt(170)).toBeGreaterThan(0); expect(blinkAt(170)).toBeLessThan(1);
});

test('drawing-preserving motion retains original mouth ink and opens back to its vertices',()=>{
  const original={...source[0],runs:[[250,350,12,2],[280,370,10,3],[330,410,20,2]]};
  const result=preserveDrawingFeatures([original,...source.slice(1)]);
  const mouth=result.find(s=>s.id==='m');
  expect(mouth.runs).toBe(original.runs);
  for(const [x,y] of original.runs){
    const {base,delta}=drawingVertex(mouth.rigProfile,x,y,'jaw');
    expect(base[0]+delta[0]).toBeCloseTo(x);
    expect(base[1]+delta[1]).toBeCloseTo(y);
    expect(base[1]).toBe(drawingVertex(mouth.rigProfile,x,y+10,'jaw').base[1]);
  }
  expect(result.find(s=>s.id==='lp').preservePupil).toBe(true);
});
test('vector-only eye contour remains curved rather than collapsing to a flat fallback',()=>{
  const p=contourProfile(source[1]);
  expect(p.samples[24][1]-p.samples[24][0]).toBeCloseTo(45);
  expect(p.samples[0][1]-p.samples[0][0]).toBeCloseTo(0);
});
