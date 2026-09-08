/** Manipulation d'une position d'échecs côté front : lecture et écriture du
 *  FEN, déplacement d'une pièce, nommage des cases. Rien ici ne connaît le
 *  réseau, et rien ici ne connaît les *règles* : le back (chesslib) reste seul
 *  juge de la légalité d'un coup, ce module ne fait que dessiner ce qu'on lui
 *  donne et bouger ce qu'on lui demande. */

/** Position de départ, telle que la renvoie `new Board()` côté back. */
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Une case vide vaut `null` ; sinon la lettre FEN de la pièce, majuscule pour
 *  les blancs (`'P'` = pion blanc, `'p'` = pion noir). */
export type ChessPosition = {
  /** 64 cases dans l'ordre de lecture du FEN : index 0 = a8, index 63 = h1. */
  squares: (string | null)[]
  sideToMove: 'w' | 'b'
  castling: string
  enPassant: string
  halfmove: number
  fullmove: number
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

/** `['a8', 'b8', …, 'h1']` — même ordre que `ChessPosition.squares`. */
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

export function isWhitePiece(piece: string) {
  return piece === piece.toUpperCase()
}

export function indexOfSquare(square: string) {
  return SQUARE_NAMES.indexOf(square)
}

/** Découpe un FEN en position exploitable. Les champs absents (FEN tronqué)
 *  retombent sur les valeurs d'une partie neuve plutôt que sur `NaN`. */
export function parseFen(fen: string): ChessPosition {
  const [placement, side, castling, enPassant, halfmove, fullmove] = fen.trim().split(/\s+/)
  const squares: (string | null)[] = []

  for (const rank of placement.split('/')) {
    for (const char of rank) {
      if (char >= '1' && char <= '8') squares.push(...Array<null>(Number(char)).fill(null))
      else squares.push(char)
    }
  }

  return {
    squares,
    sideToMove: side === 'b' ? 'b' : 'w',
    castling: castling ?? '-',
    enPassant: enPassant ?? '-',
    halfmove: Number(halfmove) || 0,
    fullmove: Number(fullmove) || 1,
  }
}

/** Réécrit la position en FEN : c'est ce format que le back attend et renvoie,
 *  donc le seul état qu'on aura à échanger une fois les routes branchées. */
export function toFen(position: ChessPosition) {
  const ranks: string[] = []

  for (let rank = 0; rank < 8; rank++) {
    let line = ''
    let empty = 0

    for (let file = 0; file < 8; file++) {
      const piece = position.squares[rank * 8 + file]
      if (piece === null) {
        empty++
        continue
      }
      if (empty > 0) {
        line += String(empty)
        empty = 0
      }
      line += piece
    }

    ranks.push(empty > 0 ? line + String(empty) : line)
  }

  return [
    ranks.join('/'),
    position.sideToMove,
    position.castling,
    position.enPassant,
    position.halfmove,
    position.fullmove,
  ].join(' ')
}

/** Déplace la pièce de `from` vers `to` **sans vérifier quoi que ce soit** :
 *  ni la légalité, ni le tour, ni la prise en passant, ni le roque. La position
 *  renvoyée est neuve (jamais mutée sur place), et la position d'origine est
 *  rendue telle quelle si la case de départ est vide. */
export function applyMove(position: ChessPosition, from: string, to: string): ChessPosition {
  const fromIndex = indexOfSquare(from)
  const toIndex = indexOfSquare(to)
  const piece = position.squares[fromIndex]

  if (fromIndex < 0 || toIndex < 0 || piece === null) return position

  const squares = [...position.squares]
  const captured = squares[toIndex]
  squares[toIndex] = piece
  squares[fromIndex] = null

  return {
    ...position,
    squares,
    sideToMove: position.sideToMove === 'w' ? 'b' : 'w',
    // Remise à zéro sur une poussée de pion ou une prise, comme le veut la
    // règle des 50 coups — la seule que ce module puisse tenir sans connaître
    // les règles.
    halfmove: piece.toLowerCase() === 'p' || captured !== null ? 0 : position.halfmove + 1,
    fullmove: position.sideToMove === 'b' ? position.fullmove + 1 : position.fullmove,
  }
}

/** Coup au format UCI attendu par le back (`ChessGameService.isValidMoveFormat`) :
 *  case de départ, case d'arrivée, et la pièce de promotion en option. */
export function toUci(from: string, to: string, promotion?: string) {
  return from + to + (promotion ?? '')
}
