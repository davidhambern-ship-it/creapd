import * as THREE from 'three';
import { brushedMetal, glossyMetal, glassMat, mattePlastic } from './materials.js';

export function createPhone(color) {
  const group = new THREE.Group();
  const frameMat = brushedMetal(color, { metalness: 0.9, roughness: 0.2, clearcoat: 0.5 });
  const glassMaterial = glassMat(0x05050a, { emissive: color, emissiveIntensity: 0.18, clearcoat: 1.0 });
  const camRingMat = glossyMetal(0x1a1a2a, { roughness: 0.1 });
  const lensMat = glossyMetal(0x0a0a0a, { roughness: 0.05 });

  // Body with slight bevel
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.66, 0.04, 4, 4, 1), frameMat);
  group.add(body);

  // Screen glass
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.56, 0.006), glassMaterial);
  screen.position.z = 0.022;
  group.add(screen);

  // Bezel
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.58, 0.002), mattePlastic(0x000000, { roughness: 0.3 }));
  bezel.position.z = 0.021;
  group.add(bezel);

  // Camera module
  const camBump = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.018), camRingMat);
  camBump.position.set(-0.08, 0.22, 0.028);
  group.add(camBump);

  // Two lenses with depth
  const lensGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.024, 32);
  const l1 = new THREE.Mesh(lensGeo, lensMat);
  l1.rotation.x = Math.PI / 2;
  l1.position.set(-0.1, 0.24, 0.04);
  group.add(l1);
  const l2 = new THREE.Mesh(lensGeo, lensMat);
  l2.rotation.x = Math.PI / 2;
  l2.position.set(-0.06, 0.2, 0.04);
  group.add(l2);

  // Lens glass (reflective, emissive)
  const lensGlassGeo = new THREE.CircleGeometry(0.028, 32);
  const lensGlassMat = glassMat(color, { emissive: color, emissiveIntensity: 0.15, clearcoat: 1.0 });
  const lg1 = new THREE.Mesh(lensGlassGeo, lensGlassMat);
  lg1.position.set(-0.1, 0.24, 0.053);
  group.add(lg1);
  const lg2 = new THREE.Mesh(lensGlassGeo, lensGlassMat);
  lg2.position.set(-0.06, 0.2, 0.053);
  group.add(lg2);

  // Inner lens reflection ring
  const innerRingGeo = new THREE.RingGeometry(0.02, 0.026, 32);
  const innerRingMat = glossyMetal(0x222244, { roughness: 0.05 });
  const ir1 = new THREE.Mesh(innerRingGeo, innerRingMat);
  ir1.position.set(-0.1, 0.24, 0.054);
  group.add(ir1);
  const ir2 = new THREE.Mesh(innerRingGeo, innerRingMat);
  ir2.position.set(-0.06, 0.2, 0.054);
  group.add(ir2);

  // Flash
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.012, 24), glassMat(0xffffaa, { emissive: 0xffffaa, emissiveIntensity: 0.4 }));
  flash.position.set(-0.06, 0.25, 0.04);
  group.add(flash);

  // Side buttons
  const btnMat = glossyMetal(0x222222, { roughness: 0.2 });
  const btn1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.012), btnMat);
  btn1.position.set(0.17, 0.1, 0);
  group.add(btn1);
  const btn2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.012), btnMat);
  btn2.position.set(0.17, 0.0, 0);
  group.add(btn2);

  // Notch / speaker grille
  const notch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.002), mattePlastic(0x000000));
  notch.position.set(0, 0.3, 0.023);
  group.add(notch);

  return group;
}