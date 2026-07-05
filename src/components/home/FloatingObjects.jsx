import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

function createFilmReel() {
  const group = new THREE.Group();
  const reelColor = 0x222222;
  const filmColor = 0x1a1a1a;

  // Outer ring (torus)
  const ringGeo = new THREE.TorusGeometry(0.55, 0.12, 16, 48);
  const reelMat = new THREE.MeshStandardMaterial({ color: reelColor, metalness: 0.7, roughness: 0.3 });
  const ring = new THREE.Mesh(ringGeo, reelMat);
  group.add(ring);

  // Center hub
  const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.24, 24);
  const hub = new THREE.Mesh(hubGeo, reelMat);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  // Center hole
  const holeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.26, 16);
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.5, roughness: 0.5 });
  const hole = new THREE.Mesh(holeGeo, holeMat);
  hole.rotation.x = Math.PI / 2;
  group.add(hole);

  // Film strip wrapping around — a thin torus slightly larger than reel
  const filmGeo = new THREE.TorusGeometry(0.5, 0.02, 8, 48);
  const filmMat = new THREE.MeshStandardMaterial({ color: filmColor, metalness: 0.2, roughness: 0.6, side: THREE.DoubleSide });
  const film = new THREE.Mesh(filmGeo, filmMat);
  group.add(film);

  // Perforation dots on film strip
  const perfGeo = new THREE.BoxGeometry(0.03, 0.04, 0.01);
  const perfMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
  for (let i = 0; i < 16; i++) {
    const perf = new THREE.Mesh(perfGeo, perfMat);
    const angle = (i / 16) * Math.PI * 2;
    perf.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0.02);
    perf.rotation.z = angle;
    group.add(perf);
  }

  // Spoke holes in the reel
  const spokeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.26, 8);
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(spokeGeo, holeMat);
    spoke.rotation.x = Math.PI / 2;
    const angle = (i / 6) * Math.PI * 2;
    spoke.position.set(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0);
    group.add(spoke);
  }

  return group;
}

function createPhone() {
  const group = new THREE.Group();
  const bodyColor = 0x1a1a2e;
  const screenColor = 0x0a0a14;

  // Body — rounded box
  const bodyGeo = new THREE.BoxGeometry(0.35, 0.7, 0.04);
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.8, roughness: 0.2 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Screen — slightly smaller, on top face
  const screenGeo = new THREE.BoxGeometry(0.3, 0.6, 0.01);
  const screenMat = new THREE.MeshStandardMaterial({
    color: screenColor,
    metalness: 0.5,
    roughness: 0.1,
    emissive: 0x8A2BE2,
    emissiveIntensity: 0.15,
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = 0.025;
  group.add(screen);

  // Camera bump
  const camGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
  const camMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
  const cam = new THREE.Mesh(camGeo, camMat);
  cam.position.set(-0.1, 0.25, 0.03);
  group.add(cam);

  // Camera lens
  const lensGeo = new THREE.CircleGeometry(0.02, 16);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.1 });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(-0.1, 0.25, 0.045);
  group.add(lens);

  return group;
}

function createMicrophone() {
  const group = new THREE.Group();
  const bodyColor = 0x2a2a2a;
  const grilleColor = 0x555555;

  // Handle
  const handleGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.45, 24);
  const handleMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.8, roughness: 0.25 });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.y = -0.25;
  group.add(handle);

  // Capsule (mic head) — sphere on top
  const headGeo = new THREE.SphereGeometry(0.13, 24, 24);
  const headMat = new THREE.MeshStandardMaterial({ color: grilleColor, metalness: 0.9, roughness: 0.15 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 0.1;
  group.add(head);

  // Grille lines — thin rings around the capsule
  const ringGeo = new THREE.TorusGeometry(0.13, 0.005, 6, 32);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.2 });
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(ringGeo, ringMat);
    r.position.y = 0.05 + i * 0.025;
    r.rotation.x = Math.PI / 2;
    group.add(r);
  }

  // Connector ring between head and handle
  const connGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16);
  const connMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.2 });
  const conn = new THREE.Mesh(connGeo, connMat);
  conn.position.y = -0.05;
  group.add(conn);

  return group;
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
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);
    const purpleLight = new THREE.PointLight(0x8A2BE2, 1.5, 20);
    purpleLight.position.set(-3, 2, 3);
    scene.add(purpleLight);
    const orangeLight = new THREE.PointLight(0xFF8C00, 1.0, 20);
    orangeLight.position.set(3, -2, 3);
    scene.add(orangeLight);
    const tealLight = new THREE.PointLight(0x00CED1, 0.8, 20);
    tealLight.position.set(0, 3, -2);
    scene.add(tealLight);

    // Create the three objects
    const filmReel = createFilmReel();
    const phone = createPhone();
    const mic = createMicrophone();

    // Position them around the viewport
    filmReel.position.set(-2.5, 0.5, 0);
    phone.position.set(2.5, -0.3, -0.5);
    mic.position.set(0, -1.5, 0.5);

    scene.add(filmReel);
    scene.add(phone);
    scene.add(mic);

    const meshes = [
      {
        obj: filmReel,
        floatSpeed: 0.5, floatOffset: 0,
        rotSpeed: { x: 0.002, y: 0.008, z: 0 },
        orbitRadius: 0.4, orbitSpeed: 0.08, orbitAngle: 0, baseX: -2.5, baseY: 0.5,
        spinSpeed: 0.01,
      },
      {
        obj: phone,
        floatSpeed: 0.4, floatOffset: Math.PI / 2,
        rotSpeed: { x: 0.001, y: 0.006, z: 0.002 },
        orbitRadius: 0.35, orbitSpeed: 0.06, orbitAngle: Math.PI, baseX: 2.5, baseY: -0.3,
        spinSpeed: 0,
      },
      {
        obj: mic,
        floatSpeed: 0.6, floatOffset: Math.PI,
        rotSpeed: { x: 0.001, y: 0.004, z: 0 },
        orbitRadius: 0.5, orbitSpeed: 0.05, orbitAngle: Math.PI / 2, baseX: 0, baseY: -1.5,
        spinSpeed: 0,
      },
    ];

    let frameId;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      meshes.forEach((m) => {
        const { floatSpeed, floatOffset, rotSpeed, orbitSpeed, orbitAngle, orbitRadius, baseX, baseY, spinSpeed } = m;
        // Gentle drift
        m.obj.position.x = baseX + Math.cos(elapsed * orbitSpeed + orbitAngle) * orbitRadius;
        m.obj.position.y = baseY + Math.sin(elapsed * floatSpeed + floatOffset) * 0.6;
        // Rotation
        m.obj.rotation.x += rotSpeed.x;
        m.obj.rotation.y += rotSpeed.y;
        m.obj.rotation.z += rotSpeed.z;
        // Spin (film reel especially)
        if (spinSpeed) m.obj.rotation.z += spinSpeed;
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