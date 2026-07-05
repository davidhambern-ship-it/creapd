import * as THREE from 'three';
import { mattePlastic, glossyMetal } from './materials.js';

export function createClapperboard(color) {
  const group = new THREE.Group();
  const baseMat = mattePlastic(color, { roughness: 0.45 });
  const stickMat = glossyMetal(0x1a1a1a, { roughness: 0.15, clearcoat: 0.5 });
  const whiteMat = mattePlastic(0xf0f0f0, { roughness: 0.35 });

  // Base board
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.05, 2, 2, 1), baseMat);
  group.add(base);

  // Top stick (open)
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.05), stickMat);
  stick.position.y = 0.26;
  stick.rotation.z = 0.15;
  group.add(stick);

  // White stripes on stick
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.003), whiteMat);
    stripe.position.set(-0.22 + i * 0.145, 0.26, 0.04);
    stripe.rotation.z = 0.15;
    group.add(stripe);
  }

  // Stripes on base top
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.08, 0.003), whiteMat);
    stripe.position.set(-0.22 + i * 0.145, 0.18, 0.028);
    stripe.rotation.z = 0.15;
    group.add(stripe);
  }

  // Hinge
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 24), glossyMetal(0x666666, { roughness: 0.1 }));
  hinge.rotation.z = Math.PI / 2;
  hinge.position.y = 0.21;
  group.add(hinge);

  // Text area lines (simulated)
  const lineMat = mattePlastic(0xffffff, { roughness: 0.3 });
  for (let i = 0; i < 3; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.015, 0.002), lineMat);
    line.position.set(0, -0.02 - i * 0.06, 0.028);
    group.add(line);
  }

  return group;
}