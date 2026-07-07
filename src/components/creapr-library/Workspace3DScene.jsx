import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const BOOK_COLORS = [
  '#5a2a2a', '#2d4a2d', '#2a3550', '#6b4a22',
  '#3a3a3a', '#4a2d4a', '#2a4545', '#5a3a1a',
  '#5a5520', '#452a45',
];

function Book({ position, height, color, width }) {
  return (
    <mesh position={[position[0], height / 2, position[2]]} castShadow>
      <boxGeometry args={[width, height, 0.4]} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

function ShelfRow({ y, z, count, startIndex, flip = false }) {
  const books = useMemo(() => {
    const arr = [];
    let x = flip ? 4 : -4;
    const dir = flip ? -1 : 1;
    for (let i = 0; i < count; i++) {
      const ci = (i + startIndex) % BOOK_COLORS.length;
      const h = 1.2 + ((i * 11 + startIndex * 7) % 9) * 0.12;
      const w = 0.35 + (i % 4) * 0.12;
      arr.push({ x: x + dir * w / 2, h, color: BOOK_COLORS[ci], w, key: i });
      x += dir * (w + 0.02);
    }
    return arr;
  }, [count, startIndex, flip]);

  return (
    <group position={[0, y, z]}>
      {books.map((b) => (
        <Book key={b.key} position={[b.x, 0, 0]} height={b.h} color={b.color} width={b.w} />
      ))}
      {/* Shelf plank */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[8.5, 0.12, 0.6]} />
        <meshStandardMaterial color="#3d2e1e" roughness={0.9} />
      </mesh>
    </group>
  );
}

function BookshelfWall({ side = 'left' }) {
  const isLeft = side === 'left';
  const x = isLeft ? -5.5 : 5.5;
  const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={[x, 0, 0]} rotation={[0, rotY, 0]}>
      {[0, 1, 2, 3, 4].map((r) => (
        <ShelfRow
          key={r}
          y={r * 1.5 - 1}
          z={0}
          count={12}
          startIndex={r * 3 + (isLeft ? 0 : 5)}
          flip={isLeft}
        />
      ))}
      {/* Vertical side panel */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[8.5, 8, 0.15]} />
        <meshStandardMaterial color="#2a1f14" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#1a1510" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

function CeilingLight({ position, intensity }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.intensity = intensity * (0.85 + Math.sin(clock.elapsedTime * 0.5 + position[0]) * 0.15);
    }
  });
  return (
    <>
      <pointLight ref={ref} position={position} intensity={intensity} color="#ffb060" distance={12} decay={2} />
      <mesh position={position}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#ffc070" emissive="#ffa050" emissiveIntensity={0.8} />
      </mesh>
    </>
  );
}

function DustParticle({ index }) {
  const ref = useRef();
  const data = useMemo(() => ({
    x: (Math.random() - 0.5) * 10,
    y: Math.random() * 6 - 1,
    z: (Math.random() - 0.5) * 6,
    speed: 0.2 + Math.random() * 0.4,
    offset: Math.random() * 10,
    scale: 0.02 + Math.random() * 0.03,
  }), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = data.y + Math.sin(t * data.speed + data.offset) * 0.5;
    ref.current.position.x = data.x + Math.cos(t * data.speed * 0.7 + data.offset) * 0.3;
  });
  return (
    <mesh ref={ref} position={[data.x, data.y, data.z]} scale={data.scale}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffc080" transparent opacity={0.5} />
    </mesh>
  );
}

function DustParticles({ count }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => <DustParticle key={i} index={i} />)}
    </>
  );
}

function DeskLamp({ intensity }) {
  return (
    <group position={[0, -1.4, 2]}>
      <pointLight position={[0, 1.5, 0]} intensity={intensity * 2} color="#ffc080" distance={6} decay={2} />
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[0.3, 0.4, 8]} />
        <meshStandardMaterial color="#5a4030" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Rig({ children }) {
  const group = useRef();
  useFrame(({ pointer }) => {
    if (group.current) {
      const targetY = pointer.x * 0.15;
      const targetX = -pointer.y * 0.08;
      group.current.rotation.y += (targetY - group.current.rotation.y) * 0.04;
      group.current.rotation.x += (targetX - group.current.rotation.x) * 0.04;
    }
  });
  return <group ref={group}>{children}</group>;
}

export default function Workspace3DScene({ intensity = 'calm' }) {
  const lightIntensity = intensity === 'assembling' ? 1.8 : intensity === 'active' ? 1.4 : 1.0;
  const lampIntensity = intensity === 'assembling' ? 1.5 : intensity === 'active' ? 1.2 : 0.9;
  const sparkleCount = intensity === 'assembling' ? 80 : intensity === 'active' ? 50 : 30;

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0e0a06 0%, #1a1208 50%, #0a0804 100%)' }}
    >
      <PerspectiveCamera makeDefault position={[0, 0.5, 8]} fov={50} />

      <fog attach="fog" args={['#0a0804', 8, 22]} />

      <ambientLight intensity={0.15} color="#4a3520" />
      <directionalLight position={[3, 6, 4]} intensity={0.3} color="#ffa060" castShadow />

      <Rig>
        <BookshelfWall side="left" />
        <BookshelfWall side="right" />

        <Floor />

        {/* Central desk surface */}
        <mesh position={[0, -1.45, 2]} receiveShadow castShadow>
          <boxGeometry args={[3, 0.1, 1.5]} />
          <meshStandardMaterial color="#3d2e1e" roughness={0.85} />
        </mesh>

        <DeskLamp intensity={lampIntensity} />

        {/* Floating ambient orbs */}
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.8}>
          <mesh position={[-2, 2.5, -2]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#ffb060" emissive="#ff9040" emissiveIntensity={0.6} transparent opacity={0.3} />
          </mesh>
        </Float>
        <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.6}>
          <mesh position={[2.5, 2, -1.5]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#ffa050" emissive="#ff8030" emissiveIntensity={0.5} transparent opacity={0.25} />
          </mesh>
        </Float>
      </Rig>

      <CeilingLight position={[-2, 3.5, 0]} intensity={lightIntensity} />
      <CeilingLight position={[2, 3.5, 0]} intensity={lightIntensity * 0.9} />
      <CeilingLight position={[0, 3.5, -1]} intensity={lightIntensity * 0.7} />

      <DustParticles count={sparkleCount} />
    </Canvas>
  );
}