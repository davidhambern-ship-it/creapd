import * as THREE from 'three';
import { glossyMetal, brushedMetal, mattePlastic, rubberMat } from '../../home/floating/materials.js';

export function createMicArm(color) {
  const group = new THREE.Group();
  const armMat = brushedMetal(0x333333, { metalness: 0.8, roughness: 0.25, clearcoat: 0.4 });
  const micBodyMat = glossyMetal(color, { roughness: 0.12, clearcoat: 0.7 });
  const grilleMat = mattePlastic(0x0a0a0a, { roughness: 0.5 });
  const cableMat = rubberMat(0x080808);

  // Mount base clamp
  const clamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.05),
    armMat
  );
  clamp.position.set(0, -1.0, 0);
  group.add(clamp);

  // Lower arm segment
  const lowerArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.7, 16),
    armMat
  );
  lowerArm.position.set(0.1, -0.6, 0);
  lowerArm.rotation.z = -0.6;
  group.add(lowerArm);

  // Elbow joint
  const elbow = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 20, 16),
    glossyMetal(0x444444, { roughness: 0.08 })
  );
  elbow.position.set(0.42, -0.35, 0);
  group.add(elbow);

  // Upper arm segment
  const upperArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.015, 0.6, 16),
    armMat
  );
  upperArm.position.set(0.6, -0.1, 0);
  upperArm.rotation.z = 0.7;
  group.add(upperArm);

  // Mic swivel joint
  const swivel = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 16, 12),
    glossyMetal(0x555555, { roughness: 0.08 })
  );
  swivel.position.set(0.78, 0.15, 0);
  group.add(swivel);

  // Mic body
  const micBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.06, 0.18, 32),
    micBodyMat
  );
  micBody.position.set(0.78, 0.32, 0);
  micBody.rotation.z = -0.3;
  group.add(micBody);

  // Mic grille
  const grille = new THREE.Mesh(
    new THREE.SphereGeometry(0.058, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    grilleMat
  );
  grille.position.set(0.72, 0.38, 0);
  grille.rotation.z = -0.3;
  group.add(grille);

  // Grille mesh detail rings
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.055 - i * 0.008, 0.002, 8, 32),
      glossyMetal(0x222222, { roughness: 0.1 })
    );
    ring.position.set(0.72 + Math.sin(-0.3) * (0.02 + i * 0.02), 0.38 + Math.cos(-0.3) * (0.02 + i * 0.02), 0);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = -0.3;
    group.add(ring);
  }

  // Cable — curved tube from mic to base
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.78, 0.24, 0),
    new THREE.Vector3(0.5, -0.2, -0.02),
    new THREE.Vector3(0.2, -0.6, -0.01),
    new THREE.Vector3(0.05, -0.9, 0),
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 40, 0.008, 8, false);
  const cable = new THREE.Mesh(cableGeo, cableMat);
  group.add(cable);

  return group;
}