import React, { useRef, useEffect, useState } from 'react';
import { Rocket, RotateCcw, X } from 'lucide-react';

const CANVAS_W = 480;
const CANVAS_H = 360;

function rand(min, max) { return Math.random() * (max - min) + min; }

function createAsteroid(x, y, size = 3) {
  const radius = size === 3 ? 28 : size === 2 ? 18 : 10;
  return {
    x: x ?? rand(radius, CANVAS_W - radius),
    y: y ?? rand(radius, CANVAS_H - radius),
    vx: rand(-1.2, 1.2),
    vy: rand(-1.2, 1.2),
    angle: rand(0, Math.PI * 2),
    spin: rand(-0.03, 0.03),
    size,
    radius,
    vertices: Array.from({ length: 8 + Math.floor(rand(0, 4)) }, () => rand(0.75, 1.15)),
  };
}

function createBullet(x, y, angle) {
  return {
    x, y,
    vx: Math.cos(angle) * 5,
    vy: Math.sin(angle) * 5,
    life: 60,
  };
}

function createParticle(x, y, color) {
  return {
    x, y,
    vx: rand(-2.5, 2.5),
    vy: rand(-2.5, 2.5),
    life: 30,
    color,
  };
}

export default function Asteroids({ onClose }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  // Mutable game state in refs so the animation loop doesn't re-render React
  const stateRef = useRef(null);

  const initGame = () => {
    stateRef.current = {
      ship: {
        x: CANVAS_W / 2,
        y: CANVAS_H / 2,
        vx: 0, vy: 0,
        angle: -Math.PI / 2,
        thrusting: false,
        invincible: 90,
        radius: 6,
      },
      asteroids: [
        createAsteroid(60, 60),
        createAsteroid(CANVAS_W - 60, 60),
        createAsteroid(60, CANVAS_H - 60),
        createAsteroid(CANVAS_W - 60, CANVAS_H - 60),
      ],
      bullets: [],
      particles: [],
      keys: {},
      score: 0,
      lives: 3,
      gameOver: false,
      canShoot: true,
      shootCooldown: 0,
    };
    setScore(0);
    setLives(3);
    setGameOver(false);
  };

  useEffect(() => {
    initGame();
  }, [restartKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const onKeyDown = (e) => {
      const s = stateRef.current;
      if (!s) return;
      s.keys[e.key] = true;
      if (e.key === ' ') {
        e.preventDefault();
        if (!s.gameOver && s.canShoot) {
          const ship = s.ship;
          s.bullets.push(createBullet(ship.x + Math.cos(ship.angle) * 10, ship.y + Math.sin(ship.angle) * 10, ship.angle));
          s.canShoot = false;
          s.shootCooldown = 10;
        }
      }
    };
    const onKeyUp = (e) => {
      const s = stateRef.current;
      if (!s) return;
      s.keys[e.key] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const loop = () => {
      const s = stateRef.current;
      if (!s) {
        raf = requestAnimationFrame(loop);
        return;
      }

      if (s.shootCooldown > 0) { s.shootCooldown--; if (s.shootCooldown === 0) s.canShoot = true; }

      // Clear
      ctx.fillStyle = '#05080c';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (!s.gameOver) {
        const ship = s.ship;

        // Rotation
        if (s.keys['ArrowLeft'] || s.keys['a']) ship.angle -= 0.08;
        if (s.keys['ArrowRight'] || s.keys['d']) ship.angle += 0.08;

        // Thrust
        ship.thrusting = s.keys['ArrowUp'] || s.keys['w'];
        if (ship.thrusting) {
          ship.vx += Math.cos(ship.angle) * 0.12;
          ship.vy += Math.sin(ship.angle) * 0.12;
          s.particles.push(createParticle(
            ship.x - Math.cos(ship.angle) * 8,
            ship.y - Math.sin(ship.angle) * 8,
            '#00FFCC'
          ));
        }
        // Damping
        ship.vx *= 0.99;
        ship.vy *= 0.99;
        ship.x += ship.vx;
        ship.y += ship.vy;
        // Wrap
        if (ship.x < 0) ship.x = CANVAS_W;
        if (ship.x > CANVAS_W) ship.x = 0;
        if (ship.y < 0) ship.y = CANVAS_H;
        if (ship.y > CANVAS_H) ship.y = 0;
        if (ship.invincible > 0) ship.invincible--;

        // Bullets
        s.bullets = s.bullets.filter(b => {
          b.x += b.vx;
          b.y += b.vy;
          b.life--;
          // Wrap
          if (b.x < 0) b.x = CANVAS_W;
          if (b.x > CANVAS_W) b.x = 0;
          if (b.y < 0) b.y = CANVAS_H;
          if (b.y > CANVAS_H) b.y = 0;
          return b.life > 0;
        });

        // Asteroids
        s.asteroids.forEach(a => {
          a.x += a.vx;
          a.y += a.vy;
          a.angle += a.spin;
          if (a.x < 0) a.x = CANVAS_W;
          if (a.x > CANVAS_W) a.x = 0;
          if (a.y < 0) a.y = CANVAS_H;
          if (a.y > CANVAS_H) a.y = 0;
        });

        // Bullet-asteroid collisions
        for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
          const b = s.bullets[bi];
          for (let ai = s.asteroids.length - 1; ai >= 0; ai--) {
            const a = s.asteroids[ai];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            if (dx * dx + dy * dy < a.radius * a.radius) {
              s.bullets.splice(bi, 1);
              s.asteroids.splice(ai, 1);
              s.score += a.size === 3 ? 20 : a.size === 2 ? 50 : 100;
              setScore(s.score);
              // Explosion particles
              for (let p = 0; p < 12; p++) {
                s.particles.push(createParticle(a.x, a.y, a.size === 3 ? '#FF00FF' : a.size === 2 ? '#00FFCC' : '#FFA500'));
              }
              // Split
              if (a.size > 1) {
                s.asteroids.push(createAsteroid(a.x, a.y, a.size - 1));
                s.asteroids.push(createAsteroid(a.x, a.y, a.size - 1));
              }
              break;
            }
          }
        }

        // Ship-asteroid collision
        if (ship.invincible === 0) {
          for (let ai = s.asteroids.length - 1; ai >= 0; ai--) {
            const a = s.asteroids[ai];
            const dx = ship.x - a.x;
            const dy = ship.y - a.y;
            if (dx * dx + dy * dy < (a.radius + ship.radius) * (a.radius + ship.radius)) {
              s.lives--;
              setLives(s.lives);
              for (let p = 0; p < 20; p++) {
                s.particles.push(createParticle(ship.x, ship.y, '#FF4444'));
              }
              if (s.lives <= 0) {
                s.gameOver = true;
                setGameOver(true);
              } else {
                ship.x = CANVAS_W / 2;
                ship.y = CANVAS_H / 2;
                ship.vx = 0; ship.vy = 0;
                ship.invincible = 120;
              }
              break;
            }
          }
        }

        // Win condition
        if (s.asteroids.length === 0 && !s.gameOver) {
          s.score += 500;
          setScore(s.score);
          for (let i = 0; i < 4; i++) s.asteroids.push(createAsteroid());
        }
      }

      // ─── DRAW ───

      // Asteroids
      s.asteroids.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.angle);
        ctx.strokeStyle = a.size === 3 ? '#FF00FF' : a.size === 2 ? '#00FFCC' : '#FFA500';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.beginPath();
        const n = a.vertices.length;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          const r = a.radius * a.vertices[i];
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      });

      // Ship
      if (!s.gameOver && (s.ship.invincible === 0 || Math.floor(s.ship.invincible / 6) % 2 === 0)) {
        const ship = s.ship;
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00FF88';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-7, -6);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-7, 6);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // Bullets
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#FFFFFF';
      s.bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life--;
        if (p.life <= 0) return false;
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-xs">
        <span className="text-cyan-300 font-mono">Score: <span className="font-bold">{score}</span></span>
        <span className="text-pink-400 font-mono">Lives: {'🚀'.repeat(Math.max(0, lives))}</span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-lg border border-cyan-500/20 bg-black"
          style={{ imageRendering: 'pixelated' }}
        />
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
            <p className="text-lg font-heading font-bold text-pink-400 mb-1" style={{ textShadow: '0 0 12px #FF00FF' }}>Game Over</p>
            <p className="text-xs text-cyan-300 font-mono mb-3">Score: {score}</p>
            <button
              onClick={() => setRestartKey(k => k + 1)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Play Again
            </button>
          </div>
        )}
      </div>
      <div className="text-[10px] text-gray-500 text-center">
        <span className="text-cyan-400">← →</span> or <span className="text-cyan-400">A/D</span> rotate &nbsp;•&nbsp;
        <span className="text-cyan-400">↑</span> or <span className="text-cyan-400">W</span> thrust &nbsp;•&nbsp;
        <span className="text-cyan-400">Space</span> shoot
      </div>
    </div>
  );
}