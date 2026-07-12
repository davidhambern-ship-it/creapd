import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, X } from 'lucide-react';

const COLS = 20;
const ROWS = 20;
const BLOCK = 16;

const COLORS = [
  { head: '#00FFCC', body: '#00CC99' },
  { head: '#FF00FF', body: '#CC00CC' },
  { head: '#FF8C00', body: '#CC6600' },
  { head: '#7C3AED', body: '#5B21B6' },
];

function makeGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(false));
}

function randomFood(snake) {
  let pos;
  let attempts = 0;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
    attempts++;
  } while (snake.some(s => s.x === pos.x && s.y === pos.y) && attempts < 200);
  return pos;
}

export default function Snake({ onClose }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [, setRenderTick] = useState(0);

  const initGame = useCallback(() => {
    const startX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS / 2);
    const snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    stateRef.current = {
      snake,
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: randomFood(snake),
      score: 0,
      gameOver: false,
      stepTimer: 0,
      speed: 130,
      colorIdx: 0,
    };
    setScore(0);
    setGameOver(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [restartKey, initGame]);

  const setDirection = useCallback((dx, dy) => {
    const s = stateRef.current;
    if (!s || s.gameOver) return;
    // Prevent reversing
    if (s.dir.x === -dx && s.dir.y === -dy) return;
    s.nextDir = { x: dx, y: dy };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); setDirection(-1, 0); }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); setDirection(1, 0); }
      if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); setDirection(0, -1); }
      if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); setDirection(0, 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setDirection]);

  const step = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.gameOver) return;

    s.dir = s.nextDir;
    const head = s.snake[0];
    const newHead = { x: head.x + s.dir.x, y: head.y + s.dir.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      s.gameOver = true;
      setGameOver(true);
      return;
    }

    // Self collision
    if (s.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      s.gameOver = true;
      setGameOver(true);
      return;
    }

    s.snake.unshift(newHead);

    // Food collision
    if (newHead.x === s.food.x && newHead.y === s.food.y) {
      s.score += 10;
      setScore(s.score);
      s.food = randomFood(s.snake);
      s.speed = Math.max(60, s.speed - 3);
      // Change color every 50 points
      if (s.score % 50 === 0) {
        s.colorIdx = (s.colorIdx + 1) % COLORS.length;
      }
    } else {
      s.snake.pop();
    }
  }, []);

  // Game loop + render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let lastTime = performance.now();

    const loop = (time) => {
      const s = stateRef.current;
      const delta = time - lastTime;
      lastTime = time;

      if (s && !s.gameOver) {
        s.stepTimer += delta;
        if (s.stepTimer >= s.speed) {
          s.stepTimer = 0;
          step();
          setRenderTick(t => t + 1);
        }
      }

      // Render
      ctx.fillStyle = '#05080c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.04)';
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK, 0);
        ctx.lineTo(c * BLOCK, ROWS * BLOCK);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK);
        ctx.lineTo(COLS * BLOCK, r * BLOCK);
        ctx.stroke();
      }

      if (s) {
        const colors = COLORS[s.colorIdx];

        // Food
        if (!s.gameOver && s.food) {
          ctx.fillStyle = '#FF0044';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#FF0044';
          ctx.beginPath();
          ctx.arc(
            s.food.x * BLOCK + BLOCK / 2,
            s.food.y * BLOCK + BLOCK / 2,
            BLOCK / 2 - 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Snake
        s.snake.forEach((seg, i) => {
          const isHead = i === 0;
          ctx.fillStyle = isHead ? colors.head : colors.body;
          if (isHead) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = colors.head;
          }
          ctx.fillRect(seg.x * BLOCK + 1, seg.y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
          ctx.shadowBlur = 0;
          // Highlight on head
          if (isHead) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(seg.x * BLOCK + 1, seg.y * BLOCK + 1, BLOCK - 2, 3);
          }
        });
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-mono text-cyan-300">Score: <span className="font-bold">{score}</span></span>
        <div className="flex gap-1">
          <button onClick={() => setRestartKey(k => k + 1)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Restart">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Close">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={COLS * BLOCK}
          height={ROWS * BLOCK}
          className="rounded-lg border border-cyan-500/20 bg-black"
        />
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
            <p className="text-lg font-heading font-bold text-red-400 mb-1" style={{ textShadow: '0 0 12px #FF0044' }}>Game Over</p>
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
        <span className="text-cyan-400">← ↑ → ↓</span> or <span className="text-cyan-400">WASD</span> to steer
      </div>
    </div>
  );
}