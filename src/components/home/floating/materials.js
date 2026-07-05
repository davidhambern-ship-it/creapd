import * as THREE from 'three';

const PURPLE = 0x8A2BE2;
const ORANGE = 0xFF8C00;
const TEAL = 0x00CED1;

export function brushedMetal(color, { metalness = 0.9, roughness = 0.3, clearcoat = 0 } = {}) {
  return new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat, clearcoatRoughness: 0.1, envMapIntensity: 1.0 });
}

export function glossyMetal(color, { metalness = 0.95, roughness = 0.08, clearcoat = 0.5 } = {}) {
  return new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat, clearcoatRoughness: 0.05, envMapIntensity: 1.5 });
}

export function mattePlastic(color, { roughness = 0.6 } = {}) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0.1, roughness, clearcoat: 0, envMapIntensity: 0.4 });
}

export function glassMat(color, { emissive = 0x000000, emissiveIntensity = 0.2, clearcoat = 1.0 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.3,
    roughness: 0.05,
    emissive,
    emissiveIntensity,
    clearcoat,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.8,
    reflectivity: 0.8,
  });
}

export function rubberMat(color) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0.0, roughness: 0.9, clearcoat: 0, envMapIntensity: 0.3 });
}

export { PURPLE, ORANGE, TEAL };