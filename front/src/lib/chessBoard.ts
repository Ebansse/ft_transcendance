/** Pont entre chess.js et l'affichage de l'échiquier.
 *
 *  chess.js tient les *règles* (déplacements légaux, roque, prise en passant,
 *  clouage, mat, pat, nulles) — c'est le même jeu de règles que chesslib côté
 *  back, et le même FEN de part et d'autre. Ce module ne fait que traduire une
 *  partie chess.js en ce que la vue sait dessiner (64 cases, glyphes Unicode,
 *  libellés français) et n'ouvre aucune connexion. */

import type { Chess } from 'chess.js'

/** Position de départ, telle que la renvoie `new Board()` côté back. */
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

/** `['a8', 'b8', …, 'h1']` — même ordre que les cases renvoyées par `squaresOf`. */
export const SQUARE_NAMES = RANKS.flatMap((rank) => FILES.map((file) => file + rank))

/** Les deux couleurs partagent les glyphes pleins : les glyphes creux (♙♔)
 *  disparaissent sur les cases claires. La couleur est portée par le CSS. */
const GLYPHS: Record<string, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
}

const NAMES: Record<string, string> = {
  k: 'roi',
  q: 'dame',
  r: 'tour',
  b: 'fou',
  n: 'cavalier',
  p: 'pion',
}

export function glyphOf(piece: string) {
  return GLYPHS[piece.toLowerCase()] ?? ''
}

/** Pièces dont le nom est féminin : leur couleur s'accorde (« tour noire »). */
const FEMININE = new Set(['q', 'r'])

/** Libellé lisible pour les lecteurs d'écran : « pion blanc », « tour noire ». */
export function nameOf(piece: string) {
  const type = piece.toLowerCase()
  const feminine = FEMININE.has(type)
  const color = isWhitePiece(piece)
    ? feminine
      ? 'blanche'
      : 'blanc'
    : feminine
      ? 'noire'
      : 'noir'

  return `${NAMES[type] ?? 'pièce'} ${color}`
}

/** Une case vide vaut `null` ; sinon la lettre FEN de la pièce, majuscule pour
 *  les blancs (`'P'` = pion blanc, `'p'` = pion noir). */
export function isWhitePiece(piece: string) {
  return piece === piece.toUpperCase()
}

export function indexOfSquare(square: string) {
  return SQUARE_NAMES.indexOf(square)
}

/** Aplatit `chess.board()` (8 rangées, la 8ᵉ d'abord) en 64 lettres FEN :
 *  index 0 = a8, index 63 = h1, exactement l'ordre de `SQUARE_NAMES`. */
export function squaresOf(chess: Chess): (string | null)[] {
  return chess
    .board()
    .flat()
    .map((cell) => {
      if (cell === null) return null
      return cell.color === 'w' ? cell.type.toUpperCase() : cell.type
    })
}

/** Matériel d'un camp au coup d'envoi, et valeur d'échange de chaque pièce.
 *  Le roi n'y figure pas : il ne se prend jamais et ne se compte pas. */
const INITIAL: Record<string, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 }
const VALUES: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 }

/** Pièces prises, vues de chaque côté, et l'écart de matériel qui en découle. */
export type Captures = {
  /** Pièces noires disparues — les prises des blancs. */
  byWhite: string[]
  /** Pièces blanches disparues — les prises des noirs. */
  byBlack: string[]
  /** Positif si les blancs mènent, négatif si ce sont les noirs. */
  advantage: number
}

/** Compte les pièces d'un camp encore sur l'échiquier, par type. */
function materialOf(squares: (string | null)[], white: boolean) {
  const counts: Record<string, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 }

  for (const piece of squares) {
    if (piece === null || isWhitePiece(piece) !== white) continue
    const type = piece.toLowerCase()
    if (type in counts) counts[type] += 1
  }

  return counts
}

/** Les pièces d'un camp qui ne sont plus sur l'échiquier, de la plus forte à la
 *  plus faible. Une promotion fait disparaître un pion sans qu'il ait été pris :
 *  chaque pièce en surnombre en rend donc un à son camp, sans quoi un pion
 *  fantôme s'ajouterait aux prises de l'adversaire. */
function missingOf(counts: Record<string, number>, white: boolean) {
  let promoted = 0
  for (const type of ['q', 'r', 'b', 'n']) {
    promoted += Math.max(0, counts[type] - INITIAL[type])
  }

  const missing: string[] = []
  for (const type of ['q', 'r', 'b', 'n', 'p']) {
    const gone = Math.max(0, INITIAL[type] - counts[type]) - (type === 'p' ? promoted : 0)
    for (let i = 0; i < gone; i += 1) missing.push(white ? type.toUpperCase() : type)
  }

  return missing
}

/** Additionne la valeur des pièces d'un camp encore en jeu. */
function scoreOf(counts: Record<string, number>) {
  return Object.entries(counts).reduce((total, [type, count]) => total + VALUES[type] * count, 0)
}

/** Déduit les prises de la seule position affichée, sans toucher à l'historique :
 *  une partie reprise depuis un FEN (rechargement de page) arrive sans coups, et
 *  doit tout de même montrer ce qui a été pris. */
export function capturesOf(squares: (string | null)[]): Captures {
  const white = materialOf(squares, true)
  const black = materialOf(squares, false)

  return {
    byWhite: missingOf(black, false),
    byBlack: missingOf(white, true),
    advantage: scoreOf(white) - scoreOf(black),
  }
}

/** Motif de fin de partie en français, ou `null` tant qu'elle continue.
 *  L'ordre compte : `isGameOver()` dit *que* c'est fini, jamais *pourquoi*, et
 *  un mat est aussi une position sans coup légal. */
export function outcomeOf(chess: Chess): string | null {
  if (chess.isCheckmate()) {
    // Le camp au trait est celui qui subit le mat.
    const winner = chess.turn() === 'w' ? 'les noirs' : 'les blancs'
    return `Échec et mat — ${winner} gagnent`
  }
  if (chess.isStalemate()) return 'Pat — partie nulle'
  if (chess.isInsufficientMaterial()) return 'Nulle — matériel insuffisant'
  if (chess.isThreefoldRepetition()) return 'Nulle — triple répétition'
  if (chess.isDrawByFiftyMoves()) return 'Nulle — règle des 50 coups'
  if (chess.isDraw()) return 'Partie nulle'

  return null
}
