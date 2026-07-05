import * as THREE from 'three';
import { mattePlastic, glossyMetal, glassMat } from './materials.js';

export function createCamera(color) {
  const group = new THREE.Group();
  const bodyMat = mattePlastic(color, { roughness: 0.35 });
  const lensMat = glossyMetal(0x111111, { roughness: 0.08, clearcoat: 0.5 });
  const ringMat = glossyMetal(0x444444, { roughness: 0.12 });
  const glassMat2 = glassMat(color, { emissive: color, emissiveIntensity: 0.15, clearcoat: 1.0 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.2, 3, 3, 2), bodyMat);
  group.add(body);

  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.18), bodyMat);
  grip.position.set(0.28, -0.02, 0);
  group.add(grip);

  // Grip texture (rubberized)
  const gripRubber = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.26, 0.16), mattePlastic(0x0a0a0a, { roughness: 0.8 }));
  gripRubber.position.set(0.335, -0.02, 0);
  group.add(gripRubber);

  // Lens barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.2, 48), lensMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.18;
  group.add(barrel);

  // Lens rings
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 16, 64), ringMat);
  r1.position.z = 0.22;
  group.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.01, 16, 64), ringMat);
  r2.position.z = 0.16;
  group.add(r2);
  const r3 = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.008, 16, 64), ringMat);
  r3.position.z = 0.28;
  group.add(r3);

  // Front element
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.09, 48), glassMat2);
  glass.position.z = 0.29;
  group.add(glass);

  // Inner barrel
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 48), glossyMetal(0x05050a, { roughness: 0.05, clearcoat: 1.0 }));
  inner.rotation.x = Math.PI / 2;
  inner.position.z = 0.26;
  group.add(inner);

  // Viewfinder housing
  const vf = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.08), bodyMat);
  vf.position.set(0.06, 0.18, 0);
  group.add(vf);

  // Flash
  const flash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.01), glassMat(0xffffee, { emissive: 0xffffaa, emissiveIntensity: 0.3 }));
  flash.position.set(0.06, 0.2, 0.045);
  group.add(flash);

  // Shutter button (red)
  const shutter = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.015, 24), glossyMetal(0x880000, { roughness: 0.1, clearcoat: 0.8 }));
  shutter.position.set(0.22, 0.18, 0);
  group.add(shutter);

  // Mode dial
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 32), ringMat);
  dial.position.set(-0.15, 0.18, 0);
  group.add(dial);

  // Hot shoe
  const hotShoe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.04), glossyMetal(0x222222, { roughness: 0.15 }));
  hotShoe.position.set(-0.05, 0.19, 0);
  group.add(hotShoe);

  return group;
}