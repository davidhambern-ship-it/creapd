import * as THREE from 'three';
import { glossyMetal, mattePlastic } from './materials.js';

export function createFilmReel(color) {
  const group = new THREE.Group();
  const reelMat = glossyMetal(color, { roughness: 0.12, clearcoat: 0.6 });
  const darkMat = mattePlastic(0x0a0a0a, { roughness: 0.5 });
  const filmMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1208, metalness: 0.2, roughness: 0.4, side: THREE.DoubleSide, envMapIntensity: 0.5, clearcoat: 0.3 });

  // Outer flanges
  const flangeGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 80);
  const flange1 = new THREE.Mesh(flangeGeo, reelMat);
  flange1.rotation.x = Math.PI / 2;
  flange1.position.z = 0.08;
  group.add(flange1);
  const flange2 = new THREE.Mesh(flangeGeo, reelMat);
  flange2.rotation.x = Math.PI / 2;
  flange2.position.z = -0.08;
  group.add(flange2);

  // Outer rims
  const rimGeo = new THREE.TorusGeometry(0.48, 0.045, 32, 80);
  const rim1 = new THREE.Mesh(rimGeo, reelMat);
  rim1.position.z = 0.08;
  group.add(rim1);
  const rim2 = new THREE.Mesh(rimGeo, reelMat);
  rim2.position.z = -0.08;
  group.add(rim2);

  // Center hub
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 56), reelMat);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  // Center hole
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 32), darkMat);
  hole.rotation.x = Math.PI / 2;
  group.add(hole);

  // Spoke holes
  const spokeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.24, 24);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(spokeGeo, darkMat);
    s.rotation.x = Math.PI / 2;
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0);
    group.add(s);
  }

  // Coiled film
  const filmCoil = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.065, 24, 80), filmMat);
  filmCoil.scale.set(1, 1, 0.5);
  group.add(filmCoil);

  // Film tail
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.35, 0.003), filmMat);
  tail.position.set(0.4, -0.17, 0);
  tail.rotation.z = -0.3;
  group.add(tail);

  // Center cap screw
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 16), glossyMetal(0x666666, { roughness: 0.05 }));
  screw.rotation.x = Math.PI / 2;
  screw.position.z = 0.1;
  group.add(screw);

  return group;
}