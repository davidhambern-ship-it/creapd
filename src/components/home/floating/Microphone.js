import * as THREE from 'three';
import { brushedMetal, glossyMetal, mattePlastic } from './materials.js';

export function createMicrophone(color) {
  const group = new THREE.Group();
  const bodyMat = brushedMetal(color, { metalness: 0.85, roughness: 0.2, clearcoat: 0.4 });
  const grilleMat = glossyMetal(0x333333, { roughness: 0.12, clearcoat: 0.6 });
  const darkMat = mattePlastic(0x111111, { roughness: 0.4 });

  // Handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.4, 48), bodyMat);
  handle.position.y = -0.22;
  group.add(handle);

  // Knurled grip rings
  const ringGeo = new THREE.TorusGeometry(0.058, 0.004, 8, 64);
  for (let i = 0; i < 8; i++) {
    const r = new THREE.Mesh(ringGeo, darkMat);
    r.position.y = -0.35 + i * 0.03;
    r.rotation.x = Math.PI / 2;
    group.add(r);
  }

  // Connector collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.04, 48), glossyMetal(0x444444, { roughness: 0.15 }));
  collar.position.y = -0.02;
  group.add(collar);

  // Shock mount hoops
  const mountMat = glossyMetal(0x555555, { roughness: 0.2 });
  const mount1 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 12, 64), mountMat);
  mount1.rotation.y = Math.PI / 2;
  mount1.position.y = 0.1;
  group.add(mount1);
  const mount2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 12, 64), mountMat);
  mount2.rotation.y = Math.PI / 2;
  mount2.position.y = 0.04;
  group.add(mount2);

  // Capsule
  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 48), grilleMat);
  capsule.position.y = 0.08;
  group.add(capsule);

  // Grille ribs
  const ribGeo = new THREE.TorusGeometry(0.112, 0.003, 8, 64);
  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Mesh(ribGeo, darkMat);
    rib.position.y = 0.02 + i * 0.018;
    rib.rotation.x = Math.PI / 2;
    group.add(rib);
  }

  // Top cap (dome)
  const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), grilleMat);
  topCap.position.y = 0.16;
  group.add(topCap);

  // Logo band
  const logoBand = new THREE.Mesh(new THREE.CylinderGeometry(0.051, 0.051, 0.025, 48), glossyMetal(color, { roughness: 0.1, clearcoat: 0.8 }));
  logoBand.position.y = -0.08;
  group.add(logoBand);

  // XLR connector
  const xlr = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 32), glossyMetal(0x333333, { roughness: 0.2 }));
  xlr.position.y = -0.44;
  group.add(xlr);

  // XLR pins
  const pinGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.015, 8);
  const pinMat = glossyMetal(0x888888, { roughness: 0.05 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(Math.cos(a) * 0.018, -0.46, Math.sin(a) * 0.018);
    group.add(pin);
  }

  return group;
}