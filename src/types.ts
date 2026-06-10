export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'F'; // Fはフィーバー用のキャンディなどの特殊ブロック

export interface SweetDefinition {
  type: PieceType;
  name: string;
  japaneseName: string;
  description: string;
  emoji: string;
  baseColor: string; // Tailwindクラス (bg-...)
  borderColor: string;
  shadowColor: string;
  textPattern: string; // トッピングやテクスチャのスタイル
  soundWord: string; // 消した時のオノマトペ
}

export type GridCell = {
  filled: boolean;
  type: PieceType | null;
  animation?: 'clear' | 'sparkle' | null;
};

export type Board = GridCell[][];

export interface Point {
  x: number;
  y: number;
}

export interface GameStats {
  score: number;
  lines: number;
  level: number;
  highScore: number;
  piecesPlaced: Record<PieceType, number>;
}

export const SWEETS: Record<PieceType, SweetDefinition> = {
  I: {
    type: 'I',
    name: 'Strawberry Pocky',
    japaneseName: 'いちごポッキー',
    description: 'サクサクのプレッツェルに、甘酸っぱいいちごパウダー入りのチョコレートをたっぷりコーティング！ロングサイズで大満足。',
    emoji: '🥖',
    baseColor: 'bg-pink-400',
    borderColor: 'border-pink-500',
    shadowColor: 'shadow-pink-300',
    textPattern: 'relative before:absolute before:inset-x-0 before:top-1/4 before:h-1/2 before:bg-pink-300/60 after:absolute after:w-1 after:h-1 after:bg-white after:rounded-full after:top-1 after:left-1',
    soundWord: 'ポキッ！'
  },
  O: {
    type: 'O',
    name: 'Butter Cookie',
    japaneseName: 'さくさくクッキー',
    description: '焦がしバターの風味豊かな、まあるいサクサククッキー。真ん中にはあま〜いチョコチップがチョンと乗っています。',
    emoji: '🍪',
    baseColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    shadowColor: 'shadow-amber-200',
    textPattern: 'rounded-md relative before:absolute before:inset-2 before:border-2 before:border-dashed before:border-amber-400/50 after:absolute after:w-1.5 after:h-1.5 after:bg-amber-900 after:rounded-full after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2',
    soundWord: 'サクッ！'
  },
  T: {
    type: 'T',
    name: 'Macaron Lavender',
    japaneseName: 'ふんわりマカロン',
    description: 'パリッと焼き上げたコックに、爽やかなラベンダー＆ブルーベリークリームをたっぷり挟んだ上品なマカロン。SNS映え間違いなし！',
    emoji: '🍬',
    baseColor: 'bg-indigo-300',
    borderColor: 'border-indigo-400',
    shadowColor: 'shadow-indigo-200',
    textPattern: 'rounded-xl relative before:absolute before:inset-x-1 before:top-1/3 before:bottom-1/3 before:bg-white/70 before:rounded-sm',
    soundWord: 'サクふにゃっ！'
  },
  S: {
    type: 'S',
    name: 'Strawberry Shortcake',
    japaneseName: 'いちごショート',
    description: 'ふんわりスポンジに、たっぷりの北海道産生クリームと甘酸っぱい真っ赤ないちごをサンドした王道のケーキ。永遠の主役。',
    emoji: '🍰',
    baseColor: 'bg-red-400',
    borderColor: 'border-red-500',
    shadowColor: 'shadow-red-200',
    textPattern: 'relative before:absolute before:inset-y-0 before:left-1/3 before:right-1/3 before:bg-white after:absolute after:w-2 after:h-2 after:bg-red-600 after:rounded-full after:top-1 after:left-1/2 after:-translate-x-1/2',
    soundWord: 'ふわぁ…！'
  },
  Z: {
    type: 'Z',
    name: 'Chocolate Bar',
    japaneseName: '金箔板チョコ',
    description: 'パキッと割るのが楽しい、芳醇なカカオが香る本格ミルクチョコレート。上品にキラリと輝くゴールドの包み紙が少し見えています。',
    emoji: '🍫',
    baseColor: 'bg-amber-950',
    borderColor: 'border-amber-900',
    shadowColor: 'shadow-amber-800',
    textPattern: 'relative before:absolute before:inset-1 before:border before:border-amber-800/40 after:absolute after:bottom-0 after:right-0 after:w-3 after:h-3 after:bg-yellow-400/40 after:rotate-45',
    soundWord: 'パキッ！'
  },
  J: {
    type: 'J',
    name: 'Pudding Mode',
    japaneseName: 'ぷるぷるプリン',
    description: '卵を贅沢に使ったカスタードプリンに、ほろ苦いカラメルソース。てっぺんにはチェリー。お皿を揺らすと優しくぷるぷる揺れます。',
    emoji: '🍮',
    baseColor: 'bg-yellow-300',
    borderColor: 'border-yellow-400',
    shadowColor: 'shadow-yellow-200',
    textPattern: 'relative before:absolute before:inset-x-0 before:top-0 before:h-2 before:bg-amber-700/80 before:rounded-t-sm after:absolute after:w-1.5 after:h-1.5 after:bg-red-500 after:rounded-full after:top-1 after:right-1',
    soundWord: 'ぷるんっ！'
  },
  L: {
    type: 'L',
    name: 'Swiss Roll',
    japaneseName: '濃厚ロールケーキ',
    description: 'しっとりときめ細やかなロールスポンジで、バニラビーンズ入りの濃厚なホイップクリームをくるりと巻き込みました。切り口の美しい渦巻きが自慢！',
    emoji: '🌀',
    baseColor: 'bg-orange-300',
    borderColor: 'border-orange-400',
    shadowColor: 'shadow-orange-200',
    textPattern: 'relative before:absolute before:inset-1.5 before:bg-white before:rounded-full before:border-2 before:border-orange-400/30',
    soundWord: 'もっちり！'
  },
  F: {
    type: 'F',
    name: 'Fever Gummy Candy',
    japaneseName: 'フィーバーグミ',
    description: 'フィーバーモード限定！キラキラと輝く不思議なクリスタルグミ。どの味に変化するかは気分次第のフルーティキャンディ！',
    emoji: '🍭',
    baseColor: 'bg-fuchsia-400 animate-pulse',
    borderColor: 'border-fuchsia-500',
    shadowColor: 'shadow-fuchsia-300',
    textPattern: 'bg-gradient-to-tr from-yellow-300 via-pink-400 to-indigo-400 relative before:absolute before:inset-y-0 before:inset-x-2 before:bg-white/40 before:rounded-full',
    soundWord: 'シュワッ！'
  }
};

export const TETROMINOES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  F: [
    [1] // フィーバー時の1x1の特殊ボム / ジュエルキャンディ
  ]
};
