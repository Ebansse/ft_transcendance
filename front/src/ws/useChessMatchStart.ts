import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CHESS_MATCHES, type ChessMatchDto } from '../lib/chessClient.ts'
import { useSocket } from './socketContext.ts'

/** Emmène l'inviteur sur le plateau quand son invitation est acceptée.
 *
 *  Celui qui accepte se redirige lui-même (il a la réponse HTTP) ; l'inviteur,
 *  lui, n'a rien demandé : il ne l'apprend que par la socket, d'où ce hook
 *  monté dans App pour être à l'écoute sur n'importe quelle page. */
export function useChessMatchStart() {
  const { subscribe } = useSocket()
  const navigate = useNavigate()

  useEffect(
    () =>
      subscribe(CHESS_MATCHES, (body) => {
        const match = JSON.parse(body) as ChessMatchDto
        // La même destination sert aux fins de partie : seule une partie qui
        // démarre mérite d'arracher l'utilisateur à la page où il est.
        if (match.status === 'IN_PROGRESS') navigate('/chess')
      }),
    [subscribe, navigate],
  )
}
