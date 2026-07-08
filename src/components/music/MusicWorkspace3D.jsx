import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PURPLE, ORANGE, TEAL } from '../home/floating/materials.js';
import { createVinylRecord } from './workspace/VinylRecord.js';
import { createStudioSpeaker } from './workspace/StudioSpeaker.js';
import { createEqualizerBars } from './workspace/EqualizerBars.js';
import { createMicArm } from './workspace/MicArm.js';
import { createTurntable } from './workspace/Turntable.js';

export default function MusicWorkspace3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x05060a, 6, 20);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 6);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // ── Environment map for reflections ──
    const pmrem = new THREE.PMREMGenerator(renderer);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(0.3, '#2a1040');
    grad.addColorStop(0.5, '#1a1a2e');
    grad.addColorStop(0.7, '#0a0a1a');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = 'rgba(138, 43, 226, 0.35)';
    ctx.beginPath(); ctx.arc(200, 100, 120, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 140, 0, 0.3)';
    ctx.beginPath(); ctx.arc(800, 150, 100, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0, 206, 209, 0.25)';
    ctx.beginPath(); ctx.arc(500, 400, 120, 0, Math.PI * 2); ctx.fill();
    const envTex = new THREE.CanvasTexture(canvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.colorSpace = THREE.SRGBColorSpace;
    const envRT = pmrem.fromEquirectangular(envTex);
    scene.environment = envRT.texture;

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9090ff, 0.4);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, -1, -5);
    scene.add(rimLight);

    const pL = new THREE.PointLight(PURPLE, 3, 25);
    pL.position.set(-3, 1.5, 2);
    scene.add(pL);
    const oL = new THREE.PointLight(ORANGE, 2.5, 25);
    oL.position.set(3, -1, 2);
    scene.add(oL);
    const tL = new THREE.PointLight(TEAL, 2, 25);
    tL.position.set(0, 3, -1);
    scene.add(tL);

    // ── Scene objects ──
    const dynamicObjects = [];

    // Left speaker
    const leftSpeaker = createStudioSpeaker(PURPLE);
    leftSpeaker.position.set(-3.2, -0.5, -1);
    leftSpeaker.rotation.y = 0.3;
    leftSpeaker.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(leftSpeaker);

    // Right speaker
    const rightSpeaker = createStudioSpeaker(ORANGE);
    rightSpeaker.position.set(3.2, -0.5, -1);
    rightSpeaker.rotation.y = -0.3;
    rightSpeaker.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(rightSpeaker);

    // Center turntable
    const turntable = createTurntable(TEAL);
    turntable.position.set(0, -1.8, 0.5);
    turntable.rotation.x = -0.15;
    turntable.scale.setScalar(1.1);
    turntable.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(turntable);

    // Find the vinyl on the turntable and mark for spinning
    let turntableVinyl = null;
    turntable.traverse(c => {
      if (c.isGroup && c.children.length > 5 && !turntableVinyl) {
        // The vinyl is the first child group
        turntableVinyl = c;
      }
    });

    // Floating vinyl records
    const vinyl1 = createVinylRecord(PURPLE);
    vinyl1.position.set(-2.2, 1.5, -1.5);
    vinyl1.scale.setScalar(0.7);
    vinyl1.rotation.y = 0.3;
    vinyl1.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(vinyl1);
    dynamicObjects.push({ obj: vinyl1, floatSpeed: 0.4, floatOffset: 0, baseX: -2.2, baseY: 1.5, drift: 0.25, spinZ: 0.02, spinY: 0.01 });

    const vinyl2 = createVinylRecord(ORANGE);
    vinyl2.position.set(2.5, 1.2, -1.8);
    vinyl2.scale.setScalar(0.6);
    vinyl2.rotation.y = -0.2;
    vinyl2.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(vinyl2);
    dynamicObjects.push({ obj: vinyl2, floatSpeed: 0.35, floatOffset: 1.5, baseX: 2.5, baseY: 1.2, drift: 0.3, spinZ: 0.025, spinY: -0.008 });

    const vinyl3 = createVinylRecord(TEAL);
    vinyl3.position.set(-1.5, -0.8, -2.5);
    vinyl3.scale.setScalar(0.45);
    vinyl3.rotation.y = 0.5;
    vinyl3.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(vinyl3);
    dynamicObjects.push({ obj: vinyl3, floatSpeed: 0.3, floatOffset: 3, baseX: -1.5, baseY: -0.8, drift: 0.35, spinZ: 0.03, spinY: 0.012 });

    // Equalizer bars — center bottom
    const eq = createEqualizerBars(PURPLE);
    eq.position.set(0, -1.5, -0.5);
    eq.scale.setScalar(1.3);
    scene.add(eq);

    // Collect eq bars for animation
    const eqBars = [];
    eq.traverse(c => {
      if (c.isMesh && c.geometry.type === 'BoxGeometry' && c.userData.phase !== undefined) {
        eqBars.push(c);
      }
    });

    // Mic arm — right side
    const micArm = createMicArm(PURPLE);
    micArm.position.set(3.5, 1.5, -1.5);
    micArm.scale.setScalar(0.8);
    micArm.rotation.y = -0.4;
    micArm.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(micArm);

    // ── Floor plane (reflective dark surface) ──
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x06060a,
      metalness: 0.5,
      roughness: 0.4,
      clearcoat: 0.3,
      envMapIntensity: 0.5,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // ── Particles ──
    const particleCount = 50;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── Mouse parallax ──
    let mouseX = 0, mouseY = 0;
    let targetCamX = 0, targetCamY = 0.5;
    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let frameId;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Camera parallax
      targetCamX = mouseX * 0.6;
      targetCamY = 0.5 - mouseY * 0.3;
      camera.position.x += (targetCamX - camera.position.x) * 0.04;
      camera.position.y += (targetCamY - camera.position.y) * 0.04;
      camera.lookAt(0, -0.3, 0);

      // Floating objects
      dynamicObjects.forEach(m => {
        m.obj.position.x = m.baseX + Math.sin(elapsed * 0.3 + m.floatOffset) * m.drift;
        m.obj.position.y = m.baseY + Math.sin(elapsed * m.floatSpeed + m.floatOffset) * 0.3;
        m.obj.rotation.z += m.spinZ;
        m.obj.rotation.y += m.spinY;
      });

      // Spin turntable vinyl
      if (turntableVinyl) {
        turntableVinyl.rotation.z += 0.015;
      }

      // Animate equalizer bars
      eqBars.forEach(bar => {
        const h = 0.15 + Math.abs(Math.sin(elapsed * bar.userData.freq + bar.userData.phase)) * 0.5;
        bar.scale.y = h;
        bar.position.y = -0.2 + (h * 0.2);
      });

      particles.rotation.y = elapsed * 0.015;

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
      window.removeEventListener('mousemove', handleMouseMove);
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