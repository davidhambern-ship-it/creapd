import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PURPLE = 0x8A2BE2;
const ORANGE = 0xFF8C00;
const TEAL = 0x00CED1;

function metalMat(color, { metalness = 0.7, roughness = 0.3, opacity = 0.9 } = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, transparent: true, opacity });
}

function createFilmReel(color) {
  const group = new THREE.Group();
  const reelMat = metalMat(color, { metalness: 0.8, roughness: 0.25 });
  const darkMat = metalMat(0x111111, { metalness: 0.5, roughness: 0.5, opacity: 0.95 });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 16, 48), reelMat);
  group.add(ring);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 24), reelMat);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 16), darkMat);
  hole.rotation.x = Math.PI / 2;
  group.add(hole);
  const film = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.018, 8, 48), darkMat);
  group.add(film);
  // perforations
  const perfGeo = new THREE.BoxGeometry(0.025, 0.035, 0.008);
  for (let i = 0; i < 16; i++) {
    const perf = new THREE.Mesh(perfGeo, darkMat);
    const a = (i / 16) * Math.PI * 2;
    perf.position.set(Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0.015);
    perf.rotation.z = a;
    group.add(perf);
  }
  // spoke holes
  const spokeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(spokeGeo, darkMat);
    s.rotation.x = Math.PI / 2;
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0);
    group.add(s);
  }
  return group;
}

function createPhone(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.64, 0.035), metalMat(color, { metalness: 0.85, roughness: 0.15 }));
  group.add(body);
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.27, 0.54, 0.008),
    new THREE.MeshStandardMaterial({ color: 0x0a0a14, metalness: 0.5, roughness: 0.1, emissive: color, emissiveIntensity: 0.2, transparent: true, opacity: 0.95 })
  );
  screen.position.z = 0.022;
  group.add(screen);
  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.018), metalMat(0x111111, { metalness: 0.9, roughness: 0.1 }));
  cam.position.set(-0.09, 0.22, 0.027);
  group.add(cam);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), metalMat(0x333333, { metalness: 0.9, roughness: 0.1 }));
  lens.position.set(-0.09, 0.22, 0.04);
  group.add(lens);
  return group;
}

function createMicrophone(color) {
  const group = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.42, 24), metalMat(color, { metalness: 0.8, roughness: 0.25 }));
  handle.position.y = -0.22;
  group.add(handle);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 24), metalMat(color, { metalness: 0.9, roughness: 0.15 }));
  head.position.y = 0.1;
  group.add(head);
  const ringGeo = new THREE.TorusGeometry(0.12, 0.004, 6, 32);
  const ringMat = metalMat(0x222222, { metalness: 0.9, roughness: 0.2, opacity: 0.9 });
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(ringGeo, ringMat);
    r.position.y = 0.05 + i * 0.025;
    r.rotation.x = Math.PI / 2;
    group.add(r);
  }
  const conn = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16), metalMat(0x333333, { metalness: 0.9, roughness: 0.2 }));
  conn.position.y = -0.04;
  group.add(conn);
  return group;
}

function createClapperboard(color) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.04), metalMat(color, { metalness: 0.6, roughness: 0.35 }));
  group.add(base);
  // top striped stick
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.05), metalMat(0x111111, { metalness: 0.5, roughness: 0.4 }));
  stick.position.y = 0.25;
  stick.rotation.z = 0.12;
  group.add(stick);
  // diagonal stripes on stick
  const stripeMat = metalMat(0xffffff, { metalness: 0.3, roughness: 0.4, opacity: 0.85 });
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.005), stripeMat);
    stripe.position.set(-0.22 + i * 0.14, 0.25, 0.04);
    stripe.rotation.z = 0.12;
    group.add(stripe);
  }
  return group;
}

function createHeadphones(color) {
  const group = new THREE.Group();
  const bandMat = metalMat(color, { metalness: 0.7, roughness: 0.25 });
  // band — half torus
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 12, 32, Math.PI), bandMat);
  band.position.y = 0.05;
  group.add(band);
  // ear cups
  const cupGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 24);
  const left = new THREE.Mesh(cupGeo, bandMat);
  left.rotation.z = Math.PI / 2;
  left.position.set(-0.22, 0.05, 0);
  group.add(left);
  const right = new THREE.Mesh(cupGeo, bandMat);
  right.rotation.z = Math.PI / 2;
  right.position.set(0.22, 0.05, 0);
  group.add(right);
  // ear cushions
  const cushMat = metalMat(0x111111, { metalness: 0.3, roughness: 0.6, opacity: 0.9 });
  const lc = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 24), cushMat);
  lc.rotation.z = Math.PI / 2;
  lc.position.set(-0.25, 0.05, 0);
  group.add(lc);
  const rc = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 24), cushMat);
  rc.rotation.z = Math.PI / 2;
  rc.position.set(0.25, 0.05, 0);
  group.add(rc);
  return group;
}

function createCamera(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.18), metalMat(color, { metalness: 0.75, roughness: 0.2 }));
  group.add(body);
  // lens
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 24), metalMat(0x111111, { metalness: 0.9, roughness: 0.1 }));
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.17;
  group.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), new THREE.MeshStandardMaterial({ color: 0x0a0a14, metalness: 0.9, roughness: 0.05, emissive: color, emissiveIntensity: 0.15, transparent: true, opacity: 0.9 }));
  glass.position.z = 0.25;
  group.add(glass);
  // top viewfinder bump
  const bump = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), metalMat(color, { metalness: 0.75, roughness: 0.2 }));
  bump.position.set(0.05, 0.18, 0);
  group.add(bump);
  return group;
}

function createBroadcastTower(color) {
  const group = new THREE.Group();
  const mat = metalMat(color, { metalness: 0.8, roughness: 0.2 });
  // mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.8, 8), mat);
  group.add(mast);
  // cross arms
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3 - i * 0.06, 0.02, 0.02), mat);
    arm.position.y = 0.2 - i * 0.2;
    group.add(arm);
  }
  // top antenna
  const ant = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 8), mat);
  ant.position.y = 0.45;
  group.add(ant);
  // dish
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), metalMat(color, { metalness: 0.6, roughness: 0.3 }));
  dish.position.set(0.12, 0.15, 0);
  dish.rotation.z = -Math.PI / 3;
  group.add(dish);
  return group;
}

function createFilmStrip(color) {
  const group = new THREE.Group();
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.01), metalMat(0x111111, { metalness: 0.3, roughness: 0.5, opacity: 0.9 }));
  group.add(strip);
  // frames
  const frameMat = metalMat(color, { metalness: 0.5, roughness: 0.3, opacity: 0.7 });
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.008), frameMat);
    f.position.set(-0.25 + i * 0.125, 0, 0.008);
    group.add(f);
  }
  // perforations top and bottom
  const perfMat = metalMat(0x000000, { opacity: 0.9 });
  for (let i = 0; i < 10; i++) {
    const pt = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.005), perfMat);
    pt.position.set(-0.32 + i * 0.07, 0.045, 0.008);
    group.add(pt);
    const pb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.005), perfMat);
    pb.position.set(-0.32 + i * 0.07, -0.045, 0.008);
    group.add(pb);
  }
  return group;
}

const OBJECTS = [
  { builder: () => createFilmReel(PURPLE), pos: [-3.4, 1.3, -1.2], scale: 1.0, spin: 0.008 },
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
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lights — brand-colored for a cohesive glow
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 3, 4);
    scene.add(dir);
    const pL = new THREE.PointLight(PURPLE, 1.4, 25);
    pL.position.set(-3, 2, 3);
    scene.add(pL);
    const oL = new THREE.PointLight(ORANGE, 1.0, 25);
    oL.position.set(3, -2, 3);
    scene.add(oL);
    const tL = new THREE.PointLight(TEAL, 0.8, 25);
    tL.position.set(0, 3, -2);
    scene.add(tL);

    const meshes = OBJECTS.map((o, i) => {
      const obj = o.builder();
      obj.position.set(...o.pos);
      obj.scale.setScalar(o.scale);
      scene.add(obj);
      return {
        obj,
        floatSpeed: 0.35 + (i % 3) * 0.12,
        floatOffset: (i * 1.3) % (Math.PI * 2),
        rotSpeed: { x: (Math.random() - 0.5) * 0.004, y: (Math.random() - 0.5) * 0.005, z: (Math.random() - 0.5) * 0.003 },
        spin: o.spin,
        baseX: o.pos[0], baseY: o.pos[1],
        drift: 0.3 + (i % 3) * 0.15,
      };
    });

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