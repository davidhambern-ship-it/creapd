import * as THREE from 'three';
import { glossyMetal, mattePlastic } from '../../home/floating/materials.js';

export function createVinylRecord(color) {
  const group = new THREE.Group();
  const discMat = glossyMetal(0x0a0a0a, { roughness: 0.15, clearcoat: 0.8 });
  const labelMat = glossyMetal(color, { roughness: 0.1, clearcoat: 0.9 });
  const centerMat = glossyMetal(0x444444, { roughness: 0.05 });
  const grooveMat = mattePlastic(0x111111, { roughness: 0.4 });

  // Main disc
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.015, 100), discMat);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  // Grooves — concentric rings
  for (let i = 0; i < 8; i++) {
    const r = 0.18 + i * 0.035;
    const groove = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.004, 8, 80),
      grooveMat
    );
    groove.position.z = 0.008;
    group.add(groove);
  }

  // Center label
  const label = new THREE.Mesh(new THREE.CircleGeometry(0.16, 64), labelMat);
  label.position.z = 0.009;
  group.add(label);

  // Label inner ring
  const labelRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.005, 8, 64),
    glossyMetal(0x222222, { roughness: 0.08 })
  );
  labelRing.position.z = 0.01;
  group.add(labelRing);

  // Center spindle hole
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.04, 24),
    centerMat
  );
  hole.rotation.x = Math.PI / 2;
  hole.position.z = 0.005;
  group.add(hole);

  // Reflective sheen highlight (thin arc)
  const sheenGeo = new THREE.RingGeometry(0.2, 0.48, 40, 1, 0, Math.PI * 0.3);
  const sheenMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    envMapIntensity: 2,
  });
  const sheen = new THREE.Mesh(sheenGeo, sheenMat);
  sheen.position.z = 0.0085;
  group.add(sheen);

  return group;
}