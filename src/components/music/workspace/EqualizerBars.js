import * as THREE from 'three';
import { glossyMetal } from '../../home/floating/materials.js';

export function createEqualizerBars(baseColor) {
  const group = new THREE.Group();
  const barCount = 9;
  const spacing = 0.075;

  for (let i = 0; i < barCount; i++) {
    const t = i / (barCount - 1);
    // Gradient from baseColor to teal
    const c = new THREE.Color(baseColor).lerp(new THREE.Color(0x00CED1), t * 0.5);
    const barMat = new THREE.MeshPhysicalMaterial({
      color: c,
      metalness: 0.8,
      roughness: 0.1,
      clearcoat: 0.6,
      emissive: c,
      emissiveIntensity: 0.3,
      envMapIntensity: 1.5,
    });

    // Main bar
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.4, 0.045),
      barMat
    );
    bar.position.x = (i - (barCount - 1) / 2) * spacing;
    bar.userData.baseY = 0;
    bar.userData.phase = i * 0.4;
    bar.userData.freq = 1.5 + (i % 3) * 0.3;
    group.add(bar);

    // Base socket
    const socket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, 0.02, 16),
      glossyMetal(0x222222, { roughness: 0.1 })
    );
    socket.position.set((i - (barCount - 1) / 2) * spacing, -0.22, 0);
    group.add(socket);
  }

  // Base rail
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(barCount * spacing + 0.05, 0.015, 0.08),
    glossyMetal(0x1a1a1a, { roughness: 0.15, clearcoat: 0.4 })
  );
  rail.position.y = -0.24;
  group.add(rail);

  return group;
}