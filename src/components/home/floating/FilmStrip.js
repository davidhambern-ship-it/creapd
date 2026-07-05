import * as THREE from 'three';
import { mattePlastic, glassMat } from './materials.js';

export function createFilmStrip(color) {
  const group = new THREE.Group();
  const stripMat = mattePlastic(0x0a0a0a, { roughness: 0.4 });
  const frameMat = glassMat(color, { emissive: color, emissiveIntensity: 0.2, clearcoat: 0.8 });
  const perfMat = mattePlastic(0x000000, { roughness: 0.5 });

  const segments = 6;
  const segWidth = 0.12;
  for (let i = 0; i < segments; i++) {
    const angle = (i - segments / 2) * 0.08;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(segWidth, 0.13, 0.012), stripMat);
    seg.position.set((i - segments / 2) * segWidth, Math.sin(angle) * 0.05, 0);
    seg.rotation.z = angle * 0.5;
    group.add(seg);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.008), frameMat);
    frame.position.copy(seg.position);
    frame.position.z = 0.008;
    frame.rotation.z = seg.rotation.z;
    group.add(frame);

    for (let p = 0; p < 2; p++) {
      const pt = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.005), perfMat);
      pt.position.set(seg.position.x - 0.03 + p * 0.06, 0.05, 0.012);
      pt.rotation.z = seg.rotation.z;
      group.add(pt);
      const pb = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.005), perfMat);
      pb.position.set(seg.position.x - 0.03 + p * 0.06, -0.05, 0.012);
      pb.rotation.z = seg.rotation.z;
      group.add(pb);
    }
  }

  return group;
}