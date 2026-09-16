import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Chess } from 'chess.js'
import { CapturedPieces } from './components/CapturedPieces.tsx'
import { ChessPromotionModal, type PromotionPiece } from './components/ChessPromotionModal.tsx'
import { capturesOf, squaresOf } from './lib/chessBoard.ts'
import './style/token.css'
import './style/body.css'

function Preview() {
  const [open, setOpen] = useState(true)
  const [picked, setPicked] = useState<PromotionPiece | null>(null)

  const game = new Chess()
  for (const move of ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qxd2', 'Bxd2', 'Nf6']) game.move(move)
  const captures = capturesOf(squaresOf(game))

  return (
    <main style={{ padding: '2rem', width: '300px', background: '#17171b', color: '#f5f1ea' }}>
      <p>Noirs · Alice</p>
      <CapturedPieces pieces={captures.byBlack} advantage={-captures.advantage} />
      <p>Blancs · Vous</p>
      <CapturedPieces pieces={captures.byWhite} advantage={captures.advantage} />

      <p>Choix : {picked ?? 'aucun'}</p>
      <button type="button" onClick={() => setOpen(true)}>
        Rouvrir
      </button>

      <ChessPromotionModal
        open={open}
        white
        onSelect={(piece) => {
          setPicked(piece)
          setOpen(false)
        }}
      />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
