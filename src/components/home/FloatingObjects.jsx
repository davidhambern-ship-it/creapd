import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PURPLE = 0x8A2BE2;
const ORANGE = 0xFF8C00;
const TEAL = 0x00CED1;

/* ── Material helpers ────────────────────────────────────── */

function brushedMetal(color, { metalness = 0.9, roughness = 0.3 } = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: 1.0 });
}

function glossyMetal(color, { metalness = 0.95, roughness = 0.08 } = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: 1.5 });
}

function mattePlastic(color, { roughness = 0.6 } = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness, envMapIntensity: 0.4 });
}

function glassMat(color, { emissive = 0x000000, emissiveIntensity = 0.2 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.3,
    roughness: 0.05,
    emissive,
    emissiveIntensity,
    envMapIntensity: 1.8,
  });
}

function rubberMat(color) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.0, roughness: 0.9, envMapIntensity: 0.3 });
}

/* ── Object builders ────────────────────────────────────── */

function createFilmReel(color) {
  const group = new THREE.Group();
  const reelMat = glossyMetal(color, { roughness: 0.15 });
  const darkMat = mattePlastic(0x0a0a0a, { roughness: 0.5 });
  const filmMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, metalness: 0.2, roughness: 0.4, side: THREE.DoubleSide, envMapIntensity: 0.5 });

  // Outer flanges (two discs)
  const flangeGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 64);
  const flange1 = new THREE.Mesh(flangeGeo, reelMat);
  flange1.rotation.x = Math.PI / 2;
  flange1.position.z = 0.08;
  group.add(flange1);
  const flange2 = new THREE.Mesh(flangeGeo, reelMat);
  flange2.rotation.x = Math.PI / 2;
  flange2.position.z = -0.08;
  group.add(flange2);

  // Outer rim torus
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.04, 24, 64), reelMat);
  rim.position.z = 0.08;
  group.add(rim);
  const rim2 = rim.clone();
  rim2.position.z = -0.08;
  group.add(rim2);

  // Center hub
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 48), reelMat);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  // Center hole (through hub)
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 24), darkMat);
  hole.rotation.x = Math.PI / 2;
  group.add(hole);

  // Spoke holes
  const spokeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.24, 16);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(spokeGeo, darkMat);
    s.rotation.x = Math.PI / 2;
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0);
    group.add(s);
  }

  // Coiled film between flanges
  const filmCoil = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 16, 64), filmMat);
  filmCoil.scale.set(1, 1, 0.5);
  group.add(filmCoil);

  // Film strip tail hanging off
  const tailGeo = new THREE.BoxGeometry(0.04, 0.3, 0.002);
  const tail = new THREE.Mesh(tailGeo, filmMat);
  tail.position.set(0.4, -0.15, 0);
  tail.rotation.z = -0.3;
  group.add(tail);

  return group;
}

function createPhone(color) {
  const group = new THREE.Group();
  const frameMat = brushedMetal(color, { metalness: 0.9, roughness: 0.2 });
  const glassMaterial = glassMat(0x05050a, { emissive: color, emissiveIntensity: 0.15 });
  const camRingMat = glossyMetal(0x1a1a2a, { roughness: 0.1 });
  const lensMat = glossyMetal(0x0a0a0a, { roughness: 0.05 });

  // Rounded body — use box with beveled look via scale
  const bodyGeo = new THREE.BoxGeometry(0.34, 0.66, 0.04, 4, 4, 1);
  const body = new THREE.Mesh(bodyGeo, frameMat);
  group.add(body);

  // Screen glass on front
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.56, 0.006), glassMaterial);
  screen.position.z = 0.022;
  group.add(screen);

  // Screen bezel
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.58, 0.002), mattePlastic(0x000000, { roughness: 0.3 }));
  bezel.position.z = 0.021;
  group.add(bezel);

  // Camera module — raised square
  const camBump = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.018), camRingMat);
  camBump.position.set(-0.08, 0.22, 0.028);
  group.add(camBump);

  // Two camera lenses
  const lensGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 32);
  const l1 = new THREE.Mesh(lensGeo, lensMat);
  l1.rotation.x = Math.PI / 2;
  l1.position.set(-0.1, 0.24, 0.038);
  group.add(l1);
  const l2 = new THREE.Mesh(lensGeo, lensMat);
  l2.rotation.x = Math.PI / 2;
  l2.position.set(-0.06, 0.2, 0.038);
  group.add(l2);

  // Lens glass (reflective)
  const lensGlassGeo = new THREE.CircleGeometry(0.028, 24);
  const lensGlassMat = glassMat(color, { emissive: color, emissiveIntensity: 0.1 });
  const lg1 = new THREE.Mesh(lensGlassGeo, lensGlassMat);
  lg1.position.set(-0.1, 0.24, 0.05);
  group.add(lg1);
  const lg2 = new THREE.Mesh(lensGlassGeo, lensGlassMat);
  lg2.position.set(-0.06, 0.2, 0.05);
  group.add(lg2);

  // Flash
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), glassMat(0xffffaa, { emissive: 0xffffaa, emissiveIntensity: 0.3 }));
  flash.position.set(-0.06, 0.25, 0.04);
  group.add(flash);

  // Side buttons
  const btnMat = glossyMetal(0x222222, { roughness: 0.2 });
  const btn1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.01), btnMat);
  btn1.position.set(0.17, 0.1, 0);
  group.add(btn1);
  const btn2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.01), btnMat);
  btn2.position.set(0.17, 0.0, 0);
  group.add(btn2);

  return group;
}

function createMicrophone(color) {
  const group = new THREE.Group();
  const bodyMat = brushedMetal(color, { metalness: 0.85, roughness: 0.2 });
  const grilleMat = glossyMetal(0x333333, { roughness: 0.12 });
  const darkMat = mattePlastic(0x111111, { roughness: 0.4 });

  // Handle — tapered cylinder
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.4, 48), bodyMat);
  handle.position.y = -0.22;
  group.add(handle);

  // Knurled grip rings on handle
  const ringGeo = new THREE.TorusGeometry(0.058, 0.004, 8, 48);
  for (let i = 0; i < 8; i++) {
    const r = new THREE.Mesh(ringGeo, darkMat);
    r.position.y = -0.35 + i * 0.03;
    r.rotation.x = Math.PI / 2;
    group.add(r);
  }

  // Connector collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.04, 32), glossyMetal(0x444444, { roughness: 0.15 }));
  collar.position.y = -0.02;
  group.add(collar);

  // Shock mount frame (metal hoops)
  const mountMat = glossyMetal(0x555555, { roughness: 0.2 });
  const mount1 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 8, 48), mountMat);
  mount1.rotation.y = Math.PI / 2;
  mount1.position.y = 0.1;
  group.add(mount1);
  const mount2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 8, 48), mountMat);
  mount2.rotation.y = Math.PI / 2;
  mount2.position.y = 0.04;
  group.add(mount2);

  // Mic capsule — ribbed cylinder
  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 48), grilleMat);
  capsule.position.y = 0.08;
  group.add(capsule);

  // Grille ribs
  const ribGeo = new THREE.TorusGeometry(0.112, 0.003, 6, 48);
  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Mesh(ribGeo, darkMat);
    rib.position.y = 0.02 + i * 0.018;
    rib.rotation.x = Math.PI / 2;
    group.add(rib);
  }

  // Top cap
  const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), grilleMat);
  topCap.position.y = 0.16;
  group.add(topCap);

  // XLR connector at bottom
  const xlr = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 24), glossyMetal(0x333333, { roughness: 0.2 }));
  xlr.position.y = -0.44;
  group.add(xlr);

  return group;
}

function createClapperboard(color) {
  const group = new THREE.Group();
  const baseMat = mattePlastic(color, { roughness: 0.45 });
  const stickMat = glossyMetal(0x1a1a1a, { roughness: 0.15 });
  const whiteMat = mattePlastic(0xf0f0f0, { roughness: 0.35 });

  // Base board
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.05, 2, 2, 1), baseMat);
  group.add(base);

  // Top hinged stick (slightly open)
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.05), stickMat);
  stick.position.y = 0.26;
  stick.rotation.z = 0.15;
  group.add(stick);

  // Diagonal white stripes on stick
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.003), whiteMat);
    stripe.position.set(-0.22 + i * 0.145, 0.26, 0.04);
    stripe.rotation.z = 0.15;
    group.add(stripe);
  }

  // Diagonal stripes on base top edge
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.08, 0.003), whiteMat);
    stripe.position.set(-0.22 + i * 0.145, 0.18, 0.028);
    stripe.rotation.z = 0.15;
    group.add(stripe);
  }

  // Hinge pin
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 16), glossyMetal(0x666666, { roughness: 0.1 }));
  hinge.rotation.z = Math.PI / 2;
  hinge.position.y = 0.21;
  group.add(hinge);

  return group;
}

function createHeadphones(color) {
  const group = new THREE.Group();
  const bandMat = glossyMetal(color, { roughness: 0.15 });
  const cupMat = brushedMetal(color, { metalness: 0.8, roughness: 0.25 });
  const cushMat = rubberMat(0x0a0a0a);

  // Headband — thick half torus
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 16, 48, Math.PI), bandMat);
  band.position.y = 0.06;
  group.add(band);

  // Inner cushion on band
  const bandCushion = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 12, 48, Math.PI), cushMat);
  bandCushion.position.y = 0.06;
  group.add(bandCushion);

  // Ear cup housings (oval-ish via scaled cylinder)
  const cupGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.08, 48);
  const left = new THREE.Mesh(cupGeo, cupMat);
  left.rotation.z = Math.PI / 2;
  left.position.set(-0.24, 0.06, 0);
  group.add(left);
  const right = new THREE.Mesh(cupGeo, cupMat);
  right.rotation.z = Math.PI / 2;
  right.position.set(0.24, 0.06, 0);
  group.add(right);

  // Ear cushions (inner, facing head)
  const cushGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 48);
  const lc = new THREE.Mesh(cushGeo, cushMat);
  lc.rotation.z = Math.PI / 2;
  lc.position.set(-0.27, 0.06, 0);
  group.add(lc);
  const rc = new THREE.Mesh(cushGeo, cushMat);
  rc.rotation.z = Math.PI / 2;
  rc.position.set(0.27, 0.06, 0);
  group.add(rc);

  // Cup outer detail ring
  const ringGeo = new THREE.TorusGeometry(0.1, 0.006, 8, 48);
  const lr = new THREE.Mesh(ringGeo, glossyMetal(0x222222, { roughness: 0.1 }));
  lr.rotation.y = Math.PI / 2;
  lr.position.set(-0.22, 0.06, 0);
  group.add(lr);
  const rr = new THREE.Mesh(ringGeo, glossyMetal(0x222222, { roughness: 0.1 }));
  rr.rotation.y = Math.PI / 2;
  rr.position.set(0.22, 0.06, 0);
  group.add(rr);

  // Arm connectors
  const armGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.08, 12);
  const la = new THREE.Mesh(armGeo, bandMat);
  la.position.set(-0.22, 0.1, 0);
  la.rotation.z = 0.3;
  group.add(la);
  const ra = new THREE.Mesh(armGeo, bandMat);
  ra.position.set(0.22, 0.1, 0);
  ra.rotation.z = -0.3;
  group.add(ra);

  return group;
}

function createCamera(color) {
  const group = new THREE.Group();
  const bodyMat = mattePlastic(color, { roughness: 0.35 });
  const lensMat = glossyMetal(0x111111, { roughness: 0.08 });
  const ringMat = glossyMetal(0x444444, { roughness: 0.12 });
  const glassMat2 = glassMat(color, { emissive: color, emissiveIntensity: 0.12 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.2, 3, 3, 2), bodyMat);
  group.add(body);

  // Grip bulge on right side
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.18), bodyMat);
  grip.position.set(0.28, -0.02, 0);
  group.add(grip);

  // Lens barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.2, 48), lensMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.18;
  group.add(barrel);

  // Lens rings (zoom/focus)
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 16, 48), ringMat);
  r1.position.z = 0.22;
  group.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.01, 16, 48), ringMat);
  r2.position.z = 0.16;
  group.add(r2);

  // Front element glass
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.09, 48), glassMat2);
  glass.position.z = 0.29;
  group.add(glass);

  // Inner barrel (recessed)
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 48), glossyMetal(0x05050a, { roughness: 0.05 }));
  inner.rotation.x = Math.PI / 2;
  inner.position.z = 0.26;
  group.add(inner);

  // Top viewfinder/flash housing
  const vf = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.08), bodyMat);
  vf.position.set(0.06, 0.18, 0);
  group.add(vf);

  // Flash
  const flash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.01), glassMat(0xffffee, { emissive: 0xffffaa, emissiveIntensity: 0.2 }));
  flash.position.set(0.06, 0.2, 0.045);
  group.add(flash);

  // Shutter button
  const shutter = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.015, 24), glossyMetal(0x880000, { roughness: 0.1 }));
  shutter.position.set(0.22, 0.18, 0);
  group.add(shutter);

  // Mode dial
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 32), ringMat);
  dial.position.set(-0.15, 0.18, 0);
  group.add(dial);

  return group;
}

function createBroadcastTower(color) {
  const group = new THREE.Group();
  const mat = glossyMetal(color, { roughness: 0.2 });
  const darkMat = mattePlastic(0x222222, { roughness: 0.4 });

  // Mast — tapered
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.028, 0.85, 12), mat);
  group.add(mast);

  // Lattice cross-pieces
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.32 - i * 0.06, 0.015, 0.015), mat);
    arm.position.y = 0.25 - i * 0.22;
    group.add(arm);
    // diagonal supports
    const d1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.25, 0.008), mat);
    d1.position.set(0.08, 0.25 - i * 0.22 - 0.1, 0);
    d1.rotation.z = 0.5;
    group.add(d1);
    const d2 = d1.clone();
    d2.position.x = -0.08;
    d2.rotation.z = -0.5;
    group.add(d2);
  }

  // Top antenna spike
  const ant = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 12), mat);
  ant.position.y = 0.48;
  group.add(ant);

  // Warning light
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 16), glassMat(0xff0000, { emissive: 0xff0000, emissiveIntensity: 0.8 }));
  light.position.y = 0.56;
  group.add(light);

  // Dish
  const dishMat = glossyMetal(color, { roughness: 0.25 });
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), dishMat);
  dish.position.set(0.14, 0.12, 0);
  dish.rotation.z = -Math.PI / 3;
  group.add(dish);

  // Dish receiver arm
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8), mat);
  arm.position.set(0.14, 0.12, 0.06);
  arm.rotation.x = Math.PI / 2;
  group.add(arm);
  const receiver = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), darkMat);
  receiver.position.set(0.14, 0.12, 0.11);
  group.add(receiver);

  return group;
}

function createFilmStrip(color) {
  const group = new THREE.Group();
  const stripMat = mattePlastic(0x0a0a0a, { roughness: 0.4 });
  const frameMat = glassMat(color, { emissive: color, emissiveIntensity: 0.15 });
  const perfMat = mattePlastic(0x000000, { roughness: 0.5 });

  // Slightly curved strip — multiple segments
  const segments = 6;
  const segWidth = 0.12;
  for (let i = 0; i < segments; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(segWidth, 0.13, 0.012), stripMat);
    const angle = (i - segments / 2) * 0.08;
    seg.position.set((i - segments / 2) * segWidth, Math.sin(angle) * 0.05, 0);
    seg.rotation.z = angle * 0.5;
    group.add(seg);

    // Frame in segment
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.008), frameMat);
    frame.position.copy(seg.position);
    frame.position.z = 0.008;
    frame.rotation.z = seg.rotation.z;
    group.add(frame);

    // Perforations top & bottom
    for (let p = 0; p < 2; p++) {
      const pt = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.005), perfMat);
      pt.position.set(seg.position.x - 0.03 + p * 0.06, 0.05, 0.012);
      pt.rotation.z = seg.rotation.z;
      group.add(pt);
      const pb = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.005), perfMat);
      pb.position.set(seg.position.x - 0.03 + p * 0.06, -0.05, 0.012);
      pb.rotation.z = seg.rotation.z;
      group.add(pb);
    }
  }

  return group;
}

/* ── Scene config ───────────────────────────────────────── */

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

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // ── Environment map for realistic metal reflections ──
    const pmrem = new THREE.PMREMGenerator(renderer);
    // Build a simple gradient environment scene
    const envScene = new THREE.Scene();
    const envGeo = new THREE.SphereGeometry(50, 32, 32);
    const envMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      vertexColors: false,
    });
    // Gradient canvas texture for env
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(0.3, '#2a1040');
    grad.addColorStop(0.5, '#1a1a2e');
    grad.addColorStop(0.7, '#0a0a1a');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    // Add some "light" spots for reflections
    ctx.fillStyle = 'rgba(138, 43, 226, 0.3)';
    ctx.beginPath();
    ctx.arc(120, 100, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 140, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(400, 150, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 206, 209, 0.2)';
    ctx.beginPath();
    ctx.arc(256, 400, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(200, 200, 40, 0, Math.PI * 2);
    ctx.fill();
    const envTex = new THREE.CanvasTexture(canvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.colorSpace = THREE.SRGBColorSpace;
    const envRT = pmrem.fromEquirectangular(envTex);
    scene.environment = envRT.texture;

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x9090ff, 0.4);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);
    // Brand-colored accent lights
    const pL = new THREE.PointLight(PURPLE, 2.0, 30);
    pL.position.set(-3, 2, 3);
    scene.add(pL);
    const oL = new THREE.PointLight(ORANGE, 1.5, 30);
    oL.position.set(3, -2, 3);
    scene.add(oL);
    const tL = new THREE.PointLight(TEAL, 1.2, 30);
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