import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const BOOK_COLORS = [
  0x5a2a2a, 0x2d4a2d, 0x2a3550, 0x6b4a22,
  0x3a3a3a, 0x4a2d4a, 0x2a4545, 0x5a3a1a,
  0x5a5520, 0x452a45,
];

function createBookshelf(side) {
  const group = new THREE.Group();
  const isLeft = side === 'left';
  const x = isLeft ? -5.5 : 5.5;
  group.position.set(x, 0, 0);
  group.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;

  // Back panel
  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 8, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x2a1f14, roughness: 0.95 })
  );
  backPanel.position.set(0, 2.5, 0);
  backPanel.receiveShadow = true;
  group.add(backPanel);

  // Shelf rows
  for (let r = 0; r < 5; r++) {
    const shelfY = r * 1.5 - 1;

    // Plank
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 0.12, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x3d2e1e, roughness: 0.9 })
    );
    plank.position.set(0, shelfY - 0.05, 0);
    plank.receiveShadow = true;
    plank.castShadow = true;
    group.add(plank);

    // Books
    let bx = isLeft ? 4 : -4;
    const dir = isLeft ? -1 : 1;
    for (let i = 0; i < 12; i++) {
      const ci = (i + r * 3 + (isLeft ? 0 : 5)) % BOOK_COLORS.length;
      const h = 1.2 + ((i * 11 + r * 7) % 9) * 0.12;
      const w = 0.35 + (i % 4) * 0.12;
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.4),
        new THREE.MeshStandardMaterial({ color: BOOK_COLORS[ci], roughness: 0.85, metalness: 0.05 })
      );
      book.position.set(bx + dir * w / 2, shelfY + h / 2, 0);
      book.castShadow = true;
      book.receiveShadow = true;
      group.add(book);
      bx += dir * (w + 0.02);
    }
  }

  return group;
}

function createDustParticles(count) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = Math.random() * 6 - 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    velocities.push({
      speed: 0.2 + Math.random() * 0.4,
      offset: Math.random() * 10,
      baseX: positions[i * 3],
      baseY: positions[i * 3 + 1],
    });
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffc080,
    size: 0.06,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.userData.velocities = velocities;
  return points;
}

export default function Workspace3DScene({ intensity = 'calm' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0804, 8, 22);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width || 1, height || 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x4a3520, 0.15));

    const dirLight = new THREE.DirectionalLight(0xffa060, 0.3);
    dirLight.position.set(3, 6, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const baseLight = intensity === 'assembling' ? 1.8 : intensity === 'active' ? 1.4 : 1.0;

    const ceilingLights = [];
    const lightPositions = [
      { pos: [-2, 3.5, 0], mult: 1.0 },
      { pos: [2, 3.5, 0], mult: 0.9 },
      { pos: [0, 3.5, -1], mult: 0.7 },
    ];
    lightPositions.forEach(({ pos, mult }) => {
      const light = new THREE.PointLight(0xffb060, baseLight * mult, 12, 2);
      light.position.set(...pos);
      scene.add(light);
      ceilingLights.push({ light, pos, mult });

      // Visible bulb
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xffa050, emissiveIntensity: 0.8 })
      );
      bulb.position.set(...pos);
      scene.add(bulb);
    });

    // Bookshelf walls
    const leftWall = createBookshelf('left');
    scene.add(leftWall);
    const rightWall = createBookshelf('right');
    scene.add(rightWall);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.95, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.6;
    floor.receiveShadow = true;
    scene.add(floor);

    // Desk surface
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.1, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x3d2e1e, roughness: 0.85 })
    );
    desk.position.set(0, -1.45, 2);
    desk.castShadow = true;
    desk.receiveShadow = true;
    scene.add(desk);

    // Desk lamp light
    const lampIntensity = intensity === 'assembling' ? 1.5 : intensity === 'active' ? 1.2 : 0.9;
    const lampLight = new THREE.PointLight(0xffc080, lampIntensity * 2, 6, 2);
    lampLight.position.set(0, 0.1, 2);
    scene.add(lampLight);

    // Lamp shade
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.7 })
    );
    lampShade.position.set(0, 0.1, 2);
    scene.add(lampShade);

    // Floating ambient orbs
    const orbs = [];
    [
      { pos: [-2, 2.5, -2], color: 0xffb060, emissive: 0xff9040, emissiveIntensity: 0.6, opacity: 0.3, radius: 0.3, speed: 1.5 },
      { pos: [2.5, 2, -1.5], color: 0xffa050, emissive: 0xff8030, emissiveIntensity: 0.5, opacity: 0.25, radius: 0.25, speed: 1.2 },
    ].forEach(({ pos, color, emissive, emissiveIntensity, opacity, radius, speed }) => {
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        new THREE.MeshStandardMaterial({
          color, emissive, emissiveIntensity, transparent: true, opacity,
        })
      );
      orb.position.set(...pos);
      orb.userData = { basePos: [...pos], speed };
      scene.add(orb);
      orbs.push(orb);
    });

    // Dust particles
    const particleCount = intensity === 'assembling' ? 80 : intensity === 'active' ? 50 : 30;
    const dust = createDustParticles(particleCount);
    scene.add(dust);

    // Mouse parallax
    let targetRotY = 0;
    let targetRotX = 0;
    const onMouseMove = (e) => {
      const rect = mount.getBoundingClientRect();
      targetRotY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.15;
      targetRotX = -((e.clientY - rect.top) / rect.height - 0.5) * 0.08;
    };
    mount.addEventListener('mousemove', onMouseMove);

    // Resize handler — use ResizeObserver for flex container changes
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    // Animation loop
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = performance.now() / 1000;

      // Camera parallax
      camera.rotation.y += (targetRotY - camera.rotation.y) * 0.04;
      camera.rotation.x += (targetRotX - camera.rotation.x) * 0.04;

      // Ceiling light flicker
      ceilingLights.forEach(({ light, pos, mult }) => {
        light.intensity = baseLight * mult * (0.85 + Math.sin(t * 0.5 + pos[0]) * 0.15);
      });

      // Orbs floating
      orbs.forEach((orb) => {
        const { basePos, speed } = orb.userData;
        orb.position.y = basePos[1] + Math.sin(t * speed) * 0.4;
        orb.position.x = basePos[0] + Math.cos(t * speed * 0.7) * 0.2;
      });

      // Dust particles
      const positions = dust.geometry.attributes.position.array;
      const velocities = dust.userData.velocities;
      for (let i = 0; i < velocities.length; i++) {
        const v = velocities[i];
        positions[i * 3] = v.baseX + Math.cos(t * v.speed * 0.7 + v.offset) * 0.3;
        positions[i * 3 + 1] = v.baseY + Math.sin(t * v.speed + v.offset) * 0.5;
      }
      dust.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener('mousemove', onMouseMove);
      resizeObserver.disconnect();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [intensity]);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />;
}