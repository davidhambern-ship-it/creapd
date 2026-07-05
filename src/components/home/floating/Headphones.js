import * as THREE from 'three';
import { glossyMetal, brushedMetal, rubberMat } from './materials.js';

export function createHeadphones(color) {
  const group = new THREE.Group();
  const bandMat = glossyMetal(color, { roughness: 0.15, clearcoat: 0.6 });
  const cupMat = brushedMetal(color, { metalness: 0.8, roughness: 0.25, clearcoat: 0.4 });
  const cushMat = rubberMat(0x0a0a0a);

  // Headband
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.028, 24, 64, Math.PI), bandMat);
  band.position.y = 0.06;
  group.add(band);

  // Band cushion
  const bandCushion = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.016, 16, 64, Math.PI), cushMat);
  bandCushion.position.y = 0.06;
  group.add(bandCushion);

  // Ear cups
  const cupGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.08, 48);
  const left = new THREE.Mesh(cupGeo, cupMat);
  left.rotation.z = Math.PI / 2;
  left.position.set(-0.24, 0.06, 0);
  group.add(left);
  const right = new THREE.Mesh(cupGeo, cupMat);
  right.rotation.z = Math.PI / 2;
  right.position.set(0.24, 0.06, 0);
  group.add(right);

  // Ear cushions
  const cushGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 48);
  const lc = new THREE.Mesh(cushGeo, cushMat);
  lc.rotation.z = Math.PI / 2;
  lc.position.set(-0.27, 0.06, 0);
  group.add(lc);
  const rc = new THREE.Mesh(cushGeo, cushMat);
  rc.rotation.z = Math.PI / 2;
  rc.position.set(0.27, 0.06, 0);
  group.add(rc);

  // Cup detail rings
  const ringGeo = new THREE.TorusGeometry(0.1, 0.006, 12, 64);
  const lr = new THREE.Mesh(ringGeo, glossyMetal(0x222222, { roughness: 0.1 }));
  lr.rotation.y = Math.PI / 2;
  lr.position.set(-0.22, 0.06, 0);
  group.add(lr);
  const rr = new THREE.Mesh(ringGeo, glossyMetal(0x222222, { roughness: 0.1 }));
  rr.rotation.y = Math.PI / 2;
  rr.position.set(0.22, 0.06, 0);
  group.add(rr);

  // Cup outer logo circle
  const logoGeo = new THREE.CircleGeometry(0.04, 32);
  const logoMat = glossyMetal(color, { roughness: 0.08, clearcoat: 0.8 });
  const ll = new THREE.Mesh(logoGeo, logoMat);
  ll.position.set(-0.2, 0.06, 0);
  ll.rotation.y = -Math.PI / 2;
  group.add(ll);
  const rl = new THREE.Mesh(logoGeo, logoMat);
  rl.position.set(0.2, 0.06, 0);
  rl.rotation.y = Math.PI / 2;
  group.add(rl);

  // Arm connectors
  const armGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.08, 16);
  const la = new THREE.Mesh(armGeo, bandMat);
  la.position.set(-0.22, 0.1, 0);
  la.rotation.z = 0.3;
  group.add(la);
  const ra = new THREE.Mesh(armGeo, bandMat);
  ra.position.set(0.22, 0.1, 0);
  ra.rotation.z = -0.3;
  group.add(ra);

  return group;
}