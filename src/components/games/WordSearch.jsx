import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';

const GRID_SIZE = 12;

// CREAPD-themed word bank
const WORD_BANK = [
  'CREAP', 'SLIDE', 'STORY', 'RESEARCH', 'VOICE', 'PACKET',
  'DOSSIER', 'EDITOR', 'SCENE', 'CAMERA', 'NARRATE', 'DIRECT',
  'SCRIPT', 'STUDIO', 'BROADCAST', 'TIMELINE', 'VISUAL', 'AUDIO',
  'ALBUM', 'AMPLIFIER', 'ANTHEM', 'ARTIST', 'AUDIENCE', 'BACKSTAGE',
  'BALLAD', 'BAND', 'BASS', 'BEAT', 'CHORUS', 'COMPOSER', 'CONCERT',
  'COUNTRY', 'CRESCENDO', 'DEEJAY', 'DRUMMER', 'DRUMS', 'ENCORE',
  'FESTIVAL', 'GUITAR', 'HARMONY', 'HEADPHONES', 'HIPHOP', 'JAZZ',
  'KEYBOARD', 'LYRICS', 'MELODY', 'METRONOME', 'MICROPHONE', 'MIXER',
  'MUSICIAN', 'NOTES', 'OPERA', 'ORCHESTRA', 'PERFORMANCE', 'PIANO',
  'PLAYLIST', 'PRODUCER', 'RAP', 'RHYTHM', 'ROCK', 'SINGER',
  'SONGWRITER', 'SPEAKERS', 'STAGE', 'STUDIO', 'TEMPO', 'TRUMPET',
  'VOCALS',
];

const DIRECTIONS = [
  [0, 1],   // right
  [1, 0],   // down
  [1, 1],   // down-right
  [-1, 1],  // up-right
  [0, -1],  // left
  [-1, 0],  // up
  [-1, -1], // up-left
  [1, -1],  // down-left
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePuzzle() {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
  const placed = [];
  const words = shuffle(WORD_BANK).slice(0, 8);

  for (const word of words) {
    let placedThisWord = false;
    for (let attempt = 0; attempt < 100 && !placedThisWord; attempt++) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      const endRow = row + dir[0] * (word.length - 1);
      const endCol = col + dir[1] * (word.length - 1);
      if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) continue;

      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + dir[0] * i;
        const c = col + dir[1] * i;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) { fits = false; break; }
      }
      if (!fits) continue;

      for (let i = 0; i < word.length; i++) {
        const r = row + dir[0] * i;
        const c = col + dir[1] * i;
        grid[r][c] = word[i];
      }
      placed.push({ word, row, col, dir, endRow, endCol });
      placedThisWord = true;
    }
  }

  // Fill empties
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
    }
  }

  return { grid, words: placed.map(p => p.word), placements: placed };
}

export default function WordSearch({ onClose }) {
  const [puzzle, setPuzzle] = useState(() => generatePuzzle());
  const [foundWords, setFoundWords] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const gridRef = useRef(null);

  const reset = useCallback(() => {
    setPuzzle(generatePuzzle());
    setFoundWords([]);
    setSelStart(null);
    setSelEnd(null);
  }, []);

  const getCellFromEvent = useCallback((e) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cellW = rect.width / GRID_SIZE;
    const cellH = rect.height / GRID_SIZE;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }, []);

  const handleMouseDown = useCallback((e) => {
    const cell = getCellFromEvent(e);
    if (!cell) return;
    setSelecting(true);
    setSelStart(cell);
    setSelEnd(cell);
  }, [getCellFromEvent]);

  const handleMouseMove = useCallback((e) => {
    if (!selecting) return;
    const cell = getCellFromEvent(e);
    if (cell) setSelEnd(cell);
  }, [selecting, getCellFromEvent]);

  const handleMouseUp = useCallback(() => {
    if (!selecting || !selStart || !selEnd) {
      setSelecting(false);
      return;
    }
    setSelecting(false);

    // Extract the selected word
    const dr = selEnd.row - selStart.row;
    const dc = selEnd.col - selStart.col;
    const len = Math.max(Math.abs(dr), Math.abs(dc));
    if (len === 0) { setSelStart(null); setSelEnd(null); return; }

    const stepR = len === 0 ? 0 : dr / len;
    const stepC = len === 0 ? 0 : dc / len;
    let selected = '';
    const cells = [];
    for (let i = 0; i <= len; i++) {
      const r = Math.round(selStart.row + stepR * i);
      const c = Math.round(selStart.col + stepC * i);
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break;
      selected += puzzle.grid[r][c];
      cells.push({ r, c });
    }

    const reversed = selected.split('').reverse().join('');
    const matched = puzzle.words.find(
      w => !foundWords.includes(w) && (w === selected || w === reversed)
    );

    if (matched) {
      setFoundWords(prev => [...prev, matched]);
    }

    setSelStart(null);
    setSelEnd(null);
  }, [selecting, selStart, selEnd, puzzle, foundWords]);

  // Determine if a cell is in the current selection
  const isInSelection = (row, col) => {
    if (!selStart || !selEnd) return false;
    const dr = selEnd.row - selStart.row;
    const dc = selEnd.col - selStart.col;
    const len = Math.max(Math.abs(dr), Math.abs(dc));
    if (len === 0) return row === selStart.row && col === selStart.col;
    const stepR = dr / len;
    const stepC = dc / len;
    for (let i = 0; i <= len; i++) {
      const r = Math.round(selStart.row + stepR * i);
      const c = Math.round(selStart.col + stepC * i);
      if (r === row && c === col) return true;
    }
    return false;
  };

  // Determine if a cell is part of a found word
  const isFoundCell = (row, col) => {
    for (const placement of puzzle.placements) {
      if (!foundWords.includes(placement.word)) continue;
      const len = placement.word.length;
      for (let i = 0; i < len; i++) {
        const r = placement.row + placement.dir[0] * i;
        const c = placement.col + placement.dir[1] * i;
        if (r === row && c === col) return true;
      }
    }
    return false;
  };

  const allFound = foundWords.length === puzzle.words.length;

  useEffect(() => {
    const up = () => { if (selecting) handleMouseUp(); };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [selecting, handleMouseUp]);

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <div className="flex items-center justify-between w-full">
        <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
          🧩 Word Search
          <span className="text-xs text-muted-foreground font-normal">
            {foundWords.length}/{puzzle.words.length} found
          </span>
        </h3>
        <div className="flex gap-1">
          <button onClick={reset} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="New puzzle">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Close game">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="grid touch-none select-none cursor-pointer"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, width: 'min(100%, 360px)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {puzzle.grid.map((rowArr, r) =>
          rowArr.map((letter, c) => {
            const inSel = isInSelection(r, c);
            const found = isFoundCell(r, c);
            return (
              <div
                key={`${r}-${c}`}
                className={`flex items-center justify-center font-mono font-bold text-xs sm:text-sm aspect-square rounded transition-colors ${
                  found
                    ? 'bg-berna-emerald/25 text-berna-emerald'
                    : inSel
                    ? 'bg-berna-purple/30 text-white'
                    : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>

      {/* Word list */}
      <div className="flex flex-wrap justify-center gap-1.5 max-w-[360px]">
        {puzzle.words.map(word => {
          const found = foundWords.includes(word);
          return (
            <span
              key={word}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                found
                  ? 'bg-berna-emerald/20 text-berna-emerald line-through opacity-60'
                  : 'bg-muted/30 text-muted-foreground'
              }`}
            >
              {found && <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />}
              {word}
            </span>
          );
        })}
      </div>

      {allFound && (
        <div className="text-center py-1 animate-fade-in">
          <p className="text-sm font-bold text-berna-emerald">🎉 You found them all!</p>
          <button onClick={reset} className="text-xs text-primary hover:underline mt-1">Play again</button>
        </div>
      )}
    </div>
  );
}