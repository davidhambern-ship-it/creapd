import React, { useState, useCallback, useEffect } from 'react';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black' };
const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function isRed(suit) { return suit === 'hearts' || suit === 'diamonds'; }
function altColor(s1, s2) { return isRed(s1) !== isRed(s2); }

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp: false, id: `${suit}-${rank}` });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function dealNewGame() {
  const deck = createDeck();
  const tableau = [[], [], [], [], [], [], []];
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = col; row < 7; row++) {
      const card = deck[idx++];
      if (row === col) card.faceUp = true;
      tableau[row].push(card);
    }
  }
  const stock = deck.slice(idx);
  return { tableau, stock, waste: [], foundations: [[], [], [], []] };
}

function canStackOnTableau(card, target) {
  if (!target) return card.rank === 13;
  return target.faceUp && altColor(card.suit, target.suit) && card.rank === target.rank - 1;
}

function canPlaceOnFoundation(card, foundation) {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

function Card({ card, style, onClick, draggable }) {
  if (!card) return <div style={style} className="rounded-md border border-border/30 bg-muted/10" />;
  return (
    <div
      style={style}
      onClick={onClick}
      className={`rounded-md border flex items-center justify-center select-none transition-all ${
        card.faceUp
          ? `bg-white border-border/40 ${isRed(card.suit) ? 'text-red-500' : 'text-gray-800'}`
          : 'bg-gradient-to-br from-berna-purple/60 to-berna-navy border-berna-purple/40'
      } ${draggable ? 'cursor-pointer hover:ring-2 hover:ring-primary/40' : 'cursor-pointer'}`}
    >
      {card.faceUp && (
        <div className="flex flex-col items-center justify-center w-full h-full p-0.5">
          <div className="flex items-center gap-0.5 self-start leading-none">
            <span className="font-bold text-[8px] sm:text-[10px]">{RANK_LABELS[card.rank]}</span>
            <span className="text-[8px] sm:text-[10px]">{SUIT_SYMBOLS[card.suit]}</span>
          </div>
          <span className="text-sm sm:text-lg my-0.5">{SUIT_SYMBOLS[card.suit]}</span>
          <div className="flex items-center gap-0.5 self-end leading-none rotate-180">
            <span className="font-bold text-[8px] sm:text-[10px]">{RANK_LABELS[card.rank]}</span>
            <span className="text-[8px] sm:text-[10px]">{SUIT_SYMBOLS[card.suit]}</span>
          </div>
        </div>
      )}
      {!card.faceUp && <span className="text-berna-purple/60 text-sm">⬡</span>}
    </div>
  );
}

const CARD_W = 36;
const CARD_H = 50;
const STACK_OFFSET = 14;

export default function Solitaire({ onClose }) {
  const [state, setState] = useState(() => dealNewGame());
  const [selected, setSelected] = useState(null); // { source, col, cardIdx } or null
  const [moves, setMoves] = useState(0);

  const reset = useCallback(() => {
    setState(dealNewGame());
    setSelected(null);
    setMoves(0);
  }, []);

  const drawStock = useCallback(() => {
    setState(prev => {
      if (prev.stock.length === 0) {
        // Recycle waste back to stock
        return { ...prev, stock: prev.waste.slice().reverse().map(c => ({ ...c, faceUp: false })), waste: [] };
      }
      const newStock = [...prev.stock];
      const card = newStock.pop();
      card.faceUp = true;
      return { ...prev, stock: newStock, waste: [...prev.waste, card] };
    });
    setSelected(null);
    setMoves(m => m + 1);
  }, []);

  const handleCardClick = useCallback((source, col, cardIdx) => {
    // If clicking a face-down card, flip it (only if it's the top card of tableau)
    if (source === 'tableau') {
      const card = state.tableau[col][cardIdx];
      if (card && !card.faceUp) {
        if (cardIdx === state.tableau[col].length - 1) {
          setState(prev => {
            const tableau = prev.tableau.map(c => [...c]);
            tableau[col][cardIdx] = { ...tableau[col][cardIdx], faceUp: true };
            return { ...prev, tableau };
          });
          setMoves(m => m + 1);
        }
        setSelected(null);
        return;
      }
    }

    // Toggle selection
    if (selected && selected.source === source && selected.col === col && selected.cardIdx === cardIdx) {
      setSelected(null);
      return;
    }

    // If something is selected, try to move
    if (selected) {
      tryMove(selected, source, col);
    } else {
      // Select the card (and any cards on top of it if tableau)
      if (source === 'tableau') {
        const card = state.tableau[col][cardIdx];
        if (card && card.faceUp) setSelected({ source, col, cardIdx });
      } else if (source === 'waste') {
        const card = state.waste[state.waste.length - 1];
        if (card) setSelected({ source: 'waste', col: 0, cardIdx: state.waste.length - 1 });
      }
    }
  }, [selected, state]);

  const tryMove = useCallback((from, toSource, toCol) => {
    setState(prev => {
      let movingCards = [];
      const newTableau = prev.tableau.map(c => [...c]);
      const newWaste = [...prev.waste];
      const newFoundations = prev.foundations.map(f => [...f]);

      // Extract moving cards
      if (from.source === 'tableau') {
        movingCards = newTableau[from.col].slice(from.cardIdx);
      } else if (from.source === 'waste') {
        movingCards = [newWaste.pop()];
      }

      if (movingCards.length === 0) return prev;

      // Determine target
      if (toSource === 'tableau') {
        const targetCol = newTableau[toCol];
        const targetCard = targetCol[targetCol.length - 1];
        if (canStackOnTableau(movingCards[0], targetCard)) {
          newTableau[toCol] = [...targetCol, ...movingCards];
        } else {
          return prev; // Invalid move
        }
        // Remove from source
        if (from.source === 'tableau') {
          newTableau[from.col] = newTableau[from.col].slice(0, from.cardIdx);
        }
      } else if (toSource === 'foundation') {
        if (movingCards.length !== 1) return prev;
        if (canPlaceOnFoundation(movingCards[0], newFoundations[toCol])) {
          newFoundations[toCol] = [...newFoundations[toCol], ...movingCards];
        } else {
          return prev;
        }
        if (from.source === 'tableau') {
          newTableau[from.col] = newTableau[from.col].slice(0, from.cardIdx);
        }
      } else {
        return prev;
      }

      // Flip newly exposed tableau card
      for (let c = 0; c < newTableau.length; c++) {
        const len = newTableau[c].length;
        if (len > 0 && !newTableau[c][len - 1].faceUp) {
          newTableau[c][len - 1] = { ...newTableau[c][len - 1], faceUp: true };
        }
      }

      return { ...prev, tableau: newTableau, waste: newWaste, foundations: newFoundations };
    });
    setSelected(null);
    setMoves(m => m + 1);
  }, []);

  const handleFoundationClick = useCallback((col) => {
    if (selected) {
      tryMove(selected, 'foundation', col);
    } else {
      // Try auto-move waste card to foundation
      const topWaste = state.waste[state.waste.length - 1];
      if (topWaste && canPlaceOnFoundation(topWaste, state.foundations[col])) {
        setSelected({ source: 'waste', col: 0, cardIdx: state.waste.length - 1 });
        setTimeout(() => tryMove({ source: 'waste', col: 0, cardIdx: state.waste.length - 1 }, 'foundation', col), 0);
      }
    }
  }, [selected, state, tryMove]);

  const handleEmptyTableauClick = useCallback((col) => {
    if (selected) tryMove(selected, 'tableau', col);
  }, [selected, tryMove]);

  const totalFoundation = state.foundations.reduce((sum, f) => sum + f.length, 0);
  const isWin = totalFoundation === 52;

  const cardStyle = {
    width: `${CARD_W}px`,
    height: `${CARD_H}px`,
  };

  const isSelected = (source, col, cardIdx) => {
    if (!selected) return false;
    if (source === 'tableau' && selected.source === 'tableau' && selected.col === col && cardIdx >= selected.cardIdx) return true;
    if (source === 'waste' && selected.source === 'waste') return true;
    return false;
  };

  return (
    <div className="flex flex-col gap-2 p-2" style={{ minWidth: '300px' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
          ♠ Solitaire
          <span className="text-xs text-muted-foreground font-normal">
            {moves} moves
          </span>
        </h3>
        <div className="flex gap-1">
          <button onClick={reset} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="New game">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Close game">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Top row: stock, waste, gap, foundations */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex gap-1">
          {/* Stock */}
          <div onClick={drawStock} style={cardStyle} className="rounded-md border border-border/30 bg-muted/10 flex items-center justify-center cursor-pointer hover:bg-muted/20">
            {state.stock.length > 0 ? (
              <span className="text-berna-purple/60 text-sm">⬡</span>
            ) : (
              <span className="text-muted-foreground/30 text-xs">↻</span>
            )}
          </div>
          {/* Waste */}
          <div style={cardStyle} className="rounded-md border border-dashed border-border/20">
            {state.waste.length > 0 && (
              <Card
                card={state.waste[state.waste.length - 1]}
                style={cardStyle}
                onClick={() => handleCardClick('waste', 0, state.waste.length - 1)}
                draggable
              />
            )}
          </div>
        </div>

        {/* Foundations */}
        <div className="flex gap-1">
          {state.foundations.map((foundation, col) => (
            <div
              key={col}
              onClick={() => handleFoundationClick(col)}
              style={cardStyle}
              className="rounded-md border border-dashed border-border/20 cursor-pointer hover:bg-muted/10 flex items-center justify-center"
            >
              {foundation.length > 0 ? (
                <Card card={foundation[foundation.length - 1]} style={cardStyle} draggable />
              ) : (
                <span className="text-muted-foreground/20 text-sm">{SUIT_SYMBOLS[SUITS[col]]}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex gap-1 justify-center">
        {state.tableau.map((col, colIdx) => (
          <div
            key={colIdx}
            onClick={() => col.length === 0 && handleEmptyTableauClick(colIdx)}
            className="relative"
            style={{ width: `${CARD_W}px`, minHeight: `${CARD_H}px` }}
          >
            {col.length === 0 && (
              <div style={cardStyle} className="rounded-md border border-dashed border-border/20 cursor-pointer hover:bg-muted/10" />
            )}
            {col.map((card, cardIdx) => (
              <div
                key={card.id}
                style={{
                  position: 'absolute',
                  top: `${cardIdx * STACK_OFFSET}px`,
                  ...cardStyle,
                  ...(isSelected('tableau', colIdx, cardIdx) ? { transform: 'translateY(-4px)', boxShadow: '0 0 0 2px hsl(270 80% 60%)' } : {}),
                }}
              >
                <Card
                  card={card}
                  style={cardStyle}
                  onClick={(e) => { e.stopPropagation(); handleCardClick('tableau', colIdx, cardIdx); }}
                  draggable
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {isWin && (
        <div className="text-center py-1 animate-fade-in">
          <p className="text-sm font-bold text-berna-emerald flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> You won! 🎉
          </p>
          <button onClick={reset} className="text-xs text-primary hover:underline mt-1">Play again</button>
        </div>
      )}
    </div>
  );
}