import * as THREE from 'three';
import { glossyMetal, brushedMetal, mattePlastic, rubberMat } from '../../home/floating/materials.js';

export function createStudioSpeaker(color) {
  const group = new THREE.Group();
  const cabinetMat = brushedMetal(0x1a1a1a, { metalness: 0.7, roughness: 0.3, clearcoat: 0.4 });
  const wooferMat = rubberMat(0x050505);
  const tweeterMat = glossyMetal(color, { roughness: 0.1, clearcoat: 0.8 });
  const portMat = mattePlastic(0x0a0a0a);

  // Cabinet body
  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.55, 0.28),
    cabinetMat
  );
  group.add(cabinet);

  // Front baffle plate
  const baffle = new THREE.Mesh(
    new THREE.BoxGeometry(0.33, 0.56, 0.01),
    brushedMetal(0x222222, { metalness: 0.6, roughness: 0.2, clearcoat: 0.5 })
  );
  baffle.position.z = 0.14;
  group.add(baffle);

  // Woofer cone (large)
  const wooferOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.14, 0.04, 48),
    glossyMetal(0x111111, { roughness: 0.2 })
  );
  wooferOuter.rotation.x = Math.PI / 2;
  wooferOuter.position.set(0, -0.08, 0.15);
  group.add(wooferOuter);

  const wooferCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.03, 48),
    wooferMat
  );
  wooferCone.rotation.x = -Math.PI / 2;
  wooferCone.position.set(0, -0.08, 0.165);
  group.add(wooferCone);

  const wooferDust = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 24, 16),
    glossyMetal(color, { roughness: 0.1, clearcoat: 0.7 })
  );
  wooferDust.position.set(0, -0.08, 0.18);
  group.add(wooferDust);

  // Tweeter (small, top)
  const tweeterRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.008, 16, 48),
    glossyMetal(0x333333, { roughness: 0.05 })
  );
  tweeterRing.position.set(0, 0.12, 0.15);
  group.add(tweeterRing);

  const tweeter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.035, 0.02, 48),
    tweeterMat
  );
  tweeter.rotation.x = Math.PI / 2;
  tweeter.position.set(0, 0.12, 0.155);
  group.add(tweeter);

  // Bass reflex port
  const port = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.03, 32),
    portMat
  );
  port.rotation.x = Math.PI / 2;
  port.position.set(0, 0.18, 0.15);
  group.add(port);

  // Power LED
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.008, 12, 8),
    new THREE.MeshPhysicalMaterial({
      color: 0x00ff66,
      emissive: 0x00ff44,
      emissiveIntensity: 3,
      metalness: 0,
      roughness: 0.3,
    })
  );
  led.position.set(0.12, -0.22, 0.15);
  group.add(led);

  return group;
}