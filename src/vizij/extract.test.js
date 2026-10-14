import { assignFeatures, tracePixels, boundsOf, asSVG } from './extract';
const pixels = (w, h, colorAt) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(colorAt(x, y), (y * w + x) * 4);
  return { width: w, height: h, data };
};
test('traces bright saturated colors, removes paper, preserves disconnected features', () => {
  const image = pixels(12, 8, (x, y) => y > 1 && y < 6 && ((x > 1 && x < 5) || (x > 7 && x < 11)) ? [255, 200, 0, 255] : [255, 255, 255, 255]);
  const shapes = tracePixels(image);
  expect(shapes).toHaveLength(2);
  expect(shapes[0].fill).toBe('#ffc800');
  expect(shapes.every(s => s.d.endsWith('Z '))).toBe(true);
  expect(asSVG(shapes)).toContain('fill-rule="evenodd"');
});
test('transparent backgrounds and white paper do not become features', () => {
  expect(tracePixels(pixels(5, 5, () => [0, 0, 0, 0]))).toEqual([]);
  expect(tracePixels(pixels(5, 5, () => [255, 255, 255, 255]))).toEqual([]);
});
test('closed rings retain inner and outer contours', () => {
  const image = pixels(9, 9, (x, y) => x >= 1 && x <= 7 && y >= 1 && y <= 7 && !(x >= 3 && x <= 5 && y >= 3 && y <= 5) ? [20, 40, 80, 255] : [255, 255, 255, 255]);
  const [shape] = tracePixels(image);
  expect(shape.d.match(/M/g)).toHaveLength(2);
});
test('finds face outline separately from eyes and mouth', () => {
  const result = assignFeatures([
    { type: 'circle', cx: 400, cy: 300, r: 240 },
    { type: 'circle', cx: 290, cy: 250, r: 40 },
    { type: 'circle', cx: 510, cy: 250, r: 40 },
    { type: 'rect', x: 330, y: 410, width: 140, height: 20 }
  ]);
  expect(result.map(s => s.role)).toEqual(['face', 'left_eye', 'right_eye', 'mouth']);
});
test('negative rectangles have normalized bounds', () => {
  expect(boundsOf({ type: 'rect', x: 60, y: 80, width: -20, height: -30 })).toEqual({ x: 40, y: 50, width: 20, height: 30 });
});
test('photo cleanup removes broad paper shadows while retaining dark and colored ink', () => {
  const image = pixels(60, 40, (x, y) => {
    if (x >= 10 && x <= 35 && y >= 12 && y <= 14) return [30, 60, 100, 255];
    if (x >= 15 && x <= 45 && y >= 28 && y <= 30) return [65, 65, 60, 255];
    const paper = 145 + x;
    return [paper, paper, paper - 5, 255];
  });
  const shapes = tracePixels(image, { photoMode: true });
  expect(shapes).toHaveLength(2);
  expect(shapes.every(s => boundsOf(s).height <= 3)).toBe(true);
});
test('raster mesh runs preserve every ink pixel and exclude enclosed holes', () => {
  const image = pixels(9, 9, (x, y) => x >= 1 && x <= 7 && y >= 1 && y <= 7 && !(x >= 3 && x <= 5 && y >= 3 && y <= 5) ? [20, 40, 80, 255] : [255, 255, 255, 255]);
  const [shape] = tracePixels(image);
  expect(shape.runs.reduce((area, [, , w, h]) => area + w * h, 0)).toBe(40);
  expect(shape.runs.some(([x, y, w, h]) => 4 >= x && 4 < x + w && 4 >= y && 4 < y + h)).toBe(false);
});
