import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, RotateCcw, Volume2, VolumeX, BookOpen, HelpCircle, Gamepad2, 
  Sparkles, ChevronLeft, ChevronRight, RotateCw, Download, ArrowDown, Zap, Info, Home 
} from 'lucide-react';
import { SWEETS, TETROMINOES, PieceType, GridCell, Board, Point, GameStats } from './types';
import { sounds } from './sound';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const createEmptyBoard = (): Board => 
  Array.from({ length: BOARD_HEIGHT }, () => 
    Array.from({ length: BOARD_WIDTH }, () => ({ filled: false, type: null }))
  );

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  emoji: string;
}

export default function App() {
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<PieceType | null>(null);
  const [currentMatrix, setCurrentMatrix] = useState<number[][]>([]);
  const [currentPos, setCurrentPos] = useState<Point>({ x: 3, y: 0 });
  const [nextPieces, setNextPieces] = useState<PieceType[]>([]);
  const [holdPiece, setHoldPiece] = useState<PieceType | null>(null);
  const [hasHeld, setHasHeld] = useState<boolean>(false);
  
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  
  const [stats, setStats] = useState<GameStats>({
    score: 0, lines: 0, level: 1, highScore: 0,
    piecesPlaced: { I: 0, O: 0, T: 0, S: 0, Z: 0, J: 0, L: 0, F: 0 }
  });

  const [feverGauge, setFeverGauge] = useState<number>(0);
  const [feverActive, setFeverActive] = useState<boolean>(false);
  const [feverTimeLeft, setFeverTimeLeft] = useState<number>(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [activeTab, setActiveTab] = useState<'game' | 'encyclopedia' | 'howTo'>('game');
  const [selectedSweet, setSelectedSweet] = useState<PieceType>('I');

  const bagRef = useRef<PieceType[]>([]);
  const lastDropTimeRef = useRef<number>(0);
  const dropIntervalRef = useRef<number>(1000);
  const requestRef = useRef<number | null>(null);
  const feverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load from local storage
  useEffect(() => {
    try {
      const savedHighScore = localStorage.getItem('sweet_high_score');
      const savedCount = localStorage.getItem('sweet_pieces_count');
      setStats(prev => ({
        ...prev,
        highScore: savedHighScore ? parseInt(savedHighScore, 10) : 0,
        piecesPlaced: savedCount ? JSON.parse(savedCount) : prev.piecesPlaced
      }));
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const triggerFloatingEffect = (text: string, x: number, y: number, color: string = 'text-pink-500', emoji: string = '🍰') => {
    const id = Math.random().toString(36).substring(2, 9);
    const xPct = Math.min(85, Math.max(10, (x / BOARD_WIDTH) * 100));
    const yPct = Math.min(85, Math.max(10, (y / BOARD_HEIGHT) * 100));
    setFloatingTexts(p => [...p, { id, text, x: xPct, y: yPct, color, emoji }]);
    setTimeout(() => {
      setFloatingTexts(p => p.filter(t => t.id !== id));
    }, 1500);
  };

  const triggerFever = () => {
    setFeverActive(true);
    setFeverTimeLeft(15);
    setFeverGauge(0);
    sounds.playFeverStart();
    triggerFloatingEffect('フィーバー開始！🍭🍬', 4, 6, 'text-purple-600 font-extrabold text-xl animate-pulse', '🔥');

    if (feverTimerRef.current) clearInterval(feverTimerRef.current);
    feverTimerRef.current = setInterval(() => {
      setFeverTimeLeft(prev => {
        if (prev <= 1) {
          if (feverTimerRef.current) clearInterval(feverTimerRef.current);
          setFeverActive(false);
          triggerFloatingEffect('フィーバー終了！', 4, 5, 'text-gray-500', '⏱️');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (feverGauge >= 100 && !feverActive) triggerFever();
  }, [feverGauge, feverActive]);

  useEffect(() => {
    let baseSpeed = difficulty === 'easy' ? 900 : difficulty === 'normal' ? 600 : 350;
    const levelModifier = Math.max(0.25, 1 - (stats.level - 1) * 0.08);
    dropIntervalRef.current = feverActive ? 220 : baseSpeed * levelModifier;
  }, [difficulty, stats.level, feverActive]);

  const getNextPieceFromBag = () => {
    if (feverActive && Math.random() < 0.45) return 'F';
    if (bagRef.current.length === 0) {
      const standard: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      const shuffled = [...standard].sort(() => Math.random() - 0.5);
      bagRef.current = shuffled;
    }
    return bagRef.current.shift()!;
  };

  const startGame = () => {
    setBoard(createEmptyBoard());
    setHoldPiece(null);
    setHasHeld(false);
    bagRef.current = [];
    
    const queue = [getNextPieceFromBag(), getNextPieceFromBag(), getNextPieceFromBag(), getNextPieceFromBag()];
    const current = queue.shift()!;
    
    setCurrentPiece(current);
    setCurrentMatrix(TETROMINOES[current]);
    setCurrentPos({ x: Math.floor((BOARD_WIDTH - TETROMINOES[current][0].length) / 2), y: 0 });
    setNextPieces(queue);
    
    setStats(prev => ({
      ...prev,
      score: 0,
      lines: 0,
      level: 1,
    }));
    setFeverGauge(0);
    setFeverActive(false);
    if (feverTimerRef.current) clearInterval(feverTimerRef.current);
    
    setIsGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
    
    lastDropTimeRef.current = performance.now();
    triggerFloatingEffect('レッツクッキング！👩‍🍳', 4, 3, 'text-pink-500 font-bold text-lg', '🎂');
  };

  // タイトル／難易度選択画面に戻る
  const goToTitle = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    setIsGameOver(false);
    setBoard(createEmptyBoard());
    setHoldPiece(null);
    setHasHeld(false);
    if (feverTimerRef.current) clearInterval(feverTimerRef.current);
    setFeverActive(false);
    setFeverGauge(0);
    triggerFloatingEffect('難易度を選び直そう 🧁', 4, 3, 'text-pink-500 font-bold', '🍭');
  }, []);

  const checkCollision = (pos: Point, matrix: number[][], curBoard: Board): boolean => {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const nextX = pos.x + c;
          const nextY = pos.y + r;
          if (nextX < 0 || nextX >= BOARD_WIDTH || nextY >= BOARD_HEIGHT) return true;
          if (nextY >= 0 && curBoard[nextY][nextX].filled) return true;
        }
      }
    }
    return false;
  };

  const lockPiece = useCallback((pos: Point, matrix: number[][], type: PieceType, curBoard: Board) => {
    const nextBoard = curBoard.map(row => row.map(cell => ({ ...cell })));
    let hasLock = false;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const gridY = pos.y + r;
          const gridX = pos.x + c;
          if (gridY >= 0 && gridY < BOARD_HEIGHT) {
            nextBoard[gridY][gridX] = { filled: true, type };
            hasLock = true;
          }
        }
      }
    }

    if (!hasLock) return;
    sounds.playDrop();

    // Increment count
    setStats(prev => {
      const nextCounts = { ...prev.piecesPlaced, [type]: (prev.piecesPlaced[type] || 0) + 1 };
      try {
        localStorage.setItem('sweet_pieces_count', JSON.stringify(nextCounts));
      } catch (e) {}
      return { ...prev, piecesPlaced: nextCounts };
    });

    // Check lines
    let linesCleared: number[] = [];
    for (let r = BOARD_HEIGHT - 1; r >= 0; r--) {
      if (nextBoard[r].every(c => c.filled)) linesCleared.push(r);
    }

    let multiplier = feverActive ? 3 : 1;
    if (linesCleared.length > 0) {
      linesCleared.forEach(r => {
        for (let c = 0; c < BOARD_WIDTH; c++) {
          nextBoard[r][c].animation = 'clear';
        }
      });

      const sData = SWEETS[type];
      triggerFloatingEffect(
        `${sData?.soundWord || 'サクッ！'} ✨`,
        4,
        linesCleared[0],
        'text-pink-500 font-black text-xl scale-110',
        sData?.emoji || '🍪'
      );

      const basePoints = [0, 100, 250, 500, 900];
      const points = basePoints[Math.min(linesCleared.length, 4)] * stats.level * multiplier;
      sounds.playLineClear(linesCleared.length);

      if (!feverActive) {
        setFeverGauge(g => Math.min(100, g + linesCleared.length * 15 + (linesCleared.length === 4 ? 20 : 0)));
      }

      setStats(prev => {
        const nextLines = prev.lines + linesCleared.length;
        const nextLevel = Math.floor(nextLines / 10) + 1;
        const nextScore = prev.score + points;
        if (nextScore > prev.highScore) {
          try { localStorage.setItem('sweet_high_score', nextScore.toString()); } catch (e) {}
        }
        return { ...prev, lines: nextLines, level: nextLevel, score: nextScore, highScore: Math.max(nextScore, prev.highScore) };
      });

      setTimeout(() => {
        setBoard(prev => {
          const filtered = prev.filter((_, idx) => !linesCleared.includes(idx));
          const padding = Array.from({ length: BOARD_HEIGHT - filtered.length }, () => 
            Array.from({ length: BOARD_WIDTH }, () => ({ filled: false, type: null }))
          );
          return [...padding, ...filtered];
        });
      }, 120);

    } else {
      setStats(prev => {
        const nextScore = prev.score + 10 * multiplier;
        if (nextScore > prev.highScore) {
          try { localStorage.setItem('sweet_high_score', nextScore.toString()); } catch (e) {}
        }
        return { ...prev, score: nextScore, highScore: Math.max(nextScore, prev.highScore) };
      });
      setBoard(nextBoard);
    }

    // Spawn next piece
    const queue = [...nextPieces];
    const spawn = queue.shift()!;
    queue.push(getNextPieceFromBag());

    const sMatrix = TETROMINOES[spawn];
    const spawnPos = { x: Math.floor((BOARD_WIDTH - sMatrix[0].length) / 2), y: 0 };

    if (checkCollision(spawnPos, sMatrix, nextBoard)) {
      setIsGameOver(true);
      setIsPlaying(false);
      sounds.playGameOver();
      triggerFloatingEffect('お腹いっぱい！お山崩壊 😫', 5, 8, 'text-red-500 font-bold scale-110', '💥');
      return;
    }

    setCurrentPiece(spawn);
    setCurrentMatrix(sMatrix);
    setCurrentPos(spawnPos);
    setNextPieces(queue);
    setHasHeld(false);
  }, [nextPieces, stats.level, feverActive]);

  const movePiece = useCallback((dx: number, dy: number): boolean => {
    if (!isPlaying || isPaused || isGameOver || !currentPiece) return false;
    const nextPos = { x: currentPos.x + dx, y: currentPos.y + dy };
    if (!checkCollision(nextPos, currentMatrix, board)) {
      setCurrentPos(nextPos);
      if (dx !== 0 && dy === 0) sounds.playMove();
      return true;
    }
    if (dy > 0) {
      lockPiece(currentPos, currentMatrix, currentPiece, board);
      return false;
    }
    return false;
  }, [currentPos, currentMatrix, board, currentPiece, isPlaying, isPaused, isGameOver, lockPiece]);

  const softDrop = useCallback(() => movePiece(0, 1), [movePiece]);

  const hardDrop = useCallback(() => {
    if (!isPlaying || isPaused || isGameOver || !currentPiece) return;
    let finalY = currentPos.y;
    while (!checkCollision({ x: currentPos.x, y: finalY + 1 }, currentMatrix, board)) {
      finalY++;
    }
    const dropDist = finalY - currentPos.y;
    setStats(prev => ({ ...prev, score: prev.score + dropDist * 2 * (feverActive ? 3 : 1) }));
    triggerFloatingEffect('スッと解決！🍪', currentPos.x + 1, finalY, 'text-yellow-600', '⭐');
    lockPiece({ x: currentPos.x, y: finalY }, currentMatrix, currentPiece, board);
  }, [currentPos, currentMatrix, board, currentPiece, isPlaying, isPaused, isGameOver, lockPiece, feverActive]);

  const rotatePiece = useCallback(() => {
    if (!isPlaying || isPaused || isGameOver || !currentPiece || currentPiece === 'F') return;
    const size = currentMatrix.length;
    const rotated = Array.from({ length: size }, () => Array(size).fill(0));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        rotated[c][size - 1 - r] = currentMatrix[r][c];
      }
    }
    const kicks = [0, -1, 1, -2, 2];
    for (const offset of kicks) {
      const kPos = { x: currentPos.x + offset, y: currentPos.y };
      if (!checkCollision(kPos, rotated, board)) {
        setCurrentMatrix(rotated);
        setCurrentPos(kPos);
        sounds.playRotate();
        return;
      }
    }
  }, [currentPos, currentMatrix, board, currentPiece, isPlaying, isPaused, isGameOver]);

  const holdCurrentPiece = useCallback(() => {
    if (!isPlaying || isPaused || isGameOver || !currentPiece || hasHeld) return;
    sounds.playHold();
    triggerFloatingEffect('キープ！🍓', 1, 3, 'text-indigo-500', '📦');
    const nextHold = currentPiece;
    
    if (holdPiece === null) {
      const queue = [...nextPieces];
      const spawn = queue.shift()!;
      queue.push(getNextPieceFromBag());
      setCurrentPiece(spawn);
      setCurrentMatrix(TETROMINOES[spawn]);
      setCurrentPos({ x: Math.floor((BOARD_WIDTH - TETROMINOES[spawn][0].length) / 2), y: 0 });
      setNextPieces(queue);
    } else {
      const recall = holdPiece;
      setCurrentPiece(recall);
      setCurrentMatrix(TETROMINOES[recall]);
      setCurrentPos({ x: Math.floor((BOARD_WIDTH - TETROMINOES[recall][0].length) / 2), y: 0 });
    }
    setHoldPiece(nextHold);
    setHasHeld(true);
  }, [currentPiece, holdPiece, nextPieces, hasHeld, isPlaying, isPaused, isGameOver]);

  const gameLoop = useCallback((time: number) => {
    if (isPlaying && !isPaused && !isGameOver) {
      const delta = time - lastDropTimeRef.current;
      if (delta >= dropIntervalRef.current) {
        softDrop();
        lastDropTimeRef.current = time;
      }
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  }, [isPlaying, isPaused, isGameOver, softDrop]);

  useEffect(() => {
    if (isPlaying && !isPaused && !isGameOver) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, isPaused, isGameOver, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isPaused || isGameOver) {
        if (e.code === 'Space' && !isPlaying) startGame();
        return;
      }
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': movePiece(-1, 0); e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': movePiece(1, 0); e.preventDefault(); break;
        case 'ArrowDown': case 'KeyS': movePiece(0, 1); e.preventDefault(); break;
        case 'ArrowUp': case 'KeyW': case 'KeyX': rotatePiece(); e.preventDefault(); break;
        case 'Space': hardDrop(); e.preventDefault(); break;
        case 'ShiftLeft': case 'KeyC': holdCurrentPiece(); e.preventDefault(); break;
        case 'Escape': case 'KeyP': setIsPaused(p => !p); e.preventDefault(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, isGameOver, movePiece, rotatePiece, hardDrop, holdCurrentPiece]);

  const getRenderBoard = (): GridCell[][] => {
    const render = board.map(row => row.map(cell => ({ ...cell })));
    if (currentPiece && !isPaused && !isGameOver) {
      for (let r = 0; r < currentMatrix.length; r++) {
        for (let c = 0; c < currentMatrix[r].length; c++) {
          if (currentMatrix[r][c]) {
            const gridY = currentPos.y + r;
            const gridX = currentPos.x + c;
            if (gridY >= 0 && gridY < BOARD_HEIGHT && gridX >= 0 && gridX < BOARD_WIDTH) {
              render[gridY][gridX] = { filled: true, type: currentPiece };
            }
          }
        }
      }
    }
    return render;
  };

  const renderBoard = getRenderBoard();

  return (
    <div 
      id="sweetris_app_root" 
      className={`bg-pink-50/50 text-gray-800 font-sans p-1 sm:p-2 md:p-6 flex flex-col items-center select-none ${
        isPlaying && activeTab === 'game' ? 'h-screen max-h-screen overflow-hidden justify-between' : 'min-h-screen justify-start'
      }`}
      style={{ backgroundImage: 'radial-gradient(#fbcfe8 1px, transparent 1px)', backgroundSize: '16px 16px' }}
    >
      
      {/* 画面を上下させないため、高さを最適化し、ゲーム中はヘッダーをスリムにする。モバイルゲーム中は非表示 */}
      <header 
        id="app_header" 
        className={`w-full max-w-4xl bg-white/80 backdrop-blur-md rounded-2xl border border-pink-100 flex items-center justify-between gap-2 shadow-sm transition-all duration-300 ${
          isPlaying ? 'p-1.5 md:p-3 mb-1.5 md:mb-4' : 'p-4 mb-4 md:mb-6'
        } animate-bubble-pop ${isPlaying ? 'hidden lg:flex' : 'flex'}`}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <div className={`rounded-xl bg-pink-400 flex items-center justify-center shadow-md shadow-pink-200/50 text-xl transition-all ${isPlaying ? 'w-8 h-8 md:w-10 md:h-10 text-lg' : 'w-12 h-12 text-2xl'}`}>
            🧁
          </div>
          <div>
            <h1 className={`font-black tracking-tight text-pink-500 flex items-center gap-1.5 transition-all ${isPlaying ? 'text-base md:text-xl' : 'text-xl md:text-2xl'}`}>
              Sweetris <span className="hidden sm:inline text-[9px] md:text-xs bg-pink-100 text-pink-600 font-semibold px-2 py-0.5 rounded-full">お菓子テトリス</span>
            </h1>
            {!isPlaying && <p className="text-[10px] md:text-xs text-gray-400">カラフルで美味しそうなお菓子を集める、美味しくて甘〜いゲーム 🍬</p>}
          </div>
        </div>

        {/* タブメニュー */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            id="nav_game" onClick={() => setActiveTab('game')}
            className={`px-2 py-1 md:px-3 md:py-1.5 rounded-xl text-[10px] md:text-xs font-semibold flex items-center gap-1 transition-all ${activeTab === 'game' ? 'bg-pink-400 text-white shadow-md' : 'bg-pink-50 text-pink-500 hover:bg-pink-100/40'}`}
          >
            <Gamepad2 className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden xs:inline">ゲーム</span>
          </button>
          <button 
            id="nav_encyclopedia" onClick={() => setActiveTab('encyclopedia')}
            className={`px-2 py-1 md:px-3 md:py-1.5 rounded-xl text-[10px] md:text-xs font-semibold flex items-center gap-1 transition-all ${activeTab === 'encyclopedia' ? 'bg-pink-400 text-white shadow-md' : 'bg-pink-50 text-pink-500 hover:bg-pink-100/40'}`}
          >
            <BookOpen className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden xs:inline">図鑑</span>
          </button>
          <button 
            id="nav_howto" onClick={() => setActiveTab('howTo')}
            className={`px-2 py-1 md:px-3 md:py-1.5 rounded-xl text-[10px] md:text-xs font-semibold flex items-center gap-1 transition-all ${activeTab === 'howTo' ? 'bg-pink-400 text-white shadow-md' : 'bg-pink-50 text-pink-500 hover:bg-pink-100/40'}`}
          >
            <HelpCircle className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden xs:inline">遊び方</span>
          </button>
          <button 
            id="btn_mute" onClick={() => { sounds.toggleMute(); setMuted(!muted); }}
            className="p-1.5 md:p-2 bg-white border border-pink-100 rounded-xl text-pink-500 hover:bg-pink-50"
          >
            {muted ? <VolumeX className="w-3.5 md:w-4 h-3.5 md:h-4" /> : <Volume2 className="w-3.5 md:w-4 h-3.5 md:h-4" />}
          </button>
        </div>
      </header>

      {/* メメイン画面：横並び（デスクトップ）でも 縦並び（モバイル・省スペース仕様）でも完全に収まるグリッド */}
      <main id="app_main" className="w-full max-w-4xl flex justify-center items-start flex-1 px-1 overflow-hidden">
        
        {activeTab === 'game' && (
          <div className="flex flex-col lg:flex-row gap-1.5 md:gap-6 items-center lg:items-start justify-center w-full">
            
            {/* モバイル専用のスリムHUD（HOLD、NEXT、スコアを1列に。ゲーム中かつlg未満のみ表示） */}
            {isPlaying && (
              <div id="mobile_hud" className="w-full max-w-sm flex lg:hidden items-center justify-between gap-1 bg-white/95 backdrop-blur-sm rounded-xl p-1 border border-pink-100 shadow-sm animate-bubble-pop mb-1.5">
                {/* HOLD */}
                <button
                  onClick={holdCurrentPiece}
                  disabled={hasHeld}
                  className={`flex items-center gap-1.5 px-1.5 py-1 rounded-lg border text-[9px] font-black active:scale-95 transition-all ${
                    hasHeld 
                      ? 'bg-gray-150 text-gray-400 border-gray-150 opacity-40' 
                      : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'
                  }`}
                >
                  <span className="text-[8px] text-orange-400 font-extrabold uppercase animate-pulse">HOLD</span>
                  <span className="text-xs leading-none">{holdPiece ? SWEETS[holdPiece].emoji : '🧁'}</span>
                </button>

                {/* SCORE & LEVEL */}
                <div className="flex-1 flex justify-center items-center gap-2">
                  <div className="text-center">
                    <span className="text-[7px] text-gray-400 block font-bold tracking-wider -mb-0.5">SCORE</span>
                    <span className="text-xs font-mono font-black text-pink-500">{stats.score.toLocaleString()}</span>
                  </div>
                  <div className="text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1 py-0.5 rounded leading-none">
                    Lv.{stats.level}
                  </div>
                  <div className="text-[8px] font-bold text-amber-500 bg-amber-50 px-1 py-0.5 rounded leading-none">
                    数:{stats.lines}
                  </div>
                </div>

                {/* CONTROLS (Mute & Title) */}
                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={() => { sounds.toggleMute(); setMuted(!muted); }}
                    className="p-1.5 bg-pink-50 hover:bg-pink-100/60 rounded-lg text-pink-500 border border-pink-100 active:scale-90 transition-all"
                    title="音量切り替え"
                  >
                    {muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                  <button 
                    onClick={() => setIsPaused(p => !p)}
                    className="p-1.5 bg-yellow-50 hover:bg-yellow-101 rounded-lg text-yellow-600 border border-yellow-100 font-black text-[9px] active:scale-90 transition-all flex items-center justify-center"
                    title="一時停止"
                  >
                    {isPaused ? <Play className="w-3 h-3 fill-current" /> : <span className="w-3 h-3 flex items-center justify-center font-black">Ⅱ</span>}
                  </button>
                  <button 
                    onClick={goToTitle}
                    className="p-1.5 bg-rose-50 hover:bg-rose-101 rounded-lg text-rose-500 border border-rose-100 active:scale-90 transition-all"
                    title="タイトルに戻る"
                  >
                    <Home className="w-3 h-3" />
                  </button>
                </div>

                {/* NEXT */}
                <div className="flex items-center gap-1 bg-pink-50/40 px-1.5 py-1 rounded-lg border border-pink-150 text-[9px]">
                  <span className="text-[8px] text-pink-400 font-extrabold uppercase">NEXT</span>
                  <span className="text-xs leading-none">{nextPieces[0] ? SWEETS[nextPieces[0]].emoji : '🍰'}</span>
                </div>
              </div>
            )}

            {/* 左側：ホールド ＆ スコア (PC/横向きでは左、スマホ/縦向きではテトリス盤面の上に小さく表示してスクロールを防止) */}
            <div className={`w-full lg:w-40 ${isPlaying ? 'hidden lg:flex' : 'flex'} flex-row lg:flex-col gap-2 md:gap-4 justify-between lg:justify-start items-stretch`}>
              
              {/* ホールドボックス (横長にフィットするように調整) */}
              <div className="flex-1 bg-white rounded-2xl p-2 md:p-4 border border-pink-100 shadow-sm flex flex-col items-center justify-center lg:justify-start">
                <span className="text-[10px] md:text-xs font-bold text-pink-400 mb-1 lg:mb-2">📦 HOLD</span>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-pink-50/40 rounded-xl flex items-center justify-center border border-dashed border-pink-200">
                  {holdPiece ? (
                    <div className="flex flex-col items-center">
                      <span className="text-xl md:text-2xl">{SWEETS[holdPiece].emoji}</span>
                      <span className="text-[8px] md:text-[9px] text-pink-600 font-bold truncate max-w-[45px] md:max-w-[60px]">{SWEETS[holdPiece].japaneseName}</span>
                    </div>
                  ) : (
                    <span className="text-[9px] md:text-[10px] text-gray-300 italic">空っぽ</span>
                  )}
                </div>
              </div>

              {/* スコア・情報 (スマホ対応のコンパクト設計) */}
              <div className="flex-2 bg-white rounded-2xl p-2 md:p-4 border border-pink-100 shadow-sm flex flex-col justify-center gap-1 md:gap-2">
                <div className="flex lg:flex-col justify-between items-center lg:items-start">
                  <span className="text-[8px] md:text-[9px] font-bold text-gray-400 block">👑 ハイスコア</span>
                  <span className="text-xs md:text-sm font-bold text-amber-500 font-mono">{stats.highScore.toLocaleString()}</span>
                </div>
                <hr className="hidden lg:block border-pink-50" />
                <div className="flex lg:flex-col justify-between items-center lg:items-start">
                  <span className="text-[8px] md:text-[9px] font-bold text-gray-400 block">🍪 今のスコア</span>
                  <span className="text-base md:text-xl font-black text-pink-500 font-mono">{stats.score.toLocaleString()}</span>
                </div>
                <hr className="hidden lg:block border-pink-50" />
                <div className="flex justify-between text-[10px] md:text-xs font-semibold text-gray-600 gap-2">
                  <span>焼き数: {stats.lines}</span>
                  <span className="text-indigo-500">Lv.{stats.level}</span>
                </div>
              </div>
            </div>

            {/* 中央：テトリス盤面 (縦の大きさをスマホでも収まるようにコンパクトに可変) */}
            <div className="relative flex flex-col items-center">
              
              {/* フィーバーゲージ */}
              <div className="w-full mb-1.5 md:mb-2 bg-pink-100/50 p-1 md:p-1.5 rounded-full border border-pink-100 flex items-center gap-1.5">
                <div className="flex items-center gap-0.5 pl-1 text-[8px] md:text-[10px] font-black text-pink-500 animate-pulse">
                  <Sparkles className="w-2.5 md:w-3 h-2.5 md:h-3" />
                  <span>フィーバー</span>
                </div>
                <div className="flex-1 h-2 md:h-3 bg-pink-50 rounded-full overflow-hidden border border-pink-100">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-400 via-yellow-300 to-orange-300 transition-all duration-300"
                    style={{ width: `${feverActive ? 100 : feverGauge}%` }}
                  />
                </div>
                <span className="text-[8px] md:text-[10px] font-bold text-pink-600 pr-1 min-w-[20px] md:min-w-[24px]">
                  {feverActive ? `強火! ${feverTimeLeft}s` : `${feverGauge}%`}
                </span>
              </div>

              {/* ゲーム盤 */}
              <div className={`bg-white rounded-2xl border-4 ${feverActive ? 'border-pink-400 shadow-md shadow-pink-200' : 'border-pink-200'} p-0.5 md:p-1 relative overflow-hidden`}>
                
                {/* 浮き上がるテキスト */}
                <div className="absolute inset-0 pointer-events-none z-30">
                  {floatingTexts.map(t => (
                    <div
                      key={t.id}
                      className="absolute animate-float-up bg-white/95 border border-pink-100 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1"
                      style={{ left: `${t.x}%`, top: `${t.y}%` }}
                    >
                      <span>{t.emoji}</span>
                      <span className={t.color}>{t.text}</span>
                    </div>
                  ))}
                </div>

                {/* ボードグリッド (縦方向をスマホ画面に完璧に収めるため `h-[300px] xs:h-[350px] ...` とスリムに最適化) */}
                <div 
                  className="grid grid-cols-10 grid-rows-20 gap-[1px] md:gap-[2px] w-[165px] h-[300px] xs:w-[190px] xs:h-[350px] sm:w-[220px] sm:h-[400px] md:w-[240px] md:h-[440px] lg:w-[280px] lg:h-[510px] bg-pink-55/10"
                  style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gridTemplateRows: 'repeat(20, minmax(0, 1fr))' }}
                >
                  {renderBoard.map((row, r) => 
                    row.map((cell, c) => {
                      const sweet = cell.type ? SWEETS[cell.type] : null;
                      return (
                        <div
                          key={`cell-${r}-${c}`}
                          className={`w-full h-full rounded-[3px] border flex items-center justify-center relative overflow-hidden transition-all duration-100 ${
                            cell.filled && sweet
                              ? `${sweet.baseColor} ${sweet.borderColor} ${sweet.shadowColor} ${sweet.textPattern} shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]`
                              : 'bg-pink-50/5 border-pink-100/10'
                          } ${cell.animation === 'clear' ? 'animate-ping border-yellow-300 bg-yellow-300 text-white' : ''}`}
                        >
                          {cell.filled && sweet && (
                            <span className="text-[10px] xs:text-xs md:text-sm drop-shadow-sm select-none z-10">
                              {sweet.emoji}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 各種オーバーレイ (インゲームダイアログ：ポーズ中やゲームオーバーからタイトルへ完全に戻れるようにボタンを強化) */}
                {(!isPlaying || isPaused || isGameOver) && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-3 text-center animate-bubble-pop">
                    {isGameOver ? (
                      <div className="flex flex-col items-center gap-1.5 md:gap-2 max-w-[200px]">
                        <span className="text-3xl">🧁💦💥</span>
                        <h2 className="text-base md:text-lg font-black text-pink-500">お山が崩れちゃった！</h2>
                        <span className="text-[10px] text-gray-500">お菓子のタワーが崩壊しました…</span>
                        
                        <div className="my-1 BG-pink-50 px-3 py-1 rounded-xl border border-pink-100">
                          <span className="text-[9px] text-gray-400 block font-bold">スコア</span>
                          <span className="text-base font-mono font-black text-pink-500">{stats.score.toLocaleString()} 点</span>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 w-full mt-1">
                          <button
                            onClick={startGame}
                            className="w-full px-4 py-2 bg-pink-400 hover:bg-pink-500 text-white rounded-full font-bold shadow-md transition-all text-xs flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> もう一度焼く
                          </button>
                          <button
                            onClick={goToTitle}
                            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full font-bold transition-all text-xs flex items-center justify-center gap-1.5"
                            title="タイトル画面に戻って難易度を選び直す"
                          >
                            <Home className="w-3.5 h-3.5" /> 難易度を選び直す
                          </button>
                        </div>
                      </div>
                    ) : isPaused ? (
                      <div className="flex flex-col items-center gap-3 max-w-[200px]">
                        <span className="text-3xl animate-bounce">⏱️🍪</span>
                        <h2 className="text-base md:text-lg font-black text-amber-500">クッキング休憩中</h2>
                        <span className="text-[10px] text-gray-400">現在お菓子はストップしています。</span>
                        
                        <div className="flex flex-col gap-2 w-full mt-1.5">
                          <button
                            onClick={() => setIsPaused(false)}
                            className="w-full px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-white rounded-full font-black shadow-md transition-all text-xs flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5" /> ゲームに戻る
                          </button>
                          <button
                            onClick={goToTitle}
                            className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full font-bold transition-all text-xs flex items-center justify-center gap-1.5"
                            title="今の進行をあきらめて難易度を選び直す"
                          >
                            <Home className="w-3.5 h-3.5" /> 難易度を選び直す (終了)
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 初期スタート画面 (難易度選択ができる最重要ポイント)
                      <div className="flex flex-col items-center gap-2 md:gap-3 max-w-[220px]">
                        <span className="text-4xl md:text-5xl animate-bounce">👩‍🍳🍡🥯</span>
                        <h2 className="text-base md:text-lg font-black text-pink-500">お菓子テトリス</h2>
                        <p className="text-[10px] md:text-[11px] text-gray-500 leading-relaxed font-semibold">
                          ポッキー、クッキー、プリンなどのスイーツ型ブロックを揃えてサクサク消しあおう！
                        </p>
                        
                        <div className="bg-pink-100/30 p-1 rounded-xl border border-pink-100 flex items-center gap-1 mt-1 justify-center w-full">
                          {(['easy', 'normal', 'hard'] as const).map(d => (
                            <button
                              key={d} onClick={() => setDifficulty(d)}
                              className={`px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black transition-all ${difficulty === d ? 'bg-pink-400 text-white shadow-sm' : 'text-pink-600 hover:bg-pink-100'}`}
                            >
                              {d === 'easy' ? '甘口' : d === 'normal' ? '中辛' : '辛口'}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={startGame}
                          className="mt-1.5 px-6 py-2.5 md:py-3 bg-pink-400 hover:bg-pink-500 text-white rounded-full font-bold text-xs shadow-md transition-all flex items-center gap-1.5 w-full justify-center"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> クッキング開始！
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 右側：NEXT & 一時停止/タイトル戻り (PC/横向きは右、スマホ/縦向きはモバイルHUDで代用するためゲーム中は非表示に) */}
            <div className={`w-full lg:w-36 ${isPlaying ? 'hidden lg:flex' : 'flex'} flex-row lg:flex-col gap-2 md:gap-4 justify-between lg:justify-start items-center lg:items-stretch`}>
              
              {/* ネクストピース予告 */}
              <div className="flex-1 bg-white rounded-2xl p-2 md:p-3 border border-pink-100 shadow-sm flex flex-col items-center">
                <span className="text-[10px] md:text-xs font-bold text-pink-400 mb-1 lg:mb-2">🧁 NEXT</span>
                
                <div className="flex flex-row lg:flex-col gap-1.5 md:gap-2.5 w-full justify-center">
                  {nextPieces.slice(0, 2).map((piece, idx) => {
                    const s = SWEETS[piece];
                    return (
                      <div 
                        key={`next-${idx}-${piece}`} 
                        className={`flex-1 flex flex-col items-center justify-center p-1 rounded-xl border ${idx === 0 ? 'bg-pink-50/50 border-pink-200' : 'bg-gray-50/20 border-gray-100 opacity-60'}`}
                      >
                        <span className="text-lg md:text-xl select-none">{s.emoji}</span>
                        <span className="text-[7px] md:text-[8px] text-gray-500 font-semibold truncate max-w-[40px] md:max-w-[55px] font-japanese">{s.japaneseName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ゲーム中の緊急メニュー (直接難易度選択に戻れる「タイトル」ボタンをゲームプレイ中にも装備！) */}
              {isPlaying && (
                <div className="flex-1 flex flex-col gap-1 md:gap-2 w-full max-w-[120px] lg:max-w-none">
                  <button
                    onClick={() => setIsPaused(p => !p)}
                    className="w-full px-2 py-1.5 md:py-2.5 bg-yellow-400 hover:bg-yellow-500 text-white font-bold rounded-xl text-[9px] md:text-[10px] flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Info className="w-3 h-3" /> {isPaused ? '再開' : 'ポーズ'}
                  </button>
                  <button
                    onClick={goToTitle}
                    className="w-full px-2 py-1.5 md:py-2.5 bg-rose-400 hover:bg-rose-500 text-white font-bold rounded-xl text-[9px] md:text-[10px] flex items-center justify-center gap-1 shadow-sm"
                    title="今のクッキングをあきらめて、難易度を選び直す"
                  >
                    <Home className="w-3 h-3" /> タイトル
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 図鑑タブ */}
        {activeTab === 'encyclopedia' && (
          <div className="w-full bg-white rounded-2xl p-4 md:p-6 border border-pink-100 shadow-sm flex flex-col md:flex-row gap-5 animate-bubble-pop">
            <div className="flex-1">
              <h2 className="text-base md:text-lg font-black text-pink-500 mb-1">📖 お菓子レシピ図鑑</h2>
              <p className="text-[10px] md:text-all text-gray-400 mb-3">焼きたてお菓子のライブラリ。お役立ち情報満載！</p>
              
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                {(Object.keys(SWEETS) as PieceType[]).map(type => {
                  const s = SWEETS[type];
                  return (
                    <button
                      key={`enc-${type}`} onClick={() => setSelectedSweet(type)}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all ${selectedSweet === type ? 'bg-pink-50 border-pink-400' : 'bg-white border-pink-100 hover:bg-pink-50/10'}`}
                    >
                      <span className="text-lg md:text-xl">{s.emoji}</span>
                      <div className="overflow-hidden">
                        <h4 className="text-[10px] md:text-xs font-bold text-gray-700 truncate font-japanese">{s.japaneseName}</h4>
                        <span className="text-[8px] md:text-[9px] text-pink-400 block font-bold">作った: {stats.piecesPlaced[type] || 0}個</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full md:w-52 bg-pink-50/20 border border-pink-100/60 rounded-xl p-3 flex flex-col items-center justify-center text-center">
              <span className="text-4xl md:text-5xl select-none mb-1.5">{SWEETS[selectedSweet].emoji}</span>
              <div className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 font-bold text-[8px] md:text-[9px] mb-1">{SWEETS[selectedSweet].name}</div>
              <h3 className="text-xs md:text-sm font-black text-pink-500 mb-1 font-japanese">{SWEETS[selectedSweet].japaneseName}</h3>
              <p className="text-[10px] md:text-[11px] text-gray-500 leading-relaxed mb-3 max-w-[160px]">{SWEETS[selectedSweet].description}</p>
              
              <div className="bg-white w-full border border-pink-100 rounded-lg p-1.5 flex justify-around text-[10px] md:text-xs font-bold text-gray-500">
                <div>
                  <span className="text-[8px] text-gray-400 block scale-90">テトロ型</span>
                  <span>{SWEETS[selectedSweet].type}</span>
                </div>
                <div className="border-l border-pink-100" />
                <div>
                  <span className="text-[8px] text-gray-400 block scale-90">焼き総数</span>
                  <span className="text-pink-500">{stats.piecesPlaced[selectedSweet] || 0}個</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 遊び方 */}
        {activeTab === 'howTo' && (
          <div className="w-full bg-white rounded-2xl p-4 md:p-5 border border-pink-100 shadow-sm flex flex-col gap-3 animate-bubble-pop max-h-[75vh] overflow-y-auto">
            <h2 className="text-base md:text-lg font-black text-pink-500">🍳 遊び方＆スイーツクッキング</h2>
            
            <div>
              <h3 className="text-xs font-black text-gray-700 mb-1 flex items-center gap-1">📍 クッキング操作方法</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] md:text-[11px] text-gray-600">
                <div className="flex justify-between p-1.5 border border-pink-100 bg-pink-50/10 rounded-lg">
                  <span>左移動 / 右移動</span>
                  <kbd className="px-1 py-0.5 bg-white border rounded text-[8px]">← / → or A / D</kbd>
                </div>
                <div className="flex justify-between p-1.5 border border-pink-100 bg-pink-50/10 rounded-lg">
                  <span>お菓子を回転する</span>
                  <kbd className="px-1 py-0.5 bg-white border rounded text-[8px]">↑ / W / X</kbd>
                </div>
                <div className="flex justify-between p-1.5 border border-pink-100 bg-pink-50/10 rounded-lg">
                  <span>スピード落下 (Soft)</span>
                  <kbd className="px-1 py-0.5 bg-white border rounded text-[8px]">↓ / S</kbd>
                </div>
                <div className="flex justify-between p-1.5 border border-pink-100 bg-pink-50/10 rounded-lg">
                  <span>一気に焼き上げる (Hard)</span>
                  <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-bold">Space</kbd>
                </div>
                <div className="flex justify-between p-1.5 border border-pink-100 bg-pink-50/10 rounded-lg sm:col-span-2">
                  <span>余ったお菓子をキープ (ホールド)</span>
                  <kbd className="px-1 py-0.5 bg-white border rounded text-[8px]">Shift / C</kbd>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-pink-50/30 border border-pink-100 rounded-xl flex gap-2.5 text-[10px] md:text-xs">
              <span className="text-2xl">🍭🔥</span>
              <div>
                <strong className="text-pink-500 block mb-0.5">激アツ「スイーツフィーバーモード」🍰</strong>
                <p className="text-gray-500 leading-relaxed text-[10px] md:text-[11px]">
                  隙間なく並べて消すとお菓子のエネルギー（フィーバーゲージ）が貯まります。<strong className="text-pink-100 bg-pink-600 px-1 py-0.5 rounded font-black">100%</strong>になると、15秒間のご褒美フィーバーが始まります！
                  フィーバー中は1マスの<strong className="text-purple-600">「フィーバーグミ (F)」</strong>が超高確率で降ってくるので、一気に連鎖消しをおこなう事が可能です。
                  さらに、フィーバー中に獲得するすべてのスコア倍率が<strong className="text-pink-500">３倍</strong>になります！ハイスコアの最大のチャンスです！
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* スマホ・Iframe用：バーチャルコントローラー (丸みを帯びたクッキー・マカロンデザインで縦サイズをスリムに構築しスクロールを解消！) */}
      {isPlaying && !isPaused && !isGameOver && activeTab === 'game' && (
        <section id="virtual_controller" className="w-full max-w-sm mt-1.5 bg-white/95 backdrop-blur-sm rounded-xl p-1 md:p-2 border border-pink-100 shadow-md flex flex-col gap-1 animate-bubble-pop">
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={holdCurrentPiece}
              disabled={hasHeld}
              className={`py-1 md:py-1.5 px-1 rounded-lg border font-bold active:scale-95 transition-all text-[9px] md:text-[10px] flex flex-col items-center justify-center gap-0.5 ${hasHeld ? 'bg-gray-50 text-gray-300 border-gray-150' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'}`}
            >
              <Download className="w-3 h-3 rotate-180" />
              <span>ホールド</span>
            </button>
            <button
              onClick={hardDrop}
              className="py-1 md:py-1.5 px-1 bg-fuchsia-50 hover:bg-fuchsia-100 active:scale-95 transition-all text-fuchsia-600 font-bold rounded-lg border border-fuchsia-100 text-[9px] md:text-[10px] flex flex-col items-center justify-center gap-0.5"
            >
              <Zap className="w-3 h-3" />
              <span>ハード落下</span>
            </button>
            <button
              onClick={rotatePiece}
              className="py-1 md:py-1.5 px-1 bg-amber-50 hover:bg-amber-100 active:scale-95 transition-all text-amber-600 font-bold rounded-lg border border-amber-100 text-[9px] md:text-[10px] flex flex-col items-center justify-center gap-0.5"
            >
              <RotateCw className="w-3 h-3" />
              <span>回転</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => movePiece(-1, 0)}
              className="py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-600 font-bold rounded-lg border border-blue-100 flex items-center justify-center shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={softDrop}
              className="py-1.5 bg-yellow-50 hover:bg-yellow-105 active:scale-95 text-yellow-600 font-bold rounded-lg border border-yellow-100 flex items-center justify-center shadow-sm"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => movePiece(1, 0)}
              className="py-1.5 bg-blue-50 hover:bg-blue-110 active:scale-95 text-blue-600 font-bold rounded-lg border border-blue-100 flex items-center justify-center shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      <footer className={`mt-1.5 mb-1 text-center ${isPlaying ? 'hidden lg:block' : 'block'}`}>
        <p className="text-[8px] md:text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">
          🧁 Sweets Tetris • Sweetris v1.0 🍰
        </p>
      </footer>
    </div>
  );
}

