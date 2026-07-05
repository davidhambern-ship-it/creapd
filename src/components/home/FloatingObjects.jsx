import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const SHAPES = [
  { type: 'octahedron', color: 0x8A2BE2, size: 0.5 },  // berna-purple
  { type: 'octahedron', color: 0xFF8C00, size: 0.35 }, // berna-orange
  { type: 'octahedron', color: 0x00CED1, size: 0.4 },  // teal
  { type: 'tetrahedron', color: 0x8A2BE2, size: 0.45 },
  { type: 'tetrahedron', color: 0xFF8C00, size: 0.3 },
  { type: 'icosahedron', color: 0x00CED1, size: 0.32 },
  { type: 'icosahedron', color: 0x8A2BE2, size: 0.28 },
  { type: 'torus', color: 0xFF8C00, size: 0.38 },
];

function createGeometry(type, size) {
  const s = Math.max(0.1, size);
  switch (type) {
    case 'octahedron': return new THREE.OctahedronGeometry(s);
    case 'tetrahedron': return new THREE.TetrahedronGeometry(s);
    case 'icosahedron': return new THREE.IcosahedronGeometry(s);
    case 'torus': return new THREE.TorusGeometry(s, s * 0.3, 8, 16);
    default: return new THREE.OctahedronGeometry(s);
  }
}

export default function FloatingObjects() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);
    const purpleLight = new THREE.PointLight(0x8A2BE2, 1.2, 15);
    purpleLight.position.set(-3, 2, 3);
    scene.add(purpleLight);
    const orangeLight = new THREE.PointLight(0xFF8C00, 0.9, 15);
    orangeLight.position.set(3, -2, 3);
    scene.add(orangeLight);

    // Create objects
    const meshes = SHAPES.map((shape, i) => {
      const geometry = createGeometry(shape.type, shape.size);
      const material = new THREE.MeshStandardMaterial({
        color: shape.color,
        metalness: 0.6,
        roughness: 0.25,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(geometry, material);
      // Spread around the hero area in a loose orbit
      const angle = (i / SHAPES.length) * Math.PI * 2;
      const radius = 3 + (i % 3) * 0.6;
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.6,
        (i % 2 === 0 ? 1 : -1) * (1 + (i % 2))
      );
      mesh.userData = {
        floatSpeed: 0.4 + Math.random() * 0.6,
        floatOffset: Math.random() * Math.PI * 2,
        rotSpeed: {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01,
        },
        orbitSpeed: 0.05 + Math.random() * 0.08,
        orbitAngle: angle,
        orbitRadius: radius,
        baseY: mesh.position.y,
      };
      scene.add(mesh);
      return mesh;
    });

    let frameId;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      meshes.forEach((mesh) => {
        const { floatSpeed, floatOffset, rotSpeed, orbitSpeed, orbitAngle, orbitRadius, baseY } = mesh.userData;
        // Orbit
        const angle = orbitAngle + elapsed * orbitSpeed;
        mesh.position.x = Math.cos(angle) * orbitRadius;
        mesh.position.z = Math.sin(angle) * orbitRadius * 0.5;
        // Float up/down
        mesh.position.y = baseY + Math.sin(elapsed * floatSpeed + floatOffset) * 0.6;
        // Rotate
        mesh.rotation.x += rotSpeed.x;
        mesh.rotation.y += rotSpeed.y;
        mesh.rotation.z += rotSpeed.z;
      });
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      meshes.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}