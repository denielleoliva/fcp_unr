// Pure, deterministic geometry in drawing coordinates. Each feature is sampled
// into strips so open/closed poses share topology and survive GLB export.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const colorOf = s => s?.stroke && s.stroke !== 'none' ? s.stroke : s?.fill && s.fill !== 'none' ? s.fill : '#253448';
function dominant(shapes) {
  return [...shapes].sort((a, b) => b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height)[0];
}
function strip(id, role, color, bounds, sample, targets = {}) {
  const positions = [], motion = Object.fromEntries(Object.keys(targets).map(k => [k, []]));
  const put = (t, edge) => {
    const p = sample(t, edge); positions.push(p[0], p[1], 0);
    for (const [key, target] of Object.entries(targets)) {
      const q = target(t, edge); motion[key].push(q[0] - p[0], q[1] - p[1], 0);
    }
  };
  for (let i = 0; i < 48; i++) {
    const a = i / 48, b = (i + 1) / 48;
    // Positive image-coordinate winding, reversed in the Vizij exporter.
    [[a,0],[b,0],[b,1],[a,0],[b,1],[a,1]].forEach(([t,e]) => put(t,e));
  }
  return { id, role, fill: color, bounds, mesh: positions, motion };
}
function mouth(shapes) {
  const main = dominant(shapes), b = main.bounds;
  const color = colorOf(main), w = Math.max(24, b.width), h = clamp(b.height, 18, w * .55);
  const cx = b.x + b.width / 2, cy = b.y + b.height * .42;
  const line = t => cy + Math.sin(Math.PI * t) * h * .16;
  const x = t => cx + (t - .5) * w;
  const opening = (t, edge) => line(t) + Math.sin(Math.PI * t) * h * (edge ? .7 : -.22);
  const closed = (t, edge) => [x(t), line(t)];
  const opened = (t, edge) => [x(t), opening(t, edge)];
  const rounded = (t, edge) => [cx + (x(t) - cx) * .55, line(t)];
  const out = [strip('natural-mouth-interior','mouth',color,b,closed,{jaw:opened,round:rounded})];
  // A short upper tooth band retracts completely when the jaw closes.
  const teeth = (t, edge) => {
    const u = .12 + t * .76;
    const top = opening(u, 0);
    return [x(u), top + (edge ? Math.sin(Math.PI * u) * h * .2 : 0)];
  };
  out.push(strip('natural-mouth-teeth','mouth','#fffdf2',b,(t,e)=>closed(.12+t*.76,e),{
    jaw:teeth,round:(t,e)=>rounded(.12+t*.76,e)
  }));
  for (const edge of [0, 1]) {
    const baseline = (t, side) => [x(t), line(t) + (side ? 1.4 : -1.4)];
    out.push(strip(`natural-mouth-lip-${edge}`,'mouth',color,b,baseline,{
      jaw:(t,side)=>[x(t), opening(t,edge)+(side?1.4:-1.4)],
      round:(t,side)=>[cx+(x(t)-cx)*.55, baseline(t,side)[1]]
    }));
  }
  return out;
}
function eye(shapes, side, skin) {
  const outlines = shapes.filter(s => s.role === `${side}_eye`);
  const main = dominant(outlines), b = main.bounds;
  const w = Math.max(18,b.width), h = Math.max(10,b.height), cx = b.x+b.width/2, cy=b.y+b.height/2;
  const color=colorOf(main), x=t=>cx+(t-.5)*w;
  const lid=t=>cy + Math.sin(Math.PI*t)*h*.12;
  const envelope=t=>Math.sin(Math.PI*t)*h*.5;
  const open=(t,e)=>[x(t),lid(t)+(e?1:-1)*envelope(t)];
  const closed=t=>[x(t),lid(t)];
  const out=[strip(`natural-${side}-sclera`,`${side}_eye`,'#fffdf8',b,open,{blink:closed})];
  const pupil = dominant(shapes.filter(s=>s.role===`${side}_pupil`)) || outlines.filter(s=>s!==main).find(s=>s.bounds.width<w*.5 && s.bounds.height<h*.8);
  const pb=pupil?.bounds;
  const radius=clamp(pb ? Math.min(pb.width,pb.height)/2 : h*.24, h*.13, h*.3);
  const px=clamp(pb ? pb.x+pb.width/2 : cx, cx-w*.13, cx+w*.13);
  const py=clamp(pb ? pb.y+pb.height/2 : cy, cy-h*.08, cy+h*.08);
  const gazeX=Math.min(w*.1,h*.18), gazeY=h*.08;
  const circle=(t,e)=>{
    const dx=(t*2-1)*radius;
    return [px+dx, py+(e?1:-1)*Math.sqrt(Math.max(0,radius*radius-dx*dx))];
  };
  const pupilShape=strip(`natural-${side}-pupil`,`${side}_pupil`,colorOf(pupil || main),b,circle,{
    gazeX:(t,e)=>{const p=circle(t,e);return [p[0]+gazeX,p[1]];},
    gazeY:(t,e)=>{const p=circle(t,e);return [p[0],p[1]-gazeY];}
  });
  // The iris remains round. Opaque white lid surfaces progressively cover it.
  // At full closure the graph also hides it, including with nonzero gaze.
  pupilShape.hideOnBlink=true;
  out.push(pupilShape);
  for (const edge of [0,1]) {
    const cover=(t,e)=>open(t,edge);
    out.push(strip(`natural-${side}-lid-cover-${edge}`,`${side}_eye`,skin,b,cover,{
      blink:(t,e)=>(edge === 0 ? e === 1 : e === 0)?closed(t):open(t,edge)
    }));
    const outline=(t,e)=>{const p=open(t,edge);return[p[0],p[1]+(e?1.4:-1.4)];};
    out.push(strip(`natural-${side}-lid-${edge}`,`${side}_eye`,color,b,outline,{
      blink:(t,e)=>[x(t),lid(t)+(e?1.4:-1.4)]
    }));
  }
  return out;
}
export function naturalizeFeatures(shapes) {
  const converted = new Set(['mouth','left_eye','right_eye','left_pupil','right_pupil']);
  const skinShape=shapes.find(s=>s.role==='face' && s.fill && s.fill!=='none');
  const skin=skinShape?.fill || '#ffffff';
  const result=shapes.filter(s=>!converted.has(s.role));
  const mouths=shapes.filter(s=>s.role==='mouth');
  if(mouths.length) result.push(...mouth(mouths));
  for(const side of ['left','right']) if(shapes.some(s=>s.role===`${side}_eye`)) result.push(...eye(shapes,side,skin));
  return result;
}
export function blinkAt(elapsed) {
  // Fast close, brief contact, slower opening; no instantaneous squash.
  if(elapsed<0 || elapsed>=240) return 0;
  const smooth=t=>t*t*(3-2*t);
  if(elapsed<75) return smooth(elapsed/75);
  if(elapsed<105) return 1;
  return 1-smooth((elapsed-105)/135);
}

// Fit the actual ink silhouette instead of replacing it with a symmetric almond.
export function contourProfile(shape) {
  const b = shape.bounds, samples = [];
  if (!shape.runs?.length) return { bounds:b, samples:Array.from({length:49},(_,i)=>{
    const arc=Math.sin(Math.PI*i/48)*b.height/2;
    return [b.y+b.height/2-arc,b.y+b.height/2+arc];
  }) };
  for (let i = 0; i <= 48; i++) {
    const x = b.x + b.width * i / 48;
    const hits = (shape.runs || []).filter(([rx, , w]) => x >= rx - .01 && x <= rx + w + .01);
    samples.push(hits.length ? [Math.min(...hits.map(r => r[1])), Math.max(...hits.map(r => r[1] + r[3]))] : null);
  }
  // Vector primitives still get a shared, smooth contour when no raster samples exist.
  for (let i = 0; i <= 48; i++) if (!samples[i]) {
    const nearest = samples.map((v,j) => v ? [Math.abs(i-j),v] : null).filter(Boolean).sort((a,b)=>a[0]-b[0])[0];
    const arc = Math.sin(Math.PI*i/48)*b.height/2;
    samples[i] = nearest?.[1] || [b.y+b.height/2-arc,b.y+b.height/2+arc];
  }
  return { bounds:b, samples };
}
export function contourAt(profile, x) {
  const t=clamp((x-profile.bounds.x)/Math.max(1,profile.bounds.width),0,1)*48;
  const i=Math.min(47,Math.floor(t)), f=t-i;
  return profile.samples[i].map((v,k)=>v+(profile.samples[i+1][k]-v)*f);
}
export function drawingVertex(profile, x, y, channel) {
  const [top,bottom]=contourAt(profile,x);
  const line=top+(bottom-top)*(profile.kind==='mouth'?.28:.58);
  const base=[x,profile.kind==='mouth'?line:y];
  if(profile.kind==='mouth') {
    if(channel==='jaw') return {base,delta:[0,y-line]};
    if(channel==='round') return {base,delta:[-(x-profile.bounds.x-profile.bounds.width/2)*.4,0]};
  } else if(channel==='blink') return {base,delta:[0,line-y]};
  return {base,delta:[0,0]};
}
export function preserveDrawingFeatures(shapes) {
  const removed=new Set(['mouth','left_eye','right_eye','left_pupil','right_pupil']);
  const result=shapes.filter(s=>!removed.has(s.role));
  const mouthShapes=shapes.filter(s=>s.role==='mouth');
  if(mouthShapes.length) {
    const main=dominant(mouthShapes), profile={...contourProfile(main),kind:'mouth'};
    result.push(...mouthShapes.map(s=>({...s,rigProfile:profile})));
    const b=profile.bounds;
    const baseline=(t,e)=>{const x=b.x+t*b.width;const p=drawingVertex(profile,x,0,'none').base;return[x,p[1]+(e?1.1:-1.1)];};
    const lip=strip('drawn-closed-lip','mouth',colorOf(main),b,baseline,{
      round:(t,e)=>{const p=baseline(t,e);return[b.x+b.width/2+(p[0]-b.x-b.width/2)*.6,p[1]];}
    });
    lip.hideOnJaw=true;
    result.push(lip);
  }
  const skin=shapes.find(s=>s.role==='face' && s.fill && s.fill!=='none')?.fill || '#ffffff';
  for(const side of ['left','right']) {
    const eyes=shapes.filter(s=>s.role===`${side}_eye`), main=dominant(eyes);
    if(!main) continue;
    const b=main.bounds, profile={...contourProfile(main),kind:'eye'};
    const explicit=shapes.filter(s=>s.role===`${side}_pupil`);
    const inferred=explicit.length?[]:eyes.filter(s=>s!==main && s.bounds.width<b.width*.5 && s.bounds.height<b.height*.8 && s.bounds.x>=b.x && s.bounds.x+s.bounds.width<=b.x+b.width && s.bounds.y>=b.y && s.bounds.y+s.bounds.height<=b.y+b.height);
    result.push(...eyes.filter(s=>!inferred.includes(s)).map(s=>({...s,rigProfile:profile})));
    result.push(...[...explicit,...inferred].map(s=>({...s,role:`${side}_pupil`,preservePupil:true,hideOnBlink:true})));
    for(const edge of [0,1]) {
      const boundary=t=>{const x=b.x+t*b.width;return[x,contourAt(profile,x)[edge]];};
      result.push(strip(`drawn-${side}-cover-${edge}`,`${side}_eye`,skin,b,(t,e)=>boundary(t),{
        blink:(t,e)=>{const p=boundary(t);const closed=drawingVertex(profile,p[0],p[1],'blink');return (edge===0?e===1:e===0)?[p[0],closed.base[1]+closed.delta[1]]:p;}
      }));
      const lid=strip(`drawn-${side}-closure-${edge}`,`${side}_eye`,colorOf(main),b,(t,e)=>{const p=boundary(t);return[p[0],p[1]+(e?.8:-.8)];},{
        blink:(t,e)=>{const p=boundary(t);const q=drawingVertex(profile,p[0],p[1],'blink');return[p[0],q.base[1]+q.delta[1]+(e?.8:-.8)];}
      });
      result.push(lid);
    }
  }
  return result;
}
