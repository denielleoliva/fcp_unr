import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { shapeMarkup } from './extract';
import { VISEMES } from '../constants/visemes';
import { naturalizeFeatures, preserveDrawingFeatures, drawingVertex } from './naturalFeatures';

export const CHANNELS = { jaw: 'mouth/open/value', round: 'mouth/round/value', blink: 'eyes/blink/value', gazeX: 'eyes/pos/x', gazeY: 'eyes/pos/y', brow: 'brows/raise/value' };
export const inputPath = key => `rig/drawing/standard/${CHANNELS[key]}`;
const fixed = value => ({ animated: false, value });
const zero = { x: 0, y: 0, z: 0 };
export function deformVertex(x, y, role, bounds, channel) {
  const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
  if (role === 'mouth') {
    if (channel === 'jaw') return [0, (y - cy) / Math.max(bounds.height, 4) * 65];
    if (channel === 'round') return [-(x - cx) * .55, (y - cy) * .3];
  }
  if (role.endsWith('_eye') || role.endsWith('_pupil')) {
    if (channel === 'blink') return [0, -(y - cy) * .96];
    if (channel === 'gazeX') return [12, 0];
    if (channel === 'gazeY') return [0, -12];
  }
  if (role.endsWith('_brow') && channel === 'brow') return [0, -22];
  return [0, 0];
}
export function createRig(sourceShapes, { natural = true, preserve = true } = {}) {
  const shapes = natural ? (preserve ? preserveDrawingFeatures(sourceShapes) : naturalizeFeatures(sourceShapes)) : sourceShapes;
  const root = new THREE.Group(); root.name = 'Drawing face';
  const children = [], nodes = [], edges = [], controls = {};
  Object.keys(CHANNELS).forEach(key => {
    controls[key] = inputPath(key);
    nodes.push({ id: `input_${key}`, type: 'input', params: { path: inputPath(key), value: { float: 0 } } });
  });
  const faceBacking = shapes.find(s => s.role === 'face' && s.fill && s.fill !== 'none');
  shapes.forEach((s, order) => {
    const parsed = s.mesh ? null : new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg">${shapeMarkup(s)}</svg>`);
    let piece = 0;
    const add = (geometry, color) => {
      if (!geometry || !geometry.attributes.position?.count) return;
      const id = `${s.id}-${piece++}`, pos = geometry.attributes.position;
      const morphTargets = Object.keys(CHANNELS);
      geometry.morphAttributes.position = morphTargets.map(key => {
        const array = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          const [dx, dy] = s.rigProfile ? drawingVertex(s.rigProfile, pos.getX(i), pos.getY(i), key).delta : s.preservePupil && key === 'blink' ? [0, 0] : s.mesh ? [s.motion[key]?.[i * 3] || 0, s.motion[key]?.[i * 3 + 1] || 0] : deformVertex(pos.getX(i), pos.getY(i), s.role, s.bounds, key);
          array[i * 3] = dx / 100; array[i * 3 + 1] = -dy / 100;
        }
        return new THREE.Float32BufferAttribute(array, 3);
      });
      geometry.morphTargetsRelative = true;
      for (let i = 0; i < pos.count; i++) {
        const [x, y] = s.rigProfile ? drawingVertex(s.rigProfile, pos.getX(i), pos.getY(i), 'none').base : [pos.getX(i),pos.getY(i)];
        pos.setXYZ(i, (x - 400) / 100, (300 - y) / 100, order * .001);
      }
      // Reverse winding after the image-to-world Y flip (Vizij uses front faces).
      if (geometry.index) {
        const ix = geometry.index;
        for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i); ix.setX(i, ix.getX(i + 2)); ix.setX(i + 2, a); }
      } else {
        for (let i = 0; i < pos.count; i += 3) {
          for (const attr of [pos, ...geometry.morphAttributes.position]) {
            const a = [attr.getX(i), attr.getY(i), attr.getZ(i)];
            attr.setXYZ(i, attr.getX(i + 2), attr.getY(i + 2), attr.getZ(i + 2)); attr.setXYZ(i + 2, ...a);
          }
        }
      }
      geometry.computeVertexNormals();
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material); mesh.name = `${s.role}-${id}`;
      mesh.morphTargetDictionary = Object.fromEntries(morphTargets.map((k, i) => [k, i]));
      const features = { translation: fixed(zero), rotation: fixed(zero), scale: fixed({ x: 1, y: 1, z: 1 }), color: fixed({ r: material.color.r, g: material.color.g, b: material.color.b }), opacity: fixed(1) };
      morphTargets.forEach(key => {
        const target = `${id}-${key}`;
        features[key] = { animated: true, value: { id: target, name: `${s.role} ${key}`, type: 'number', default: 0, constraints: { min: -1, max: 1 }, pub: { public: true, output: target } } };
        nodes.push({ id: `out_${target}`, type: 'output', params: { path: target } });
        edges.push({ from: { node_id: `input_${key}` }, to: { node_id: `out_${target}`, input: 'in' } });
      });
      if (s.hideOnBlink || s.hideOnJaw) {
        const opacityId = `${id}-visibility`;
        features.opacity = { animated: true, value: { id: opacityId, name: 'Feature visibility', type: 'number', default: 1, constraints: { min: 0, max: 1 }, pub: { public: true, output: opacityId } } };
        nodes.push({ id: `hide_${id}`, type: 'piecewise_remap', input_defaults: { input_breakpoints: { vector: s.hideOnJaw ? [0, .03, .15] : [0, .85, 1] }, output_breakpoints: { vector: [1, 1, 0] } } });
        nodes.push({ id: `opacity_${id}`, type: 'output', params: { path: opacityId } });
        edges.push({ from: { node_id: s.hideOnJaw ? 'input_jaw' : 'input_blink' }, to: { node_id: `hide_${id}`, input: 'in' } });
        edges.push({ from: { node_id: `hide_${id}` }, to: { node_id: `opacity_${id}`, input: 'in' } });
      }
      mesh.userData.gltfExtensions = { RobotData: { id, name: mesh.name, type: 'shape', tags: [s.role], material: 'basic', features, morphTargets } };
      root.add(mesh); children.push(id);
    };
    if (s.mesh) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(s.mesh, 3));
      add(geometry, s.fill);
      return;
    }
    if (s.runs && s !== faceBacking) {
      const positions = [];
      for (const [x, y, w, h] of s.runs) positions.push(x, y, 0, x + w, y, 0, x + w, y + h, 0, x, y, 0, x + w, y + h, 0, x, y + h, 0);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      add(geometry, s.fill);
      return;
    }
    parsed.paths.forEach(path => {
      const style = path.userData.style;
      if (style.fill && style.fill !== 'none') SVGLoader.createShapes(path).forEach(shape => {
        // A skin region in a raster has holes where the eyes/mouth were drawn.
        // Fill those on the base face so moving features do not reveal paper.
        if (s === faceBacking) shape.holes = [];
        add(new THREE.ShapeGeometry(shape), style.fill);
      });
      if (style.stroke && style.stroke !== 'none') path.subPaths.forEach(sub => add(SVGLoader.pointsToStroke(sub.getPoints(), style), style.stroke));
    });
  });
  if (!children.length) throw new Error('No visible vectors to rig. Draw or trace a face first.');
  root.userData.gltfExtensions = { RobotData: { id: 'drawing-root', name: root.name, type: 'group', root: true, children, tags: [], rootBounds: { center: { x: 0, y: 0 }, size: { x: 8, y: 6 } }, features: { translation: fixed(zero), rotation: fixed(zero), scale: fixed({ x: 1, y: 1, z: 1 }) } } };
  const config = { version: 1, faceId: 'drawing', title: 'Drawing speech poses', neutralInputs: Object.fromEntries(Object.values(controls).map(p => [p, 0])), poses: Object.entries(VISEMES).map(([id, v]) => ({ id, name: `viseme_${id}`, group: 'speech', values: { [controls.jaw]: v.mouthOpen, [controls.round]: v.lipRounding || 0 } })) };
  const bundle = { version: 1, graphs: [{ id: 'drawing-rig', kind: 'rig', spec: { nodes, edges } }], poses: { config }, metadata: { generator: 'Face Rigging Studio', featureConvention: 'image-left', conversion: natural ? (preserve ? 'drawing-preserving-motion' : 'natural-motion') : 'traced', controls } };
  root.userData.gltfExtensions.VIZIJ_bundle = bundle;
  return { root, bundle, controls, dispose: () => root.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }) };
}
export async function exportRig(rig) {
  const bytes = await new GLTFExporter().parseAsync(rig.root, { binary: true, includeCustomExtensions: true });
  return new Blob([bytes], { type: 'model/gltf-binary' });
}
