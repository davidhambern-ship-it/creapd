import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, X } from 'lucide-react';

const COLS = 10;
const ROWS = 20;
const BLOCK = 24;

const PIECES = {
  I: { shape: [[1,1,1,1]], color: '#00FFFF' },
  O: { shape: [[1,1],[1,1]], color: '#FFD700' },
  T: { shape: [[0,1,0],[1,1,1]], color: '#A020F0' },
  S: { shape: [[0,1,1],[1,1,0]], color: '#00FF66' },
  Z: { shape: [[1,1,0],[0,1,1]], color: '#FF0044' },
  J: { shape: [[1,0,0],[1,1,1]], color: '#0080FF' },
  L: { shape: [[0,0,1],[1,1,1]], color: '#FF8C00' },
};

const TYPES = Object.keys(PIECES);

function makeBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  return {
    type,
    shape: PIECES[type].shape.map(r => [...r]),
    color: PIECES[type].color,
    x: Math.floor((COLS - PIECES[type].shape[0].length) / 2),
    y: 0,
  };
}

function rotate(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
}

function collides(board, shape, x, y) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const bx = x + c;
      const by = y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
}

function merge(board, piece) {
  const next = board.map(r => [...r]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        const by = piece.y + r;
        const bx = piece.x + c;
        if (by >= 0) next[by][bx] = piece.color;
      }
    }
  }
  return next;
}

function clearLines(board) {
  let cleared = 0;
  const next = board.filter(row => row.some(cell => cell === null));
  cleared = ROWS - next.length;
  while (next.length < ROWS) next.unshift(Array(COLS).fill(null));
  return { board: next, cleared };
}

export default function Tetris({ onClose }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [, setRenderTick] = useState(0);

  const initGame = useCallback(() => {
    stateRef.current = {
      board: makeBoard(),
      piece: randomPiece(),
      dropTimer: 0,
      score: 0,
      lines: 0,
      level: 1,
      gameOver: false,
      paused: false,
    };
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setPaused(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [restartKey, initGame]);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.gameOver || s.paused) return;

    // Try move down
    if (!collides(s.board, s.piece.shape, s.piece.x, s.piece.y + 1)) {
      s.piece.y++;
      return;
    }

    // Lock piece
    s.board = merge(s.board, s.piece);
    const result = clearLines(s.board);
    s.board = result.board;

    if (result.cleared > 0) {
      s.lines += result.cleared;
      s.score += [0, 100, 300, 500, 800][result.cleared] * s.level;
      s.level = Math.floor(s.lines / 10) + 1;
      setScore(s.score);
      setLines(s.lines);
      setLevel(s.level);
    }

    // Spawn next piece
    s.piece = randomPiece();
    if (collides(s.board, s.piece.shape, s.piece.x, s.piece.y)) {
      s.gameOver = true;
      setGameOver(true);
    }
  }, []);

  const move = useCallback((dx) => {
    const s = stateRef.current;
    if (!s || s.gameOver || s.paused) return;
    if (!collides(s.board, s.piece.shape, s.piece.x + dx, s.piece.y)) {
      s.piece.x += dx;
      setRenderTick(t => t + 1);
    }
  }, []);

  const doRotate = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.gameOver || s.paused) return;
    const rotated = rotate(s.piece.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collides(s.board, rotated, s.piece.x + kick, s.piece.y)) {
        s.piece.shape = rotated;
        s.piece.x += kick;
        setRenderTick(t => t + 1);
        return;
      }
    }
  }, []);

  const hardDrop = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.gameOver || s.paused) return;
    let drop = 0;
    while (!collides(s.board, s.piece.shape, s.piece.x, s.piece.y + drop + 1)) drop++;
    s.piece.y += drop;
    s.score += drop * 2;
    setScore(s.score);
    tick();
    setRenderTick(t => t + 1);
  }, [tick]);

  const togglePause = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.gameOver) return;
    s.paused = !s.paused;
    setPaused(s.paused);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); move(-1); }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); move(1); }
      if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); doRotate(); }
      if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); tick(); setRenderTick(t => t + 1); }
      if (e.key === ' ') { e.preventDefault(); hardDrop(); }
      if (e.key === 'p') { e.preventDefault(); togglePause(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [move, doRotate, tick, hardDrop, togglePause]);

  // Game loop + render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let lastTime = performance.now();

    const loop = (time) => {
      const s = stateRef.current;
      if (s && !s.gameOver && !s.paused) {
        const delta = time - lastTime;
        s.dropTimer += delta;
        const dropInterval = Math.max(120, 800 - (s.level - 1) * 70);
        if (s.dropTimer >= dropInterval) {
          s.dropTimer = 0;
          tick();
        }
      }
      lastTime = time;

      // Render
      ctx.fillStyle = '#05080c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.06)';
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

      // Locked blocks
      if (s) {
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const color = s.board[r][c];
            if (color) {
              ctx.fillStyle = color;
              ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, BLOCK - 2);
              ctx.fillStyle = 'rgba(255,255,255,0.15)';
              ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, 3);
            }
          }
        }

        // Active piece
        if (!s.gameOver) {
          // Ghost piece
          let ghostY = s.piece.y;
          while (!collides(s.board, s.piece.shape, s.piece.x, ghostY + 1)) ghostY++;
          ctx.globalAlpha = 0.2;
          for (let r = 0; r < s.piece.shape.length; r++) {
            for (let c = 0; c < s.piece.shape[r].length; c++) {
              if (s.piece.shape[r][c]) {
                ctx.fillStyle = s.piece.color;
                ctx.fillRect((s.piece.x + c) * BLOCK + 1, (ghostY + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
              }
            }
          }
          ctx.globalAlpha = 1;

          // Actual piece
          for (let r = 0; r < s.piece.shape.length; r++) {
            for (let c = 0; c < s.piece.shape[r].length; c++) {
              if (s.piece.shape[r][c]) {
                ctx.fillStyle = s.piece.color;
                ctx.shadowBlur = 8;
                ctx.shadowColor = s.piece.color;
                ctx.fillRect((s.piece.x + c) * BLOCK + 1, (s.piece.y + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect((s.piece.x + c) * BLOCK + 1, (s.piece.y + r) * BLOCK + 1, BLOCK - 2, 3);
              }
            }
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-cyan-300">Score: <span className="font-bold">{score}</span></span>
          <span className="text-purple-300">Lines: <span className="font-bold">{lines}</span></span>
          <span className="text-orange-300">Lvl: <span className="font-bold">{level}</span></span>
        </div>
        <div className="flex gap-1">
          <button onClick={togglePause} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Pause (P)">
            {paused ? '▶' : '❚❚'}
          </button>
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
          className="rounded-lg border border-purple-500/20 bg-black"
        />
        {(gameOver || paused) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
            <p className="text-lg font-heading font-bold mb-1" style={{
              color: gameOver ? '#FF0044' : '#00FFCC',
              textShadow: `0 0 12px ${gameOver ? '#FF0044' : '#00FFCC'}`,
            }}>
              {gameOver ? 'Game Over' : 'Paused'}
            </p>
            {gameOver && <p className="text-xs text-cyan-300 font-mono mb-3">Score: {score}</p>}
            {gameOver && (
              <button
                onClick={() => setRestartKey(k => k + 1)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Play Again
              </button>
            )}
          </div>
        )}
      </div>
      <div className="text-[10px] text-gray-500 text-center">
        <span className="text-purple-400">← →</span> move &nbsp;•&nbsp;
        <span className="text-purple-400">↑</span> rotate &nbsp;•&nbsp;
        <span className="text-purple-400">↓</span> soft drop &nbsp;•&nbsp;
        <span className="text-purple-400">Space</span> hard drop &nbsp;•&nbsp;
        <span className="text-purple-400">P</span> pause
      </div>
    </div>
  );
}