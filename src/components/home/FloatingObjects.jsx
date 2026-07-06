import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PURPLE, ORANGE, TEAL } from './floating/materials.js';
import { createFilmReel } from './floating/FilmReel.js';
import { createPhone } from './floating/Phone.js';
import { createMicrophone } from './floating/Microphone.js';
import { createClapperboard } from './floating/Clapperboard.js';
import { createHeadphones } from './floating/Headphones.js';
import { createCamera } from './floating/Camera.js';
import { createBroadcastTower } from './floating/BroadcastTower.js';
import { createFilmStrip } from './floating/FilmStrip.js';

const OBJECTS = [
  { builder: () => createFilmReel(PURPLE), pos: [-3.4, 1.3, -1.2], scale: 1.0, spin: 0.006 },
  { builder: () => createPhone(ORANGE), pos: [3.3, 1.0, 0.4], scale: 1.0, spin: 0 },
  { builder: () => createMicrophone(TEAL), pos: [-2.8, -1.6, 0.2], scale: 1.0, spin: 0 },
  { builder: () => createClapperboard(PURPLE), pos: [2.9, -1.4, -0.6], scale: 0.9, spin: 0 },
  { builder: () => createHeadphones(ORANGE), pos: [-0.5, 2.0, -1.8], scale: 0.8, spin: 0 },
  { builder: () => createCamera(TEAL), pos: [3.6, -0.3, -1.4], scale: 0.8, spin: 0 },
  { builder: () => createBroadcastTower(PURPLE), pos: [0.8, 2.2, -2.2], scale: 0.7, spin: 0 },
  { builder: () => createFilmStrip(ORANGE), pos: [-3.6, 0.2, 0.8], scale: 0.9, spin: 0 },
  { builder: () => createHeadphones(TEAL), pos: [3.2, 2.0, -1.0], scale: 0.6, spin: 0 },
  { builder: () => createCamera(PURPLE), pos: [-1.5, -2.3, -1.2], scale: 0.65, spin: 0 },
];

export default function FloatingObjects() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    // ── Environment map for realistic reflections ──
    const pmrem = new THREE.PMREMGenerator(renderer);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(0.25, '#2a1040');
    grad.addColorStop(0.5, '#1a1a2e');
    grad.addColorStop(0.7, '#0a0a1a');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);
    // Light blobs for reflection highlights
    ctx.fillStyle = 'rgba(138, 43, 226, 0.35)';
    ctx.beginPath(); ctx.arc(200, 100, 120, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 140, 0, 0.3)';
    ctx.beginPath(); ctx.arc(800, 150, 100, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0, 206, 209, 0.25)';
    ctx.beginPath(); ctx.arc(500, 400, 120, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath(); ctx.arc(350, 200, 50, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath(); ctx.arc(700, 300, 40, 0, Math.PI * 2); ctx.fill();
    const envTex = new THREE.CanvasTexture(canvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.colorSpace = THREE.SRGBColorSpace;
    const envRT = pmrem.fromEquirectangular(envTex);
    scene.environment = envRT.texture;

    // ── Lighting rig ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9090ff, 0.5);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // Brand-colored accent lights
    const pL = new THREE.PointLight(PURPLE, 2.5, 30);
    pL.position.set(-3, 2, 3);
    scene.add(pL);
    const oL = new THREE.PointLight(ORANGE, 2.0, 30);
    oL.position.set(3, -2, 3);
    scene.add(oL);
    const tL = new THREE.PointLight(TEAL, 1.5, 30);
    tL.position.set(0, 4, -2);
    scene.add(tL);

    // ── Create objects ──
    const meshes = OBJECTS.map((o, i) => {
      const obj = o.builder();
      obj.position.set(...o.pos);
      obj.scale.setScalar(o.scale);

      scene.add(obj);
      return {
        obj,
        floatSpeed: 0.35 + (i % 3) * 0.12,
        floatOffset: (i * 1.3) % (Math.PI * 2),
        rotSpeed: {
          x: (Math.random() - 0.5) * 0.004,
          y: (Math.random() - 0.5) * 0.005,
          z: (Math.random() - 0.5) * 0.003,
        },
        spin: o.spin,
        baseX: o.pos[0],
        baseY: o.pos[1],
        drift: 0.3 + (i % 3) * 0.15,
      };
    });

    // ── Subtle accent particles for depth ──
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.015,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    let frameId;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      meshes.forEach((m) => {
        m.obj.position.x = m.baseX + Math.sin(elapsed * 0.3 + m.floatOffset) * m.drift;
        m.obj.position.y = m.baseY + Math.sin(elapsed * m.floatSpeed + m.floatOffset) * 0.45;
        m.obj.rotation.x += m.rotSpeed.x;
        m.obj.rotation.y += m.rotSpeed.y;
        if (m.spin) m.obj.rotation.z += m.spin;
        else m.obj.rotation.z += m.rotSpeed.z;
      });
      particles.rotation.y = elapsed * 0.02;
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
      pmrem.dispose();
      envTex.dispose();
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