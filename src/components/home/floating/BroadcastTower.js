import * as THREE from 'three';
import { glossyMetal, glassMat, mattePlastic } from './materials.js';

export function createBroadcastTower(color) {
  const group = new THREE.Group();
  const mat = glossyMetal(color, { roughness: 0.2, clearcoat: 0.4 });
  const darkMat = mattePlastic(0x222222, { roughness: 0.4 });

  // Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.028, 0.85, 16), mat);
  group.add(mast);

  // Cross arms + diagonals
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.32 - i * 0.06, 0.015, 0.015), mat);
    arm.position.y = 0.25 - i * 0.22;
    group.add(arm);
    const d1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.25, 0.008), mat);
    d1.position.set(0.08, 0.25 - i * 0.22 - 0.1, 0);
    d1.rotation.z = 0.5;
    group.add(d1);
    const d2 = d1.clone();
    d2.position.x = -0.08;
    d2.rotation.z = -0.5;
    group.add(d2);
  }

  // Top antenna
  const ant = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 16), mat);
  ant.position.y = 0.48;
  group.add(ant);

  // Warning light (emissive red)
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 16), glassMat(0xff0000, { emissive: 0xff0000, emissiveIntensity: 1.0 }));
  light.position.y = 0.56;
  group.add(light);

  // Dish
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glossyMetal(color, { roughness: 0.25, clearcoat: 0.3 }));
  dish.position.set(0.14, 0.12, 0);
  dish.rotation.z = -Math.PI / 3;
  group.add(dish);

  // Dish receiver
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 12), mat);
  arm.position.set(0.14, 0.12, 0.06);
  arm.rotation.x = Math.PI / 2;
  group.add(arm);
  const receiver = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 16), darkMat);
  receiver.position.set(0.14, 0.12, 0.11);
  group.add(receiver);

  return group;
}