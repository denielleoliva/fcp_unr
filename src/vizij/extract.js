export const ROLES = ['decoration', 'face', 'left_eye', 'right_eye', 'left_pupil', 'right_pupil', 'left_brow', 'right_brow', 'nose', 'mouth'];
export const LABELS = Object.fromEntries(ROLES.map(r => [r, r.replaceAll('_', ' ')]));
export function boundsOf(shape) {
  let points;
  if (shape.type === 'circle') points = [[shape.cx - shape.r, shape.cy - shape.r], [shape.cx + shape.r, shape.cy + shape.r]];
  else if (shape.type === 'rect') points = [[shape.x, shape.y], [shape.x + shape.width, shape.y + shape.height]];
  else {
    const n = (shape.d.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
    points = Array.from({ length: Math.floor(n.length / 2) }, (_, i) => [n[i * 2], n[i * 2 + 1]]);
  }
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
export function assignFeatures(shapes) {
  if (!shapes.length) return [];
  const boxes = shapes.map(boundsOf);
  const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
  const w = Math.max(1, ...boxes.map(b => b.x + b.width - x));
  const h = Math.max(1, ...boxes.map(b => b.y + b.height - y));
  return shapes.map((s, i) => {
    const b = boxes[i], cx = (b.x + b.width / 2 - x) / w, cy = (b.y + b.height / 2 - y) / h;
    const side = cx < .5 ? 'left' : 'right'; // Image-left, not anatomical left.
    let role = 'decoration';
    if (b.width > w * .65 && b.height > h * .65) role = 'face';
    else if (cy > .6 && cy < .95 && cx > .2 && cx < .8 && b.width < w * .95) role = 'mouth';
    else if (cy >= 0 && cy < .58 && (cx < .43 || cx > .57)) role = `${side}_${b.width > b.height * 2.4 && cy < .4 ? 'brow' : 'eye'}`;
    else if (cx > .4 && cx < .6 && cy > .4 && cy < .65) role = 'nose';
    return { ...s, id: `shape-${i}`, role, bounds: b, confidence: role === 'decoration' ? .2 : .55 };
  });
}
// Four-connected components on the downsampled image; white paper is transparent.
export function tracePixels({ data, width, height }, { threshold = 242, minArea = 5, scale = 1, offsetX = 0, offsetY = 0, photoMode = false } = {}) {
  const labels = new Int32Array(width * height).fill(-1);
  const keys = new Int32Array(width * height).fill(-1);
  // Local luminance removes broad lighting gradients without treating gray paper
  // as ink. Photo mode is for line drawings; solid fills use the original mode.
  const integral = new Float64Array((width + 1) * (height + 1));
  if (photoMode) for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row += (data[i] + data[i + 1] + data[i + 2]) / 3;
      integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + row;
    }
  }
  for (let i = 0; i < keys.length; i++) {
    const [r, g, b, a] = data.subarray(i * 4, i * 4 + 4);
    if (a < 30) continue;
    if (photoMode) {
      const x = i % width, y = Math.floor(i / width), radius = Math.max(5, Math.round(width * .035));
      const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1);
      const y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
      const at = (px, py) => integral[py * (width + 1) + px];
      const mean = (at(x1, y1) - at(x0, y1) - at(x1, y0) + at(x0, y0)) / ((x1 - x0) * (y1 - y0));
      if (mean - (r + g + b) / 3 < 12) continue;
      // Merge shading variants within each ink family; keep the average source color.
      const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
      let hue = delta === 0 ? 0 : max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
      keys[i] = delta / Math.max(1, max) < .25 ? 0 : 1 + Math.floor(hue);
      continue;
    }
    if (Math.min(r, g, b) >= threshold) continue;
    keys[i] = (Math.round(r / 48) * 49) + Math.round(g / 48) * 7 + Math.round(b / 48);
  }
  const components = [];
  for (let start = 0; start < keys.length; start++) {
    if (keys[start] < 0 || labels[start] >= 0) continue;
    const id = components.length, pixels = [start], sum = [0, 0, 0];
    labels[start] = id;
    for (let q = 0; q < pixels.length; q++) {
      const p = pixels[q], x = p % width, y = Math.floor(p / width);
      for (let c = 0; c < 3; c++) sum[c] += data[p * 4 + c];
      const neighbors = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
      for (const n of neighbors) if (n >= 0 && labels[n] < 0 && keys[n] === keys[start]) { labels[n] = id; pixels.push(n); }
    }
    components.push({ id, pixels, color: '#' + sum.map(c => Math.round(c / pixels.length).toString(16).padStart(2, '0')).join('') });
  }
  const kept = components.filter(c => c.pixels.length >= minArea).sort((a, b) => b.pixels.length - a.pixels.length).slice(0, 240);
  const shapes = kept.map(({ id, pixels, color }) => {
    const edges = new Map();
    const add = (ax, ay, bx, by) => {
      const a = ay * (width + 1) + ax, b = by * (width + 1) + bx;
      if (!edges.has(a)) edges.set(a, []);
      edges.get(a).push(b);
    };
    for (const p of pixels) {
      const x = p % width, y = Math.floor(p / width);
      if (y === 0 || labels[p - width] !== id) add(x, y, x + 1, y);
      if (x === width - 1 || labels[p + 1] !== id) add(x + 1, y, x + 1, y + 1);
      if (y === height - 1 || labels[p + width] !== id) add(x + 1, y + 1, x, y + 1);
      if (x === 0 || labels[p - 1] !== id) add(x, y + 1, x, y);
    }
    let d = '';
    while (edges.size) {
      const start = edges.keys().next().value;
      let p = start, first = true;
      do {
        const px = p % (width + 1), py = Math.floor(p / (width + 1));
        d += `${first ? 'M' : 'L'}${(px * scale + offsetX).toFixed(2)} ${(py * scale + offsetY).toFixed(2)} `;
        first = false;
        const next = edges.get(p);
        if (!next) break;
        const n = next.pop();
        if (!next.length) edges.delete(p);
        p = n;
      } while (p !== start);
      d += 'Z ';
    }
    // Exact horizontal runs also provide a hole-safe mesh source. Contours can
    // touch at a corner, which SVG triangulators may interpret inconsistently.
    const rows = new Map();
    for (const p of pixels) {
      const y = Math.floor(p / width);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push(p % width);
    }
    const runs = [];
    for (const [y, xs] of rows) {
      xs.sort((a, b) => a - b);
      let start = xs[0], end = start;
      const emit = () => runs.push([start * scale + offsetX, y * scale + offsetY, (end - start + 1) * scale, scale]);
      for (let i = 1; i < xs.length; i++) {
        if (xs[i] === end + 1) end = xs[i];
        else { emit(); start = end = xs[i]; }
      }
      emit();
    }
    return { type: 'path', d, runs, fill: color, stroke: 'none', strokeWidth: 0 };
  });
  return shapes;
}
export async function traceImage(src, options = {}) {
  const img = new Image();
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('This image could not be decoded. Try PNG or JPEG.')); img.src = src; });
  const ratio = Math.min((options.photoMode ? 320 : 240) / img.width, (options.photoMode ? 240 : 180) / img.height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * ratio)); canvas.height = Math.max(1, Math.round(img.height * ratio));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const scale = Math.min(800 / canvas.width, 600 / canvas.height);
  return tracePixels(ctx.getImageData(0, 0, canvas.width, canvas.height), { ...options, scale, offsetX: (800 - canvas.width * scale) / 2, offsetY: (600 - canvas.height * scale) / 2 });
}
export function shapeMarkup(s) {
  const style = `fill="${s.fill || 'none'}" stroke="${s.stroke || 'none'}" stroke-width="${s.strokeWidth || 0}" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd"`;
  if (s.type === 'circle') return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${style}/>`;
  if (s.type === 'rect') return `<rect x="${Math.min(s.x, s.x + s.width)}" y="${Math.min(s.y, s.y + s.height)}" width="${Math.abs(s.width)}" height="${Math.abs(s.height)}" ${style}/>`;
  return `<path d="${s.d}" ${style}/>`;
}
export const asSVG = shapes => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">${shapes.map(shapeMarkup).join('')}</svg>`;
