import * as THREE from 'three';
import { glossyMetal, brushedMetal, mattePlastic, rubberMat } from '../../home/floating/materials.js';
import { createVinylRecord } from './VinylRecord.js';

export function createTurntable(color) {
  const group = new THREE.Group();
  const plinthMat = brushedMetal(0x1a1a1a, { metalness: 0.6, roughness: 0.3, clearcoat: 0.3 });
  const platterMat = glossyMetal(0x111111, { roughness: 0.12, clearcoat: 0.7 });
  const tonearmMat = brushedMetal(0x444444, { metalness: 0.8, roughness: 0.2 });

  // Plinth (base)
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.06, 0.65),
    plinthMat
  );
  group.add(plinth);

  // Platter
  const platter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.02, 64),
    platterMat
  );
  platter.position.set(-0.1, 0.04, 0);
  group.add(platter);

  // Vinyl on platter
  const vinyl = createVinylRecord(color);
  vinyl.position.set(-0.1, 0.055, 0);
  vinyl.scale.setScalar(0.55);
  group.add(vinyl);

  // Spindle
  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.06, 16),
    glossyMetal(0x888888, { roughness: 0.05 })
  );
  spindle.position.set(-0.1, 0.06, 0);
  group.add(spindle);

  // Tonearm base
  const tonearmBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.035, 0.06, 24),
    tonearmMat
  );
  tonearmBase.position.set(0.28, 0.05, 0.15);
  group.add(tonearmBase);

  // Tonearm pivot
  const pivot = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 20, 16),
    glossyMetal(0x555555, { roughness: 0.08 })
  );
  pivot.position.set(0.28, 0.09, 0.15);
  group.add(pivot);

  // Tonearm arm
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.4, 12),
    tonearmMat
  );
  arm.position.set(0.1, 0.1, 0.07);
  arm.rotation.z = 0.5;
  group.add(arm);

  // Cartridge head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.015, 0.02),
    glossyMetal(color, { roughness: 0.1 })
  );
  head.position.set(-0.07, 0.075, 0.01);
  head.rotation.z = 0.5;
  group.add(head);

  // Control buttons
  const btnMat = mattePlastic(0x0a0a0a, { roughness: 0.4 });
  const speed33 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.008, 16),
    btnMat
  );
  speed33.rotation.x = Math.PI / 2;
  speed33.position.set(0.3, 0.035, -0.2);
  group.add(speed33);

  const speed45 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.008, 16),
    btnMat
  );
  speed45.rotation.x = Math.PI / 2;
  speed45.position.set(0.3, 0.035, -0.15);
  group.add(speed45);

  return group;
}